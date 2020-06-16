function range(...args) {
  let step = 1
  let start = 0
  let end = 1
  if (args.length === 1) {
    ;[end] = args
  } else if (args.length === 2) {
    ;[start, end] = args
  } else if (args.length === 3) {
    ;[start, end, step] = args
  }

  const arr = []
  for (let i = start; i < end; i += step) {
    arr.push(i)
  }
  return arr
}

function flatArray(arr) {
  return arr.reduce((acc, item) => {
    Array.isArray(item) ? acc.push(...flatArray(item)) : acc.push(item)
    return acc
  }, [])
}

class NaiveSet {
  constructor() {
    this.arr = []
  }

  static defaultEqual(a, b) {
    return a === b
  }

  static from(arrLike) {
    const ret = new NaiveSet()
    if ('length' in arrLike) {
      for (let i = 0; i < arrLike.length; i++) {
        ret.add(arrLike[i])
      }
    }
    return ret
  }

  get size() {
    return this.arr.length
  }

  add(item, validateFunc = NaiveSet.defaultEqual) {
    if (!this.has(item, validateFunc)) this.arr.push(item)
  }

  delete(item, validateFunc = NaiveSet.defaultEqual) {
    for (let i = 0; i < this.arr.length; i++) {
      if (validateFunc(item, this.arr[i])) {
        this.arr.splice(i, 1)
        break
      }
    }
  }

  clear() {
    this.arr.length = 0
  }

  has(item, validateFunc = NaiveSet.defaultEqual) {
    for (let i = 0; i < this.arr.length; i++) {
      if (validateFunc(item, this.arr[i])) return true
    }
    return false
  }

  forEach(func) {
    return this.arr.forEach(func)
  }

  find(validateFunc = (_) => false) {
    for (let i = 0; i < this.arr.length; i++) {
      if (validateFunc(this.arr[i])) return this.arr[i]
    }
  }

  findAll(validateFunc = (_) => false) {
    const ret = []
    for (let i = 0; i < this.arr.length; i++) {
      if (validateFunc(this.arr[i])) ret.push(this.arr[i])
    }
    return ret
  }
}

export { NaiveSet }
