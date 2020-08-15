import { identity } from '../const/common'
import { isArrayLike, isUndef } from './is'

function getValueByPath(...path) {
  return (obj) => {
    let target = obj
    let index = -1
    const boundIndex = path.length - 1
    do {
      if (isUndef(target)) return target
      target = isUndef(target.get) ? target[path[++index]] : target.get(path[++index])
    } while (index < boundIndex)

    return target
  }
}

function proxyMethod(proto, target, methodNames) {
  methodNames.forEach((method) => {
    proto[method] = function (...args) {
      return this[target][method](...args)
    }
  })
}

function _extendTwo(obj1, obj2, hooks) {
  if (!isUndef(obj2) && !isArrayLike(obj2)) {
    Object.keys(obj2).forEach((key) => {
      const value = obj2[key]
      if (!isUndef(value) && typeof value === 'object' && !isArrayLike(value)) {
        if (typeof obj1[key] !== 'object') obj1[key] = {}
        _extendTwo(obj1[key], value, hooks)
      } else obj1[key] = hooks.beforeMerge(value, obj1[key], key, obj1, obj2)
    })
  }
}

function extend(...args) {
  return function ({ beforeMerge = identity } = {}) {
    if (args.length) {
      const target = args[0]
      if (target) {
        for (let i = 1; i < args.length; i++) {
          _extendTwo(target, args[i], {
            beforeMerge
          })
        }
      }
      return target
    }
  }
}

export { getValueByPath, proxyMethod, extend }
