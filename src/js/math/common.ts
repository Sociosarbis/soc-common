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

class Vec3 {
  x: number
  y: number
  z: number
  constructor(x: number, y: number, z: number) {
    this.x = x
    this.y = y
    this.z = z
  }

  len2() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  len() {
    return Math.sqrt(this.len2())
  }

  normalized() {
    const len = this.len()
    return len ? new Vec3(this.x / len, this.y / len, this.z / len) : new Vec3(0, 0, 0)
  }
}

export { Vec2, Vec3 }
