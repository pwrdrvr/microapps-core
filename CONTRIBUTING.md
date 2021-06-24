# Overview

Instructions, tools, and tips for those wishing to contribute.

# TIP: Installing npm Modules

Attempting to run `npm i` will fail because of a chicken and egg problem with npm 7 workspaces, TypeScript transpiled .js output files, and `bin` in `package.json`. npm wants the files pointed to by `bin` to exist when linking to workspaces, but the `.js` files can't exist until `npm i` and `npm run build` build, which is a circular dependency. npm also, unfortunately, [gives no way to run a script before installing dependencies](https://stackoverflow.com/questions/46725374/how-to-run-a-script-before-installing-any-npm-module) thus we must manually run our script before running `npm i`.

## Creating a Dummy `.js` file for `npm i`

To create the dummy files that will allow `npm i` or `npm ci` to proceed, simply run:

```sh
npm run preinstall
```

## Log Output from Circular Dependency Failure

```log
npm ERR! code ENOENT
npm ERR! syscall chmod
npm ERR! path /Users/myusername/pwrdrvr/microapps-core/node_modules/@pwrdrvr/microapps-publish/dist/src/index.js
npm ERR! errno -2
npm ERR! enoent ENOENT: no such file or directory, chmod '/Users/myusername/pwrdrvr/microapps-core/node_modules/@pwrdrvr/microapps-publish/dist/src/index.js'
npm ERR! enoent This is related to npm not being able to find a file.
npm ERR! enoent
```
