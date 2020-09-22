import fs from "fs";
import { argv } from "yargs";
import { resolveFile } from "./utils";

const loadCoverageSummary = () => {
    const filePath = resolveFile(process.cwd(), argv.coverageSummaryPath as string ?? "./coverage/coverage-summary.json");
    console.info(`Jest coverage summary file: ${filePath}`);
    return require(filePath);
};

const createCoverageThresholdsManager = (): CoverageThresholdsAdapter => { 
    const currentWorkingDir = process.cwd();
    let filePath: string = resolveFile(currentWorkingDir, "./package.json");
    if (argv.coverageThresholdsPath) {
        filePath = resolveFile(currentWorkingDir, argv.coverageThresholdsPath as string);
    }
    else {        
        const jestConfigJsonPath = resolveFile(currentWorkingDir, "./jest.config.json");
        if (fs.existsSync(jestConfigJsonPath)) {
            filePath = jestConfigJsonPath;
        }
        else {
            const jestConfigJsPath = resolveFile(currentWorkingDir, "./jest.config.js");
            if (fs.existsSync(jestConfigJsPath)) {
                filePath = jestConfigJsPath;
            }
        }
    }
    console.info(`Jest coverage thresholds file: ${filePath}`);
    if (filePath.toLowerCase().endsWith("package.json")) {
        return new PackageJsonAdapter(filePath);
    }
    if (filePath.toLowerCase().endsWith("jest.config.json")) {
        return new JestConfigJsonAdapter(filePath);
    }
    if (filePath.toLowerCase().endsWith("jest.config.js")) {
        return new JestConfigJsAdapter(filePath);
    }
    throw Error(`Unsupported file format - use package.json or jest.config.json or jest.config.js. File: ${filePath}`);
};

interface CoverageThresholdsAdapter {
    getThresholdValue(thresholdType: string): number | null | "Unknown";
    setThresholdValue(thresholdType: string, value: number): void;
    saveIfDirty(): void;
}

class JestConfigJsonAdapter implements CoverageThresholdsAdapter {
    private readonly originalContent: string;
    protected readonly contentAsObject: any;

    constructor(private readonly filePath: string) {
        this.contentAsObject= require(filePath);
        this.originalContent = this.serialize(this.contentAsObject);
    }

    public getThresholdValue(thresholdType: string) {
        return this.getJestConfigSection()?.coverageThreshold?.global[thresholdType] ?? null;
    }

    public setThresholdValue(thresholdType: string, value: number) {
        this.getJestConfigSection().coverageThreshold.global[thresholdType] = value;
    }

    protected getJestConfigSection() {
        return this.contentAsObject;
    }

    serialize(contentAsObject: any) {
        return JSON.stringify(contentAsObject, null, 2) 
    }

    public saveIfDirty() {
        const newContent = this.serialize(this.contentAsObject);
        if (this.originalContent !== newContent) {
            console.info("Changed detected, saving coverage thresholds...");
            fs.writeFileSync(this.filePath, newContent);
            console.info(`Coverage thresholds updated: ${this.filePath}`);
        }
        else {
            console.info("No changes detected.");
        }
    }
}

class PackageJsonAdapter extends JestConfigJsonAdapter {
    constructor(filePath: string) {
        super(filePath);
        if (this.getJestConfigSection() == null) {
            throw new Error("package.json file has no 'jest' section!");
        }
    }

    protected getJestConfigSection() {
        return this.contentAsObject.jest;
    }
}

class JestConfigJsAdapter implements CoverageThresholdsAdapter {
    private readonly originalContent: string;
    private content: string;

    constructor(private readonly filePath: string) {
        this.originalContent = fs.readFileSync(filePath, {encoding: "utf8"});
        this.content = this.originalContent;
    }

    // TODO Support quoted threshold type keys
    getThresholdValue(thresholdType: string): number | "Unknown" | null {
        const match = this.content.match(`${thresholdType}\\s*:\\s*(-?\\d+(\\.\\d+)?)`);
        if (match && match.length > 1) {
            return parseInt(match[1]);
        }
        return null;
    }

    setThresholdValue(thresholdType: string, value: number): void {
        this.content = this.content.replace(new RegExp(`(${thresholdType}\\s*:\\s*)(-?\\d+(\\.\\d+)?)`, "g"), `$1${value}`);
    }

    saveIfDirty(): void {
        if (this.originalContent !== this.content) {
            console.info("Changed detected, saving coverage thresholds...");
            fs.writeFileSync(this.filePath, this.content);
            console.info(`Coverage thresholds updated: ${this.filePath}`);
        }
        else {
            console.info("No changes detected.");
        }
    }
}

const updateThresholds = (coverageSummaryFileAsObject: any, coverageThresholdManager: CoverageThresholdsAdapter): void => {
    const checkAndUpdateThreshold = (thresholdType: string) => {
        const oldValue = coverageThresholdManager.getThresholdValue(thresholdType);
        const newValue = coverageSummaryFileAsObject.total[thresholdType].pct;
        if (newValue === "Unknown") {
            console.info(`No coverage information for "${thresholdType}" threshold.`);
        }
        else if (oldValue == null) {
            console.info(`Coverage threshold type ${thresholdType} is not defined. Skipping.`);
        }
        else {
            if (typeof oldValue === "number" && oldValue < 0) {
                // TODO Bump down uncovered lines too
                console.info(`Ignoring "${thresholdType}" coverage threshold - it is not using coverage percentage.`);
            }
            else {
                // Ignore negative values, they specify the maximum number of uncovered lines
                if (oldValue === "Unknown" || (typeof oldValue === "number" && oldValue < newValue)) {
                    console.info(`Bumping up "${thresholdType}" coverage threshold value from ${oldValue} to ${newValue}.`);
                    coverageThresholdManager.setThresholdValue(thresholdType, newValue);
                }
                else {
                    console.info(`Ignoring "${thresholdType}" coverage threshold - new value ${newValue} <= ${oldValue}.`);
                }
            }
        }
    };
    // return true is nothing updated
    checkAndUpdateThreshold("lines");
    checkAndUpdateThreshold("statements");
    checkAndUpdateThreshold("branches");
    checkAndUpdateThreshold("functions"); 
};

export const execute = () => {
    console.info("Running Jest coverage thresholds bumper...");
    const coverageSummaryFileAsObject = loadCoverageSummary();
    const coverageThresholdManager = createCoverageThresholdsManager();
    console.info("Jest code coverage data loaded.");
    updateThresholds(coverageSummaryFileAsObject, coverageThresholdManager);
    coverageThresholdManager.saveIfDirty();
};