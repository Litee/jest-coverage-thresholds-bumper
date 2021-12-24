import fs from "fs";
import { JestConfigFileType } from "./jest-config-file-finder";
import { ThresholdType, Context } from "./program";

export interface CoverageThresholdsAdapter {
    getThresholdValue(thresholdType: ThresholdType): number | null | "Unknown";
    setThresholdValue(thresholdType: ThresholdType, value: number): void;
    saveIfDirty(context: Context): void;
}

export const createCoverageThresholdsAdapter = ({ logger, jestConfigFileInfo }: Context): CoverageThresholdsAdapter => {
    const { filePath, fileType } = jestConfigFileInfo;
    logger.info(`Jest coverage thresholds file: ${filePath}`);
    if (fileType === JestConfigFileType.PACKAGE_JSON) {
        return new PackageJsonAdapter(filePath);
    }
    if (fileType === JestConfigFileType.JSON) {
        return new JestConfigJsonAdapter(filePath);
    }
    if (fileType === JestConfigFileType.JS_OR_TS) {
        return new JestConfigJsAdapter(filePath);
    }
    throw Error(`Unsupported file format - use package.json, jest.config.json, jest.config.js or jest.config.ts. File: ${filePath}`);
};

interface JestConfig {
    coverageThreshold?: {
        global?: Record<ThresholdType, number>;
    };
}

const saveIfDirty = (filePath: string, oldContent: string, newContent: string, { logger, options }: Context): void => {
    if (oldContent !== newContent) {
        if (options.dryRun) {
            logger.info("Changes detected, but not updating thresholds because of the dry run mode.");
        } else {
            logger.info("Changes detected, saving new coverage thresholds...");
            fs.writeFileSync(filePath, newContent);
            logger.info(`Coverage thresholds saved: ${filePath}`);
        }
    } else {
        logger.info("No changes detected.");
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

    public saveIfDirty(context: Context): void {
        const newContent = this.serialize(this.contentAsObject);
        saveIfDirty(this.filePath, this.originalContent, newContent, context);
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

    public saveIfDirty(context: Context): void {
        saveIfDirty(this.filePath, this.originalContent, this.content, context);
    }
}
