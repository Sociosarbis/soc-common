type ExecuteOptions = {
  strictGlobal?: boolean
  publicPath?: string
}

const PATH_COMMANDS = {
  PREV: -1,
  NEXT: 1,
  SEEK: 2,
  END: 4
}

function isRelative(path: string) {
  return path[0] !== '/'
}

function hasProtocol(path: string) {
  return /^\w+:[\\/]{2}/.test(path)
}

function isPath(path: string) {
  return !/^(\w+:)?[\\/]{2}/.test(path)
}

function parsePath(path: string) {
  path = path.replace(/\\/g, '/')
  const hasEnd = path.endsWith('/')
  if (path[path.length - 1] !== '/') path += '/'
  let dots = 0
  let subPath = ''
  const ret = []
  if (!isRelative(path)) ret.push([PATH_COMMANDS.SEEK, 0])
  for (let i = 0; i < path.length; i++) {
    switch (path[i]) {
      case '.':
        dots++
        break
      case '/':
        switch (dots) {
          case 1:
            break
          case 2:
            ret.push([PATH_COMMANDS.PREV])
            dots = 0
            break
          default:
            subPath += '.'.repeat(dots)
            if (subPath.length > 0) {
              ret.push([PATH_COMMANDS.NEXT, subPath])
              dots = 0
              subPath = ''
            }
        }
        break
      default:
        if (dots > 0) {
          subPath += '.'.repeat(dots)
          dots = 0
        }
        subPath += path[i]
    }
  }
  if (hasEnd) ret.push([PATH_COMMANDS.END])
  return ret
}

function concatPath(base: string, path: string) {
  const protocol = hasProtocol(base) ? base.match(/^(\w+:)/)![0] : ''
  let opsList = [parsePath(base.substring(protocol.length)), parsePath(path)]
  const context: string[] = []
  let index = context.length - 1
  let hasEnd = false
  opsList.forEach(ops => {
    if (ops.length && !hasEnd) {
      if (ops[0][0] === PATH_COMMANDS.NEXT) {
        context.pop()
      }
    }
    hasEnd = false
    for (let i = 0; i < ops.length; i++) {
      switch (ops[i][0]) {
        case PATH_COMMANDS.PREV:
          index--
          context.splice(index + 1)
          break
        case PATH_COMMANDS.SEEK:
          index = Number(ops[i][1])
          context.splice(index + 1)
          break
        case PATH_COMMANDS.NEXT:
          context.push(String(ops[i][1]))
          index = context.length - 1
          break
        case PATH_COMMANDS.END:
          hasEnd = true
          break
        default:
      }
    }
  })
  return `${protocol ? `${protocol}//` : ''}${context.join('/')}${hasEnd ? '/' : ''}`
}

function Sandbox(global: any, extendContext: Record<string | number, any>) {
  const context: Record<string | number, any> = Object.assign({}, extendContext)
  return new Proxy(context, {
    get(target, key: string | number) {
      const value = Reflect.get(key in context ? target : global, key)
      if (typeof value === 'function')
        return new Proxy(value, {
          apply(fn, _, args) {
            return fn.apply(global, args)
          }
        })
      return value
    },
    set(target, key: string | number, value: any) {
      return Reflect.set(target, key, value)
    }
  })
}

function geval(code: string) {
  /**
   * (0, eval)返回的eval的执行代码的scope为全局的scope
   * eval的scope则为本地的scope
   */
  try {
    return (0, eval)(code)
  } catch (e) {
    console.log(e)
  }
}

function executeScript(code: string, proxy: any = window, options: ExecuteOptions = {}) {
  const globalWindow = geval('window')
  globalWindow.proxy = proxy
  return geval(wrapCode(code, Boolean(options.strictGlobal)))
}

async function executeExternalScript(src: string, proxy: any = window, options: ExecuteOptions = {}) {
  const res = await fetch(options.publicPath && isPath(src) ? concatPath(options.publicPath, src) : src)
  if (res.status >= 400) throw new Error(`Script load error: ${src}`)
  return executeScript(await res.text(), proxy, options)
}

function wrapCode(code: string, strictGlobal: boolean) {
  if (/\/\/# sourceMappingURL=.*$/.test(code)) {
    code = code.replace(/\/\/# sourceMappingURL=.*$/, '')
  }
  const innerCode = `;${code}`
  return `;(function(window, self){${
    strictGlobal ? `with(window){${innerCode}}` : innerCode
  }}).bind(window.proxy)(window.proxy, window.proxy);`
}

let uid = 0

const rawAppendChild = HTMLHeadElement.prototype.appendChild

export default function importEntry(
  url: string,
  options: ExecuteOptions = {
    strictGlobal: false
  }
) {
  options.publicPath = options.publicPath || url
  const root = document.createElement('div')
  root.setAttribute('id', `ekwing-parcel-${uid++}`)
  return fetch(url)
    .then(res => res.text())
    .then(html => {
      root.innerHTML = html
      const globalWindow = geval('window')

      const win = Sandbox(globalWindow, {
        document: Sandbox(globalWindow.document, {
          head: root,
          body: root
        })
      })

      root.appendChild = appendChild

      function appendChild<T extends Node>(this: Node, newChild: T) {
        if (newChild.nodeType !== 1) return rawAppendChild.call(this, newChild) as T
        else {
          let src = ''
          let href = ''
          switch (newChild.nodeName) {
            case 'SCRIPT':
              src = (newChild as any).getAttribute('src')
              src ? executeExternalScript(src, win, options) : executeScript(newChild.textContent || '', win, options)
              break
            case 'LINK':
              href = (newChild as any).getAttribute('href')
              if (isPath(href) && options.publicPath) {
                ;(newChild as any).setAttribute('href', concatPath(options.publicPath, href))
              }
              rawAppendChild.call(this, newChild) as T
              break
            default:
              return rawAppendChild.call(this, newChild) as T
          }
        }
        return newChild
      }

      const children = Array.from(root.children)

      return {
        win,
        mount(parent: HTMLElement) {
          root.innerHTML = ''
          parent.appendChild(root)
          children.forEach(el => root.appendChild(el))
        }
      }
    })
}
