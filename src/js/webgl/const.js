const BYTE = 0x1400
const UNSIGNED_BYTE = 0x1401
const SHORT = 0x1402
const UNSIGNED_SHORT = 0x1403
const INT = 0x1404
const UNSIGNED_INT = 0x1405
const FLOAT = 0x1406

const STATIC_DRAW = 0x88e4

const ARRAY_BUFFER = 0x8892

const COMPILE_STATUS = 0x8b81
const LINK_STATUS = 0x8b82

const DEFAULT_ATTRIBUTE_SETTINGS = {
  targetType: ARRAY_BUFFER,
  stride: 0,
  offset: 0,
  numComponents: 3,
  normalize: false,
  drawType: STATIC_DRAW
}

export {
  COMPILE_STATUS,
  LINK_STATUS,
  DEFAULT_ATTRIBUTE_SETTINGS,
  BYTE,
  UNSIGNED_BYTE,
  UNSIGNED_INT,
  UNSIGNED_SHORT,
  SHORT,
  INT,
  FLOAT
}
