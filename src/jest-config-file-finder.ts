import fs from "fs";
import { resolveFile } from "./utils";

export enum JestConfigFileType {
    PACKAGE_JSON,
    JSON,
    JS_OR_TS,
}

export interface JestConfigFileInfo {
    readonly filePath: string;
    readonly fileType: JestConfigFileType;
}

export const findJestConfigFile = (configPath?: string): JestConfigFileInfo => {
    const currentWorkingDir = process.cwd();
    if (configPath) {
        const jestResolvedConfigPath = resolveFile(currentWorkingDir, configPath);
        if (fs.existsSync(jestResolvedConfigPath)) {
            if (jestResolvedConfigPath.toLowerCase().endsWith("package.json")) {
                return { filePath: jestResolvedConfigPath, fileType: JestConfigFileType.PACKAGE_JSON };
            }
            if (jestResolvedConfigPath.toLowerCase().endsWith(".json")) {
                return { filePath: jestResolvedConfigPath, fileType: JestConfigFileType.JSON };
            }
            if (jestResolvedConfigPath.toLowerCase().endsWith(".js") || jestResolvedConfigPath.toLowerCase().endsWith(".ts")) {
                return { filePath: jestResolvedConfigPath, fileType: JestConfigFileType.JS_OR_TS };
            }
            throw new Error(`Failed to detect Jest config file type: ${jestResolvedConfigPath}`);
        } else {
            throw new Error(`Jest config file not found: ${jestResolvedConfigPath}`);
        }
    } else {
        const jestConfigJsonPath = resolveFile(currentWorkingDir, "./jest.config.json");
        if (fs.existsSync(jestConfigJsonPath)) {
            return { filePath: jestConfigJsonPath, fileType: JestConfigFileType.JSON };
        }
        const jestConfigJsPath = resolveFile(currentWorkingDir, "./jest.config.js");
        if (fs.existsSync(jestConfigJsPath)) {
            return { filePath: jestConfigJsPath, fileType: JestConfigFileType.JS_OR_TS };
        }
        const jestConfigTsPath = resolveFile(currentWorkingDir, "./jest.config.ts");
        if (fs.existsSync(jestConfigTsPath)) {
            return { filePath: jestConfigTsPath, fileType: JestConfigFileType.JS_OR_TS };
        }
        return { filePath: resolveFile(currentWorkingDir, "./package.json"), fileType: JestConfigFileType.PACKAGE_JSON };
    }
};
