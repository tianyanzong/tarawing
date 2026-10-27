'use strict';

const { readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = join(__dirname, '..');
const sourceDirectories = ['data', 'db', 'middlewares', 'repositories', 'schemas', 'services', 'utils'];
const files = [join(root, 'server.js')];

function collectJavaScript(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) collectJavaScript(path);
    else if (path.endsWith('.js')) files.push(path);
  }
}

for (const directory of sourceDirectories) {
  collectJavaScript(join(root, directory));
}

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || `Syntax check failed: ${relative(root, file)}\n`);
    process.exit(result.status || 1);
  }
}

console.log(`Server build validation passed (${files.length} JavaScript files).`);
