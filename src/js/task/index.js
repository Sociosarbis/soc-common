function debounce(func, delay = 200) {
  let timerId = 0
  return (...args) => {
    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => {
      func(...args)
      timerId = 0
    }, delay)
    return () => clearTimeout(timerId)
  }
}

export { debounce }
