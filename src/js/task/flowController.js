import Promise from 'bluebird'

import { proxyMethod } from '../obj'
import EventEmitter from './EventEmitter'

class TaskSet extends Set {
  constructor(...args) {
    super(...args)
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
      if (this.delete(target)) {
        if (!target.isCancelled()) this.emit('task-complete', target)
      }
    })
    this.emit('size-change', {
      newVal: _size + 1,
      oldVal: _size
    })
  }

  /**
   *
   * @param {function} creator 创建任务的函数
   * @param {any[]} args 创建任务用到的参数
   */
  shouldCreateTask(creator, ...args) {
    return true
  }

  beforeAdd(val) {
    if (typeof val.then === 'function') {
      if (!val.isPending() || this.has(val)) return false
      return val
    }
    return false
  }

  delete(val, silent = false) {
    if (typeof val.then === 'function') {
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

class RaceTaskSet extends TaskSet {
  constructor() {
    super()
    this._services = new Set()
    this.on('task-complete', this.clear.bind(this))
  }

  _add(target) {
    if (RaceTaskSet.isService(target)) {
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
    task[RaceTaskSet.SERVICE_SYMBOL] = 1
    return task
  }

  static isService(task) {
    return task[RaceTaskSet.SERVICE_SYMBOL]
  }
}

RaceTaskSet.SERVICE_SYMBOL = 'RACE_TASK_SET_SERVICE'

function useTaskSets(arr = []) {
  return function wrap(func) {
    return function scheduleTask(...args) {
      if (arr.every((taskset) => taskset.shouldCreateTask(func, ...args))) {
        const task = func(...args)
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
