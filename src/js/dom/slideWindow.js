import { noop } from '../const/common'

class SlideItem {
  constructor(height) {
    this.height = height
    this.heightCache = null
  }

  cacheHeight() {
    this.heightCache = this.height
    return this
  }

  getAndRemoveHeightCache() {
    try {
      return this.heightCache
    } finally {
      this.heightCache = null
    }
  }
}
class SlideWindow {
  constructor({ container, defaultItemSize, start = -1, end = -1, startY, onHideItem = noop }) {
    this.container = container
    this.start = start
    this.end = end
    this.startY = startY
    this.defaultItemSize = defaultItemSize
    this.paddingTop = 0
    this.paddingBottom = 0
    this.offsetTopForEnd = 0
    this.upperFactor = 18
    this.lowerFactor = 2
    /** @type {(item: SlideItem, index: number) => any} */
    this.onHideItem = onHideItem
    this.items = []
    this.disable = false
    this.defaultItem = Object.freeze(this.createDefaultItem())
  }

  get halfFactor() {
    return (this.upperFactor + this.lowerFactor) / 2
  }

  resizeItemsNum(num) {
    this.items.length = num
    const maxNum = Math.max(num - 1, 0)
    this.start = num > 0 ? Math.max(Math.min(this.start, maxNum), 0) : -1
    this.end = num > 0 ? Math.max(Math.min(this.end, maxNum), 0) : -1
  }

  forward(_scrollTop) {
    if (this.disable || this.start < 0 || this.end < 0) return
    let end = this.end
    const scrollTop = isNaN(_scrollTop) ? this.container.scrollTop : _scrollTop
    const containerBottom = scrollTop + this.container.offsetHeight
    let paddingTop = this.paddingTop
    let paddingBottom = this.paddingBottom
    let threshold = scrollTop - this.halfFactor * this.container.offsetHeight
    let lowerThreshold = scrollTop - this.lowerFactor * this.container.offsetHeight
    let upperThreshold = scrollTop - this.upperFactor * this.container.offsetHeight
    let start = this.start
    let acc = 0
    let endBottom = this.paddingTop
    for (let i = start; i <= end; i++) {
      endBottom += this.getItemOrDefault(i).height
    }
    // 当start的下边小于容器顶减upperFactor个容器高，则增加start至start的下边大于容器顶减halfFactor个容器高
    if (paddingTop + this.getItemOrDefault(start).height < upperThreshold) {
      while (start < end) {
        this.onHideItem(this.getItem(start), start)
        acc += this.items[start++].cacheHeight().height
        if (paddingTop + acc >= threshold) break
      }
      paddingTop += acc
      // 当start的上边大于容器顶减lowerFactor个容器高，则减小start至start的上边小于容器顶halfFactor个容器高
    } else if (paddingTop > lowerThreshold) {
      while (start > 0) {
        acc -= this.getItem(--start).heightCache
          ? this.items[start].getAndRemoveHeightCache()
          : this.items[start].height
        if (paddingTop + acc <= threshold) break
      }
      paddingTop += acc
    }
    acc = 0
    threshold = containerBottom + this.halfFactor * this.container.offsetHeight
    upperThreshold = containerBottom + this.upperFactor * this.container.offsetHeight
    lowerThreshold = containerBottom + this.lowerFactor * this.container.offsetHeight
    // 当end的下边小于容器底加lower个容器高，则增加end至end的下边大于容器底加halfFactor个容器高
    if (endBottom < lowerThreshold) {
      while (end < this.items.length - 1) {
        acc += this.getItem(++end).heightCache ? this.items[end].getAndRemoveHeightCache() : this.items[end].height
        if (endBottom + acc >= threshold) break
      }
      paddingBottom -= acc
      // 当end的上边大于容器底加upperFactor个容器高，则减小end至end的上边小于容器底加halfFactor个容器高
    } else if (endBottom - this.getItemOrDefault(end).height > upperThreshold) {
      while (end > 0) {
        this.onHideItem(this.getItem(end), end)
        acc -= this.items[end--].cacheHeight().height
        if (endBottom + acc <= threshold) break
      }
      paddingBottom -= acc
    }

    if (this.start !== start) {
      this.start = start
      this.paddingTop = Math.max(paddingTop, 0)
    }

    if (this.end !== end) {
      this.end = end
      this.paddingBottom = Math.max(paddingBottom, 0)
    }
  }

  createDefaultItem() {
    return Object.seal(new SlideItem(this.defaultItemSize))
  }

  updateItem(idx, newProps) {
    const prevHeight = this.items[idx] ? this.items[idx].height : 0
    const targetItem = this.getItem(idx)
    if (newProps) {
      targetItem.height = newProps.height
    }
    const heightDelta = targetItem.height - prevHeight
    if (!targetItem.heightCache) {
      if (idx < this.start) {
        this.paddingTop += heightDelta
      }
      if (idx > this.end) {
        this.paddingBottom += heightDelta
      }
    }
  }

  getItemOrDefault(idx) {
    if (idx < this.items.length) {
      return this.items[idx] || this.defaultItem
    }
    return null
  }

  getItem(idx) {
    if (idx < this.items.length) {
      if (!this.items[idx]) {
        this.items[idx] = this.createDefaultItem()
      }
      return this.items[idx]
    }
    return false
  }
}

export default SlideWindow
