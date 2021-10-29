import { AHNode } from './adaptiveHuffmanTree'

test('should generate correctly', () => {
  const word = 'bookkeeper'
  for (const c of word) {
    AHNode.createOrIncrease(c)
  }
  const root = AHNode.getRoot()
  expect(root.weight).toBe(10)
})
