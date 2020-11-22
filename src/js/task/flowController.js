import Promise from 'bluebird'

import { noop } from '../const/common'
import { proxyMethod } from '../obj'
import { NaiveSet } from '../obj/array'
import { isFunc, isUndef } from '../obj/is'
import EventEmitter from './EventEmitter'

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
    // @ts-ignore
    if (isFunc(creator.then)) return [creator, args]
    // @ts-ignore
    return [creator(...args), []]
  }

  /**
   * 判断是否是一个合法的任务
   */
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

// 将方法代理到_emitter属性上
proxyMethod(TaskSet.prototype, '_emitter', ['on', 'off', 'emit'])

// 只取最后一个任务，当有任务需要加入时，取消正在进行的任务
class TakeLatestTaskSet extends TaskSet {
  beforeAdd(val) {
    const target = super.beforeAdd(val)
    if (target) {
      this.clear(true)
    }
    return target
  }
}

// 当有正在进行的任务时，不添加新任务并取消新任务
class TakeLeadingTaskSet extends TaskSet {
  shouldCreateTask() {
    return this.size === 0
  }

  beforeAdd(val) {
    if (this.size !== 0) return false
    return super.beforeAdd(val)
  }
}

// _services可看作是一个基于Promise的事件触发器，当触发时取消队列中的所有任务
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

// RaceTaskSet跟ManualTaskSet相比多了一个当有Promise resolve时，取消所有其他Promise的机制
class RaceTaskSet extends ManualCancelTaskSet {
  constructor() {
    super()
    this.on('task-complete', this.clear.bind(this))
  }
}

class BatchTaskSet extends TaskSet {
  /**
   * @param {number} batchSize
   */
  constructor(batchSize = 5) {
    super()
    this._batchSize = batchSize
    this._waitingTasks = []
    this._shipping = false
    this.on('size-change', this.handleSizeChange.bind(this))
  }

  /**
   *
   * @param {function} creator 创建任务的函数或已创建的任务
   */
  add(creator, ...args) {
    if (this.size < this._batchSize) {
      super.add(creator(...args))
    } else {
      this._waitingTasks.push([creator, ...args])
    }
    return this
  }

  handleSizeChange({ newVal }) {
    if (this._shipping) return
    this._shipping = true
    while (newVal < this._batchSize && this._waitingTasks.length) {
      const task = this._waitingTasks.shift()
      super.add(task[0](...task.slice(1)))
      newVal++
    }
    this._shipping = false
  }
}

// 队列中的任务按顺序进行的TaskSet
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

// 创建可手动resolve的Promsie
function createManualPromise(promiseResolver = noop) {
  let resolve
  const p = new Promise(function (res) {
    resolve = res
  })
  // @ts-ignore
  p.resolve = () => resolve(promiseResolver())
  return p
}

/**
 *
 * @param {TaskSet[]} arr
 */
function useTaskSets(arr = []) {
  // 接收一个创建task的func，func返回的task会加入到事先设置好的每个taskset中
  return function wrap(func) {
    return function scheduleTask(...args) {
      if (arr.every((taskset) => taskset.shouldCreateTask(func, ...args))) {
        const [task] = arr.reduce((acc, taskset) => taskset.createTask(acc[0], ...acc[1]), [func, args])
        arr.forEach((taskSet) => {
          taskSet.add(task)
        })
        return task
      }
      return Promise.reject(new Promise.CancellationError())
    }
  }
}

export { TakeLatestTaskSet, TakeLeadingTaskSet, RaceTaskSet, BatchTaskSet, useTaskSets }
