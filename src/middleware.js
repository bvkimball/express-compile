import './babel-maybefill';
import path from 'path';
import mkdirp from 'mkdirp';
import _ from 'lodash';
import minimatch from 'minimatch';
import { createCompilerHostFromProjectRootSync } from './config-parser';

import { rollup } from 'rollup';
import babel from 'rollup-plugin-babel';
import npm from 'rollup-plugin-npm';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript';
import string from 'rollup-plugin-string';

import Builder from 'systemjs-builder';

function buildWithBuiltIn(root, source) {
  let compilerHost = null;
  let rootCacheDir = path.join(root, '.cache');
  mkdirp.sync(rootCacheDir);

  try {
    compilerHost = createCompilerHostFromProjectRootSync(root, rootCacheDir);
  } catch (e) {
    console.error(`Couldn't set up compilers: ${e.message}`);
    throw e;
  }

  return new Promise((resolve, reject) => {
    try {
      let result = compilerHost.compileSync(source);
      resolve(result);
    } catch (e) {
      console.error(`Failed to compile file: ${source}`);
      console.error(e.message);
      reject(e);
    }
  });
}

function buildWithSystemJS(root, source) {
  let builder = new Builder(root, ''); //Need Config File
  builder.config({
    map: {
      'systemjs-babel-build': 'node_modules/plugin-babel/systemjs-babel-node.js'
    }
  });
  new Promise((resolve, reject) => {
    builder.bundle(source, {
      minify: false
    }).then((output) => {
      resolve(output);
    //output.source; // generated bundle source
    //output.sourceMap; // generated bundle source map
    //output.modules; // array of module names defined in the bundle
    }).catch((err) => {
      reject(err);
    });
  });
}

function buildWithRollup(root, source) {
  return new Promise((resolve, reject) => {
    rollup({
      entry: source,
      plugins: [
        //npm({ jsnext: true, main: true }), // include node_modules
        //commonjs(), // convert commonjs to es6 module syntax
        string({
          extensions: ['.html']
        }),
        babel({
          exclude: 'node_modules/**'
        })
      ]
    }).then(function(bundle) {
      // Generate bundle + sourcemap
      let result = bundle.generate({
        format: 'iife' // output format - 'amd', 'cjs', 'es6', 'iife', 'umd'
      });

      resolve(result);

    }).catch((err) => {
      console.log(err);
      reject(err);
    });
  });
}


export function ExpressCompiler(options = {}) {
  let {root, paths, ignore, cwd} = options;

  return function(request, response, next) {
    if ('GET' != request.method.toUpperCase() && 'HEAD' != request.method.toUpperCase()) {
      return next();
    }
    try {
      let filepath = path.join(root, cwd, request.url),
        ext = path.extname(filepath).split('.')[1],
        check = paths.some((glob) => {
          var result = minimatch(filepath, glob);
          return result;
        }),
        ignored = ignore.some((glob) => {
          var result = minimatch(filepath, glob);
          return result;
        });

      if (ext && ext.length && check && !ignored) {
        buildWithBuiltIn(root, filepath).then((result) => {
          response.setHeader('Content-Type', 'application/javascript');
          response.send(result.code);
        }).catch((err) => {
          return next();
        });
      } else {
        return next();
      }
    } catch (err) {
      console.log(err);
      return next();
    }
  }
}
