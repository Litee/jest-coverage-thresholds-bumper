import { resolve } from "path";

export const resolveFile = (baseDir: string, fileDir: string): string => {
    return resolve(baseDir, fileDir);
};
