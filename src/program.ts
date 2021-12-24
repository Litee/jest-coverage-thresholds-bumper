import fs from "fs";
import { DEFAULT_MARGIN, DEFAULT_PATH_TO_COVERAGE_SUMMARY as DEFAULT_PATH_TO_COVERAGE_SUMMARY_FILE } from "./constants";
import { CoverageThresholdsAdapter, createCoverageThresholdsAdapter } from "./coverage-thresholds-adapters";
import { findJestConfigFile, JestConfigFileInfo } from "./jest-config-file-finder";
import { getLogger, Logger } from "./logger";
import { resolveFile } from "./utils";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require("../package.json");

const loadCoverageSummary = (coverageSummaryPath: string, { logger }: Context): CoverageSummary => {
    const filePath = resolveFile(process.cwd(), coverageSummaryPath);
    logger.info(`Jest coverage summary file: ${filePath}`);
    return require(filePath);
};

export type ThresholdType = "lines" | "statements" | "branches" | "functions";

interface CoverageSummary {
    total: Record<ThresholdType, { pct: number | "Unknown" }>;
}

const updateThresholds = (
    coverageSummaryFileAsObject: CoverageSummary,
    coverageThresholdAdapter: CoverageThresholdsAdapter,
    { logger, options }: Context
): void => {
    const checkAndUpdateThreshold = (thresholdType: ThresholdType) => {
        const oldValue = coverageThresholdAdapter.getThresholdValue(thresholdType);
        const newValue = coverageSummaryFileAsObject.total[thresholdType].pct;
        if (newValue === "Unknown") {
            logger.info(`No coverage information for "${thresholdType}" threshold.`);
        } else if (oldValue == null) {
            logger.info(`Coverage threshold type ${thresholdType} is not defined. Skipping.`);
        } else {
            if (typeof oldValue === "number" && oldValue < 0) {
                // TODO Bump down uncovered lines too
                logger.info(`Ignoring "${thresholdType}" coverage threshold because it is not a positive number.`);
            } else {
                // Ignore negative values, they specify the maximum number of uncovered lines
                if (oldValue === "Unknown" || (typeof oldValue === "number" && oldValue + options.margin < newValue)) {
                    logger.info(`"${thresholdType}" coverage threshold should be changed from ${oldValue} to ${newValue}.`);
                    coverageThresholdAdapter.setThresholdValue(thresholdType, newValue);
                } else {
                    const oldValueDescription = options.margin > 0 ? `current value ${oldValue} + margin ${options.margin}` : `current value ${oldValue}`;
                    logger.info(`Ignoring "${thresholdType}" coverage threshold because new value ${newValue} is less or equal to ${oldValueDescription}.`);
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

const getCoverageSummaryFilePath = (coverageSummaryPath: unknown, { logger, jestConfigFileInfo }: Context): string => {
    if (coverageSummaryPath == null) {
        // Try to detect coverageDirectory path
        try {
            const configContent = fs.readFileSync(jestConfigFileInfo.filePath, { encoding: "utf8" });
            const match = configContent.match(`(?:"|')?coverageDirectory(?:"|')?\\s*:\\s*(?:"|')(.*)(?:"|')`);
            if (match && match.length > 1) {
                const coverageDirectory = match[1].trim();
                logger.info(`Detected custom coverageDirectory value in Jest configuration: ${coverageDirectory}`);
                return coverageDirectory + "/coverage-summary.json";
            }
        } catch (err) {
            logger.warn("Failed to detect coverageDirectory value, using the default one.");
        }
        return DEFAULT_PATH_TO_COVERAGE_SUMMARY_FILE;
    }
    return coverageSummaryPath as string;
};

export interface Context {
    readonly logger: Logger;
    readonly options: {
        readonly dryRun: boolean;
        readonly margin: number;
    };
    readonly jestConfigFileInfo: JestConfigFileInfo;
}

export const execute = (argv: Record<string, unknown>): void => {
    if (!argv.version) {
        const logger = getLogger({
            silent: (argv.silent as boolean) ?? false,
        });
        logger.info(`Running Jest Coverage Thresholds Bumper v${packageJson.version}...`);
        const jestConfigFileInfo = findJestConfigFile(argv.configPath as string);
        logger.info("Jest config file found: " + jestConfigFileInfo.filePath);
        const context: Context = {
            logger,
            options: {
                dryRun: (argv.dryRun as boolean) ?? false,
                margin: (argv.margin as number) ?? DEFAULT_MARGIN,
            },
            jestConfigFileInfo,
        };
        const coverageSummaryFilePath = getCoverageSummaryFilePath(argv.coverageSummaryPath, context);
        const coverageSummaryFileAsObject = loadCoverageSummary(coverageSummaryFilePath, context);
        const coverageThresholdManager = createCoverageThresholdsAdapter(context);
        logger.info("Jest configuration and code coverage data loaded. Analyzing...");
        updateThresholds(coverageSummaryFileAsObject, coverageThresholdManager, context);
        coverageThresholdManager.saveIfDirty(context);
        logger.info("Jest Coverage Thresholds Bumper has finished its work!");
    }
};
