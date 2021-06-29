enum STATE {
  PROPERTY_NAME = 0,
  ROOT_PROPERTY = 1,
  SUB_PROPERTY = 2,
  PROPERTY_VALUE = 4,
}

enum CHAR {
  SQUARE_OPEN = "[",
  SQUARE_CLOSE = "]",
  SPACE = " ",
  EQUAL = "=",
  BREAK_LINE = "\n",
  DOUBLE_QOUTE = '"',
}

export const parse = function (content: string) {
  let index = 0
  let state = STATE.PROPERTY_NAME
  const ret: Record<any, any> = {}
  const stack: [STATE, number, any?][] = []
  const stackTop = () => stack[stack.length - 1]
  let context = ret
  content += "\n"
  const CHAR_TO_HANDLER = {
    [CHAR.SQUARE_OPEN]: () => {
      stack.push([STATE.ROOT_PROPERTY, index])
      state |= STATE.ROOT_PROPERTY
      context = ret
      index += 1
    },
    [CHAR.SQUARE_CLOSE]: () => {
      let top = stackTop()
      if (top[0] === STATE.SUB_PROPERTY) {
        const name = content.substring(top[1], index).trim();
        if (!top[2][name]) {
          top[2][name] = {}
        }
        context = top[2][name]
      }
      while (top[0] !== STATE.ROOT_PROPERTY) {
        stack.pop()
        top = stackTop()
      }
      stack.pop()
      state = STATE.PROPERTY_NAME
      index += 1
    },
    [CHAR.BREAK_LINE]: () => {
      if (state & STATE.PROPERTY_VALUE) {
        let top = stackTop()
        let value: any = content.substring(top[1], index).trim()
        if (value === 'false') {
          value = false
        } else if (value === 'true') {
          value = true
        } else if (!isNaN(value)) {
          value = Number(value)
        }
        const name = top[2]
        stack.pop()
        top = stackTop()
        top[2][name] = value
        context = top[2]
        stack.pop()
        state = STATE.PROPERTY_NAME
      }
      index += 1
    },
    [CHAR.EQUAL]: () => {
      if (state === STATE.PROPERTY_NAME) {
        const top = stackTop()
        const name = content.substring(top[1], index).trim()
        stack.push([STATE.PROPERTY_VALUE, index + 1, name])
        state |= STATE.PROPERTY_VALUE
      }
      index += 1
    },
  };
  const charHandler = () => {
    let top = stackTop();
    if (!top) {
      stack.push([STATE.PROPERTY_NAME, index, context])
      top = stackTop()
    }
    if (top[0] === STATE.ROOT_PROPERTY) {
      if (![CHAR.DOUBLE_QOUTE, CHAR.SPACE].includes(content[index] as CHAR)) {
        state |= STATE.SUB_PROPERTY;
        stack.push([STATE.SUB_PROPERTY, index, context])
      }
    } else if (top[0] === STATE.SUB_PROPERTY) {
      if (
        content[index] === CHAR.DOUBLE_QOUTE ||
        content[index] === CHAR.SPACE
      ) {
        const name = content.substring(top[1], index).trim()
        if (!top[2][name]) {
          top[2][name] = {}
        }
        context = top[2][name]
        stack.pop()
      }
    }
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
  return ret
};