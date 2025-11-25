module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/core/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'packages/core/src/**/*.ts',
    '!packages/core/src/**/*.d.ts',
    '!packages/core/src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  globalSetup: '<rootDir>/packages/core/jest.global-setup.js',
  globalTeardown: '<rootDir>/packages/core/jest.global-teardown.js',
};
