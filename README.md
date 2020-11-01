# jest-coverage-thresholds-bumper

[![Build Status](https://travis-ci.org/Litee/jest-coverage-thresholds-bumper.png)](https://travis-ci.org/Litee/jest-coverage-thresholds-bumper)

Tool for [Jest](https://jestjs.io/) testing library that automatically bumps up code coverage thresholds as real code coverage improves. Inspired by <https://github.com/Koleok/jest-coverage-ratchet>, but I decided to re-write without Ramda (it looks cool, but readability sucks IMO) and to add features I missed.

Tool supports `jest.config.json` and `jest.config.js` configuration files, as well as `jest` section in `package.json`.

## Value

Code coverage by tests may drop accidentally if you forget to cover new code with tests. It is easy to notice if your coverage thresholds are matching real coverage exactly. If you do have to decrease coverage then it has to be done explicitly and this fact will be more visible in pull requests.

## Installation

Assuming that you already have Jest installed, call:

`npm install -D jest-coverage-thresholds-bumper`

## Usage

1. Make sure that Jest has code coverage enabled and uses `json-summary` reporter. It is needed to produce coverage results for analysis.
2. Ensure that you have some threshold values specified (you can start with `0`). `jest-coverage-thresholds-bumper` only updates existing values. Example:

```JavaScript
// jest.config.js
...
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      branches: 80,
      functions: 80,
    }
  }
...
```

3. Call `jest-coverage-thresholds-bumper` after running tests, for example:

```json
// package.json
...
"scripts": {
    "test": "jest",
    "posttest": "jest-coverage-thresholds-bumper",
}
...
```

When tool is called it finds coverage information, compares results with threshold values and bumps up values if results are higher. Note that only defined thresholds are bumped up - i.e. if no thresholds exists nothing will be bumped.

## Options

```text
Usage: jest-coverage-thresholds-bumper <command> [options]

Options:
  --coverage-summary-path  path to coverage results               [string] [default: "./coverage/coverage-summary.json"]
  --margin                 minimal threshold increase                                              [number] [default: 0]
  --dry-run                do analysis, but don't change any thresholds                                        [boolean]
  --help                   Show help                                                                           [boolean]
  --version                Show version number                                                                 [boolean]
```
