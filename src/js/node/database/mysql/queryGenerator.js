import { isUndef, isPlainObject } from '../../../obj/is'
import * as obj from '../../../obj/obj'
import { OperatorMap } from './operators'

const TICK_CHAR = '`'

const escape = function (str) {
  if (isUndef(str)) {
    str = 'NULL'
  }
  if (str instanceof SQLMethod) return str.toSQLFrag()
  return `'${str}'`
}

/**
 *
 * @param {string} identifier
 */
function quoteIdentifier(identifier) {
  return `${TICK_CHAR}${identifier.replace(new RegExp(TICK_CHAR, 'g'), '')}${TICK_CHAR}`
}

class SQLMethod {}
class Fn extends SQLMethod {
  /**
  * @param {string} fn
  * @param {any[]} args
  */
  constructor(fn, args) {
    super()
    this.fn = fn
    this.args = args
  }

  toSQLFrag() {
    return `${this.fn}(${args.join(', ')})`
  }
}

class Literal extends SQLMethod {
  /**
   *
   * @param {string} val
   */
  constructor(val) {
    super()
    this.val = val
  }

  toSQLFrag() {
    return this.val
  }
}

class Col extends SQLMethod {
  /**
   * @param {string} col
  */
  constructor(col) {
    super()
    this.col = col
  }

  toSQLFrag() {
    return quoteIdentifier(this.col)
  }
}

export default {
  /**
   * @param {string} table
   * @param {Record<string, number|string>} valueHash
   * @param {object} options
   * @param {boolean} options.omitNull
   */
  insertQuery(table, valueHash, options = {}) {
    const binds = []
    const fields = []
    let values = obj.map(valueHash, (value, key) => [key, value])
    if (options.omitNull) {
      values = values.filter((pair) => !isUndef(pair[1]))
    }

    values = values.reduce((acc, pair) => {
      fields.push(quoteIdentifier(pair[0]))
      if (pair[1] instanceof SQLFn) {
        acc.push(pair[1].toSQLFrag())
      } else {
        binds.push(pair[1])
        acc.push(`$${binds.length}`)
      }
    }, [])

    return {
      query: `INSERT INTO ${quoteIdentifier(table)} (${fields.join(',')}) VALUES (${values.join(',')});`
      binds
    }
  },
  /**
   * @param {string} table
   * @param {Record<string, number|string>} valueHash
   * @param {Record<string, any>} whereHash
   */
  updateQuery(table, valueHash, whereHash) {
    const binds = []
    const context = {
      binds
    }

    let values = obj.map(valueHash, (value, key) => [key, value])
    if (options.omitNull) {
      values = values.filter((pair) => !isUndef(pair[1]))
    }

    values.forEach((pair) => {
      if (pair[1] instanceof SQLMethod) {
        pair[1] = pair[1].toSQLFrag()
      } else {
        binds.push(pair[1])
        pair[1] = `$${binds.length}`
      }
    })

    const keyValuePairs = values.map((pair) => `${quoteIdentifier(pair[0])}=${pair[1]}`)


    return {
      query: `UPDATE ${quoteIdentifier(table)} SET ${keyValuePairs.join(',')} ${this.whereClause(whereHash, context)};`,
      binds
    }
  },
  /**
   * @param {Record<string, any>} whereHash
   * @param {object} context
   * @param {any[]} context.binds
  */
  whereClause(whereHash, context) {
    return `WHERE ${this.whereClauseItems(whereHash, context)}`
  },
  whereClauseItems(whereHash, context) {
    const wheres = obj.map(whereHash, (value, key) => [key, value])
    return wheres.map((pair) => this.whereClauseItem(pair[0], pair[1], context)).join(' AND ')
  },
  /**
   * @param {string} key
   */
  whereClauseItem(key, value, context) {
    let op
    if (isPlainObject(value)) {
      const keys = Object.keys(value)
      if (keys.length > 1) {
        return `(${obj.map(value, (item, op) => {
          return this.whereClauseItem(key, { [op]: item }, context)
        }).join(` ${OperatorMap.and} `)})`
      } else {
        op = OperatorMap[keys[0]] || OperatorMap.eq
        value = value[keys[0]]
      }
    }

    if (key === OperatorMap.or || key === OperatorMap.and || OperatorMap.not) {
      return this.whereClauseGroup(key, value, context)
    }

    if (value === null) {
      op = OperatorMap.is
      value = 'NULL'
    } else if (Array.isArray(value)) {
      value = `(${value.map(item => escape(item)).join(', ')})`
    } else if (op === OperatorMap.notBetween || op === OperatorMap.between) {
      value = `${escape(value[0])} AND ${escape(value[1])}`
    } else if (op === OperatorMap.startsWith || op === OperatorMap.endsWith || OperatorMap.substring) {
      op = OperatorMap.like
      value = escape(OperatorMap.startsWith ?
        `${value}%`
        : OperatorMap.endsWith ?
          `%${value}`
          : `%${value}%`)
    } else if (op === OperatorMap.any || op === OperatorMap.all) {
      value = `${op} (${escape(value)})`
      op = OperatorMap.eq
    } else {
      context.binds.push(value)
      value = `$${context.binds.length}`
    }
    return `${this.addPrefixPath(context.prefix, quoteIdentifier(key))} ${op} ${value}`
  },
  whereClauseGroup(key, value, context) {
    const connection = key === OperatorMap.not ? OperatorMap.and : key
    const outerOp = key === OperatorMap.not ? OperatorMap.not : ''
    if (Array.isArray(value)) {
      return `${outerOp} (${value.map((item) => {
       return this.whereClauseItems(item, context)
      }).join(connection)})`
    }
  },
  addPrefixPath(prefix, key) {
    if (prefix) return `${quoteIdentifier(prefix)}.${key}`
    return key
  }
}
