const base = require('../../jest.base.config.cjs');

module.exports = {
<<<<<<< HEAD
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Use src relative to the package root so the config works when running
  // tests from the monorepo root or inside the package directory.
  roots: ['<rootDir>/src'],
=======
  ...base,
  roots: ['<rootDir>/src'],

>>>>>>> main
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
<<<<<<< HEAD
    // Collect coverage from files inside this package's src dir
=======
>>>>>>> main
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
};
