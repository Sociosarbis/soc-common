<script lang="ts">
import { defineComponent, inject, Ref, PropType } from 'vue-demi'

export default defineComponent({
  props: {
    cx: {
      type: Number,
      default: 0
    },
    cy: {
      type: Number,
      default: 0
    },
    r: {
      type: Number,
      default: 0
    },
    stroke: {
      type: String
    },
    strokeLineCap: {
      type: String as PropType<CanvasLineCap>,
      default: 'round'
    },
    strokeDashArray: {
      type: Array as PropType<number[]>
    },
    strokeDashOffset: {
      type: Number
    },
    strokeWidth: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const contextRef = inject<Ref<CanvasRenderingContext2D>>('context')
    const vRef = inject<Ref<number>>('v')
    let v
    return () => {
      if (contextRef?.value) {
        // 只有当canvas的v改变时才重新渲染
        if (vRef?.value === v) return
        v = vRef?.value
        const context = contextRef.value
        context.save()
        context.beginPath()
        context.lineCap = props.strokeLineCap
        if (props.stroke) {
          context.strokeStyle = props.stroke
        }
        if (props.strokeDashArray) {
          context.setLineDash(props.strokeDashArray)
        }
        context.lineWidth = props.strokeWidth
        if (props.strokeDashOffset) {
          context.lineDashOffset = props.strokeDashOffset
        }
        context.arc(props.cx, props.cy, props.r, Math.PI * -0.5, Math.PI * 1.5)
        context.stroke()
        context.restore()
      }
      return null
    }
  }
})
</script>
