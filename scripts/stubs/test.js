import { expect } from "@japa/expect";
import * as reporters from "@japa/runner/reporters";
import { configure, processCLIArgs, run } from "@japa/runner";

processCLIArgs(process.argv.splice(2));

configure({
  files: ["tests/**/*.spec.js"],
  plugins: [expect()],
  reporters: {
    activated: ["ndjson"],
    list: [reporters.spec(), reporters.ndjson(), reporters.dot()]
  }
});

run();
