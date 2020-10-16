const protocolRegExp = /^([^:]+:)/
const urlRegExp = /^(\w+:)?\/*?([^#\?\/:]+)(:\d+)?([^#\?]*?)(\?[^#]*)?(#.*)?$/

function getProtocol(url) {
  const protocol = protocolRegExp.exec(url)
  if (protocol) return protocol[1]
  else return window ? window.location.protocol : ''
}

const PATH_COMMANDS = {
  PREV: -1,
  NEXT: 1,
  SEEK: 2
}
/**
 * @param {string} path
 */
function isRelative(path) {
  return path[0] !== '/'
}

/**
 * @param {string} path
 */
function parsePath(path) {
  path = path.replace(/\\/g, '/')
  if (path[path.length - 1] !== '/') path += '/'
  let dots = 0
  let subPath = ''
  const ret = []
  if (!isRelative(path)) ret.push([PATH_COMMANDS.SEEK, 0])
  for (let i = 0;i < path.length;i++) {
    switch(path[i]) {
      case '.':
        dots++;
        break;
      case '/':
        switch (dots) {
          case 1:
            break;
          case 2:
            ret.push([PATH_COMMANDS.PREV])
            dots = 0
          default:
            subPath += '.'.repeat(dots)
            if (subPath.length > 0) {
              ret.push([PATH_COMMANDS.NEXT, subPath])
              dots = 0
              subPath = ''
            }
        }
        break;
      default:
        if (dots > 0) {
          subPath += '.'.repeat(dots)
          dots = 0
        }
        subPath += path[i]
    }
  }
  return ret
}

/**
 * @param {string[]} context
 * @param {string} path
 */
function concatPath(context, path) {
  const ops = parsePath(path)
  let index = context.length - 1
  for (let i = 0;i < ops.length;i++) {
    switch(ops[i][0]) {
      case PATH_COMMANDS.PREV:
        index--
        context.splice(index + 1)
        break
      case PATH_COMMANDS.SEEK:
        index = ops[i][1]
        context.splice(index + 1)
        break
      case PATH_COMMANDS.NEXT:
        context.push(ops[i][1])
        index = context.length - 1
        break
      default:
    }
  }
  return context.join('/')
}

export default class SoURL {
  constructor(url) {
    const protocol = getProtocol(url)
    const urlParsedResult = urlRegExp.exec(url)
    if (urlParsedResult && (protocol === 'http:' || protocol === 'https:')) {
      this.isValid = true
      this.protocol = protocol
      this.host = (urlParsedResult[2] && urlParsedResult[2].toLowerCase()) || ''
      this.port = urlParsedResult[3] || ''
      this.path = urlParsedResult[4] || ''
      this.search = urlParsedResult[5] || ''
      this.hash = urlParsedResult[6] || ''
    } else {
      this.isValid = false
    }
    this._url = url
  }

  addParams(params, type, prefix) {
    if (params && this.isValid) {
      let paramsMap = this.getParams(type)
      Object.keys(params).forEach(function (key) {
        Reflect.set(paramsMap, key, params[key])
      })
      this[type] =
        prefix +
        Object.keys(paramsMap)
          .map(function (key) {
            return key + '=' + paramsMap[key]
          })
          .join('&')
    }
    return this
  }

  getParams(type) {
    return this[type]
      .slice(1)
      .split('&')
      .reduce(function (paramsMap, keyPair) {
        const [_, key, value] = keyPair.match(/([^=]+)=(.*)$/) || []
        if (key) Reflect.set(paramsMap, key, value)
        return paramsMap
      }, {})
  }

  addSearchParams(params) {
    return this.addParams(params, 'search', '?')
  }

  addHashParams(params) {
    return this.addParams(params, 'hash', '#')
  }

  getFullPath() {
    return this.host + this.port + this.path
  }

  toString() {
    return this.isValid ? this.protocol + '//' + this.host + this.port + this.path + this.search + this.hash : this._url
  }
}

export { urlRegExp }
