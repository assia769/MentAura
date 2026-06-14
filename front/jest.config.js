/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/auth-panel/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@angular|rxjs|zone\\.js)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.html$': '<rootDir>/src/__mocks__/fileMock.js',
    '\\.scss$': '<rootDir>/src/__mocks__/fileMock.js',
    '\\.css$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  collectCoverageFrom: [
    'src/app/pages/landing/auth-panel/**/*.ts',
    '!**/*.spec.ts',
  ],
}