#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * This file is executed on the Dockerfile to register 50 Linux users on
 * the Docker image to enable parallel execution to the RCE API.
 */

const fsSync = require("fs");
const fs = require("fs/promises");
const cp = require("child_process");
const console = require("console");
const path = require("path");

// This file should be in CommonJS as it will be called directly.

function execute(command, workingDirectory = process.cwd()) {
  console.log(
    `Executing command: ${command} in working directory ${workingDirectory}`
  );
  return new Promise((resolve, reject) => {
    const cmd = cp.exec(command, { cwd: workingDirectory }, (error) => {
      if (error) {
        reject(error);
      }
    });

    let stdout = "";
    let stderr = "";

    cmd.stdout.on("data", (data) => {
      console.log(data.toString());
      stdout += data.toString();
    });

    cmd.stderr.on("data", (data) => {
      console.error(data.toString());
      stderr += data.toString();
    });

    cmd.on("error", (error) => {
      reject(error);
    });

    cmd.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr));
        return;
      }

      resolve(stdout);
    });
  });
}

function getStubs() {
  const files = fsSync.readdirSync(path.resolve(__dirname, "stubs"));

  return files.map((file) => ({
    file,
    content: fsSync.readFileSync(path.resolve(__dirname, "stubs", file)),
  }));
}

function executeNpmInstallForUser(username, uid) {
  const gid = GLOBAL_GROUP_ID;

  console.log(`Executing npm install for user ${username}...`);

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let output = "";
    let exitCode = 0;
    let exitSignal = "";

    const cmd = cp.spawn("/opt/node/20.9.0/bin/npm", ["install"], {
      cwd: "/code/" + username,
      gid: gid,
      uid: uid,
      timeout: 25000,
      stdio: "pipe",
      detached: true,
      env: {
        PATH: "/opt/node/20.9.0/bin",
      },
    });

    cmd.stdout.on("data", (data) => {
      stdout += data.toString();
      output += data.toString();
      if (process.env.ENVIRONMENT === "development") {
        console.log(data.toString());
      }
    });

    cmd.on("error", (error) => {
      cmd.stdout.destroy();
      cmd.stderr.destroy();
      reject(error.message);
    });

    cmd.on("close", (code, signal) => {
      cmd.stdout.destroy();
      cmd.stderr.destroy();
      exitCode = code ?? 0;
      exitSignal = signal ?? "";
      resolve({
        stdout: stdout.slice(0, 50000),
        stderr: stderr.slice(0, 50000),
        output: output.slice(0, 50000),
        exitCode,
        signal: exitSignal,
      });
    });
  });
}

const TOTAL_USERS = 50;
const GLOBAL_GROUP_ID = 64101;

(async () => {
  await fs.mkdir("/code", { recursive: true });

  // Create a new group
  const groupAddStdout = await execute(
    `groupadd -g ${GLOBAL_GROUP_ID.toString()} code_executors`
  );
  console.log(groupAddStdout.toString());

  const ints = Array.from(Array(TOTAL_USERS).keys());

  for await (const i of ints) {
    const uid = (GLOBAL_GROUP_ID + i).toString();
    const homeDir = `/code/code_executor_${uid}`;
    console.log({ uid, i, homeDir });
    await execute(
      `useradd -M --base-dir ${homeDir} --uid ${uid} --gid ${GLOBAL_GROUP_ID.toString()} --shell /bin/bash --home ${homeDir} --comment "Code executor ${uid}" code_executor_${uid}`
    );

    await fs.mkdir(homeDir, { recursive: true });
    await execute(`chown -R code_executor_${uid}:code_executors ${homeDir}`);
    await execute(`chmod 711 ${homeDir}`);

    // create the stub files in the user home folder.
    for (const file of getStubs()) {
      console.log(`Stubs: writing file ${file.file}...`);
      await fs.writeFile(`${homeDir}/${file.file}`, file.content);
    }

    await execute(`npm install`, homeDir);

    console.log(`Successfully registered user code_executor_${uid}`);
  }
})();
