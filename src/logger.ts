import { TypedOptions } from "./program";

export const getLogger = (options: TypedOptions) => ({
    info(message?: any, ...optionalParams: any[]) {
        if (!options.silent) {
            console.info(message, ...optionalParams);
        }
    },
    warn(message?: any, ...optionalParams: any[]) {
        if (!options.silent) {
            console.warn(message, ...optionalParams);
        }
    },
});
