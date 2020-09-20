import { isPlainObject, isUndef } from '../../../obj/is'
import * as obj from '../../../obj/obj'
import { isGroupOperator, OperatorMap } from './operators'

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

/**
 *
 * @param {string} expr
 */
function wrapParenthesis(expr) {
  return `(${expr})`
}

/**
 * @param {any[]} binds
 */
function bindParamCreator(binds) {
  return (value) => {
    binds.push(value)
    return `$${binds.length}`
  }
}

class SQLMethod {
  toSQLFrag() {
    return ''
  }
}
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
    return `${this.fn}(${this.args.join(', ')})`
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
  insertQuery(table, valueHash, options = { omitNull: false }) {
    const binds = []
    const fields = []
    const bindParam = bindParamCreator(binds)
    let values = obj.map(valueHash, (value, key) => [key, value])
    if (options.omitNull) {
      values = values.filter((pair) => !isUndef(pair[1]))
    }

    values = values.reduce((acc, pair) => {
      fields.push(quoteIdentifier(pair[0]))
      if (pair[1] instanceof SQLMethod) {
        acc.push(pair[1].toSQLFrag())
      } else {
        bindParam(pair[1])
      }
    }, [])

    return {
      query: `INSERT INTO ${quoteIdentifier(table)} (${fields.join(',')}) VALUES (${values.join(',')});`,
      binds
    }
  },
  /**
   * @param {string} table
   * @param {Record<string, number|string>} valueHash
   * @param {Record<string, any>} whereHash
   */
  updateQuery(table, valueHash, whereHash, options = {}) {
    const binds = []
    const bindParam = bindParamCreator(binds)
    const context = {
      bindParam,
      where: {
        upperOp: OperatorMap.and
      }
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
   * @param {(value: any) => string} context.bindParam
   */
  whereClause(whereHash, context) {
    return `WHERE ${this.whereClauseItems(whereHash, context)}`
  },
  whereClauseItems(whereHash, context) {
    const wheres = obj.map(whereHash, (value, key) => [key, value])
    return wheres.map((pair) => this.whereClauseItem(pair[0], pair[1], context)).join(' AND ')
  },
  /**
   * @param {string} key 运算符或者列名
   * @param {string | number | Record<string, string | number> } value
   */
  whereClauseItem(key, value, context) {
    if (isGroupOperator(key)) {
      return this.whereClauseGroup(key, value, context)
    }

    let op

    if (isPlainObject(value)) {
      const keys = Object.keys(value)
      if (keys.length > 1) {
        return `(${obj
          .map(value, (item, op) => {
            return this.whereClauseItem(key, { [op]: item }, context)
          })
          .join(` ${OperatorMap.and} `)})`
      } else {
        op = OperatorMap[keys[0]] || OperatorMap.eq
        value = value[keys[0]]
      }
    }

    if (value === null) {
      op = OperatorMap.is
      value = 'NULL'
    } else if (Array.isArray(value)) {
      value = `(${value.map((item) => escape(item)).join(', ')})`
    } else if (op === OperatorMap.notBetween || op === OperatorMap.between) {
      value = `${escape(context.bindParam(value[0]))} AND ${escape(context.bindParam(value[1]))}`
    } else if (op === OperatorMap.startsWith || op === OperatorMap.endsWith || OperatorMap.substring) {
      op = OperatorMap.like
      value = escape(OperatorMap.startsWith ? `${value}%` : OperatorMap.endsWith ? `%${value}` : `%${value}%`)
    } else if (op === OperatorMap.any || op === OperatorMap.all) {
      value = `${op} (${escape(value)})`
      op = OperatorMap.eq
    } else {
      value = context.bindParam(value)
    }
    return `${this.addPrefixPath(context.prefix, quoteIdentifier(key))} ${op} ${value}`
  },
  whereClauseGroup(key, value, context) {
    const connection = key === OperatorMap.not ? OperatorMap.and : key
    const outerOp = key === OperatorMap.not ? OperatorMap.not : ''
    if (Array.isArray(value)) {
      const newContext = Object.assign({}, context)
      newContext.where = Object.assign({}, newContext.where, { upperOp: connection })
      const expr = value
        .map((item) => {
          return this.whereClauseItems(item, context)
        })
        .join(connection)
      if (connection !== context.where.upperOp)
        return [outerOp, outerOp || connection !== context.where.upperOp ? wrapParenthesis(expr) : expr]
          .filter(Boolean)
          .join(' ')
    }
  },
  addPrefixPath(prefix, key) {
    if (prefix) return `${quoteIdentifier(prefix)}.${key}`
    return key
  }
}
