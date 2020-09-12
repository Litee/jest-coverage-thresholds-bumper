import "jest";
import { execute } from "./program";
import fs from "fs";

jest.mock('fs');
jest.mock('./utils.ts', () => ({
    resolveFile: (baseDir: string, fileDir: string) => fileDir,
}));

describe('when running execute function', () => {
    const saveNewThresholds = jest.fn();
    const coverageSummaryFileAsObject = {"total": {"lines":{"total":1,"covered":0,"skipped":0,"pct":12},"statements":{"total":1,"covered":0,"skipped":0,"pct":23},"functions":{"total":0,"covered":0,"skipped":0,"pct":34},"branches":{"total":4,"covered":0,"skipped":0,"pct":45}}} as const;
    let jestConfigJsonFileAsObject: any;
    let packageJsonFileAsObject: any;
    let jestConfigJsFile: any;
    
    beforeEach(() => {
        jest.resetModules();
        // Some values are higher then values in summary, some values are negative - should not be changed, "statements" value is missing - should be ignored
        jestConfigJsonFileAsObject = {
            "coverageThreshold": {
                "global": {
                    "branches": 90,
                    "functions": -10,
                    "lines": 10,
                },
            },
        };
        packageJsonFileAsObject = {
            "name": "jest-coverage-thresholds-bumper-test",
            "version": "0.0.1",
            "jest": jestConfigJsonFileAsObject,
        };
        jestConfigJsFile = `module.exports = {
            coverageThreshold: {
                global: {
                    branches: 90,
                    functions: -10,
                    lines: 10,
                },
            },
        }`;
        fs.writeFileSync = jest.fn();
    });

    describe('and input files exist', () => {
        beforeEach(() => {
            jest.mock("./coverage/coverage-summary.json", () => {
                return coverageSummaryFileAsObject;
            }, {virtual: true});
        });

        describe('and thresholds file has package.json format', () => {    
            describe('and jest section exists', () => {
                beforeEach(() => {
                    jest.mock("./package.json", () => {
                        return packageJsonFileAsObject;
                    }, {virtual: true});
                });
                
                it("should update coverage thresholds", () => {
                    execute();
                    expect(fs.writeFileSync).toBeCalled();
                    expect(fs.writeFileSync).toMatchSnapshot();
                });
            });        

            describe('but jest section does not exist', () => {
                beforeEach(() => {
                    const {jest: _, ...packageJsonFileAsObjectWithoutJestSection} = packageJsonFileAsObject;
                    jest.mock("./package.json", () => {
                        return packageJsonFileAsObjectWithoutJestSection;
                    }, {virtual: true});
                });

                it('should fail', () => {
                    expect(() => execute()).toThrowErrorMatchingSnapshot();
                });
            });
        });

        describe('and thresholds file has jest.config.json format', () => {
            beforeEach(() => {
                fs.existsSync = jest.fn((path) => {
                    console.debug(path);
                    return path === "./jest.config.json";
                });
            });

            describe('and coverageThresholds section exists', () => {
                beforeEach(() => {
                    jest.mock("./jest.config.json", () => {
                        return jestConfigJsonFileAsObject;
                    }, {virtual: true});
                });

                it("should update coverage thresholds", () => {
                    execute();
                    expect(fs.writeFileSync).toBeCalled();
                    expect(fs.writeFileSync).toMatchSnapshot();
                });
            });

            describe('but coverageThresholds section does not exist', () => {
                beforeEach(() => {
                    jest.mock("./jest.config.json", () => {
                        return {};
                    }, {virtual: true});
                });

                it("should not update the file", () => {
                    execute();
                    expect(fs.writeFileSync).not.toBeCalled();
                });
            });
        });

        describe('and thresholds file has jest.config.js format', () => {
            beforeEach(() => {
                fs.existsSync = jest.fn((path) => {
                    console.debug(path);
                    return path === "./jest.config.js";
                });
                fs.readFileSync = jest.fn((path) => {
                    return jestConfigJsFile;
                });
            });

            it("should update coverage thresholds", () => {
                execute();
                expect(fs.writeFileSync).toBeCalled();
                expect(fs.writeFileSync).toMatchSnapshot();
            });
        });
    });
});