import fs from "fs";
import { findFileWithJestConfig } from "./jest-config-file-finder";
import { ThresholdType } from "./program";

export interface CoverageThresholdsAdapter {
    getThresholdValue(thresholdType: ThresholdType): number | null | "Unknown";
    setThresholdValue(thresholdType: ThresholdType, value: number): void;
    saveIfDirty(dryRun: boolean): void;
}

export const createCoverageThresholdsAdapter = (): CoverageThresholdsAdapter => {
    const { filePath, fileType } = findFileWithJestConfig();
    console.info(`Jest coverage thresholds file: ${filePath}`);
    if (fileType === "package.json") {
        return new PackageJsonAdapter(filePath);
    }
    if (fileType === "jest.config.json") {
        return new JestConfigJsonAdapter(filePath);
    }
    if (fileType === "jest.config.js") {
        return new JestConfigJsAdapter(filePath);
    }
    throw Error(`Unsupported file format - use package.json or jest.config.json or jest.config.js. File: ${filePath}`);
};

interface JestConfig {
    coverageThreshold?: {
        global?: Record<ThresholdType, number>;
    };
}

const saveIfDirty = (filePath: string, oldContent: string, newContent: string, dryRun: boolean): void => {
    if (oldContent !== newContent) {
        if (dryRun) {
            console.info("Changed detected, but not updating anything because of the dry run.");
        } else {
            console.info("Changed detected, saving new coverage thresholds...");
            fs.writeFileSync(filePath, newContent);
            console.info(`Coverage thresholds saved: ${filePath}`);
        }
    } else {
        console.info("No changes detected.");
    }
};

abstract class JsonAdapter<T> implements CoverageThresholdsAdapter {
    private readonly originalContent: string;
    protected readonly contentAsObject: T;

    constructor(private readonly filePath: string) {
        this.contentAsObject = require(filePath);
        this.originalContent = this.serialize(this.contentAsObject);
    }

    protected getJestConfigSection(): JestConfig {
        throw new Error("Not implemented");
    }

    public getThresholdValue(thresholdType: ThresholdType) {
        const global = this.getJestConfigSection()?.coverageThreshold?.global ?? ({} as Record<ThresholdType, number>);
        return global[thresholdType] ?? null;
    }

    public setThresholdValue(thresholdType: ThresholdType, value: number) {
        const global = this.getJestConfigSection()?.coverageThreshold?.global ?? ({} as Record<ThresholdType, number>);
        global[thresholdType] = value;
    }

    serialize(contentAsObject: T) {
        return JSON.stringify(contentAsObject, null, 2);
    }

    public saveIfDirty(dryRun: boolean) {
        const newContent = this.serialize(this.contentAsObject);
        saveIfDirty(this.filePath, this.originalContent, newContent, dryRun);
    }
}

class JestConfigJsonAdapter extends JsonAdapter<JestConfig> {
    protected getJestConfigSection() {
        return this.contentAsObject;
    }
}

class PackageJsonAdapter extends JsonAdapter<{ jest: JestConfig }> {
    constructor(filePath: string) {
        super(filePath);
        if (this.getJestConfigSection() == null) {
            throw new Error("package.json file has no 'jest' section!");
        }
    }

    protected getJestConfigSection() {
        return this.contentAsObject.jest as JestConfig;
    }
}

class JestConfigJsAdapter implements CoverageThresholdsAdapter {
    private readonly originalContent: string;
    private content: string;

    constructor(private readonly filePath: string) {
        this.originalContent = fs.readFileSync(filePath, { encoding: "utf8" });
        this.content = this.originalContent;
    }

    getThresholdValue(thresholdType: ThresholdType): number | "Unknown" | null {
        const match = this.content.match(`(?:"|')?${thresholdType}(?:"|')?\\s*:\\s*(-?\\d+(\\.\\d+)?)`);
        if (match && match.length > 1) {
            return parseFloat(match[1]);
        }
        return null;
    }

    setThresholdValue(thresholdType: ThresholdType, value: number): void {
        this.content = this.content.replace(new RegExp(`(${thresholdType}\\s*:\\s*)(-?\\d+(\\.\\d+)?)`, "g"), `$1${value}`);
    }

    saveIfDirty(dryRun: boolean): void {
        saveIfDirty(this.filePath, this.originalContent, this.content, dryRun);
    }
}
