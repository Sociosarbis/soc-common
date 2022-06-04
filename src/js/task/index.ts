import Promise from 'bluebird'

function debounce(func: (...args: any[]) => any, delay = 200) {
  let timerId = 0
  return (...args) => {
    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = window.setTimeout(() => {
      func(...args)
      timerId = 0
    }, delay)
    return () => clearTimeout(timerId)
  }
}

function sleep(sec: number) {
  return new Promise((res) => setTimeout(res, sec * 1000))
}

type MeasureData = { time: number }

async function measure(fn: (...args: any[]) => any, times = 1) {
  const data: MeasureData[] & Partial<{ avg: MeasureData }> = []
  for (let i = 0; i < times; i++) {
    const before = performance.now()
    await fn()
    data.push({ time: performance.now() - before })
  }
  data.avg = {
    time: data.reduce((acc, item) => acc + item.time, 0) / data.length
  }
  console.table(data)
}

export async function raceAll<T>(promiseFactories: Array<() => Promise<T>>, batchSize = 5) {
  const ret: Array<T | undefined> = []
  const remains = promiseFactories.map((fn, i) => [fn, i] as const)
  const mapFn = ([fn, i]: readonly [typeof promiseFactories[0], number]) => {
    const p = fn()
      .then((res) => {
        ret[i] = res
      })
      .catch(() => {
        //
      })
      .finally(() => {
        const index = tasks.indexOf(p)
        if (index !== -1) {
          tasks.splice(index, 1)
        }
      })
    return p
  }
  const tasks = remains.splice(0, batchSize).map(mapFn)

  while (tasks.length) {
    await Promise.race(tasks)
    if (remains.length) {
      tasks.push(mapFn(remains.shift()))
    }
  }
  return ret
}

export { debounce, sleep, measure }
