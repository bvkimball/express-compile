## express-compile

express-compile is middleware that compiles JS and CSS on the fly within your express application.  This project is based off the electron-compile [electron-compile](https://github.com/paulcbetts/electron-compile) project and uses the same compilers.

For JavaScript:

* JavaScript ES6/ES7 (via Babel)
* TypeScript
* CoffeeScript

For CSS:

* LESS
* Sass/SCSS

### How does it work?

Put this at the top of your Express app:

```js
import compiler from 'express-compile';

app.use(compiler({
    root: 'public',
    paths: ['public/scripts/**/*','public/styles/**/*']
}));
app.use(express.static('/public')); 

```

This will check every file in your public directory if it has a compiler associated with it, the compiled version will be returned, otherwise the original source with be returned.

From then on, you can now simply include files directly in your HTML, no need for cross-compilation:

```html
<head>
  <script src="main.coffee"></script>
  <link rel="stylesheet" type="text/css" href="main.less" />
</head>
```

or just require them in:

```js
require('./mylib')   // mylib.ts
```

### Babel keeps running on my ES5 source

Add `'use nobabel';` to the top of your file to opt-out of Babel compilation.

### My files are compiled into the CommonJS format?

Yes. This is because the project is forked from electron which uses node-webkit. It is recommended that you use [require1k](https://github.com/Stuk/require1k) a CommonJS loader for browsers, this allows you to setup your project with little to no configuration, but you can always pass compiler options as described below.

### How do I set up (Babel / LESS / whatever) the way I want?

In order to configure individual compilers, use the `initWithOptions` method:

```js
let babelOpts = {
  stage: 2
};

app.use(compiler({
    root: 'public',
    paths: ['public/scripts/**/*','public/styles/**/*'],
    compilerOpts: {
        // Compiler options are a map of extension <=> options for compiler
        js: babelOpts
    }
}));

```

## How can I precompile my code for release-time?

express-compile comes with a command-line application to pre-create a cache for you.

```sh
Usage: express-compile --target [target-path] paths...

Options:
  -t, --target   The target directory to write a cache directory to
  -v, --verbose  Print verbose information
  -h, --help     Show help
```

Once you create a cache folder, pass it in as a parameter to `initForProduction()`. Ship the cache folder with your application, and you won't need to compile the app on first-run:

```js
app.use(compiler({
    root: 'public',
    paths: ['public/scripts/**/*','public/styles/**/*'],
    cacheDir: 'path/to/cache/dir'
}));

```

In order to save space in your application, you can also delete `node_modules/express-compile/node_modules/express-compilers` in production so that you're not shipping the compiler implementations themselves (~56MB uncompressed).

Compilation also has its own API:

```js
// Public: Compiles a single file given its path.
//
// filePath: The path on disk to the file
// compilers: (optional) - An {Array} of objects conforming to {CompileCache}
//                         that will be tried in-order to compile code. You must
//                         call init() first if this parameter is null.
//
// Returns a {String} with the compiled output, or will throw an {Error} 
// representing the compiler errors encountered.
export function compile(filePath, compilers=null)

// Public: Recursively compiles an entire directory of files.
//
// rootDirectory: The path on disk to the directory of files to compile.
// compilers: (optional) - An {Array} of objects conforming to {CompileCache}
//                         that will be tried in-order to compile code.
//
// Returns nothing.
export function compileAll(rootDirectory, compilers=null)

// Public: Allows you to create new instances of all compilers that are 
// supported by express-compile and use them directly. Currently supports
// Babel, CoffeeScript, TypeScript, LESS, and Sass/SCSS.
//
// Returns an {Array} of {CompileCache} objects.
export function createAllCompilers()
```
