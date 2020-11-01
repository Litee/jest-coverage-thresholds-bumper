import fs from "fs";
import { DEFAULT_MARGIN, DEFAULT_PATH_TO_COVERAGE_SUMMARY as DEFAULT_PATH_TO_COVERAGE_SUMMARY_FILE } from "./constants";
import { CoverageThresholdsAdapter, createCoverageThresholdsAdapter } from "./coverage-thresholds-adapters";
import { findFileWithJestConfig } from "./jest-config-file-finder";
import { resolveFile } from "./utils";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require("../package.json");

const loadCoverageSummary = (coverageSummaryPath: string): CoverageSummary => {
    const filePath = resolveFile(process.cwd(), coverageSummaryPath);
    console.info(`Jest coverage summary file: ${filePath}`);
    return require(filePath);
};

export type ThresholdType = "lines" | "statements" | "branches" | "functions";

interface CoverageSummary {
    total: Record<ThresholdType, { pct: number | "Unknown" }>;
}

const updateThresholds = (coverageSummaryFileAsObject: CoverageSummary, coverageThresholdAdapter: CoverageThresholdsAdapter, margin: number): void => {
    const checkAndUpdateThreshold = (thresholdType: ThresholdType) => {
        const oldValue = coverageThresholdAdapter.getThresholdValue(thresholdType);
        const newValue = coverageSummaryFileAsObject.total[thresholdType].pct;
        if (newValue === "Unknown") {
            console.info(`No coverage information for "${thresholdType}" threshold.`);
        } else if (oldValue == null) {
            console.info(`Coverage threshold type ${thresholdType} is not defined. Skipping.`);
        } else {
            if (typeof oldValue === "number" && oldValue < 0) {
                // TODO Bump down uncovered lines too
                console.info(`Ignoring "${thresholdType}" coverage threshold because it is not a positive number.`);
            } else {
                // Ignore negative values, they specify the maximum number of uncovered lines
                if (oldValue === "Unknown" || (typeof oldValue === "number" && oldValue + margin < newValue)) {
                    console.info(`Bumping up "${thresholdType}" coverage threshold from ${oldValue} to ${newValue}.`);
                    coverageThresholdAdapter.setThresholdValue(thresholdType, newValue);
                } else {
                    const oldValueDescription = margin > 0 ? `current value ${oldValue} + margin ${margin}` : `current value ${oldValue}`;
                    console.info(`Ignoring "${thresholdType}" coverage threshold because new value ${newValue} is less or equal to ${oldValueDescription}.`);
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

const getCoverageSummaryFilePath = (coverageSummaryPath: unknown): string => {
    if (coverageSummaryPath == null) {
        // Try to detect coverageDirectory path
        try {
            const { filePath } = findFileWithJestConfig();
            const configContent = fs.readFileSync(filePath, { encoding: "utf8" });
            const match = configContent.match(`(?:"|')?coverageDirectory(?:"|')?\\s*:\\s*(?:"|')(.*)(?:"|')`);
            if (match && match.length > 1) {
                const coverageDirectory = match[1].trim();
                console.info(`Detected custom coverageDirectory value in Jest configuration: ${coverageDirectory}`);
                return coverageDirectory + "/coverage-summary.json";
            }
        } catch (err) {
            console.warn("Failed to detect coverageDirectory value, using the default one");
        }
        return DEFAULT_PATH_TO_COVERAGE_SUMMARY_FILE;
    }
    return coverageSummaryPath as string;
};

export const execute = (argv: Record<string, unknown>): void => {
    if (!argv.version) {
        console.info(`Running Jest Coverage Thresholds Bumper v${packageJson.version}...`);
        const coverageSummaryFilePath = getCoverageSummaryFilePath(argv.coverageSummaryPath);
        const coverageSummaryFileAsObject = loadCoverageSummary(coverageSummaryFilePath);
        const coverageThresholdManager = createCoverageThresholdsAdapter();
        console.info("Jest configuration and code coverage data loaded. Analyzing...");
        updateThresholds(coverageSummaryFileAsObject, coverageThresholdManager, (argv.margin as number) ?? DEFAULT_MARGIN);
        coverageThresholdManager.saveIfDirty((argv.dryRun as boolean) ?? false);
        console.info("Jest Coverage Thresholds Bumper has finished its work!");
    }
};
