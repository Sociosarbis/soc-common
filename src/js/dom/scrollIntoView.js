import Tween from '../task/tween'

const axes = {
  x: {
    start: 'left',
    end: 'right',
    scalar: 'width',
    overflow: 'overflowX',
    scroll: 'scrollLeft',
    borderWidth: 'borderLeftWidth',
    clientScalar: 'clientWidth',
    scrollScalar: 'scrollWidth',
    windowScalar: 'innerWidth'
  },
  y: {
    start: 'top',
    end: 'bottom',
    scalar: 'height',
    overflow: 'overflowY',
    scroll: 'scrollTop',
    borderWidth: 'borderTopWidth',
    clientScalar: 'clientHeight',
    scrollScalar: 'scrollHeight',
    windowScalar: 'innerHeight'
  }
}

let element = null
function scrollingElement() {
  if (element) {
    return element
  } else if (document.body.scrollTop) {
    // speed up if scrollTop > 0
    return (element = document.body)
  }
  var iframe = document.createElement('iframe')
  iframe.style.height = '1px'
  document.documentElement.appendChild(iframe)
  var doc = iframe.contentWindow.document
  doc.write('<!DOCTYPE html><div style="height:9999em">x</div>')
  doc.close()
  var isCompliant = doc.documentElement.scrollHeight > doc.body.scrollHeight
  iframe.parentNode.removeChild(iframe)
  return (element = isCompliant ? document.documentElement : document.body)
}

export function getScrollingElement() {
  // reference https://github.com/yangg/scrolling-element/blob/master/scrolling-element.js
  if (document.scrollingElement) return document.scrollingElement
  if (document.body.scrollTop) {
    // speed up if scrollTop > 0
    document.scrollingElement = document.body
  } else {
    const iframe = document.createElement('iframe')
    iframe.style.height = '1px'
    document.documentElement.appendChild(iframe)
    const doc = iframe.contentWindow.document
    doc.write('<!DOCTYPE html><div style="height:9999em">x</div>')
    doc.close()
    const isCompliant = doc.documentElement.scrollHeight > doc.body.scrollHeight
    iframe.parentNode.removeChild(iframe)
    document.scrollingElement = isCompliant ? document.documentElement : document.body
  }
  return document.scrollingElement
}

export default function scrollIntoView(el, target = {}, isSmooth = false) {
  let cur = el.parentElement
  const rect = el.getBoundingClientRect()
  target.x = isNaN(target.x) ? rect.left : target.x
  target.y = isNaN(target.y) ? rect.top : target.y
  let ctx = ['x', 'y'].reduce(function (acc, axis) {
    var axisInfo = axes[axis]
    acc[axisInfo.start] = rect[axisInfo.start]
    acc[axisInfo.scalar] = rect[axisInfo.scalar]
    return acc
  }, {})
  while (cur) {
    const computedStyle = getComputedStyle(cur)
    const curRect = cur.getBoundingClientRect()
    const scrollDist = ['x', 'y'].reduce(
      function (acc, axis, index) {
        var axisInfo = axes[axis]
        var overflow = computedStyle[axisInfo.overflow]
        if (
          ((overflow !== 'visible' && overflow !== 'hidden') || cur === getScrollingElement()) &&
          cur[axisInfo.scrollScalar] > cur[axisInfo.clientScalar]
        ) {
          const curRectStart =
            cur === getScrollingElement()
              ? 0
              : curRect[axisInfo.start] + parseFloat(computedStyle[axisInfo.borderWidth])
          const curRectEnd = curRectStart + cur[axisInfo.clientScalar]
          const maxScroll = cur[axisInfo.scrollScalar] - cur[axisInfo.clientScalar]
          const delta = maxScroll - cur[axisInfo.scroll]
          const deltaToTarget = target[axis] - ctx[axisInfo.start]
          let startDelta = ctx[axisInfo.start] - curRectStart
          let endDelta = ctx[axisInfo.start] + ctx[axisInfo.scalar] - curRectEnd
          if (startDelta < 0 || endDelta <= 0) {
            startDelta = Math.min(Math.max(-deltaToTarget, endDelta), startDelta)
            let scrollDist = -startDelta > cur[axisInfo.scroll] ? -cur[axisInfo.scroll] : startDelta
            acc[index] = scrollDist
            ctx[axisInfo.start] -= scrollDist
          } else {
            if (delta > 0) {
              endDelta = Math.max(Math.min(-deltaToTarget, startDelta), endDelta)
              const scrollDist = endDelta > delta ? delta : endDelta
              acc[index] = scrollDist
              ctx[axisInfo.start] -= scrollDist
            }
          }
        }
        return acc
      },
      [0, 0]
    )
    if (scrollDist[0] || scrollDist[1]) {
      if (isSmooth) {
        const beginX = cur[axes.x.scroll]
        const beginY = cur[axes.y.scroll]
        const curEl = cur
        const anime = Tween({ duration: 250 }, (t, fn) => {
          try {
            curEl[axes.x.scroll] = fn(beginX, scrollDist[0])
            curEl[axes.y.scroll] = fn(beginY, scrollDist[1])
          } catch {
            anime.clear()
          }
        }).run()
      } else {
        cur[axes.x.scroll] += scrollDist[0]
        cur[axes.y.scroll] += scrollDist[1]
      }
    }
    cur = cur.parentElement
  }
}
