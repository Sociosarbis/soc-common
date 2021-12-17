const isLetter = (c: string) => c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122
const isFullColon = (c: string) => c === ':'
const isSemiColon = (c: string) => c === ';'
const isColon = (c: string) => isFullColon(c) || isSemiColon(c)
const isBracketStart = (c: string) => c === '{'
const isBracketEnd = (c: string) => c === '}'
const isDoubleQoute = (c: string) => c === '"'
const isBackSlash = (c) => c === '\\'

const list = {
  get(list: any[], index: number) {
    return list[index >= 0 ? index : list.length + index]
  },
  set(list: any[], index: number, value: any) {
    list[index >= 0 ? index : list.length + index] = value
  }
}

const TAG = {
  a: 'a',
  i: 'i',
  s: 's'
}

class Deserializer {
  text: string
  cursor = 0
  root: any[] | null = null
  objStack: any[] = [null]
  pathStack: (number | string)[] = ['']
  constructor(text: string) {
    this.text = text
  }

  deserialize() {
    while (this.cursor < this.text.length) {
      if (isBracketEnd(this.text[this.cursor])) {
        this.popObj()
      }
      this.readTag()
    }
    return this.root
  }

  readTag() {
    this.skipUntil(isLetter)
    switch (this.text[this.cursor]) {
      case TAG.a:
        this.onTagA()
        break
      case TAG.i:
        this.onTagI()
        break
      case TAG.s:
        this.onTagS()
    }
    this.cursor++
    this.skipUntil((c) => !!c)
  }

  skipUntil(test: (c: string) => boolean) {
    while (this.cursor < this.text.length && !test(this.text[this.cursor])) {
      this.cursor++
    }
  }

  onTagA() {
    const length = this.readNumber()
    const item = new Array(length)
    if (!this.root) {
      this.root = item
    }
    if (typeof list.get(this.objStack, -1) === 'function') {
      list.get(this.objStack, -1)(item)
    }
    list.set(this.objStack, -1, item)
    this.skipUntil(isBracketStart)
  }

  readNumber() {
    this.skipUntil(isFullColon)
    const start = ++this.cursor
    this.skipUntil(isColon)
    return Number(this.text.substring(start, this.cursor))
  }

  readText() {
    this.skipUntil(isDoubleQoute)
    const start = ++this.cursor
    let isEscape = false
    while (this.cursor < this.text.length) {
      if (isDoubleQoute(this.text[this.cursor]) && !isEscape) {
        break
      } else {
        if (isEscape) {
          isEscape = false
        } else if (isBackSlash(this.text[this.cursor])) {
          isEscape = true
        }
      }
      this.cursor++
    }
    return this.text.substring(start, this.cursor)
  }

  pushObj(key: string | number, value: any) {
    this.objStack.push(value)
    this.pathStack.push(key)
  }

  popObj() {
    this.objStack.pop()
    this.pathStack.pop()
  }

  onTagI() {
    const index = this.readNumber()
    this.pushObj(index, (item) => {
      list.get(this.objStack, -1)[index] = item
      this.pathStack.push(index)
    })
  }

  onTagS() {
    const text = this.readText()
    this.skipUntil(isSemiColon)
    if (typeof list.get(this.objStack, -1) === 'function') {
      list.get(this.objStack, -1)(text)
    } else {
      this.pushObj(text, (obj: any) => {
        let item = list.get(this.objStack, -2)
        if (Array.isArray(item)) {
          item = {}
          list.get(this.objStack, -3)[list.get(this.pathStack, -2)] = item
          list.set(this.objStack, -2, item)
        }
        item[text] = obj
        this.popObj()
      })
    }
  }
}

class Serializer {
  static serialize(obj: any) {
    if (Array.isArray(obj)) {
      return `a:${obj.length}:{${obj.map((item, i) => `i:${i};${this.serialize(item)}`).join('')}}`
    } else if (obj && typeof obj === 'object') {
      const keys = Object.keys(obj)
      return `a:${keys.length}:{${keys
        .map((key) => {
          return `s:${Buffer.from(key).toString('latin1').length}:"${key}";${this.serialize(obj[key])}`
        })
        .join('')}}`
    } else {
      return `s:${Buffer.from(obj).toString('latin1').length}:"${obj}";`
    }
  }
}

export { Serializer, Deserializer }
