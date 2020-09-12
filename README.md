# jest-coverage-thresholds-bumper

[![Build Status](https://travis-ci.org/Litee/jest-coverage-thresholds-bumper.png)](https://travis-ci.org/Litee/jest-coverage-thresholds-bumper)

Tool for Jest testing library that automatically bumps up code coverage thresholds as real code coverage improves. Inspired by <https://github.com/Koleok/jest-coverage-ratchet>, but I decided to re-write without Ramda (looks cool, but not sure about readability) and to add basic support for `jest.config.js`.

This tools should be used with Jest testing library. It automatically bumps up code coverage values in `package.json` or `jest.config.json` or `jest.config.js` files if test results have improved.

## The value

Code coverage by tests ideally should only increase. Automatically bumping thresholds enforces this policy. If one developer added new tests and improved the coverage, another developer won't be able to commit changes that decrease the coverage. Any required decrease in code coverage will be visible in pull requests and people are more likely to notice bad practices.

## How to install

Assuming that you already have Jest installed, call:

`npm install -D jest-coverage-thresholds-bumper`

## Usage

1. Make sure that Jest has code coverage enabled and uses `json-summary` reporter. It is needed to produce a JSON file with coverage results.
1. Call this method after running tests, for example using `package.json` scripts:

```json
"scripts": {
    "test": "jest && jest-coverage-thresholds-bumper"
}
```

When tool is called it finds coverage information, compares results with threshold values and bumps up values if results are higher. Note that only defined thresholds are bumped up - i.e. if no thresholds exists nothing will be bumped.

* You may override path to coverage summary report using `--coverageSummaryPath <path>`  command-line option. If no parameter specified tool will search for `./coverage/coverage-summary.json` file.
* You may specify custom path to Jest configuration file using `--coverageThresholdsPath <path>` command-line option. JSON and JS files are supported. If no parameter specified tool will look for `jest.config.json` and `jest.config.js` files first and if they are not available will try to find "jest" section in `package.json`.
