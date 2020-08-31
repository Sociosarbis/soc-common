import { isUndef } from '../obj/is'

const SHADER_TYPES = {
  vertex: WebGLRenderingContext.VERTEX_SHADER,
  fragment: WebGLRenderingContext.FRAGMENT_SHADER
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {string} source
 * @param {'vertex' | 'fragment'} type
 */
function createShader(gl, source, type) {
  let shader = gl.createShader(SHADER_TYPES[type])
  gl.shaderSource(shader, source)
  // 将着色器编译成二进制数据
  gl.compileShader(shader)
  const isSuccess = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (!isSuccess) {
    console.error(`Compiled error: ${gl.getShaderInfoLog(shader)}`)
    gl.deleteShader(shader)
    shader = null
  }
  return shader
}

/**
 * @param {WebGLRenderingContext} gl
 */
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  let program = gl.createProgram()
  const vertexShader = createShader(gl, vertexShaderSource, 'vertex')
  const fragmentShader = createShader(gl, fragmentShaderSource, 'fragment')
  if (vertexShader && fragmentShader) {
    // 往WebGL程序添加顶点着色器和片元着色器
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
  }
  // 链接两个着色器成一个WebGL程序
  gl.linkProgram(program)
  const isSuccess = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (!isSuccess) {
    console.error(`Linked error: ${gl.getProgramInfoLog(program)}`)
    gl.deleteProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    program = null
  }
  return program
}

/**
 * @param {WebGLRenderingContext} gl
 */
function createAttribSetter(gl, program) {
  /** @type {number} */
  const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
  const attribsMap = {}
  for (let i = 0; i < numAttribs; i++) {
    const attribInfo = gl.getActiveAttrib(program, i)
    const location = gl.getAttribLocation(program, attribInfo.name)
    attribsMap[attribInfo.name] = Object.assign({ location }, attribInfo)
  }
  return (key, data) => {
    if (key in attribsMap) {
      const attribInfo = attribsMap[key]
      gl.bindBuffer(gl.ARRAY_BUFFER, data.buffer)
      gl.enableVertexAttribArray(attribInfo.location)
      gl.vertexAttribPointer(attribInfo.location, data.size, data.type, data.normalized, data.stride, data.offset)
    }
  }
}

const VALUE_TYPES_TO_UNIFORM_SETTERS = {
  [WebGLRenderingContext.FLOAT]: WebGL2RenderingContext.prototype.uniform1f,
  [WebGL2RenderingContext.FLOAT_VEC2]: WebGL2RenderingContext.prototype.uniform2fv
}

/**
 * @param {WebGLRenderingContext} gl
 */
function createUniformSetter(gl, program) {
  /** @type {number} */
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  const uniformsMap = {}
  for (let i = 0; i < numUniforms; i++) {
    const uniformInfo = gl.getActiveUniform(program, i)
    const location = gl.getUniformLocation(program, uniformInfo.name)
    uniformsMap[uniformInfo.name] = Object.assign({ location }, uniformInfo)
  }
  return (key, data) => {
    if (key in uniformsMap) {
      const uniformInfo = uniformsMap[key]
      VALUE_TYPES_TO_UNIFORM_SETTERS[uniformInfo.type].call(gl, uniformInfo.location, data)
    }
  }
}

const BUFFER_TARGET_TYPES = {
  array: WebGLRenderingContext.ARRAY_BUFFER,
  element: WebGLRenderingContext.ELEMENT_ARRAY_BUFFER
}

const DRAW_TYPES = {
  static: WebGLRenderingContext.STATIC_DRAW,
  dynamic: WebGLRenderingContext.DYNAMIC_DRAW
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {keyof BUFFER_TARGET_TYPES} bindTarget
 * @param {Float32Array} arr
 * @param {keyof DRAW_TYPES} drawType
 * @param {object} extraInfo
 * @param {number} [extraInfo.num] 多少个数对应一个顶点信息
 * @param {number} [extraInfo.offset] 从数组的第几位开始扫描
 * @param {number} [extraInfo.stride] 扫描完一个顶点信息后需要移动多少位进行下一次扫描
 * @param {boolean} [extraInfo.normalized] 数据是否已经映射（规范化）到 0 - 1 或者 -1 - 1 的范围
 */
function createAttribBufferInfoFromArray(
  gl,
  bindTarget,
  arr,
  drawType,
  { normalized = false, offset = 0, stride = 0, num = 3 } = {}
) {
  const buffer = gl.createBuffer()
  const targetType = BUFFER_TARGET_TYPES[bindTarget]
  gl.bindBuffer(targetType, buffer)
  gl.bufferData(targetType, arr, DRAW_TYPES[drawType])
  return {
    buffer,
    type: gl.FLOAT,
    size: num,
    normalized,
    count: Math.floor((arr.length - offset + stride) / (num + stride)),
    offset,
    stride
  }
}

const GL_SHAPE_PRIMITIVES = {
  /** 三角形由n - 2，n - 1，n 三个顶点组成，顶点移动的步长为3 */
  triangle: WebGLRenderingContext.TRIANGLES,
  point: WebGLRenderingContext.POINTS,
  /** 线段由n - 1，n 两个个顶点组成，顶点移动的步长为2 */
  line: WebGLRenderingContext.LINES,
  /** 线段由n - 1，n 两个个顶点组成，顶点移动的步长为1 */
  lineStrip: WebGLRenderingContext.LINE_STRIP,
  /** 线段由n - 1，n 两个个顶点组成，顶点移动的步长为1，且最后起点与终点相连 */
  lineLoop: WebGLRenderingContext.LINE_STRIP,
  /** 三角形由0，n - 1， n 三个顶点组成，顶点移动的步长为1 */
  triFan: WebGLRenderingContext.TRIANGLE_FAN,
  /** 三角形由n - 2，n - 1，n 三个顶点组成，顶点移动的步长为1 */
  triStrip: WebGLRenderingContext.TRIANGLE_STRIP
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {keyof GL_SHAPE_PRIMITIVES} type
 * @param {number} offset 从第几个点开始
 * @param {number} count 要画多少个点
 */
function draw(gl, type, offset, count) {
  gl.drawArrays(GL_SHAPE_PRIMITIVES[type], offset, count)
}
