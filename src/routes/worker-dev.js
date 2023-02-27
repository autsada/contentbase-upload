/**
 * The code below is a workaround to make the workerpool be able to run `.ts` file, we don't need this file to be compiled so need to exclude this file in tsconfig.json.
 */

const path = require("path")

require("ts-node").register()
require(path.resolve(__dirname, "worker.ts"))
