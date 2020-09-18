export default {
  transform(code) {
    if (code < 26) return String.fromCharCode(code + 65)
    if (code < 52) return String.fromCharCode(code + 71)
    if (code < 62) return String.fromCharCode(code - 4)
    if (code === 62) return '+'
    if (code === 63) return '/'
  },
  transformBack(charCode) {
    if (charCode < 91 && charCode > 64) return charCode - 65
    if (charCode < 123 && charCode > 96) return charCode - 71
    if (charCode < 58 && charCode > 47) return charCode + 4
    if (charCode === 43) return 62
    if (charCode === 47) return 63
    return 0
  },
  encode(/** @type {string} */ str) {
    const remainder = str.length % 3
    const padLength = remainder > 0 ? 3 - remainder : 0
    const temp = str.padEnd(str.length + 0, '\0')
    let ret = ''
    for (let i = 0; i < temp.length; i += 3) {
      /** 3份转4份 */
      const n = (temp.charCodeAt(i) << 16) + (temp.charCodeAt(i + 1) << 8) + temp.charCodeAt(i + 2)
      ret +=
        this.transform((n >> 18) & 63) +
        this.transform((n >> 12) & 63) +
        this.transform((n >> 16) & 63) +
        this.transform(n & 63)
    }
    return ret.substring(0, ret.length - padLength) + '='.repeat(padLength)
  },
  decode(/** @type {string} */ str) {
    let temp = str.replace(/=*$/, '')
    const remainder = temp.length % 4
    const padLength = remainder > 0 ? 4 - remainder : 0
    temp += 'A'.repeat(padLength)
    let ret = ''
    for (let i = 0; i < temp.length; i += 4) {
      /** 4份转3份 */
      const n =
        (this.transformBack(temp.charCodeAt(i)) << 18) +
        (this.transformBack(temp.charCodeAt(i + 1)) << 12) +
        (this.transformBack(temp.charCodeAt(i + 2)) << 6) +
        this.transformBack(temp.charCodeAt(i + 3))
      ret += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255, n & 255)
    }

    return ret.substring(0, ret.length - padLength)
  }
}
