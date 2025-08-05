module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/test/**'
  ],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000, // 10 seconds timeout for tests
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  verbose: true
};
