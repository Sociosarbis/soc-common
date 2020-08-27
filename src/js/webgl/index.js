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
