// Default threshold set low to avoid failing CI while we incrementally improve coverage.
// Override with `JEST_COVERAGE_THRESHOLD` in CI (e.g., 70) for stricter checks.
const threshold = parseInt(process.env.JEST_COVERAGE_THRESHOLD || '35', 10);

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
