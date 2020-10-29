import { Declaration, Node, Root, Rule } from 'postcss'
import { promisify } from 'util'
import scss from 'postcss-scss'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

declare module 'postcss' {
  export interface Declaration {
    variable: boolean
  }
}

const statAsync = promisify(fs.stat)
const mkdirAsync = promisify(fs.mkdir)

function normalizeKey(key: string) {
  return key.replace(/\s\r\n/g, '')
}

function overwrite(store: Record<string, Node>, key: string, value: Node) {
  if (store[key]) store[key].remove()
  store[key] = value
}

function mergeRules(rule1: Rule, rule2: Rule) {
  const ctx1 = collect(rule1)
  const ctx2 = collect(rule2)
  for (let type in ctx2) {
    for (let name in ctx2[type]) {
      if (ctx1[type][name]) {
        if (type !== 'rule') {
          rule1.insertAfter(ctx1[type][name], ctx2[type][name])
          ctx1[type][name].remove()
        } else {
          mergeRules(ctx1[type][name], ctx2[type][name])
        }
      } else rule1.append(ctx2[type][name])
      ctx1[type][name] = ctx2[type][name]
    }
  }
  rule2.remove()
}

function collect(root: Rule | Root) {
  const store = {
    var: {},
    prop: {},
    mixin: {},
    function: {},
    include: {},
    rule: {}
  }
  root.each(node => {
    if (node.type === 'decl') {
      if ((node as Declaration).variable) {
        overwrite(store.var, normalizeKey(node.prop), node)
      } else overwrite(store.prop, normalizeKey(node.prop), node)
    } else if (node.type === 'atrule') {
      if (store[node.name]) {
        overwrite(store[node.name], normalizeKey(node.params), node)
      } else console.log(node.name)
    } else if (node.type === 'rule') {
      const key = normalizeKey(node.selector)
      if (store.rule[key]) {
        mergeRules(store.rule[key], node)
      } else {
        store.rule[key] = node
      }
    }
  })
  return store
}

function readAsync(stream: Readable): Promise<string> {
  return new Promise((res) => {
    let output = ''
    stream.on('data', (chunk: string) => {
      output += chunk
    })
    stream.on('end', () => res(output))
  })
}

export default async function removeDuplicate(from: string, to: string) {
  const outputDir = path.dirname(to)
  const stat = await statAsync(outputDir)
  if (!stat.isDirectory()) await mkdirAsync(outputDir, { recursive: true })
  fs.createWriteStream(to)
    .write(
      scss.parse(
        await readAsync(fs.createReadStream(from, { encoding: 'utf-8' })),
        { from }
      )
    )
}
