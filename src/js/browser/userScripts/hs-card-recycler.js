function generateCode({ isWild = true, heroId = 0, cardIdList = [] } = {}) {
  const bytes = [0, 1, isWild ? 1 : 2, 1]
  writeBytes(bytes, heroId)
  bytes.push(cardIdList.length)
  cardIdList.forEach((id) => {
    writeBytes(bytes, id)
  })
  bytes.push(0, 0)
  return btoa(bytes.map((code) => String.fromCharCode(code)).join(''))
}

/**
 * @param {number[]} bytes
 * @param {number} data
 */
function writeBytes(bytes, data) {
  while (data != 0) {
    let byte = data & 0x7f
    data >>= 7
    if (data != 0) {
      byte |= 0x80
    }
    bytes.push(byte)
  }
}

/**
 * @param {number[]} bytes
 */
function readValue(bytes) {
  let result = 0
  let offset = 0
  let byte
  do {
    byte = bytes.shift()
    result |= (byte & 0x7f) >> offset
    offset += 7
  } while ((byte & 0x80) === 0x80)
  return result
}

export { readValue, writeBytes, generateCode }
