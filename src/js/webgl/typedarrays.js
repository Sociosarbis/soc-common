import { BYTE, FLOAT, INT, SHORT, UNSIGNED_BYTE, UNSIGNED_INT, UNSIGNED_SHORT } from './const'

// @ts-ignore
const TYPED_ARRAY_TO_GL_TYPE = new Map([
  [Int8Array, BYTE],
  [Uint8Array, UNSIGNED_BYTE],
  [Uint8ClampedArray, UNSIGNED_BYTE],
  [Int16Array, SHORT],
  [Uint16Array, UNSIGNED_SHORT],
  [Int32Array, INT],
  [Uint32Array, UNSIGNED_INT],
  [Float32Array, FLOAT]
])

function getGLTypeForTypedArray(typedArray) {
  return TYPED_ARRAY_TO_GL_TYPE.get(typedArray.prototype.constructor)
}

export { getGLTypeForTypedArray }
