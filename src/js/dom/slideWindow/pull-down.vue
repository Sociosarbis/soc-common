<template>
  <div :style="transformStyle"><slot :lock="lock" :locking="locking" :show="show" /></div>
</template>
<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'

import Tween from '../../task/tween'

@Component<PullDown>({
  computed: {
    transformStyle() {
      return { marginTop: `${-this.stopAt + this.y}px` }
    },
    show() {
      return this.y !== 0
    }
  }
})
export default class PullDown extends Vue {
  @Prop(Number) maxDist!: number
  @Prop(Number) threshold!: number
  $el!: HTMLElement
  transformStyle!: Record<string, string>
  _anime!: ReturnType<typeof Tween> | null
  DOMObserver!: MutationObserver
  y = 0
  lock = false
  locking = false
  stopAt = 0
  show!: boolean
  mounted() {
    this.$parent.$on('touch-move', this.handleTouchMove)
    this.$parent.$on('touch-start', this.clearAnime)
    this.$parent.$on('touch-end', this.handleEnd)
    this.stopAt = this.$el.offsetHeight
    this.DOMObserver = new MutationObserver(() => {
      this.stopAt = this.$el.offsetHeight
    })
    this.DOMObserver.observe(this.$el, {
      subtree: true,
      childList: true,
      attributeFilter: ['class', 'style']
    })
  }

  clearAnime() {
    if (this._anime) {
      this._anime.clear()
    }
  }

  handleTouchStart() {
    this.clearAnime()
  }

  handleTouchMove(touchInfo: { deltaY: number }) {
    if (this.$parent.$el.scrollTop <= this.stopAt) {
      // @ts-ignore
      const maxDist = this.maxDist * window.rem
      const factor = Math.pow(1 - this.y / maxDist, 2)
      this.y = Math.min(Math.max(this.y + factor * touchInfo.deltaY, 0), maxDist)
      // @ts-ignore
      this.lock = this.y > this.threshold * window.rem
    }
  }

  unlock() {
    this.locking = false
    this.handleEnd()
  }

  handleEnd() {
    const beginValue = this.y
    const changeValue = this.lock ? this.stopAt - this.y : -beginValue
    if (changeValue < 0) {
      this._anime = Tween({ duration: 200 }, (_, cb) => {
        this.y = cb(beginValue, changeValue)
        if (this.y === beginValue + changeValue) {
          this._anime = null
        }
      })
      this._anime.run()
    }
    if (!this.locking && this.lock) {
      this.locking = true
      this.lock = false
      this.$parent.$emit('pull-down-release', this.unlock)
    }
  }

  beforeDestroy() {
    this.clearAnime()
    this.DOMObserver.disconnect()
  }
}
</script>
