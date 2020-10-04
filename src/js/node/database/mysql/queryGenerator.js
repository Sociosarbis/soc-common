import { joinWithTruthy } from '../../../obj/array'
import { wrap } from '../../../string/common'
import { Alias, Binary, Call, Condition, ensureEntity, Entity, Ident, Liter } from './entity'
import { OperatorMap } from './operators'

class Select extends Entity {
  constructor(struct) {
    super()
    this.attrs = (struct.attrs || [new Liter('*')]).map((item) =>
      Array.isArray(item) ? new Alias(...item) : ensureEntity(item, Ident)
    )
    this.tables = (struct.tables || []).map((table) =>
      Array.isArray(table) ? new Alias(...table, ' ') : ensureEntity(table, Ident)
    )
    this.where = struct.where && new Where(struct.where)
    this.orderBy = struct.orderBy && new OrderBy(struct.orderBy)
    this.groupBy = struct.groupBy && new GroupBy(struct.groupBy)
    this.having = struct.having && new Having(struct.having)
    this.as = struct.as && ensureEntity(struct.as, Ident)
  }

  toString() {
    const inner = joinWithTruthy(
      [
        `SELECT ${this.attrs.join(', ')} FROM ${this.tables
          .map((table) => (table instanceof Select && !table.as ? `(${table})` : table))
          .join(', ')}`,
        this.where,
        this.orderBy,
        this.groupBy,
        this.having
      ],
      ' '
    )
    if (this.as) {
      return `(${inner}) AS ${this.as}`
    }
  }
}

class Join extends Entity {
  /**
   * @param {object} options
   * @param {'left'|'right'|'inner'|'cross'} options.type
   * @param {Condition} options.cond
   */
  constructor(table1, table2, options) {
    super()
    this.table1 = Array.isArray(table1) ? new Alias(...table1, ' ') : ensureEntity(table1, Ident)
    this.table2 = Array.isArray(table2) ? new Alias(...table2, ' ') : ensureEntity(table2, Ident)
    this.cond = new WhereItem(options.cond)
    this.type = (options.type && options.type.toUpperCase()) || 'LEFT'
  }

  toString() {
    return joinWithTruthy([`${this.table1} ${this.type} JOIN ${this.table2}`, this.cond], ' ON ')
  }
}

class Where extends Entity {
  constructor(groups) {
    super()
    this.groups = groups
  }

  toString() {
    return `WHERE ${this.groups
      .map((item) => {
        if (item instanceof WhereGroup) {
          if (item.join !== 'AND' && !item.not) return `(${item})`
        }
        return item.toString()
      })
      .join(' AND ')}`
  }
}

class OrderBy extends Entity {
  constructor(bys) {
    super()
    this.bys = bys.map((item) => (Array.isArray(item) ? new OrderByItem(...item) : new OrderByItem(item)))
  }

  toString() {
    return `ORDER BY ${this.bys.map((item) => item.toString()).join(', ')}`
  }
}

class OrderByItem extends Entity {
  constructor(prop, order) {
    super()
    this.prop = ensureEntity(prop, Ident)
    this.order = order && order.toUpperCase()
  }

  toString() {
    return joinWithTruthy([this.prop, this.order], ' ')
  }
}

class GroupBy extends Entity {
  constructor(bys) {
    super()
    this.bys = bys.map((item) => new GroupByItem(item))
  }

  toString() {
    return `GROUP BY ${this.bys.map((item) => item.toString()).join(', ')}`
  }
}

class GroupByItem extends Entity {
  constructor(prop) {
    super()
    this.prop = ensureEntity(prop, Ident)
  }

  toString() {
    return this.prop.toString()
  }
}

class WhereGroup extends Entity {
  /**
   * @param {object} group
   * @param {boolean?} group.not
   * @param {('AND' | 'OR')?} group.join
   * @param {(WhereGroup|WhereItem)[]} group.items
   */
  constructor(group) {
    super()
    this.not = Boolean(group.not)
    this.join = group.join || 'AND'
    this.items = group.items
  }

  toString() {
    const inner = this.items
      .map((item) => {
        if (item instanceof WhereGroup) {
          if (item.join !== this.join && !item.not) return `(${item})`
        }
        return item.toString()
      })
      .join(wrap(this.join, ' '))
    return this.not ? `NOT (${inner})` : inner
  }
}

class WhereItem extends Binary {
  toString() {
    let right
    let op
    switch (this.op) {
      case OperatorMap.between:
      case OperatorMap.notBetween:
        // @ts-ignore
        right = this.right.map((item) => item.toString()).join(' AND ')
        break
      case OperatorMap.startsWith:
      case OperatorMap.endsWith:
      case OperatorMap.substring:
        switch (this.op) {
          case OperatorMap.startsWith:
            // @ts-ignore
            right = `${this.right.value}%`
            break
          case OperatorMap.endsWith:
            // @ts-ignore
            right = `%${this.right.value}`
            break
          default:
            // @ts-ignore
            right = `%${this.right.value}%`
        }
        op = OperatorMap.like
        break
      case OperatorMap.any:
      case OperatorMap.all:
        // @ts-ignore
        right = this.right.map((item) => item.toString()).join(', ')
        break
      default:
        right = this.right.toString()
    }
    return `${this.left} ${op} ${right}`
  }
}

class Having extends Where {
  toString() {
    return `Having ${this.groups
      .map((item) => {
        if (item instanceof WhereGroup) {
          if (item.join !== 'AND' && !item.not) return `(${item})`
        }
        return item.toString()
      })
      .join(' AND ')}`
  }
}
