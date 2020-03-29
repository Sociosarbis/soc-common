const timingFunctions = {
  easeOut(t, b, c, d) {
    return -c * (t /= d) * (t - 2) + b
  }
}

export default function Tween({ duration, easing = 'easeOut' }, cb) {
  let timerId = 0
  let currentTime = 0
  let start = 0
  function callbackFactory(t) {
    return (b, c) => {
      return timingFunctions[easing](t, b, c, duration)
    }
  }
  return {
    clear() {
      cancelAnimationFrame(timerId)
    },
    run: function step(timestamp = 0) {
      if (!start) start = timestamp
      const delta = timestamp - start
      currentTime = Math.min(duration, currentTime + delta)
      cb(currentTime, callbackFactory(currentTime))
      if (currentTime >= duration) return
      requestAnimationFrame(step)
      return this
    }
  }
}
