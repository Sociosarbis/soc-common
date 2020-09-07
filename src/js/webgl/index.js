/** @typedef {Int8Array|Uint8Array|Uint8ClampedArray|Uint16Array|Int16Array|Int32Array|Uint32Array|Float32Array|Float64Array} TypedArray */

const {
  VERTEX_SHADER,
  FRAGMENT_SHADER,

  ARRAY_BUFFER,
  TEXTURE_2D,

  STATIC_DRAW,
  RGBA,
  CLAMP_TO_EDGE,
  LINEAR,
  NEAREST,

  UNSIGNED_BYTE,
  UNSIGNED_SHORT,
  FLOAT,

  INT,
  FLOAT_VEC2,
  FLOAT_VEC3,
  FLOAT_VEC4,
  FLOAT_MAT4,

  SAMPLER_2D,

  ACTIVE_UNIFORMS,
  ACTIVE_ATTRIBUTES,

  /** 绘制的原始图形 */
  TRIANGLES /** 由n - 2，n - 1，n 三个顶点组成，顶点移动的步长为3 */,
  TRIANGLE_FAN /** 由0，n - 1， n 三个顶点组成，顶点移动的步长为1 */,
  TRIANGLE_STRIP /** 由n - 2，n - 1，n 三个顶点组成，顶点移动的步长为1 */,
  LINES /** 由n - 1，n 两个个顶点组成，顶点移动的步长为2 */,
  LINE_STRIP /** 由n - 1，n 两个个顶点组成，顶点移动的步长为1 */,
  LINE_LOOP /** 由n - 1，n 两个个顶点组成，顶点移动的步长为1，且最后起点与终点相连 */,
  POINTS
} = WebGLRenderingContext

function getGLTypeFromTypedArray(arr) {
  const _class = arr.constructor
  switch (_class) {
    case Float32Array:
      return FLOAT
    case Uint16Array:
      return UNSIGNED_SHORT
    case Uint8Array:
      return UNSIGNED_BYTE
    default:
      return FLOAT
  }
}

function isSampler(type) {
  return [SAMPLER_2D].indexOf(type) !== -1
}

const VALUE_TYPES_TO_UNIFORM_SETTERS = {
  [INT]: WebGLRenderingContext.prototype.uniform1i,
  [FLOAT]: WebGLRenderingContext.prototype.uniform1f,
  [FLOAT_VEC2]: WebGLRenderingContext.prototype.uniform2fv,
  [FLOAT_VEC3]: WebGLRenderingContext.prototype.uniform3fv,
  [FLOAT_VEC4]: WebGLRenderingContext.prototype.uniform4fv,
  [FLOAT_MAT4]: WebGLRenderingContext.prototype.uniformMatrix4fv
}

const SAMPLER_TYPES_TO_BINDPOINTS = {
  [SAMPLER_2D]: TEXTURE_2D
}

/**
 *
 * @param {WebGLRenderingContext} gl
 */
function createGLHelpers(gl) {
  function createShader(source, type) {
    let shader = gl.createShader(type)
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

  function createProgram(vertexShaderSource, fragmentShaderSource) {
    let program = gl.createProgram()
    const vertexShader = createShader(vertexShaderSource, VERTEX_SHADER)
    const fragmentShader = createShader(fragmentShaderSource, FRAGMENT_SHADER)
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
   *
   * @param {object} params
   * @param {TypedArray=} params.pixels
   * @param {number} params.target
   * @param {number} params.internalFormat
   * @param {number} params.type
   * @param {number} params.level mipmap的等级，width和height皆为2的n次幂时可用，各级大小为原图的1 / 2 ^ n
   * @param {number} params.width 纹理宽
   * @param {number} params.height 纹理高
   * @param {number} params.minFilter 当渲染的像素小于纹理时应用
   * @param {number} params.magFilter 当渲染的像素大于纹理时应用
   * @param {number} params.wrapS X轴方向铺排方式
   * @param {number} params.wrapT Y轴方向铺排方式
   */
  function createTexture(
    {
      pixels,
      target = TEXTURE_2D,
      internalFormat = RGBA,
      type = UNSIGNED_BYTE,
      level = 0,
      width = 1,
      height = 1,
      minFilter = LINEAR,
      magFilter = LINEAR,
      wrapS = CLAMP_TO_EDGE,
      wrapT = CLAMP_TO_EDGE
    } = {
      target: TEXTURE_2D,
      internalFormat: RGBA,
      type: UNSIGNED_BYTE,
      level: 0,
      width: 1,
      height: 1,
      minFilter: LINEAR,
      magFilter: LINEAR,
      wrapS: CLAMP_TO_EDGE,
      wrapT: CLAMP_TO_EDGE
    }
  ) {
    const texture = gl.createTexture()
    gl.bindTexture(target, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(target, level, internalFormat, width, height, 0, internalFormat, type, pixels)
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter)
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter)
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS)
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT)
    return texture
  }

  /**
   * @param {object} params
   * @param {number} params.target
   * @param {TypedArray=} params.data
   * @param {number} params.usage
   * @param {boolean} params.normalized 是否已经映射（规范化）到 0 - 1 或者 -1 - 1 的空间
   * @param {number} params.offset 第一次读取偏移多少位
   * @param {number} params.stride 进行下次读取的位置需移动多少位
   * @param {number=} params.size 一次读取多少位
   */
  function createVertexAttrib(
    { target = ARRAY_BUFFER, data, usage = STATIC_DRAW, normalized = false, offset = 0, stride = 0, size } = {
      target: ARRAY_BUFFER,
      usage: STATIC_DRAW,
      normalized: false,
      offset: 0,
      stride: 0
    }
  ) {
    const buffer = gl.createBuffer()
    gl.bindBuffer(target, buffer)
    gl.bufferData(target, data, usage)
    return {
      buffer,
      bytesPerElement: data.BYTES_PER_ELEMENT,
      normalized,
      offset,
      stride: stride === 0 ? size : stride,
      size
    }
  }

  function createSamplerSetter(bindPoint, unit) {
    return function (location, texture) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.uniform1i(location, unit)
      gl.bindTexture(bindPoint, texture)
    }
  }

  function createUniformSetter(program) {
    const numUniforms = gl.getProgramParameter(program, ACTIVE_UNIFORMS)
    const uniformsMap = {}
    let samplerCount = 0
    for (let i = 0; i < numUniforms; i++) {
      const uniformInfo = gl.getActiveUniform(program, i)
      const location = gl.getUniformLocation(program, uniformInfo.name)
      uniformsMap[uniformInfo.name] = {
        location,
        size: uniformInfo.size,
        name: uniformInfo.name,
        type: uniformInfo.type
      }
      if (isSampler(uniformInfo.type)) {
        uniformInfo[uniformInfo.name].setter = createSamplerSetter(
          SAMPLER_TYPES_TO_BINDPOINTS[uniformInfo.type],
          samplerCount++
        )
      } else {
        uniformsMap[uniformInfo.name].setter = VALUE_TYPES_TO_UNIFORM_SETTERS[uniformInfo.type]
      }
    }
    return (key, data) => {
      if (key in uniformsMap) {
        const uniformInfo = uniformsMap[key]
        uniformsMap[key].setter(gl, uniformInfo.location, data)
      }
    }
  }

  function createAttribSetter(program) {
    const numAttribs = gl.getProgramParameter(program, ACTIVE_ATTRIBUTES)
    const attribsMap = {}
    for (let i = 0; i < numAttribs; i++) {
      const attribInfo = gl.getActiveAttrib(program, i)
      const location = gl.getAttribLocation(program, attribInfo.name)
      attribsMap[attribInfo.name] = {
        name: attribInfo.name,
        location,
        size: attribInfo.size,
        type: attribInfo.type
      }
    }
    return (key, data) => {
      if (key in attribsMap) {
        const attribInfo = attribsMap[key]
        gl.bindBuffer(gl.ARRAY_BUFFER, data.buffer)
        gl.enableVertexAttribArray(attribInfo.location)
        gl.vertexAttribPointer(
          attribInfo.location,
          data.size,
          data.type,
          data.normalized,
          data.stride * data.bytesPerElement,
          data.offset * data.bytesPerElement
        )
      }
    }
  }

  return {
    createTexture,
    createVertexAttrib,
    createUniformSetter,
    createAttribSetter,
    createProgram,
    createShader
  }
}
