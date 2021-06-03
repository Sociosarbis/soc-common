const enum States {
  pending,
  fulfilled,
  rejected
}

type OneArgFunc<T = any, R = any> = (arg?: T) => R

interface Thenable {
  then(onFulfilled?: OneArgFunc, onRejected?: OneArgFunc): any
}

const isObj = (obj: unknown) => {
  return !!(obj && typeof obj === 'object')
}

const isFunc = (obj: unknown) => {
  return typeof obj === 'function'
}

const isPromise = (obj: unknown) => {
  return isObj(obj) && obj.constructor === APlusPromise
}

const isThenable = (obj: unknown) => {
  return isObj(obj) && isFunc((obj as { then?: unknown }).then)
}

class APlusPromise<T = any> implements Thenable {
  private _state: States = States.pending
  private _val: T
  private _fulfilledCallbacks: ((val:T) => any)[] = []
  private _rejectedCallbacks: ((err: T) => any)[] = []
  constructor(func: (resolve?: (val:T) => any, reject?: (err: T) => any) => any) {
    func(this._resolve, this._reject)
  }

  private _resolve = (val: T) => {
    if (this._isPending) {
      if (val as unknown === this) throw new TypeError('Chaining cycle detected for promise')
      let thenHandler = null
      if (isObj(val) || isFunc(val)) {
        try {
          thenHandler = (val as unknown as Thenable).then
        } catch(e) {
          return this._reject(e)
        }
      }
      if (!isFunc(thenHandler)) {
        this._state = States.fulfilled
        this._val = val
        this._fulfilledCallbacks.forEach((cb) => {
          this._nextTick(() => cb(val))
        })
        this._clearCallbacks()
      } else {
        const promise = (val as unknown as Thenable)
        if (isPromise(promise)) {
          promise.then(this._resolve, this._reject)
        } else {
          let called = false
          const fulfilledCallback = (val: T) => {
            if (!called) {
              called = true
              this._resolve(val)
            }
          }

          const rejectedCallback = (err: T) => {
            if (!called) {
              called = true
              this._reject(err)
            }
          }
          try {
            thenHandler.apply(promise, [fulfilledCallback, rejectedCallback])
          } catch (e) {
            rejectedCallback(e)
          }
        }
      }
    }
  }

  private _reject = (err: T) => {
    if (this._isPending) {
      this._state = States.rejected
      this._val = err
      this._rejectedCallbacks.forEach((cb) => {
        this._nextTick(() => cb(err))
      })
      this._clearCallbacks()
    }
  }

  private _clearCallbacks() {
    this._fulfilledCallbacks.length = 0
    this._rejectedCallbacks.length = 0
  }

  private _nextTick(cb: () => any) {
    setTimeout(cb, 0)
  }

  private get _isPending() {
    return this._state === States.pending
  }

  private get _isFulFilled() {
    return this._state === States.fulfilled
  }

  then<R>(onFulfilled?: OneArgFunc<T, R>, onRejected?: OneArgFunc<T, R>) {
    const promise = new APlusPromise((resolve, reject) => {
      const fulfilledCallback = (val: T) => {
        try {
          const ret = isFunc(onFulfilled) ? onFulfilled(val) : val
          resolve(ret)
        } catch (e) {
          reject(e)
        }
      }

      const rejectedCallback = (err: T) => {
        try {
          if (isFunc(onRejected)) {
            const ret = onRejected(err)
            resolve(ret)
          } else {
            throw err
          }
        } catch (e) {
          reject(e)
        }
      }
      if (!this._isPending) {
        this._nextTick(() => {
          if (this._isFulFilled) {
            fulfilledCallback(this._val as T)
          } else {
            rejectedCallback(this._val as T)
          }
        })
      } else {
        this._fulfilledCallbacks.push(fulfilledCallback)
        this._rejectedCallbacks.push(rejectedCallback)
      }
    })
    return promise
  }

  static resolve<T>(val: T) {
    return new APlusPromise((resolve) => {
      resolve(val)
    })
  }

  static reject<T>(err: T) {
    return new APlusPromise((_, reject) => {
      reject(err)
    })
  }
}

export const adapter = {
  resolved<T>(value: T) {
    return APlusPromise.resolve(value)
  },
  rejected<T>(reason:T) {
    return APlusPromise.reject(reason)
  },
  deferred() {
    let resolve
    let reject
    const promise = new APlusPromise((res, rej) => {
      resolve = res
      reject = rej
    })
    return {
      promise,
      resolve,
      reject
    }
  }
}
