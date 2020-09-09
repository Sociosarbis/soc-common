/**
 *
 * scaleX = 2 / (right - left)
 * scaleY = 2 / (up - bottom)
 * scaleZ = 2 / (far - near)
 *
 * midX = (left + right) / 2
 * midY = (up + bottom) / 2
 * midZ = -(near + far) / 2  near 和 far 是左手系的Z坐标，这里转成右手系
 *
 * 由以下三个矩阵相乘而来
 * 由于NDC（标准设备坐标系）是左手系，所以这里要翻转Z轴
 * [1, 0, 0, 0,   [scaleX, 0, 0, 0,    [0, 0, 0, -midX,
 *  0, 1, 0, 0,     0, scaleY, 0, 0,    0, 0, 0, -midY,
 *  0, 0, -1, 0, *  0, 0, scaleZ, 0, *  0, 0, 0, -midZ,
 *  0, 0, 0, 1]     0, 0, 0, 1]         0, 0, 0, 1]
 * @param {number} left
 * @param {number} right
 * @param {number} up
 * @param {number} bottom
 * @param {number} near 沿着-Z轴到近平面的距离
 * @param {number} far 沿着-Z轴到远平面的距离
 */
function getOrthoProj(left, right, up, bottom, near, far) {
  const xRangeInv = 1 / (right - left)
  const yRangeInv = 1 / (up - bottom)
  const zRangeInv = 1 / (near - far)

  /* eslint-disable */
  return new Float32Array([
    2 * xRangeInv, 0, 0, -(left + right) * xRangeInv,
    0, 2 * yRangeInv, 0, -(up + bottom) * yRangeInv,
    0, 0, 2 * zRangeInv, (near + far) * zRangeInv,
    0, 0, 0, 1
  ])
  /* eslint-enable */
}

/**
 * 透视投影
 * 1. 先将平截头体的空间变换成以near处为底面的长方体
 * 有 x' = x * near / -z，y同理
 *
 * [near / -z, 0, 0, 0,
 *  0, near / -z, 0, 0,
 *  0, 0, 1, 0,
 *  0, 0, 0, 1]
 *
 * 2. x轴和y轴的值放缩到[-1, 1]
 * [2 / (right - left), 0, 0, 0,
 *  0, 2 / (up - bottom), 0, 0,
 *  0, 0, 1, 0,
 *  0, 0, 0, 1]
 *
 * 又因为 left = -right， bottom = -up
 * [1 / right, 0, 0, 0,
 *  0, 1 / up , 0, 0,
 *  0, 0, 1, 0,
 *  0, 0, 0, 1]
 *
 * 3. z轴的值映射到[-1, 1]，且使在较小的z值时获得更多的精度（变化更明显），
 * 所以使 s / -far + c = 1，s / -near + c = -1，解方程组得
 * s = 2 * far * near / (near - far)
 * c = (far + near) / (far - near)
 *
 * [1, 0, 0, 0,
 *  0, 1, 0, 0,
 *  0, 0, c / z, s / -z,
 *  0, 0, 0, 1]
 *
 * 三者相乘，可得
 * [(near / right) / -z, 0, 0, 0,
 *  0, (near / up) / -z, 0, 0,
 *  0, 0, c / z, s / -z,
 *  0, 0, 0, 1]
 *
 * 提取公共的除数-z作为w的值
 * [near / right, 0, 0, 0,
 *  0, near / up, 0, 0,
 *  0, 0, -c, s,
 *  0, 0, -1, 0]
 *
 * up = near * tan(fov / 2)
 * right = up * aspect
 * @param {number} fov 纵向视觉
 * @param {number} aspect 宽高比
 * @param {number} near 沿着-Z轴到近平面的距离
 * @param {number} far 沿着-Z轴到远平面的距离
 */
function getPerspectProj(fov, aspect, near, far) {
  /** 1 / tan(fov / 2) */
  const f = Math.tan(Math.PI * 0.5 - fov * 0.5)
  const rangeInv = 1 / (near - far)
  /* eslint-disable */
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * rangeInv, 2 * far * near * rangeInv,
    0, 0, -1, 0
  ])
  /* eslint-enable */
}

function crossProduct(v1, v2, dst) {
  dst[0] = v1[1] * v2[2] - v1[2] * v2[1]
  dst[1] = v1[0] * v2[2] - v1[2] * v2[0]
  dst[2] = v1[0] * v2[1] - v1[1] * v2[0]
  return dst
}

function normalize(v, dst) {
  const divisor = 1 / Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2) + Math.pow(v[2], 2))
  dst[0] *= divisor
  dst[1] *= divisor
  dst[2] *= divisor
  return dst
}

function lookAt(eye, target, up) {
  const zAxis = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]], [])
  const xAxis = normalize(crossProduct(up, zAxis, []), [])
  const yAxis = normalize(crossProduct(zAxis, xAxis, []), [])
  /* eslint-disable */
  return new Float32Array([
    xAxis[0], xAxis[1], xAxis[2], -eye[0] * xAxis[0] * xAxis[1] * xAxis[2],
    yAxis[0], yAxis[1], yAxis[2], -eye[1] * yAxis[0] * yAxis[1] * yAxis[2],
    zAxis[0], zAxis[1], zAxis[2], -eye[2] * zAxis[0] * zAxis[1] * zAxis[2],
    0, 0, 0, 1
  ])
  /* eslint-enable */
}
