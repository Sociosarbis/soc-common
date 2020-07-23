// ==UserScript==
// @name         cookie-transplanter
// @namespace    http://tampermonkey.net/
// @version      0.11
// @require      https://cdnjs.cloudflare.com/ajax/libs/vue/2.6.11/vue.min.js
// @description  try to take over the world!
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'
  const ID = 'cookie-transplanter'
  const ONE_DAY = 24 * 60 * 60 * 1000

  const FIRST_CLASS_DOMAIN = `.${window.location.host.split('.').slice(-2).join('.')}`

  function setCookie(key, value) {
    document.cookie = `${key}=${value};Max-Age=${ONE_DAY};Domain=${FIRST_CLASS_DOMAIN};Path=/;`
  }

  function parseCookies(str) {
    const pairs = str.split(';').filter(Boolean)
    return pairs.reduce((acc, p) => {
      let [k, v] = p.split('=')
      acc[decodeURIComponent(k)] = decodeURIComponent(v)
      return acc
    }, {})
  }

  function parseAndSetCookies(str) {
    const params = parseCookies(str)
    Object.keys(params).forEach((key) => {
      setCookie(key, params[key])
    })
  }

  function addStylesheet(css) {
    const style = document.createElement('style')
    style.innerHTML = css
    document.head.appendChild(style)
  }

  /** @return {any} */
  function noop(...args) {}

  function makeTransit(
    el,
    {
      resolveStartStyle = noop,
      beforeStart = noop,
      beforeEnd = noop,
      onStart = noop,
      onEnd = noop,
      afterStart = noop,
      afterEnd = noop,
      resolveEndStyle = noop
    } = {}
  ) {
    const newAfterStart = () => {
      beforeEnd(el)
      afterStart(el)
    }
    const newAfterEnd = () => {
      beforeStart(el)
      afterEnd(el)
    }
    return (state) => {
      const oldTransition = el.style.transition
      el.style.transition = 'none'
      beforeStart(el)
      let startStyle = resolveStartStyle(el) || {}
      beforeEnd(el)
      let endStyle = resolveEndStyle(el) || {}
      switch (state) {
        case -1:
          beforeEnd(el)
          const tmp = endStyle
          endStyle = startStyle
          startStyle = tmp
          break
        case 1:
          beforeStart(el)
        default:
      }
      Object.keys(startStyle).forEach((key) => {
        el.style.setProperty(key, startStyle[key])
      })
      if (oldTransition) {
        el.style.transition = oldTransition
      } else {
        el.style.removeProperty('transition')
      }
      el.removeEventListener('transitionend', newAfterStart)
      el.removeEventListener('transitionend', newAfterEnd)
      el.addEventListener('transitionend', state === 1 ? newAfterStart : newAfterEnd)
      state === 1 ? onStart(el) : onEnd(el)
      // 需要放到下一帧再渲染，不然会没有过渡效果
      requestAnimationFrame(() => {
        Object.keys(endStyle).forEach((key) => {
          el.style.setProperty(key, endStyle[key])
        })
      })
    }
  }

  function resolveStyle(el) {
    const rect = el.getBoundingClientRect()
    return {
      width: `${rect.width}px`,
      height: `${rect.height}px`
    }
  }

  function removeTransitionStyle(el) {
    el.style.removeProperty('width')
    el.style.removeProperty('height')
    el.classList.remove(`${ID}_animated`)
  }

  function render() {
    const styles = `.${ID} {
      position: fixed;
      top: 0;
      right: 0;
      box-sizing: border-box;
      background-color: #fff;
      font-size: 14px;
      overflow: hidden;
      z-index: 9999;
    }

    .${ID}_animated {
      transition: all 100ms ease-in-out;
    }


    .mt-20 {
      margin-top: 20px;
    }

    .p-20 {
      padding: 20px;
    }

    .p-5 {
      padding: 5px;
    }

    .flex {
      display: flex;
    }

    .w-full {
      width: 100%;
    }

    .text-center {
      text-align: center;
    }

    .${ID}-label {
      width: 80px;
      flex: none;
    }

    .shadow-2xl {
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    #${ID}-cookies {
      resize: vertical;
    }

    .float-left {
      float: left;
    }

    .minimize-leave, minimize-enter {
      transition-property: width, height;
      transition-duration: 100ms;
      transition-timing-function: ease-in-out;
    }
    `

    addStylesheet(styles)

    const container = document.createElement('div')
    document.body.appendChild(container)

    // @ts-ignore
    new Vue({
      el: container,
      data() {
        return {
          form: {
            target: '',
            cookies: ''
          },
          open: false
        }
      },
      mounted() {
        this._transit = makeTransit(this.$el, {
          resolveStartStyle: resolveStyle,
          beforeStart(el) {
            el.classList.remove('w-full')
            el.classList.remove('p-20')
            el.classList.add('p-5')
            el.children[0].style.display = 'none'
            el.children[1].style.display = 'none'
          },
          onStart(el) {
            el.classList.add(`${ID}_animated`)
          },
          afterStart: removeTransitionStyle,
          beforeEnd(el) {
            el.classList.add('w-full')
            el.classList.add('p-20')
            el.classList.remove('p-5')
            el.children[0].style.removeProperty('display')
            el.children[1].style.removeProperty('display')
          },
          onEnd(el) {
            el.classList.add(`${ID}_animated`)
          },
          afterEnd: removeTransitionStyle,
          resolveEndStyle: resolveStyle
        })
        this.$el.classList.add('p-5')
        this.$el.children[0].style.display = 'none'
        this.$el.children[1].style.display = 'none'
      },
      methods: {
        clear() {
          this.form.target = ''
          this.form.cookies = ''
        },
        jump() {
          parseAndSetCookies(this.form.cookies)
          window.location.href = this.form.target
        },
        handleToggle() {
          this.open = !this.open
          this._transit(this.open ? 1 : -1)
        }
      },
      template: `<div class='${ID} text-center shadow-2xl'>
          <form>
            <div class="flex">
              <label class="${ID}-label" for='${ID}-target-url'>跳转地址：</label>
              <input v-model="form.target" class="w-full" id='${ID}-target-url'/>
            </div>
            <div class="mt-20 flex">
              <label class="${ID}-label" for='${ID}-cookies'>cookies：</label>
              <textarea id='${ID}-cookies' class="w-full" v-model="form.cookies"></textarea>
            </div>
            <div class="mt-20"><input id="${ID}-submit" type='button' value='点击跳转' @click="jump" /></div>
          </form>
        <div class="mt-20"><button id="${ID}-clear" @click="clear">清空</button></div>
        <button class="float-left" :class="open ? 'mt-20' : ''" @click="handleToggle">{{ open ? '收起' : '展开' }}</button>
      </div>`
    })
  }

  render()
})()
