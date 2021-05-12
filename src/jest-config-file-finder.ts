import fs from "fs";
import { resolveFile } from "./utils";

export type ConfigFileType = "package.json" | "jest.config.json" | "jest.config.js" | "jest.config.ts";

export const findFileWithJestConfig = (): { filePath: string; fileType: ConfigFileType } => {
    const currentWorkingDir = process.cwd();
    const jestConfigJsonPath = resolveFile(currentWorkingDir, "./jest.config.json");
    if (fs.existsSync(jestConfigJsonPath)) {
        return { filePath: jestConfigJsonPath, fileType: "jest.config.json" };
    }
    const jestConfigJsPath = resolveFile(currentWorkingDir, "./jest.config.js");
    if (fs.existsSync(jestConfigJsPath)) {
        return { filePath: jestConfigJsPath, fileType: "jest.config.js" };
    }
    const jestConfigTsPath = resolveFile(currentWorkingDir, "./jest.config.ts");
    if (fs.existsSync(jestConfigTsPath)) {
        return { filePath: jestConfigTsPath, fileType: "jest.config.ts" };
    }
    return { filePath: resolveFile(currentWorkingDir, "./package.json"), fileType: "package.json" };
};
