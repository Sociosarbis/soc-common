<template>
  <view class="relative">
    <canvas ref="canvasRef" class="w-full h-full" type="2d" />
    <slot />
  </view>
</template>

<script lang="ts">
import { ref, onMounted, provide, onBeforeUpdate, nextTick, defineComponent } from 'vue-demi'

export default defineComponent({
  props: {
    width: {
      type: Number,
      default: 300
    },
    height: {
      type: Number,
      default: 150
    }
  },
  setup(props) {
    const canvasRef = ref<HTMLCanvasElement>()
    const v = ref(0)
    const contextRef = ref<CanvasRenderingContext2D>()
    provide('v', v)
    provide('context', contextRef)
    onMounted(() => {
      const node = canvasRef.value
      node.width = props.width
      node.height = props.height
      contextRef.value = node.getContext('2d')
    })
    onBeforeUpdate(() => {
      contextRef.value?.clearRect(0, 0, props.width, props.height)
      nextTick(() => {
        v.value = (v.value + 1) % Number.MAX_SAFE_INTEGER
      })
    })
    return {
      canvasRef
    }
  }
})
</script>
