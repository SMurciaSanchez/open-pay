// Jest con el compilador de Next (SWC): entiende TypeScript y el alias @/.
const nextJest = require('next/jest');

module.exports = nextJest({ dir: './' })({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
});
