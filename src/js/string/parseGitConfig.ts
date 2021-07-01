enum CHAR {
  SQUARE_OPEN = "[",
  SQUARE_CLOSE = "]",
  SPACE = " ",
  EQUAL = "=",
  BREAK_LINE = "\n",
  DOUBLE_QOUTE = '"',
  BACK_SLASH = '\\'
}

class RootProperty {
  nameList: (string | StringLiteral)[] = []
  properties: Property[] = []
  start = 0
  end = 0
}

class Property {
  name: string | StringLiteral
  value: string | number | boolean | StringLiteral
  start = 0
  end = 0
}

class StringLiteral {
  quote = ''
  value = ''
  start = 0
  end = 0
}

type Entity = RootProperty | Property | StringLiteral


export const parseNew = function (content: string) {
  let index = 0
  let context: Entity | Entity[] | undefined
  content += "\n"

  const ctx: Entity[] = []
  const ast: RootProperty[] = []
  let isEscape = false
  const getCurrentEntity = () => ctx[ctx.length - 1]

  const parseStringLiteral = () => {
    let top = getCurrentEntity() as StringLiteral
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
  const CHAR_TO_HANDLER = {
    [CHAR.SQUARE_OPEN]: () => {
      let top = getCurrentEntity()
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
      let top = getCurrentEntity()
      if (!(top instanceof StringLiteral)) {
        if (top instanceof RootProperty) {
          const trail = content.substring(top.end, index).trim()
          if (trail) {
            top.nameList.push(trail)
          }
          top.end = index + 1
          context = top.properties
        }
      }
      index += 1
    },
    [CHAR.BREAK_LINE]: () => {
      let top = getCurrentEntity()
      if (!(top instanceof StringLiteral)) {
        if (top instanceof Property) {
          if (!top.value) {
            const value = content.substring(top.end, index).trim()
            top.value = value
            top.end = index + 1
          }
          ctx.pop()
          const nextTop = getCurrentEntity()
          nextTop.end = top.end
        }
      }
      index += 1
    },
    [CHAR.EQUAL]: () => {
      let top = getCurrentEntity()
      if (!(top instanceof StringLiteral)) {
        if (top instanceof RootProperty) {
          const value = content.substring(top.end, index).trim()
          const property = new Property()
          property.name = value
          property.start = top.end
          property.end = index + 1
          if (!(context instanceof RootProperty)) {
            (context as Property[]).push(property)
          }
          top.end = property.end
          ctx.push(property)
        }
      }
      index += 1
    },
    [CHAR.DOUBLE_QOUTE]: () => {
      let top = getCurrentEntity()
      if (!(top instanceof StringLiteral)) {
        const literal = new StringLiteral()
        literal.start = index
        literal.quote = CHAR.DOUBLE_QOUTE
        literal.end = index + 1
        ctx.push(literal)
        index += 1
        parseStringLiteral()
      }
      index += 1
    },
    [CHAR.SPACE]: () => {
      let top = getCurrentEntity()
      if (!(top instanceof StringLiteral)) {
        if (context instanceof RootProperty) {
          const value = content.substring(top.end, index).trim()
          if (value) {
            (top as RootProperty).nameList.push(value)
          }
          top.end = index + 1
        }
      }
      index += 1
      while (index < content.length && content[index] === CHAR.SPACE) {
        index++
      }
    },
    [CHAR.BACK_SLASH]: () => {
      let top = getCurrentEntity()
      if (top instanceof StringLiteral) {
        isEscape = !isEscape
      }
      index += 1
    }
  };
  const charHandler = () => {
    index += 1
  };
  const step = () => {
    while (index < content.length) {
      var char = content[index]
      if (CHAR_TO_HANDLER[char]) {
        CHAR_TO_HANDLER[char]()
      } else {
        charHandler()
      }
    }
  };
  step()
  return ast
};
