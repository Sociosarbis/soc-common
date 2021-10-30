import { AHTree } from './adaptiveHuffmanTree'

test('should generate correctly', () => {
  const word = 'bookkeeper'
  const tree = new AHTree()
  for (const c of word) {
    tree.createOrIncrease(c)
  }
  const root = tree.root
  expect(root.weight).toBe(10)
  expect(tree.encode('r')[0]).toBe(0b010101)
  const code = 0b0100
  let node = tree.root
  for (let i = 2; node !== tree.decode(node, code >> i); i--) {
    node = tree.decode(node, code >> i)
  }
  expect(node.value).toBe('b')
})
