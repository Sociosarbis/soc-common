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
