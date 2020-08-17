import * as obj from '../obj/obj'
import { ARRAY_BUFFER, COMPILE_STATUS, DEFAULT_ATTRIBUTE_SETTINGS, LINK_STATUS } from './const'
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

function setFloatAttrib(gl, index, data) {
  if (!data.buffer) {
    gl.disableVertexAttribArray(index)
    gl[`vertexAttrib${data.value.length}`](index, data.value)
  } else {
    gl.bindBuffer(ARRAY_BUFFER, data.buffer)
    gl.enableVertexAttribArray(index)
    /** 将当前与ARRAY_BUFFER绑定的buffer与着色器的顶点属性变量绑定，并定义buffer的数据布局 */
    gl.vertexAttribPointer(index, data.numComponents, data.type, data.normalize, data.stride, data.offset)
  }
}
