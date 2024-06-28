import { startVitest } from "vitest/node";
import Fs from "fs";

const vitest = await startVitest("test", {}, { run: true });

await vitest?.close();

const output = Fs.readFileSync("test.output.json").toString();

console.log("TEST_RESULTS_DELIMITER");
console.log(output);
