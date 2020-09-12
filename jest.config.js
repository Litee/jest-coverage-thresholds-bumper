module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ["<rootDir>/src"],
  clearMocks: true,
  collectCoverage : true,
  collectCoverageFrom : ["./src/**/*.ts", "!./src/index.ts"],
  coverageReporters: [
    "json-summary",
    "text",
  ],
};