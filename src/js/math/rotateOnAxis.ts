import { Vec3, Vec2 } from './common'

export default function rotateOnAxis(origin: Vec3, axis: Vec3, point: Vec3, angle: number) {
  // 使旋转轴经过远点
  const point1 = new Vec3(point.x - origin.x, point.y - origin.y, point.z - origin.z)
  const point2 = new Vec3(0, 0, 0)

  const unitAxis = axis.normalized()

  const yzLen = new Vec2(unitAxis.y, unitAxis.z).len()

  // 旋转轴旋转至XZ平面，Y是sin，Z是cos，因为是角度减小，所以是sin(a - b)，cos(a - b)
  if (yzLen) {
    point2.x = point1.x
    point2.y = (point1.y * unitAxis.z) / yzLen - (point1.z * unitAxis.y) / yzLen
    point2.z = (point1.z * unitAxis.z) / yzLen + (point1.y * unitAxis.y) / yzLen
  } else {
    point2.x = point1.x
    point2.y = point1.y
    point2.z = point1.z
  }

  // 将旋转轴旋转至Z轴，X是sin，Z是cos
  point1.x = point2.x * yzLen - point2.z * unitAxis.x
  point1.y = point2.y
  point1.z = point2.z * yzLen + point2.x * unitAxis.x

  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  point2.x = point1.x * cos - point1.y * sin
  point2.y = point1.y * cos + point1.x * cos
  point2.z = point2.z

  point1.x = point2.x * yzLen + point2.z * unitAxis.x
  point1.y = point2.y
  point1.z = point2.z * yzLen - point2.x * unitAxis.x

  if (yzLen) {
    point2.x = point1.x
    point2.y = (point1.y * unitAxis.z) / yzLen + (point1.z * unitAxis.y) / yzLen
    point2.z = (point1.z * unitAxis.z) / yzLen - (point1.y * unitAxis.y) / yzLen
  } else {
    point2.x = point1.x
    point2.y = point1.y
    point2.z = point1.z
  }

  point1.x += origin.x
  point1.y += origin.y
  point1.z += origin.z
  return point1
}
