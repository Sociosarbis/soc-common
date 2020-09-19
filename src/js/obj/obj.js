import { identity } from '../const/common'

/** @param {(item: any, key: string ) => any} mapFunc */
function map(obj, mapFunc = identity) {
  return Object.keys(obj).map((key) => mapFunc(obj[key], key))
}

/** @param {(acc: any, item: any, key: string ) => any} reduceFunc */
function reduce(obj, reduceFunc = identity, initialVal = null) {
  return Object.keys(obj).reduce((acc, key, i) => reduceFunc(acc, obj[key], key), initialVal)
}

export { map, reduce }
