import { debounce } from '../../task'
import scrollIntoView from '../scrollIntoView'
import SlideWindow from './index'

export default {
  props: {
    itemClass: {
      type: String,
      default: 'window-item'
    },
    modelList: Array,
    contentClass: {
      type: String
    },
    infinite: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      slideWindow: null
    }
  },
  computed: {
    windowList() {
      return this.slideWindow && this.modelList.slice(this.slideWindow.start, this.slideWindow.end + 1)
    },
    layout() {
      if (this.slideWindow) {
        let minHeight = this.slideWindow.paddingTop + this.slideWindow.paddingBottom
        for (let i = this.slideWindow.start; i < this.slideWindow.end + 1; i++) {
          minHeight += this.slideWindow.getItemOrDefault(i).height
        }
        return {
          minHeight,
          top: this.slideWindow.paddingTop
        }
      } else {
        return null
      }
    }
  },
  watch: {
    windowList(val) {
      this.$emit(
        'window-change',
        val,
        this.slideWindow && this.slideWindow.start,
        this.slideWindow && this.slideWindow.end
      )
    }
  },
  mounted() {
    if (this.infinite) {
      this.createSlideWindow()
      this.DOMObserver = new MutationObserver(([record]) => {
        let cur = record.target
        while (cur && cur != this.$el) {
          // @ts-ignore
          if (cur.classList.contains(this.itemClass)) {
            this.handleDOMChange()
            break
          }
          cur = cur.parentNode
        }
      })
      this.DOMObserver.observe(this.$el, {
        subtree: true,
        childList: true,
        attributeFilter: ['class', 'style']
      })
    }
  },
  beforeDestroy() {
    if (this.infinite) {
      this.DOMObserver.disconnect()
    }
  },
  created() {
    this._cacheDOMList = []
    this.handleDOMChange = debounce(this.handleDOMChange)
  },
  methods: {
    handleScroll(e) {
      this.forward(e.target.scrollTop)
      this.$emit('scroll', { y: e.target.scrollTop })
    },
    handleDOMChange() {
      if (this.infinite && this._cacheDOMList.length) {
        const newItems = []
        for (let i = 0; i < this._cacheDOMList.length; i++) {
          const item = this.slideWindow.getItem(i + this.slideWindow.start)
          item.height = this.calcItemHeight(this._cacheDOMList[i])
        }
        this.slideWindow.items.splice(this.slideWindow.start, newItems.length, ...newItems)
      }
    },
    calcItemHeight(el) {
      const computedStyle = getComputedStyle(el)
      return el.offsetHeight + parseFloat(computedStyle.marginBottom) + parseFloat(computedStyle.marginTop)
    },
    forward(_scrollTop) {
      if (!this.infinite) return
      this._cacheDOMList = this.$el.getElementsByClassName(this.itemClass)
      this.slideWindow.forward(_scrollTop)
    },
    loadItems(modelList) {
      if (!this.infinite) return
      this.slideWindow.resizeItemsNum(modelList.length)
      this.forward(0)
    },
    onHideItem(item, index) {
      if (this._cacheDOMList.length) {
        const el = this._cacheDOMList[index - this.slideWindow.start]
        if (el) {
          item.height = this.calcItemHeight(el)
        }
      }
    },
    reset(modelList) {
      if (!this.infinite) return
      this.createSlideWindow()
      this.loadItems(modelList)
      this.$el.scrollTop = 0
    },
    createSlideWindow() {
      if (!this.infinite) return
      const contentEls = this.contentClass ? this.$el.getElementsByClassName(this.contentClass) : null
      this.slideWindow = new SlideWindow({
        container: this.$el,
        startY: contentEls && contentEls.length ? contentEls[0].offsetTop : 0,
        defaultItemSize: this.defaultItemSize,
        onHideItem: this.onHideItem
      })
    },
    setDisable(disable) {
      if (!this.infinite) return
      this.slideWindow.disable = disable
    },
    scrollTo(y) {
      this.$el.scrollTop = y
    },
    scrollToElement(el) {
      scrollIntoView(
        el,
        {
          y: this.$el.getBoundingClientRect().top
        },
        false
      )
    }
  },
  render(h) {
    return h(
      'div',
      {
        class: 'relative overflow-auto smooth-scroll',
        nativeOn: {
          scroll: this.handleScroll
        }
      },
      [this.infinite ? this.$slots.default({ layout: this.layout, windowList: this.windowList }) : this.$slots.default]
    )
  }
}
