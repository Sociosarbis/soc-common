function isUndef(obj) {
  return obj === null || typeof obj === 'undefined'
}

function isFunc(func) {
  return typeof func === 'function'
}

export { isUndef, isFunc }
