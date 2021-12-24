export interface LoggerOptions {
    readonly silent: boolean;
}

export type Logger = Pick<typeof console, "info" | "warn">;

export const getLogger = (options: LoggerOptions): Logger => ({
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
