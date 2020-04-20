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
  const ret = []
  ret.push(...arr.map((item) => (Array.isArray(item) ? flatArray(item) : item)))
  return ret
}
