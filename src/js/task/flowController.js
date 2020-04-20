class TaskContext {
  constructor() {
    this.reject = null
    this.rejectPromise = null
    this.list = []
  }

  add(promise) {
    if (!this.rejectPromise) {
      this.rejectPromise = new Promise((_, rej) => {
        this.reject = rej
      })
    }

    const wrappedPromise = Promise.race([this.rejectPromise, promise])
    this.list.push(wrappedPromise)
    return wrappedPromise
      .then((res) => {
        this.clearAll()
        return res
      })
      .catch((err) => {
        try {
          if (err.__CANCEL__ && typeof promise.cancel === 'function') promise.cancel()
        } catch (e) {
          return Promise.reject(e)
        }
        return Promise.reject(err)
      })
  }

  clearAll() {
    this.list.length = 0
    if (this.reject) this.reject(TaskContext.CANCEL_SIGNAL)
    this.resetController()
  }

  resetController() {
    this.reject = null
    this.rejectPromise = null
  }
}

TaskContext.CANCEL_SIGNAL = { __CANCEL__: true }

class FlowController {
  constructor() {
    this.taskContext = {}
  }

  createTaskList(id) {
    if (!(id in this.taskContext)) {
      this.taskContext[id] = new TaskContext()
    }
    return this.taskContext[id]
  }

  takeLast(promise, id) {
    const context = this.createTaskList(id)
    context.clearAll()
    return context.add(promise)
  }

  takeFirst(promise, id) {
    const context = this.createTaskList(id)
    return context.add(promise)
  }
}
