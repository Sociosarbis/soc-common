import { isUndef } from '../obj/is'

export default class EventEmitter {
  constructor() {
    /** @type {Map<string, Set>} */
    this._bus = new Map()
  }

  /**
   * @param {string|string[]} eventName
   */
  on(eventName, handler) {
    Array.isArray(eventName) ? eventName.forEach((name) => this._on(name, handler)) : this._on(eventName, handler)
  }
  /**
   * @param {string} eventName
   */
  _on(eventName, handler) {
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

  /**
   * @param {string|string[]} eventName
   */
  off(eventName, handler) {
    Array.isArray(eventName) ? eventName.forEach((name) => this._off(name, handler)) : this._off(eventName, handler)
  }

  _off(eventName, handler) {
    if (isUndef(eventName)) this._bus.clear()
    else {
      if (this._bus.has(eventName)) {
        if (isUndef(handler)) this._bus.get(eventName).clear()
        else this._bus.get(eventName).delete(handler)
      }
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
