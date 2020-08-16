import * as obj from '../obj/obj'
import { COMPILE_STATUS, DEFAULT_ATTRIBUTE_SETTINGS, LINK_STATUS } from './const'
import { getGLTypeForTypedArray } from './typedarrays'

/**
 * @typedef {'VERTEX_SHADER'|'FRAGMENT_SHADER'} ShaderType
 */

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} shaderSource
 * @param {ShaderType} shaderType
 */

function loadShader(gl, shaderSource, shaderType) {
  const shader = gl.createShader(gl[shaderType])
  gl.shaderSource(shader, shaderSource)
  gl.compileShader(shader)
  const compiled = gl.getShaderParameter(shader, COMPILE_STATUS)
  if (!compiled) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {WebGLShader[]} shaders
 */
function createProgram(gl, shaders) {
  const program = gl.createProgram()
  shaders.forEach((shader) => {
    gl.attachShader(program, shader)
  })
  gl.linkProgram(program)
  const linked = gl.getProgramParameter(program, LINK_STATUS)
  if (!linked) {
    gl.deleteProgram(program)
    shaders.forEach((shader) => gl.deleteBuffer(shader))
    return null
  }
  return program
}

function createAttribs(gl, attributes) {
  return obj.map(attributes, (item, key) => {
    const settings = Object.assign({}, DEFAULT_ATTRIBUTE_SETTINGS, item)
    const buffer = createBufferFromTypedArray(gl, settings.value, settings.targetType, settings.drawType)
    const dataType = getGLTypeForTypedArray(item.value)
    Object.assign(settings, {
      buffer,
      name: key,
      dataType
    })
  })
}

function createBufferFromTypedArray(gl, typedArray, type, drawType) {
  const buffer = gl.createBuffer()
  gl.bindBuffer(type, buffer)
  gl.bufferData(type, typedArray, drawType)
  return buffer
}
