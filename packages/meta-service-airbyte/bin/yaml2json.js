#!/usr/bin/env node
const {parseArgs} = require('node:util')

async function readStreamToString(stream /* @type {NodeJS.ReadableStream} */) {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function main() {
  const {
    values: {output},
  } = parseArgs({options: {output: {type: 'string', short: 'o'}}})

  const yaml = await readStreamToString(process.stdin)
  const json = JSON.stringify(require('yaml').parse(yaml), null, 2)
  if (output) {
    await require('node:fs/promises').writeFile(`${output}.json`, json)
    await require('node:fs/promises').writeFile(`${output}.yaml`, yaml)
  } else {
    process.stdout.write(json)
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void main()
