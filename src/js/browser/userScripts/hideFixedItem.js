/**
 * 清除网站的悬浮元素，悬浮元素大多是小广告
 */
function hideFixedItem() {
  const ELEMENT_NODE_TYPE = 1
  /**
   * @param {Node} target
   */
  function hideFixedEl(target) {
    if (target.nodeType !== ELEMENT_NODE_TYPE) return
    // @ts-ignore
    const computedStyle = getComputedStyle(target)
    if (computedStyle.position === 'fixed' && computedStyle.display !== 'none') {
      // @ts-ignore
      target.style.display = 'none'
    }
  }

  /**
   * @callback RecordHandler
   * @param {MutationRecord} record
   */

  /**
   * @type {RecordHandler}
   */
  function handleAttributeChange(record) {
    hideFixedEl(record.target)
  }

  /**
   * @type {RecordHandler}
   */
  function handleChildListChange(record) {
    if (record.addedNodes.length) {
      record.addedNodes.forEach(hideFixedEl)
    }
  }

  const HANDLER_MAPS = {
    attributes: handleAttributeChange,
    childList: handleChildListChange
  }

  /**
   * @type {RecordHandler}
   */
  function handleRecord(record) {
    HANDLER_MAPS[record.type](record)
  }
  const observer = new MutationObserver(([record]) => handleRecord(record))
  observer.observe(document.body, {
    subtree: true,
    attributeFilter: ['class', 'style'],
    childList: true
  })
}
