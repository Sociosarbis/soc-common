import Promise from 'bluebird'

import { BatchTaskSet } from './flowController'
import { sleep } from './index'

test('BatchTaskSet functionality', (done) => {
  const taskResult = []
  const taskCreator = Promise.coroutine(
    /**
     * @param {number} id
     */ function* (id) {
      yield sleep(Math.floor(Math.random() * 3 + 1))
      taskResult.push(id)
    }
  )

  const batchTaskSet = new BatchTaskSet(5)
  for (let i = 0; i < 20; i++) {
    batchTaskSet.add(taskCreator, i)
    if (i == 5) {
      expect(batchTaskSet.size).toEqual(5)
    }
  }

  batchTaskSet.on('size-change', ({ newVal }) => {
    if (newVal === 0) {
      try {
        expect(taskResult.length).toEqual(100)
      } catch {}
      done()
    }
  })
}, 12000)
