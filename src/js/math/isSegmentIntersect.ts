class Vec2 {
  x: number
  y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  dot(other: Vec2) {
    return this.x * other.x + this.y * other.y
  }

  len() {
    return Math.sqrt(this.len2())
  }

  len2() {
    return this.x * this.x + this.y * this.y
  }
}

export default function isIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2) {
  const v1 = new Vec2(p2.x - p1.x, p2.y - p1.y)
  const v2 = new Vec2(p4.x - p3.x, p4.y - p3.y)
  const l1 = v1.len()
  const l2 = v2.len()
  if (l1 !== 0) {
    v1.x /= l1
    v1.y /= l1
  }

  if (l2 != 0) {
    v2.x /= l2
    v2.y /= l2
  }

  const v3 = new Vec2(p3.x - p1.x, p3.y - p1.y)

  if (l1 === 0) {
    if (l2 === 0) {
      return p1.x === p3.x && p1.y === p3.y
    } else {
      const l3 = v3.len()
      if (l3 === 0 && p1.x === p3.x) return true
      // 如果点在线段上
      return l3 <= l2 && new Vec2(-v3.x, -v3.y).dot(v2) === l3
    }
  } else if (l2 === 0) {
    const l3 = v3.len()
    if (l3 === 0 && p1.x === p3.x) return true
    return l3 <= l1 && v3.dot(v1) === l3
  }
  // 解方程
  // o1.x + f1 * v1.x = o2.x + f2 * v2.x
  // o1.y + f1 * v1.y = o2.y + f2 * v2.y
  // 利用矩阵的逆求解
  const det = v1.y * v2.x - v1.x * v2.y
  const f1 = new Vec2(-v2.y, v2.x).dot(v3) / det
  const f2 = new Vec2(-v1.y, v1.x).dot(v3) / det
  return f1 >= 0 && f1 <= l1 && f2 >= 0 && f2 <= l2
}
