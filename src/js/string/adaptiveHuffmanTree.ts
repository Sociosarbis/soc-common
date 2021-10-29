enum NODE_TYPE {
  NULL,
  NORMAL,
  INTERIOR
}

class AHNode {
  type: NODE_TYPE
  value: string
  weight: number
  left?: AHNode
  right?: AHNode
  parent?: AHNode
  constructor({ type, value, weight }: { type?: NODE_TYPE; value?: string; weight?: number } = {}) {
    this.type = type ?? NODE_TYPE.NULL
    this.value = value ?? ''
    this.weight = weight ?? 0
  }

  static getRoot() {
    return root
  }

  static traverse(callback: (node: AHNode) => boolean) {
    let i = 0
    const bfs = [root]
    while (i != bfs.length) {
      const n = bfs.length
      for (; i < n; i++) {
        if (callback(bfs[i])) {
          bfs.length = i
          return bfs
        }
        if (bfs[i].right) {
          bfs.push(bfs[i].right)
        }
        if (bfs[i].left) {
          bfs.push(bfs[i].left)
        }
      }
      i = n
    }
    return bfs
  }

  static createOrIncrease(value: string) {
    let node: AHNode = null
    const list = AHNode.traverse((n) => {
      if (n.value === value) {
        node = n
        return true
      }
    })
    if (!node) {
      const newNode = new AHNode({
        type: NODE_TYPE.NORMAL,
        weight: 1,
        value
      })
      const parentNode = new AHNode({
        type: NODE_TYPE.INTERIOR,
        weight: emptyNode.weight + newNode.weight
      })
      parentNode.left = emptyNode
      parentNode.right = newNode
      const oldParent = emptyNode.parent
      emptyNode.parent = parentNode
      newNode.parent = parentNode
      parentNode.parent = oldParent
      if (root === emptyNode) {
        root = parentNode
      }
      if (oldParent) {
        oldParent.left = parentNode
        oldParent.updateWeight()
        AHNode.ensureValid(oldParent)
      }
    } else {
      node.weight += 1
      AHNode.ensureValid(node, list)
    }
  }

  isLeftChild() {
    return this.parent && this.parent.left === this
  }

  static replaceNode(node1: AHNode, node2: AHNode) {
    const node1Parent = node1.parent
    const isLeftChild1 = node1.isLeftChild()
    const node2Parent = node2.parent
    const isLeftChild2 = node2.isLeftChild()
    if (node1Parent) {
      if (isLeftChild1) {
        node1Parent.left = node2
      } else {
        node1Parent.right = node2
      }
    }
    if (node2Parent) {
      if (isLeftChild2) {
        node2Parent.left = node1
      } else {
        node2Parent.right = node1
      }
    }
    node1.parent = node2Parent
    node2.parent = node1Parent
    if (!node1.parent) {
      root = node1
    } else if (!node2.parent) {
      root = node2
    }
  }

  updateWeight() {
    this.weight = (this.left?.weight ?? 0) + (this.right?.weight ?? 0)
    if (this.parent) this.parent.updateWeight()
  }

  static ensureValid(node: AHNode, list?: AHNode[]) {
    list = list ?? AHNode.traverse((n) => n.value === node.value)
    let l = 0
    let r = list.length - 1
    while (l <= r) {
      const mid = (l + r) >> 1
      if (list[mid].weight < node.weight) {
        if (mid > 0 && list[mid - 1].weight < node.weight) {
          r = mid - 1
        } else {
          l = mid
          break
        }
      } else {
        l = mid + 1
      }
    }
    if (l < list.length && node != list[l]) {
      AHNode.replaceNode(node, list[l])
      node.parent?.updateWeight()
      const nextNode = list[l]
      list[l] = node
      AHNode.ensureValid(nextNode, list)
      if (nextNode.parent) AHNode.ensureValid(nextNode.parent)
      if (node.parent && node.parent !== nextNode.parent) AHNode.ensureValid(node.parent)
    }
  }
}

const emptyNode = new AHNode()
let root = emptyNode

export { AHNode }
