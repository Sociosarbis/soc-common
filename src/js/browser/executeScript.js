/**
 * @param {string} code
 */
function geval(code) {
  /**
   * (0, eval)返回的eval的执行代码的scope为全局的scope
   * eval的scope则为本地的scope
   */
  return (0, eval)(code)
}

/**
 * @param {string} code
 * @param {*} proxy
 */
function executeScript(code, proxy = window, { scriptGlobal = false } = {}) {
  const globalWindow = geval('window')
  globalWindow.proxy = proxy
  return geval(wrapCode(code, scriptGlobal))
}

/**
 * @param {string} src
 * @param {*} proxy
 */
async function executeExternalScript(src, proxy = window, options) {
  const res = await fetch(src)
  if (res.status >= 400) throw new Error(`Script load error: ${src}`)
  return executeScript(await res.text(), proxy, options)
}

/**
 * @param {string} code
 * @param {boolean} strictGlobal
 */
function wrapCode(code, strictGlobal) {
  const innerCode = `;${code}`
  return `;(function(window, self){${
    strictGlobal ? `with(window){${innerCode}}` : innerCode
  }).bind(window.proxy)(window.proxy, window.proxy);`
}
