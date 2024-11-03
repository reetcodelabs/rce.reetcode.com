# Remote code execution for reetcode.com

This is a fork / copy of pesto rce.

### Commands

Build docker image:

```sh
docker build -f Dockerfile.dev . --platform linux/x86_64 -t rce.reetcode.com
```

Run docker image which exposes api endpoint:

```sh
docker run -dp 127.0.0.1:50051:50051 --platform linux/x86_64 rce.reetcode.com
```

## Execution for javascript-20 package

1. For execution, file called "package.json" must be provided. This file must have a script called "execute". The script will contain the command to execute the project. The command can use any of the globally installed packages such as jest, vitest, jsdom.

2. The rce will run `/opt/node/20.9.0/bin/npm run execute` at the root of the project.

### Findings

1. Using global packages when executing the code isn't working out. So before running the command in javascript, execute an npm install of all packages we'll need. This means we'll write a package.json file if it does not exist. Or, we write this package.json file at build time. We then run the npm install command using `spawn`. Should be able to do all of this during build, even though it'll make for a long as build sequence.

2. After npm install, we execute the regular run command sequences to run the tests.

# How to run with docker:

1. Build container: `docker build -f Dockerfile.dev . --platform linux/x86_64 -t rce.reetcode.com`
2. Run container: `docker run rce.reetcode.com`
3. Done
