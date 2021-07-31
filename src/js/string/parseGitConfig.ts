enum CHAR {
  SQUARE_OPEN = '[',
  SQUARE_CLOSE = ']',
  SPACE = ' ',
  EQUAL = '=',
  BREAK_LINE = '\n',
  DOUBLE_QOUTE = '"',
  BACK_SLASH = '\\',
  NUMBER_SIGN = '#',
  COLON = ';'
}

class RootProperty {
  nameList: (string | StringLiteral)[] = []
  properties: Property[] = []
  start = 0
  end = 0
}

class Property {
  name: string | StringLiteral
  value: string | StringLiteral
  start = 0
  end = 0
}

class StringLiteral {
  quote = ''
  value = ''
  start = 0
  end = 0
}

class Comment {
  content = ''
  start = 0
  end = 0
}

type Entity = RootProperty | Property | StringLiteral

const resolveStringValue = (str: string | StringLiteral) => {
  return str instanceof StringLiteral ? str.value : str
}

const resolvePrimitive = (str: string) => {
  if (str === 'true') return true
  if (str === 'false') return false
  if (!isNaN(parseFloat(str))) return parseFloat(str)
  return str
}

export const parseNew = function (content: string) {
  let index = 0
  let context: Entity | Entity[] | undefined
  content += '\n'

  const ctx: Entity[] = []
  const comments: Comment[] = []
  const ast: RootProperty[] = []
  let isEscape = false
  const getCurrentEntity = () => ctx[ctx.length - 1]

  const parseStringLiteral = () => {
    const top = getCurrentEntity() as StringLiteral
    while (index < content.length && !(!isEscape && content[index] === CHAR.DOUBLE_QOUTE)) {
      if (isEscape) {
        isEscape = false
        top.value += content[index]
      } else {
        if (content[index] === CHAR.BACK_SLASH) {
          isEscape = true
        } else {
          top.value += content[index]
        }
      }
      index += 1
    }
    top.end = index + 1
    ctx.pop()
    const nextTop = getCurrentEntity()
    nextTop.end = top.end
    if (nextTop instanceof RootProperty) {
      if (context instanceof RootProperty) {
        context.nameList.push(top)
      } else {
        const property = new Property()
        property.name = top
        property.start = top.start
        property.end = top.end
        ;(context as Property[]).push(property)
      }
      nextTop.end = top.end
    } else if (nextTop instanceof Property) {
      nextTop.value = top
      nextTop.end = top.end
    }
  }

  const parseComment = () => {
    const comment = new Comment()
    comment.start = index
    while (index < content.length && content[index] !== CHAR.BREAK_LINE) {
      index++
    }
    comment.content = content.substring(comment.start + 1, index)
    comment.end = index + 1
    comments.push(comment)
  }

  const handleCommentSymbol = () => {
    if (!(context instanceof RootProperty)) {
      let top = getCurrentEntity()
      if (endProperty(top) !== top) {
        top = getCurrentEntity()
      }
      parseComment()
      top.end = index + 1
    }
    index++
  }
  console.log(123)
  const endProperty = (top: Entity) => {
    if (top instanceof Property) {
      if (!top.value) {
        const value = content.substring(top.end, index).trim()
        top.value = value
        top.end = index + 1
      }
      ctx.pop()
      const nextTop = getCurrentEntity()
      nextTop.end = top.end
      return nextTop
    }
    return top
  }

  const CHAR_TO_HANDLER = {
    [CHAR.SQUARE_OPEN]: () => {
      const top = getCurrentEntity()
      if (!(top instanceof StringLiteral)) {
        ctx.length = 0
        context = new RootProperty()
        context.start = index
        context.end = index + 1
        ctx.push(context)
        ast.push(context)
      }
      index += 1
    },
    [CHAR.SQUARE_CLOSE]: () => {
      const top = getCurrentEntity()
      if (context instanceof RootProperty && context === top) {
        const trail = content.substring(top.end, index).trim()
        if (trail) {
          top.nameList.push(trail)
        }
        top.end = index + 1
        context = top.properties
      }
      index += 1
    },
    [CHAR.BREAK_LINE]: () => {
      const top = getCurrentEntity()
      endProperty(top)
      index += 1
    },
    [CHAR.EQUAL]: () => {
      const top = getCurrentEntity()
      if (top instanceof RootProperty) {
        const value = content.substring(top.end, index).trim()
        const property = new Property()
        property.name = value
        property.start = top.end
        property.end = index + 1
        if (!(context instanceof RootProperty)) {
          ;(context as Property[]).push(property)
        }
        top.end = property.end
        ctx.push(property)
      }
      index += 1
    },
    [CHAR.DOUBLE_QOUTE]: () => {
      const literal = new StringLiteral()
      literal.start = index
      literal.quote = CHAR.DOUBLE_QOUTE
      literal.end = index + 1
      ctx.push(literal)
      index += 1
      parseStringLiteral()
      index += 1
    },
    [CHAR.SPACE]: () => {
      const top = getCurrentEntity()
      if (context instanceof RootProperty) {
        const value = content.substring(top.end, index).trim()
        if (value) {
          ;(top as RootProperty).nameList.push(value)
        }
        top.end = index + 1
      }
      index += 1
      while (index < content.length && content[index] === CHAR.SPACE) {
        index++
      }
    },
    [CHAR.NUMBER_SIGN]: handleCommentSymbol,
    [CHAR.COLON]: handleCommentSymbol
  }
  const charHandler = () => {
    index += 1
  }
  const step = () => {
    while (index < content.length) {
      const char = content[index]
      if (CHAR_TO_HANDLER[char]) {
        CHAR_TO_HANDLER[char]()
      } else {
        charHandler()
      }
    }
  }
  step()
  return {
    ast,
    comments
  }
}

export const astToObj = function (ast: RootProperty[]) {
  const root: Record<string, any> = {}
  ast.forEach((p) => {
    let cur = root
    p.nameList.forEach((name) => {
      const value = resolveStringValue(name)
      if (!cur[value]) {
        cur[value] = {}
      }
      cur = cur[value]
    })
    p.properties.forEach((prop) => {
      const key = resolveStringValue(prop.name)
      if (prop.value instanceof StringLiteral) {
        cur[key] = prop.value.value
      } else {
        cur[key] = resolvePrimitive(prop.value)
      }
    })
  })
  return root
}
