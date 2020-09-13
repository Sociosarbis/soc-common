/**
 * A的逆矩阵等于 A的伴随矩阵/A的行列式值
 * (-1)^(i + j) * det(M_ij^(n-1)) 伴随矩阵各元素值
 * 行列式展开：n阶行列式的值等于等于第一行元素m_1j * (-1)^(1 + j) * det(M_1j^(n-1))的值的和
 */
function inverse(m, dst) {
  const m11 = m[0]
  const m12 = m[1]
  const m13 = m[2]
  const m14 = m[3]
  const m21 = m[4]
  const m22 = m[5]
  const m23 = m[6]
  const m24 = m[7]
  const m31 = m[8]
  const m32 = m[9]
  const m33 = m[10]
  const m34 = m[11]
  const m41 = m[12]
  const m42 = m[13]
  const m43 = m[14]
  const m44 = m[15]

  const temp1 = m31 * m42 - m32 * m41
  const temp2 = m31 * m43 - m33 * m41
  const temp3 = m31 * m44 - m34 * m41
  const temp4 = m32 * m43 - m33 * m42
  const temp5 = m32 * m44 - m34 * m42
  const temp6 = m33 * m44 - m34 * m43
  const temp7 = m23 * m44 - m24 * m43
  const temp8 = m22 * m44 - m24 * m42
  const temp9 = m22 * m43 - m23 * m42
  const temp10 = m21 * m44 - m24 * m41
  const temp11 = m21 * m42 - m22 * m41
  const temp12 = m23 * m34 - m24 * m33
  const temp13 = m22 * m34 - m24 * m32
  const temp14 = m22 * m33 - m23 * m32
  const temp15 = m21 * m34 - m24 * m31
  const temp16 = m21 * m32 - m22 * m31
  const temp17 = m21 * m43 - m23 * m41
  const temp18 = m21 * m33 - m23 * m31

  const t1 = m22 * temp6 - m23 * temp5 + m24 * temp4
  const t2 = m21 * temp6 - m23 * temp3 + m24 * temp2
  const t3 = m21 * temp5 - m22 * temp3 + m24 * temp1
  const t4 = m21 * temp4 - m22 * temp2 + m23 * temp1
  const detInv = 1 / (m11 * t1 - m12 * t2 + m13 * t3 - m14 * t4)

  dst[0] = t1 * detInv
  dst[1] = -t2 * detInv
  dst[2] = t3 * detInv
  dst[3] = -t4 * detInv
  // m21
  dst[4] = (m12 * temp6 - m13 * temp5 + m14 * temp4) * detInv
  // m22
  dst[5] = (m11 * temp6 - m13 * temp3 + m14 * temp2) * detInv
  // m23
  dst[6] = (m11 * temp5 - m12 * temp3 + m14 * temp1) * detInv
  // m24
  dst[7] = (m11 * temp4 - m12 * temp2 + m13 * temp1) * detInv
  // m31
  dst[8] = (m12 * temp7 - m13 * temp8 + m14 * temp9) * detInv
  // m32
  dst[9] = (m11 * temp7 - m13 * temp10 + m14 * temp17) * detInv
  // m33
  dst[10] = (m11 * temp8 - m12 * temp10 + m14 * temp11) * detInv
  // m34
  dst[11] = (m11 * temp9 - m12 * temp17 + m13 * temp11) * detInv
  // m41
  dst[12] = (m11 * temp12 - m13 * temp13 + m14 * temp14) * detInv
  // m42
  dst[13] = (m11 * temp12 - m13 * temp15 + m14 * temp18) * detInv
  // m43
  dst[14] = (m11 * temp13 - m12 * temp15 + m14 * temp16) * detInv
  // m44
  dst[15] = (m11 * temp14 - m12 * temp18 + m13 * temp16) * detInv
  return dst
}
