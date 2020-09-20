const OperatorMap = {
  eq: '=',
  ne: '!=',
  gte: '>=',
  gt: '>',
  lte: '<=',
  lt: '<',
  not: 'IS NOT',
  is: 'IS',
  in: 'IN',
  notIn: 'NOT IN',
  like: 'LIKE',
  notLike: 'NOT LIKE',
  iLike: 'ILIKE',
  notILike: 'NOT ILIKE',
  startsWith: 'LIKE',
  endsWith: 'LIKE',
  substring: 'LIKE',
  regexp: '~',
  notRegexp: '!~',
  iRegexp: '~*',
  notIRegexp: '!~*',
  between: 'BETWEEN',
  notBetween: 'NOT BETWEEN',
  overlap: '&&',
  contains: '@>',
  contained: '<@',
  adjacent: '-|-',
  strictLeft: '<<',
  strictRight: '>>',
  noExtendRight: '&<',
  noExtendLeft: '&>',
  any: 'ANY',
  all: 'ALL',
  and: ' AND ',
  or: ' OR ',
  col: 'COL',
  placeholder: '$$PLACEHOLDER$$'
}

const GROUP_OPERATORS = [OperatorMap.or, OperatorMap.and, OperatorMap.not]
/**
 *
 * @param {string} str
 */
function isGroupOperator(str) {
  return GROUP_OPERATORS.indexOf(str) !== -1
}

export { OperatorMap, isGroupOperator }
