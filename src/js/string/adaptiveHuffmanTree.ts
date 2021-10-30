enum NODE_TYPE {
  NULL,
  INTERIOR,
  NORMAL
}

class AHTree {
  emptyNode = new AHNode(this)
  root: AHNode
  charToNode = new Map<string, AHNode>()
  constructor() {
    this.root = this.emptyNode
  }

  traverse(callback: (node: AHNode) => boolean) {
    let i = 0
    const bfs = [this.root]
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

  createOrIncrease(value: string) {
    let node: AHNode = this.charToNode.get(value)
    if (!node) {
      const newNode = new AHNode(this, {
        type: NODE_TYPE.NORMAL,
        weight: 1,
        value
      })
      const parentNode = new AHNode(this, {
        type: NODE_TYPE.INTERIOR,
        weight: this.emptyNode.weight + newNode.weight
      })
      parentNode.left = this.emptyNode
      parentNode.right = newNode
      const oldParent = this.emptyNode.parent
      this.emptyNode.parent = parentNode
      newNode.parent = parentNode
      parentNode.parent = oldParent
      if (this.root === this.emptyNode) {
        this.root = parentNode
      }
      if (oldParent) {
        oldParent.left = parentNode
        oldParent.updateWeight()
      }
      node = newNode
      this.charToNode.set(value, node)
    } else {
      node.weight += 1
      this.ensureValid(node)
      node.parent?.updateWeight()
    }
    return node
  }

  encode(value: string) {
    let node = this.charToNode.get(value)
    let length = 0
    let ret = 0
    for (; node; length++, node = node.parent) {
      if (!(node.isLeftChild() || !node.parent)) {
        ret |= 1 << length
      }
    }
    return [ret, length]
  }

  decode(node: AHNode, bit: number) {
    if (node.type === NODE_TYPE.NORMAL) return node
    if (bit & 1) {
      return node.right
    } else {
      return node.left
    }
  }

  replaceNode(node1: AHNode, node2: AHNode) {
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
      this.root = node1
    } else if (!node2.parent) {
      this.root = node2
    }
  }

  ensureValid(node: AHNode) {
    const list = this.traverse((n) => n === node)
    let l = 0
    let r = list.length - 1
    while (l <= r) {
      const mid = (l + r) >> 1
      if (node.isGreater(list[mid])) {
        if (mid > 0 && node.isGreater(list[mid - 1])) {
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
      const oldParent = node.parent
      this.replaceNode(node, list[l])
      node.parent?.updateWeight()
      const nextNode = list[l]
      list[l] = node
      this.ensureValid(nextNode)
      oldParent?.updateWeight()
    }
  }
}

class AHNode {
  type: NODE_TYPE
  value: string
  weight: number
  left?: AHNode
  right?: AHNode
  parent?: AHNode
  tree?: AHTree
  constructor(tree: AHTree, { type, value, weight }: { type?: NODE_TYPE; value?: string; weight?: number } = {}) {
    this.type = type ?? NODE_TYPE.NULL
    this.value = value ?? ''
    this.weight = weight ?? 0
    this.tree = tree
  }

  isLeftChild() {
    return this.parent && this.parent.left === this
  }

  updateWeight() {
    const oldWeight = this.weight
    this.weight = (this.left?.weight ?? 0) + (this.right?.weight ?? 0)
    if (oldWeight !== this.weight) {
      if (this.parent) {
        this.parent.updateWeight()
      }
      this.tree.ensureValid(this)
    }
  }

  isGreater(other: AHNode) {
    return other.weight < this.weight
  }
}

export { AHTree }
