import { isUndef } from '../../../obj/is'
import { wrap } from '../../../string/common'

/**
 * @typedef {object} Condition
 * @property {any} Condition.left
 * @property {string} Condition.op
 * @property {any} Condition.right
 */

class Entity {
  /**
   *
   * @param {string|Entity} item
   */
  static serialize(item) {
    return item instanceof Entity ? item.toString() : Entity.escape(item)
  }
  static escape(str) {
    if (str === '*') return str
    if (typeof str === 'number') return str
    if (isUndef(str)) {
      str = 'NULL'
    } else {
      str = str.replace(/[\0\n\r\b\t\\'"\x1a]/g, (s) => {
        switch (s) {
          case '\0':
            return '\\0'
          case '\n':
            return '\\n'
          case '\r':
            return '\\r'
          case '\b':
            return '\\b'
          case '\t':
            return '\\t'
          case '\x1a':
            return '\\Z'
          default:
            return `\\${s}`
        }
      })
    }

    return wrap(str, "'")
  }
}

class Liter extends Entity {
  constructor(val) {
    super()
    this.value = val
  }

  toString() {
    return Entity.escape(this.value)
  }
}

class Ident extends Entity {
  /**
   * @param {string} name
   */
  constructor(name) {
    super()
    this.name = name
  }

  toString() {
    return wrap(this.name, '`')
  }
}

class Call extends Entity {
  /**
   * @param {string} name
   * @param {(string|Entity)[]} args
   */
  constructor(name, args) {
    super()
    this.name = name
    this.args = args
  }

  toString() {
    return `${this.name}(${this.args.map((item) => Entity.serialize(item)).join(', ')})`
  }
}

class Member extends Entity {
  /**
   * @param {string} obj
   * @param {string} prop
   */
  constructor(obj, prop) {
    super()
    this.obj = new Ident(obj)
    this.prop = new Ident(prop)
  }

  toString() {
    return `${this.obj}.${this.prop}`
  }
}

class Alias extends Entity {
  constructor(origin, alias, join = 'AS') {
    super()
    this.origin = ensureEntity(origin, Ident)
    this.alias = ensureEntity(alias, Ident)
    this.join = join
  }

  toString() {
    return `${this.origin} ${this.join} ${this.alias}`
  }
}

class Binary extends Entity {
  /**
   * @param {Condition} cond
   */
  constructor(cond) {
    super()
    this.left = ensureEntity(cond.left, Ident)
    this.op = cond.op
    this.right = Array.isArray(cond.right) ? cond.right.map((item) => ensureEntity(item)) : ensureEntity(cond.right)
  }

  toString() {
    return `${this.left} ${this.op} ${this.right}`
  }
}

class Decor extends Entity {
  /**
   * @param {string} decorator
   * @param {string|Entity} entity
   */
  constructor(decorator, entity) {
    super()
    this.decorator = decorator
    this.entity = ensureEntity(entity, Ident)
  }

  toString() {
    return `${this.decorator} ${this.entity}`
  }
}

/**
 * @param {*} obj
 * @param {T extends Entity ? T : never} defaultCtor
 * @template T
 * @return {Entity}
 */
// @ts-ignore
function ensureEntity(obj, defaultCtor = Liter) {
  if (obj instanceof Entity) return obj
  // @ts-ignore
  return new defaultCtor(obj)
}

export { Ident, Call, Member, Liter, ensureEntity, Entity, Alias, Binary, Decor }
