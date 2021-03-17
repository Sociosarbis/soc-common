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
    let before = performance.now()
    await fn()
    data.push({ time: performance.now() - before })
  }
  data.avg = {
    time: data.reduce((acc, item) => acc + item.time, 0) / data.length
  }
  console.table(data)
}

export { debounce, sleep, measure }
