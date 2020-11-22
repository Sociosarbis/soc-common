import Promise from 'bluebird'

function debounce(func, delay = 200) {
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

/**
 * @param {number} sec
 */
function sleep(sec) {
  return new Promise((res) => setTimeout(res, sec * 1000))
}

export { debounce, sleep }
