# jest-coverage-thresholds-bumper

[![Build Status](https://travis-ci.org/Litee/jest-coverage-thresholds-bumper.png)](https://travis-ci.org/Litee/jest-coverage-thresholds-bumper)

Tool for [Jest](https://jestjs.io/) testing library that automatically bumps up code coverage thresholds as real code coverage improves. Inspired by <https://github.com/Koleok/jest-coverage-ratchet>, but I decided to re-implement without Ramda (it looks cool, but readability sucks IMO). I am also adding features I need. My team are using this tool for many months now, and it seems to be stable.

Tool supports `jest.config.json`, `jest.config.js`, and `jest.config.ts` configuration files, as well as `jest` section in `package.json`.

## Value

Sometimes you may forget to cover some of your new code with tests. Jest helps to detect that - it it compares code coverage against configured thresholds and fails if there are not enough tests (see https://jestjs.io/docs/configuration#coveragethreshold-object). Unfortunately, it only works if your thresholds are always up to date - e.g. if your specified threshold is 90% and your coverage drops from 92% to 91% then Jest will fail to see that.

`jest-coverage-thresholds-bumper` helps to regularly update configured thresholds, so if your real coverage drops then Jest will report it immediately.

Note that sometimes it could be perfectly normal to decrease configured thresholds (e.g. if you removed a chunk of 100% covered code). In this case, you will have to update threshold values in Jest config and include it into your pull request. This way reviewers will have better visibility on the code coverage impact and why it happens.

## Installation

Assuming that you already have Jest installed, call:

`npm install -D jest-coverage-thresholds-bumper`

## Usage

1. Make sure that Jest has code coverage enabled and uses `json-summary` reporter. It is needed to produce coverage results for analysis.
2. Ensure that you have some threshold values specified in Jest config file (you can start with `0`). `jest-coverage-thresholds-bumper` only updates existing values. Example:

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

When the tool is called, it finds coverage information, compares results with stored threshold values, and bumps up threshold values if results are higher. Note that only defined thresholds are bumped up - i.e. if no thresholds exist, nothing will be bumped.

## Options

```text
Usage: jest-coverage-thresholds-bumper <command> [options]

Options:
  --coverage-summary-path  Path to Jest coverage results                                                    [string] [default: ./coverage/coverage-summary.json]
  --config-path            Path to Jest config file                         [string] [default: Search for jest.config.* files or "jest" section in package.json]
  --margin                 Minimal threshold increase in per cent                                                                          [number] [default: 0]
  --dry-run                Do analysis, but don't change any thresholds                                                               [boolean] [default: false]
  --silent                 No console output unless something goes wrong                                                              [boolean] [default: false]
  --help                   Show help                                                                                                                   [boolean]
  --version                Show version number                                                                                                         [boolean]
```

## FAQ

Q: How `margin` parameter works? What is it for?

A: Imagine that both real and expected coverage are at 90 percent and the margin is 1 percent. If you add a tiny test that increases real coverage by only 0.5 percent then this tool won't bump up the expected coverage. If you add more tests and real coverage improves to 91 or mor percent then your threshold will increase. Some people may use `margin` parameter to ignore little fluctuations in code coverage during active development phase, which could fail builds.

Q: Which NodeJS versions do you support?

A: I am aiming for all currently supported LTS versions. Package might work with older versions, but I am not testing it and won't be fixing issues that happen only with those old versions. Current minimal version is NodeJS v12.
