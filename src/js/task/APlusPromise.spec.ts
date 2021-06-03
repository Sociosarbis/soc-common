import { adapter } from './APlusPromise'

const testRunner = require('promises-aplus-tests')

testRunner(adapter, function (err) {
  console.log(err)
})
