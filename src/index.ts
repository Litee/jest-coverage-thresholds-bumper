import { execute } from "./program";

try {
    execute();
}
catch (err) {
    console.error(`Something went wrong when bumping code coverage thresholds:
==========================================================
${err}`);
    throw err;
}
