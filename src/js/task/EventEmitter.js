export default class EventEmitter {
  constructor() {
    this._bus = new Map()
  }

  on(eventName, handler) {
    if (!this._bus.has(eventName)) this._bus.set(eventName, new Set())
    this._bus.get(eventName).add(handler)
  }

  once(eventName, handler) {
    const composed = (...args) => {
      try {
        return handler(...args)
      } finally {
        this.off(eventName, composed)
      }
    }
    this.on(eventName, composed)
  }

  off(eventName, handler) {
    if (this._bus.has(eventName)) {
      this._bus.get(eventName).delete(handler)
    }
  }

  emit(eventName, params) {
    if (this._bus.has(eventName)) {
      this._bus.get(eventName).forEach((handler) => handler(params))
    }
  }

  waitUntil(eventName) {
    return new Promise((res, _, onCancel) => {
      this.once(eventName, res)
      onCancel(() => this.off(eventName, res))
    })
  }
}
