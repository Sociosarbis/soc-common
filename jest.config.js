module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.[jt]s$',
  transform: { '\\.js$': 'babel-jest' },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  testEnvironment: 'node'
}
