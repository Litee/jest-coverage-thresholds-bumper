import "jest";
import { execute } from "./program";
import fs from "fs";

jest.mock("fs");
jest.mock("./utils.ts", () => ({
    resolveFile: (baseDir: string, fileDir: string) => fileDir,
}));

describe("when running execute() function", () => {
    const coverageSummaryFileAsObject = {
        total: {
            lines: { total: 1, covered: 0, skipped: 0, pct: 12 },
            statements: { total: 1, covered: 0, skipped: 0, pct: 23.4 },
            functions: { total: 0, covered: 0, skipped: 0, pct: 34.56 },
            branches: { total: 4, covered: 0, skipped: 0, pct: 45.678 },
        },
    } as const;

    // Some values are higher then values in summary, some values are negative - should not be changed, "statements" value is missing - should be ignored
    const jestConfigJsonFileAsObject1 = {
        coverageThreshold: {
            global: {
                branches: 90,
                functions: -10,
                lines: 10,
            },
        },
    } as const;
    const jestConfigJsonFileAsObject2 = {
        coverageThreshold: {
            global: {
                branches: 1,
                functions: 2.3,
                lines: 3.45,
            },
        },
    } as const;

    beforeEach(() => {
        jest.resetModules();
        fs.writeFileSync = jest.fn();
    });

    describe("and input files exist", () => {
        beforeEach(() => {
            jest.mock(
                "./coverage/coverage-summary.json",
                () => {
                    return coverageSummaryFileAsObject;
                },
                { virtual: true }
            );
        });

        describe.each([
            {
                packageJsonFileAsObject: {
                    name: "jest-coverage-thresholds-bumper-test",
                    version: "0.0.1",
                    jest: JSON.parse(JSON.stringify(jestConfigJsonFileAsObject1)),
                },
            },
            {
                packageJsonFileAsObject: {
                    name: "jest-coverage-thresholds-bumper-test",
                    version: "0.0.1",
                    jest: JSON.parse(JSON.stringify(jestConfigJsonFileAsObject2)),
                },
            },
        ])("and thresholds file has package.json format", ({ packageJsonFileAsObject }) => {
            describe("and jest section exists", () => {
                beforeEach(() => {
                    jest.mock(
                        "./package.json",
                        () => {
                            return packageJsonFileAsObject;
                        },
                        { virtual: true }
                    );
                });

                it("should update coverage thresholds", () => {
                    execute({ dryRun: false });
                    expect(fs.writeFileSync).toBeCalled();
                    expect(fs.writeFileSync).toMatchSnapshot();
                });
            });

            describe("but jest section does not exist", () => {
                beforeEach(() => {
                    const { jest: _, ...packageJsonFileAsObjectWithoutJestSection } = packageJsonFileAsObject;
                    jest.mock(
                        "./package.json",
                        () => {
                            return packageJsonFileAsObjectWithoutJestSection;
                        },
                        { virtual: true }
                    );
                });

                it("should fail", () => {
                    expect(() => execute({ dryRun: false })).toThrowErrorMatchingSnapshot();
                });
            });
        });

        describe.each([
            {
                jestConfigJsonFileAsObject: JSON.parse(JSON.stringify(jestConfigJsonFileAsObject1)),
            },
            {
                jestConfigJsonFileAsObject: JSON.parse(JSON.stringify(jestConfigJsonFileAsObject2)),
            },
        ])("and thresholds file has jest.config.json format", ({ jestConfigJsonFileAsObject }) => {
            beforeEach(() => {
                fs.existsSync = jest.fn((path) => {
                    console.debug(path);
                    return path === "./jest.config.json";
                });
            });

            describe("and coverageThresholds section exists", () => {
                beforeEach(() => {
                    jest.mock(
                        "./jest.config.json",
                        () => {
                            return jestConfigJsonFileAsObject;
                        },
                        { virtual: true }
                    );
                });

                it("should update coverage thresholds", () => {
                    execute({ dryRun: false });
                    expect(fs.writeFileSync).toBeCalled();
                    expect(fs.writeFileSync).toMatchSnapshot();
                });
            });

            describe("but coverageThresholds section does not exist", () => {
                beforeEach(() => {
                    jest.mock(
                        "./jest.config.json",
                        () => {
                            return {};
                        },
                        { virtual: true }
                    );
                });

                it("should not update the file", () => {
                    execute({ dryRun: false });
                    expect(fs.writeFileSync).not.toBeCalled();
                });
            });
        });

        describe.each([
            {
                jestConfigJsonFileAsObject: JSON.parse(JSON.stringify(jestConfigJsonFileAsObject1)),
            },
            {
                jestConfigJsonFileAsObject: JSON.parse(JSON.stringify(jestConfigJsonFileAsObject2)),
            },
        ])("and thresholds file has jest.config.json format specified as an argument", ({ jestConfigJsonFileAsObject }) => {
            beforeEach(() => {
                fs.existsSync = jest.fn((path) => {
                    console.debug(path);
                    return path === "./custom/jest.custom.config.json";
                });
            });

            describe("and coverageThresholds section exists", () => {
                beforeEach(() => {
                    jest.mock(
                        "./custom/jest.custom.config.json",
                        () => {
                            return jestConfigJsonFileAsObject;
                        },
                        { virtual: true }
                    );
                });

                it("should update coverage thresholds", () => {
                    execute({ dryRun: false, configFilePath: "./custom/jest.custom.config.json" });
                    expect(fs.writeFileSync).toBeCalled();
                    expect(fs.writeFileSync).toMatchSnapshot();
                });
            });

            describe("but coverageThresholds section does not exist", () => {
                beforeEach(() => {
                    jest.mock(
                        "./custom/jest.custom.config.json",
                        () => {
                            return {};
                        },
                        { virtual: true }
                    );
                });

                it("should not update the file", () => {
                    execute({ dryRun: false, configFilePath: "./custom/jest.custom.config.json" });
                    expect(fs.writeFileSync).not.toBeCalled();
                });
            });
        });

        describe.each([
            {
                jestConfigJsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            lines: 10,
                        },
                    },
                }` as any,
                margin: 0,
            },
            {
                jestConfigJsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            branches: 10.0,
                            functions: 1.12,
                            lines: 0.987,
                        },
                    },
                }` as any,
                margin: 0,
            },
            {
                jestConfigJsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            branches: 40,
                            functions: 30,
                            lines: 10,
                        },
                    },
                }` as any,
                margin: 5,
            },
        ])("and thresholds file has jest.config.js format", ({ jestConfigJsFile, margin }) => {
            beforeEach(() => {
                fs.existsSync = jest.fn((path) => {
                    console.debug(path);
                    return path === "./jest.config.js";
                });
                fs.readFileSync = jest.fn(() => {
                    return jestConfigJsFile;
                });
            });

            it("should update coverage thresholds", () => {
                execute({ margin, dryRun: false });
                expect(fs.writeFileSync).toBeCalled();
                expect(fs.writeFileSync).toMatchSnapshot();
            });
        });
        describe.each([
            {
                jestConfigJsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            lines: 10,
                        },
                    },
                }` as any,
                margin: 0,
            },
            {
                jestConfigJsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            branches: 10.0,
                            functions: 1.12,
                            lines: 0.987,
                        },
                    },
                }` as any,
                margin: 0,
            },
            {
                jestConfigJsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            branches: 40,
                            functions: 30,
                            lines: 10,
                        },
                    },
                }` as any,
                margin: 5,
            },
        ])("and thresholds file has jest.config.js format specified as argument", ({ jestConfigJsFile, margin }) => {
            beforeEach(() => {
                fs.existsSync = jest.fn((path) => {
                    console.debug(path);
                    return path === "./custom/jest.custom.config.js";
                });
                fs.readFileSync = jest.fn(() => {
                    return jestConfigJsFile;
                });
            });

            it("should update coverage thresholds", () => {
                execute({ margin, dryRun: false, configFilePath: "./custom/jest.custom.config.js" });
                expect(fs.writeFileSync).toBeCalled();
                expect(fs.writeFileSync).toMatchSnapshot();
            });
        });

        describe.each([
            {
                jestConfigTsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            lines: 10,
                        },
                    },
                }` as any,
                margin: 0,
            },
            {
                jestConfigTsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            branches: 10.0,
                            functions: 1.12,
                            lines: 0.987,
                        },
                    },
                }` as any,
                margin: 0,
            },
            {
                jestConfigTsFile: `module.exports = {
                    coverageThreshold: {
                        global: {
                            branches: 40,
                            functions: 30,
                            lines: 10,
                        },
                    },
                }` as any,
                margin: 5,
            },
        ])("and thresholds file has jest.config.ts format", ({ jestConfigTsFile, margin }) => {
            beforeEach(() => {
                fs.existsSync = jest.fn((path) => {
                    console.debug(path);
                    return path === "./jest.config.ts";
                });
                fs.readFileSync = jest.fn(() => {
                    return jestConfigTsFile;
                });
            });

            it("should update coverage thresholds", () => {
                execute({ margin, dryRun: false });
                expect(fs.writeFileSync).toBeCalled();
                expect(fs.writeFileSync).toMatchSnapshot();
            });
        });
    });
});
