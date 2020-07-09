/**
 * @constructor
 * @param {string} version
 */

function Version(version) {
  this.version = version
  this.versionSplit = version.split('.')
}

/**
 * @param {string} version
 * @param {(a: number, b: number) => boolean} comparator
 */
Version.prototype.compare = function (version, comparator) {
  const versionSplit = version.split('.')
  let ret = false
  for (let i = 0; i < versionSplit.length; i++) {
    const num = versionSplit[i]
    const a = Number(this.versionSplit[i] || 0)
    const b = Number(num)
    ret = comparator(a, b)
    if (a !== b && ret) return true
    if (!ret) return false
  }
  return ret
}
/**
 * @param {string} version
 */
Version.prototype.gte = function (version) {
  return this.compare(version, function (a, b) {
    return a >= b
  })
}
/**
 * @param {string} version
 */
Version.prototype.lte = function (version) {
  return this.compare(version, function (a, b) {
    return a <= b
  })
}
