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
  constructor({ container, defaultItemSize, start = -1, end = -1, startY }) {
    this.container = container
    this.start = start
    this.end = end
    this.startY = startY
    this.defaultItemSize = defaultItemSize
    this.paddingTop = 0
    this.paddingBottom = 0
    this.offsetTopForEnd = 0
    this.upperFactor = 2
    this.lowerFactor = 1
    this.items = []
  }

  resizeItemsNum(num) {
    this.items.length = num
    const maxNum = Math.max(num - 1, 0)
    this.start = num > 0 ? Math.max(Math.min(this.start, maxNum), 0) : -1
    this.end = num > 0 ? Math.max(Math.min(this.end, maxNum), 0) : -1
  }

  forward() {
    if (this.start < 0 || this.end < 0) return
    let end = this.end
    const containerBottom = this.container.scrollTop + this.container.offsetHeight
    let paddingTop = this.paddingTop
    let paddingBottom = this.paddingBottom
    let threshold = this.container.scrollTop - this.lowerFactor * this.container.offsetHeight
    let start = this.start
    let acc = 0
    let offsetTopForEnd = this.paddingTop
    for (let i = start; i < end; i++) {
      offsetTopForEnd += this.items[i].height
    }
    // 当start的下边小于容器顶减两个容器高，则增加start至start的下边大于容器顶减一个容器高
    if (
      paddingTop + this.items[start].height <
      this.container.scrollTop - this.upperFactor * this.container.offsetHeight
    ) {
      acc = this.items[start].cacheHeight().height
      while (start < end) {
        if (paddingTop + acc + this.items[start + 1].height < threshold) {
          acc += this.items[++start].cacheHeight().height
        } else {
          start++
          break
        }
      }
      paddingTop += acc
      // 当start的上边大于容器顶减一个容器高，则减小start至start的上边小于容器顶减一个容器高
    } else if (paddingTop > threshold) {
      acc = -(this.items[start].heightCache ? this.items[start].getAndRemoveHeightCache() : this.items[start].height)
      this.items[start].remove
      while (start > 0) {
        if (paddingTop + acc - this.items[start - 1].height >= threshold) {
          --start
          acc -= -(this.items[start].heightCache
            ? this.items[start].getAndRemoveHeightCache()
            : this.items[start].height)
        } else {
          start--
          break
        }
      }
      paddingTop += acc
    }
    acc = 0
    threshold = containerBottom + this.lowerFactor * this.container.offsetHeight
    // 当end的下边小于容器底加一个容器高，则增加end至end的下边大于容器底加一个容器高
    if (offsetTopForEnd + this.items[end].height < threshold) {
      acc = this.items[end].heightCache ? this.items[end].getAndRemoveHeightCache() : this.items[end].height
      while (end < this.items.length - 1) {
        if (offsetTopForEnd + acc + this.items[end + 1].height <= threshold) {
          ++end
          acc += this.items[end].heightCache ? this.items[end].getAndRemoveHeightCache() : this.items[end].height
        } else {
          end++
          break
        }
      }
      paddingBottom -= acc
      // 当end的上边大于容器底加两个容器高，则减小end至end的上边小于容器底加一个容器高
    } else if (offsetTopForEnd > containerBottom + this.upperFactor * this.container.offsetHeight) {
      acc = -this.items[end].cacheHeight().height
      while (end > 0) {
        if (offsetTopForEnd + acc - this.items[end - 1].height > threshold) {
          acc -= this.items[--end].cacheHeight().height
        } else {
          end--
          break
        }
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
    if (!this.items[idx]) {
      this.items[idx] = this.createDefaultItem()
    }
    if (newProps) {
      this.items[idx].height = newProps.height
    }
    const heightDelta = this.items[idx].height - prevHeight
    if (idx < this.start) {
      this.paddingTop += heightDelta
    }
    if (idx > this.end) {
      this.paddingBottom += heightDelta
    }
  }
}

export default SlideWindow
