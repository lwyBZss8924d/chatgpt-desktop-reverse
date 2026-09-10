#!/usr/bin/env node
/** Feature Markdown uses the same normalized model as the React workbench. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocuments } from './research/documents.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);const flag=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const lang=flag('--lang','en');if(!['en','zh'].includes(lang))throw new Error('--lang must be en or zh');
const name=`docs/codex-desktop-feature-map${lang==='zh'?'_Zh':''}.md`;
const model=JSON.parse(await readFile(resolve(ROOT,flag('--model','evidence/static/atlas-model.json')),'utf8'));
if(model.schemaVersion!==1||!model.methods)throw new Error('Expected the normalized atlas-model.json; use the legacy scanner only to reproduce its original scan.');
const output=resolve(ROOT,flag('--out',name));await mkdir(dirname(output),{recursive:true});await writeFile(output,createDocuments(model).get(name));
console.log(`feature map: ${output}`);
