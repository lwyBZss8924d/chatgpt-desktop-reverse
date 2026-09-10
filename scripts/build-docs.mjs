#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocuments } from './research/documents.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const model=JSON.parse(await readFile(join(ROOT,'evidence/static/atlas-model.json'),'utf8'));
const deploymentPath=join(ROOT,'docs/deployment-state.json');
const deployment=existsSync(deploymentPath)?JSON.parse(await readFile(deploymentPath,'utf8')):{};
const documents=createDocuments(model,deployment);const check=process.argv.includes('--check');const errors=[];
for(const [name,content] of documents){
  const file=join(ROOT,name);
  if(check){if(!existsSync(file)||await readFile(file,'utf8')!==content)errors.push(`out of sync: ${name}`);}
  else{await mkdir(dirname(file),{recursive:true});await writeFile(file,content);}
  for(const match of content.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)){
    const link=match[1];if(/^(?:https?:|#|mailto:)/.test(link))continue;
    const target=decodeURIComponent(link.split(/[?#]/)[0]);if(!existsSync(resolve(dirname(file),target))&&!documents.has(resolve(dirname(file),target).slice(ROOT.length+1)))errors.push(`${name}: missing link ${link}`);
  }
  if(/\[pending init\]|\[待初始化\]/.test(content))errors.push(`${name}: obsolete initialization banner`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`docs: ${documents.size} EN/ZH files ${check?'verified':'written'}; relative links valid`);
