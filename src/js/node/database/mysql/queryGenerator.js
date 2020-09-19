import { isUndef } from '../../../obj/is'
import * as obj from '../../../obj/obj'

const TICK_CHAR = '`'

export default {
  /**
   *
   * @param {string} identifier
   */
  quoteIdentifier(identifier) {
    return `${TICK_CHAR}${identifier.replace(new RegExp(TICK_CHAR, 'g'), '')}${TICK_CHAR}`
  },
  /**
   * @param {string} table
   * @param {Record<string, number|string>} valueHash
   */
  insertQuery(table, valueHash) {
    const binds = []
    const fields = []

    const values = obj.reduce(valueHash, (acc, value, key) => {
      if (!isUndef(value)) {
        fields.push(this.quoteIdentifier(key))
        binds.push(value)
        acc.push(`$${binds.length}`)
      }
    })
  }
}
