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
  POINTS,
} = WebGLRenderingContext;

type TypedArray = Uint8Array | Float32Array;

function getGLTypeFromTypedArray(arr: any[]) {
  const _class = arr.constructor;
  switch (_class) {
    case Float32Array:
      return FLOAT;
    case Uint16Array:
      return UNSIGNED_SHORT;
    case Uint8Array:
      return UNSIGNED_BYTE;
    default:
      return FLOAT;
  }
}

function isSampler(type: number) {
  return [SAMPLER_2D].indexOf(type) !== -1;
}


interface Uniform {
  set(
    location: WebGLUniformLocation,
    transpose: boolean,
    data: TypedArray | number[]
  ):any
  set(location: WebGLUniformLocation, data: TypedArray | number[]): any
  set(location: WebGLUniformLocation, data: number):any
  set(location: WebGLUniformLocation, data: WebGLTexture): any
}

const SAMPLER_TYPES_TO_BINDPOINTS = {
  [SAMPLER_2D]: TEXTURE_2D,
};

export function createGLHelpers(
  gl: WebGL2RenderingContext & WebGLRenderingContext
) {
  const extensions = {
    colorBufferFloat: false,
    textureFloatLinear: false,
    colorBufferHalfFloat: false,
    textureHalfFloatLinear: false,
  };

  const VALUE_TYPES_TO_UNIFORM_SETTERS = {
    [INT]: gl.uniform1i.bind(gl),
    [FLOAT]: gl.uniform1f.bind(gl),
    [FLOAT_VEC2]: gl.uniform2fv.bind(gl),
    [FLOAT_VEC3]: gl.uniform3fv.bind(gl),
    [FLOAT_VEC4]: gl.uniform4fv.bind(gl),
    [FLOAT_MAT4]: gl.uniformMatrix4fv.bind(gl),
  } as Record<number, Uniform['set']>;

  function checkExtensions() {
    extensions.colorBufferFloat = Boolean(
      gl.getExtension("EXT_color_buffer_float")
    );
    extensions.textureFloatLinear = Boolean(
      gl.getExtension("OES_texture_float_linear")
    );
    extensions.colorBufferHalfFloat = Boolean(
      gl.getExtension("EXT_color_buffer_half_float")
    );
    extensions.textureHalfFloatLinear = Boolean(
      gl.getExtension("OES_texture_half_float_linear")
    );
  }

  function createShader(source: string, type: number) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader!, source);
    // 将着色器编译成二进制数据
    gl.compileShader(shader!);
    const isSuccess = gl.getShaderParameter(shader!, gl.COMPILE_STATUS);
    if (!isSuccess) {
      console.error(`Compiled error: ${gl.getShaderInfoLog(shader!)}`);
      gl.deleteShader(shader);
      shader = null;
    }
    return shader;
  }

  function createProgram(
    vertexShaderSource: string,
    fragmentShaderSource: string
  ) {
    let program = gl.createProgram();
    const vertexShader = createShader(vertexShaderSource, VERTEX_SHADER);
    const fragmentShader = createShader(fragmentShaderSource, FRAGMENT_SHADER);
    if (vertexShader && fragmentShader) {
      // 往WebGL程序添加顶点着色器和片元着色器
      gl.attachShader(program!, vertexShader);
      gl.attachShader(program!, fragmentShader);
    }
    // 链接两个着色器成一个WebGL程序
    gl.linkProgram(program!);
    const isSuccess = gl.getProgramParameter(program!, gl.LINK_STATUS);
    if (!isSuccess) {
      console.error(`Linked error: ${gl.getProgramInfoLog(program!)}`);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      program = null;
    }
    return program;
  }

  type TextureParams = {
    pixels: TypedArray | null;
    target: number;
    internalFormat: number;
    type: number;
    /** mipmap的等级，width和height皆为2的n次幂时可用，各级大小为原图的1 / 2 ^ n */
    level: number;
    /** 纹理宽 */
    width: number;
    /** 纹理高 */
    height: number;
    /** 当渲染的像素小于纹理时应用 */
    minFilter: number;
    /** 当渲染的像素大于纹理时应用 */
    magFilter: number;
    /** X轴方向铺排方式  */
    wrapS: number;
    /** Y轴方向铺排方式 */
    wrapT: number;
  };

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
      wrapT = CLAMP_TO_EDGE,
    } = {} as Partial<TextureParams>
  ) {
    if (internalFormat === gl.RGBA32F) {
      if (extensions.textureFloatLinear) {
        type = gl.FLOAT;
      } else {
        internalFormat = gl.RGBA16F;
      }
    }

    if (internalFormat === gl.RGBA16F) {
      if (extensions.textureHalfFloatLinear) {
        type = gl.HALF_FLOAT;
      } else {
        internalFormat = gl.RGBA;
        type = gl.UNSIGNED_BYTE;
      }
    }

    const texture = gl.createTexture()!;
    gl.bindTexture(target, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      target,
      level,
      internalFormat,
      width,
      height,
      0,
      gl.RGBA,
      type,
      pixels!
    );
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
    return texture;
  }

  type VertexAttribParams = {
    target: number;
    type: number;
    data: TypedArray;
    usage: number;
    /** 是否已经映射（规范化）到 0 - 1 或者 -1 - 1 的空间 */
    normalized: boolean;
    /** 第一次读取偏移多少位  */
    offset: number;
    /** 进行下次读取的位置需移动多少位 */
    stride: number;
    /** 一次读取多少位  */
    size: number;
  };

  type VertexAttrib = ReturnType<typeof createVertexAttrib>;

  function createVertexAttrib(
    {
      target = ARRAY_BUFFER,
      type = gl.FLOAT,
      data,
      usage = STATIC_DRAW,
      normalized = false,
      offset = 0,
      stride = 0,
      size,
    } = {} as Partial<VertexAttribParams>
  ) {
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data!, usage);
    return {
      buffer,
      bytesPerElement: data!.BYTES_PER_ELEMENT,
      normalized,
      offset,
      type,
      stride,
      size: size!,
    };
  }

  /**
   * @param bindPoint
   * @example TEXTURE_2D TEXTURE_CUBE_MAP
   * @param unit sampler index
   */
  function createSamplerSetter(bindPoint: number, unit: number) {
    return function(location: WebGLUniformLocation, texture: WebGLTexture) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.uniform1i(location, unit);
      gl.bindTexture(bindPoint, texture);
    };
  }

  type UniformsMap = Record<
    string,
    {
      name: string;
      location: WebGLUniformLocation;
      size: number;
      type: number;
      setter?: Uniform['set'];
    }
  >;

  function createUniformSetter(program: WebGLProgram) {
    const numUniforms = gl.getProgramParameter(program, ACTIVE_UNIFORMS);
    const uniformsMap: UniformsMap = {};
    let samplerCount = 0;
    for (let i = 0; i < numUniforms; i++) {
      const uniformInfo = gl.getActiveUniform(program, i)!;
      const location = gl.getUniformLocation(program, uniformInfo.name)!;
      uniformsMap[uniformInfo.name] = {
        location,
        size: uniformInfo.size,
        name: uniformInfo.name,
        type: uniformInfo.type,
      };
      if (isSampler(uniformInfo.type)) {
        uniformsMap[uniformInfo.name].setter = createSamplerSetter(
          SAMPLER_TYPES_TO_BINDPOINTS[uniformInfo.type],
          samplerCount++
        );
      } else {
        uniformsMap[uniformInfo.name].setter =
          VALUE_TYPES_TO_UNIFORM_SETTERS[uniformInfo.type];
      }
    }

    function setter(
      key: string,
      data: TypedArray | number | WebGLTexture,
      transpose?: boolean
    ) {
      if (key in uniformsMap) {
        const uniformInfo = uniformsMap[key];
        if (typeof transpose !== "undefined") {
          uniformsMap[key].setter!(
            uniformInfo.location,
            transpose,
            data as TypedArray
          );
        } else uniformsMap[key].setter!(uniformInfo.location, data);
      }
    }
    return setter;
  }

  type AttribsMap = Record<
    string,
    {
      name: string;
      location: number;
      size: number;
      type: number;
    }
  >;

  function createAttribSetter(program: WebGLProgram) {
    const numAttribs = gl.getProgramParameter(program, ACTIVE_ATTRIBUTES);
    const attribsMap: AttribsMap = {};
    for (let i = 0; i < numAttribs; i++) {
      const attribInfo = gl.getActiveAttrib(program, i)!;
      const location = gl.getAttribLocation(program, attribInfo.name);
      attribsMap[attribInfo.name] = {
        name: attribInfo.name,
        location,
        size: attribInfo.size,
        type: attribInfo.type,
      };
    }

    function setter(key: string, data: VertexAttrib) {
      if (key in attribsMap) {
        const attribInfo = attribsMap[key];
        gl.bindBuffer(gl.ARRAY_BUFFER, data.buffer);
        gl.enableVertexAttribArray(attribInfo.location);
        gl.vertexAttribPointer(
          attribInfo.location,
          data.size,
          data.type,
          data.normalized,
          data.stride * data.bytesPerElement,
          data.offset * data.bytesPerElement
        );
      }
    }

    setter.getLoc = function getLoc(key: string) {
      if (key in attribsMap) {
        return attribsMap[key];
      }
    };
    return setter;
  }

  checkExtensions();

  return {
    createTexture,
    createVertexAttrib,
    createUniformSetter,
    createAttribSetter,
    createProgram,
    createShader,
  };
}

type UniformSetter = ReturnType<ReturnType<typeof createGLHelpers>['createUniformSetter']>
type AttribSetter = ReturnType<ReturnType<typeof createGLHelpers>['createAttribSetter']>


export class GLHelpers {
  gl: WebGL2RenderingContext & WebGLRenderingContext
  program: WebGLProgram
  utils: ReturnType<typeof createGLHelpers>
  private _uniformSetter: UniformSetter
  private _attribSetter: AttribSetter
  constructor(gl: WebGL2RenderingContext & WebGLRenderingContext, vertShader: string, fragShader: string) {
    this.gl = gl
    this.utils = createGLHelpers(gl)
    this.program = this.utils.createProgram(vertShader, fragShader)!
    this._uniformSetter = this.utils.createUniformSetter(this.program)
    this._attribSetter = this.utils.createAttribSetter(this.program)
  }

  setAttrib(...args: Parameters<AttribSetter>) {
    this._attribSetter(...args)
  }

  getAttribLoc(name: string) {
    return this._attribSetter.getLoc(name)!.location
  }

  setUniform(...args: Parameters<UniformSetter>) {
    this._uniformSetter(...args)
  }

  resetAttribSetter() {
    this._attribSetter = this.utils.createAttribSetter(this.program)
  }

  use(program?: WebGLProgram | null) {
    this.gl.useProgram(program === null ? null : this.program)
  }
}
