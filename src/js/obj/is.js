function isUndef(obj) {
  return obj === null || typeof obj === 'undefined'
}

function isFunc(func) {
  return typeof func === 'function'
}

function isArrayLike(list) {
  return 'length' in list
}

/**
 * 暂时只处理常见类型
 */
function isEmptyOrInvalid(obj) {
  return (
    isUndef(obj) ||
    (typeof obj === 'object' ? (isArrayLike(obj) ? obj.length === 0 : Object.keys(obj).length === 0) : isNaN(obj))
  )
}

export { isUndef, isFunc, isArrayLike, isEmptyOrInvalid }
