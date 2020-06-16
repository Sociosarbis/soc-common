import Promise from 'bluebird'

import { noop } from '../const/common'
import { proxyMethod } from '../obj'
import { NaiveSet } from '../obj/array'
import { isFunc, isUndef } from '../obj/is'
import EventEmitter from './EventEmitter'

/**
 * @extends {NaiveSet}
 */
class TaskSet extends NaiveSet {
  constructor() {
    super()
    this._emitter = new EventEmitter()
  }

  add(val) {
    const target = this.beforeAdd(val)
    if (target) {
      this._add(target)
    }
    return this
  }

  _add(target) {
    const _size = this.size
    super.add(target)
    target.finally(() => {
      if (this.remove(target)) {
        if (!target.isCancelled()) this.emit('task-complete', target)
      }
    })
    this.emit('size-change', {
      newVal: _size + 1,
      oldVal: _size
    })
  }

  emit(eventName, handler) {
    throw new Error('Method not implemented.')
  }

  on(eventName, handler) {
    throw new Error('Method not implemented.')
  }

  /**
   *
   * @param {function} creator 创建任务的函数
   * @param {any[]} args 创建任务用到的参数
   */
  shouldCreateTask(creator, ...args) {
    return true
  }

  /**
   *
   * @param {function|Promise} creator 创建任务的函数或已创建的任务
   * @param {any[]} args 创建任务用到的参数
   */
  createTask(creator, ...args) {
    if (isFunc(creator.then)) return [creator, args]
    return [creator(...args), []]
  }

  beforeAdd(val) {
    if (isFunc(val.then)) {
      if (!val.isPending() || this.has(val)) return false
      return val
    }
    return false
  }

  remove(val, silent = false) {
    if (isFunc(val.then)) {
      if (this.has(val)) {
        const _size = this.size
        super.delete(val)
        if (val.isPending()) val.cancel()
        if (!silent)
          this.emit('size-change', {
            newVal: _size - 1,
            oldVal: _size
          })
        return true
      }
    }
    return false
  }

  clear(silent = false) {
    const _size = this.size
    if (_size !== 0) {
      this.forEach((task) => {
        if (task.isPending()) task.cancel()
      })
      super.clear()
      if (!silent)
        this.emit('size-change', {
          newVal: 0,
          oldVal: _size
        })
    }
  }

  first() {
    return this.arr[0]
  }
}

proxyMethod(TaskSet.prototype, '_emitter', ['on', 'off', 'emit'])

class TakeLatestTaskSet extends TaskSet {
  beforeAdd(val) {
    const target = super.beforeAdd(val)
    if (target) {
      this.clear(true)
    }
    return target
  }
}

class TakeLeadingTaskSet extends TaskSet {
  shouldCreateTask() {
    return this.size === 0
  }

  beforeAdd(val) {
    if (this.size !== 0) return false
    return super.beforeAdd(val)
  }
}

class ManualCancelTaskSet extends TaskSet {
  constructor() {
    super()
    this._services = new Set()
  }

  _add(target) {
    if (ManualCancelTaskSet.isService(target)) {
      this.addService(target)
      target.finally(() => {
        this.deleteService(target)
        this.clear()
      })
    } else super._add(target)
  }

  addService(target) {
    return this._services.add(target)
  }

  deleteService(target) {
    return this._services.delete(target)
  }

  static markService(task) {
    task[ManualCancelTaskSet.SERVICE_SYMBOL] = 1
    return task
  }

  static isService(task) {
    return task[ManualCancelTaskSet.SERVICE_SYMBOL]
  }
}

ManualCancelTaskSet.SERVICE_SYMBOL = 'RACE_TASK_SET_SERVICE'

class RaceTaskSet extends ManualCancelTaskSet {
  constructor() {
    super()
    this.on('task-complete', this.clear.bind(this))
  }
}

class SeriesTaskSet extends TaskSet {
  constructor() {
    super()
    this.on('size-change', this.handleSizeChange.bind(this))
  }

  createTask(creator, ...args) {
    if (isFunc(creator.then)) {
      if (!isUndef(creator[SeriesTaskSet.WAITING_REF])) {
        creator[SeriesTaskSet.WAITING_REF].add(this)
      } else if (isFunc(creator.resolve)) {
        creator[SeriesTaskSet.WAITING_REF] = new Set().add(this)
      }
      this.add(creator)
      return [creator, args]
    } else {
      const p = createManualPromise(() => creator(...args))
      p[SeriesTaskSet.WAITING_REF] = new Set().add(this)
      p[SeriesTaskSet.SERIES_TASK_CREATOR] = creator
      return [p, args]
    }
  }

  remove(val, silent = false) {
    const targetCreator = val[SeriesTaskSet.SERIES_TASK_CREATOR]
    if (isFunc(targetCreator)) {
      const result = [-1, -1]
      let index = 0
      if (
        this.arr.find((item, idx) => {
          if (item[SeriesTaskSet.SERIES_TASK_CREATOR] === targetCreator) result[idx] = index++
          return index > 1
        })
      ) {
        ;[this.arr[result[0]], this.arr[result[1]]] = [this.arr[result[1]], this.arr[result[0]]]
      }
    }
    return super.remove(val, silent)
  }

  handleSizeChange({ newVal }) {
    if (newVal > 0) {
      const first = this.first()
      const refs = first[SeriesTaskSet.WAITING_REF]
      if (refs) {
        if (refs.has(this)) refs.delete(this)
        if (refs.size === 0) first.resolve()
      }
    }
  }
}

SeriesTaskSet.WAITING_REF = 'SERIES_TASK_WAITING_REF'
SeriesTaskSet.SERIES_TASK_CREATOR = 'SERIES_TASK_CREATOR'

function createManualPromise(promiseResolver = noop) {
  let resolve
  const p = new Promise(function (res) {
    resolve = res
  })
  p.resolve = () => resolve(promiseResolver())
  return p
}

function useTaskSets(arr = []) {
  return function wrap(func) {
    return function scheduleTask(...args) {
      if (arr.every((taskset) => taskset.shouldCreateTask(func, ...args))) {
        const [task] = arr.reduce((acc, taskset) => taskset.createTask(acc[0], ...acc[1]), [func, args])
        arr.forEach((taskSet) => {
          taskSet.add(task)
        })
        return task
      }
      return Promise.reject(Promise.CancellationError())
    }
  }
}

export { TakeLatestTaskSet, TakeLeadingTaskSet, RaceTaskSet, useTaskSets }
