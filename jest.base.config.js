const threshold = parseInt(process.env.JEST_COVERAGE_THRESHOLD || '70', 10);

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: threshold,
      functions: threshold,
      lines: threshold,
      statements: threshold,
    },
  },
  clearMocks: true,
  restoreMocks: true,
};
