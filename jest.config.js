module.exports = {
  roots: ['<rootDir>/infra/cdk'],
  testMatch: ['**/*.jest.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};