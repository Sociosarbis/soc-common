import { isUndef } from './is'

function getValueByPath(...path) {
  return (obj) => {
    let target = obj
    let index = -1
    const boundIndex = path.length - 1
    do {
      if (isUndef(target)) return target
      target = isUndef(target.get) ? target[path[++index]] : target.get(path[++index])
    } while (index < boundIndex)

    return target
  }
}

export { getValueByPath }
