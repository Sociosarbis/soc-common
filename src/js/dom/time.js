/**
 * @returns {Promise<number>}
 */
function getServerTime() {
  let timestamp = -1
  return timestamp !== -1
    ? Promise.resolve(timestamp)
    : new Promise((res, rej) => {
        const xhr = new XMLHttpRequest()
        xhr.open('HEAD', window.location.href)
        xhr.send()
        xhr.onload = function () {
          res(Date.parse(xhr.getResponseHeader('date')))
        }
        xhr.onerror = rej
        xhr.onabort = rej
      })
}
