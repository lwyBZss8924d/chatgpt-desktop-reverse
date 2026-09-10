#!/usr/bin/env node
/** Export the current source/data into an existing publication checkout, without local history. */
import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocuments } from './research/documents.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const at=process.argv.indexOf('--out');if(at<0)throw new Error('--out is required');const OUT=resolve(process.argv[at+1]);if(OUT===ROOT)throw new Error('Publication export must be isolated from the research checkout');
const hash=s=>createHash('sha256').update(s).digest('hex');
await mkdir(OUT,{recursive:true});
for(const name of ['web','scripts','tests','.github','package.json','package-lock.json','tsconfig.json','vercel.json','.gitignore','.vercelignore'])await cp(join(ROOT,name),join(OUT,name),{recursive:true});
await mkdir(join(OUT,'evidence/static'),{recursive:true});
const model=JSON.parse(await readFile(join(ROOT,'evidence/static/atlas-model.json'),'utf8'));
for(const name of ['scan-model','rust-core-model','three-way-model']){
  const raw=JSON.parse(await readFile(join(ROOT,`evidence/static/${name}.json`),'utf8'));
  if(raw.generatedFrom?.root)raw.generatedFrom.root='/path/to/extracted-app';
  if(raw.generatedFrom?.repo)raw.generatedFrom.repo='/path/to/codex';
  if(raw.generatedFrom?.extracted)raw.generatedFrom.extracted='/path/to/extracted-app';
  if(raw.generatedFrom?.rustCore?.repo)raw.generatedFrom.rustCore.repo='/path/to/codex';
  const body=JSON.stringify(raw,null,2);await writeFile(join(OUT,`evidence/static/${name}.json`),body);model.provenance.inputDigests[name]=hash(body);
}
model.provenance.snapshotRoot='/path/to/extracted-app';
model.publication={privacy:'mosaic derivatives; operator configuration excluded',originalEvidence:'retained in the local research archive'};
await cp(join(ROOT,'evidence/static/licenses'),join(OUT,'evidence/static/licenses'),{recursive:true});
await mkdir(join(OUT,'evidence/runtime'),{recursive:true});
execFileSync('python3',[join(ROOT,'scripts/redact-screenshots.py'),'--out',join(OUT,'evidence/runtime/shots')],{stdio:'inherit'});
const redactions=JSON.parse(await readFile(join(OUT,'evidence/runtime/redaction-manifest.json'),'utf8'));
const receipt=JSON.parse(await readFile(join(ROOT,'evidence/runtime/shots/recapture-results.json'),'utf8'));
const publicReceipt={results:receipt.results.map(r=>({name:r.name,ok:r.ok,coverage:r.coverage,privacy:'receipt belongs to the original local capture'}))};
await writeFile(join(OUT,'evidence/runtime/shots/recapture-results.json'),JSON.stringify(publicReceipt,null,2));
for(const c of model.captures){
  const redaction=redactions.captures.find(r=>r.name===`${c.name}.jpg`);c.originalSha256=c.sha256;c.sha256=redaction.sha256;c.redacted=true;
  for(const id of c.sourceIds){const s=model.sources.find(s=>s.id===id);s.sha256=c.sha256;s.excerpt=JSON.stringify({capture:c.name,originalSha256:c.originalSha256,publicImageSha256:c.sha256,privacy:'real capture with local mosaic redaction',receiptAvailable:c.receipt},null,2);s.excerptSha256=hash(s.excerpt);s.note={en:'Real archived image with privacy mosaics. The original is retained locally; the receipt refers to that original capture.',zh:'带隐私马赛克的真实归档图片，原图在本地保留，回执对应原始采集。'};}
}
// Capture scripts are retained for reproducibility, without workstation-specific paths.
for(const name of await readdir(join(ROOT,'evidence/runtime'))){if(name.endsWith('.mjs')||name==='lib')await cp(join(ROOT,'evidence/runtime',name),join(OUT,'evidence/runtime',name),{recursive:true});}
await writeFile(join(OUT,'evidence/static/atlas-model.json'),JSON.stringify(model));
let deployment={};try{deployment=JSON.parse(await readFile(join(ROOT,'docs/deployment-state.json'),'utf8'));}catch{}
const docs=createDocuments(model,deployment);for(const [name,body] of docs){await mkdir(dirname(join(OUT,name)),{recursive:true});await writeFile(join(OUT,name),body);}
if(Object.keys(deployment).length)await writeFile(join(OUT,'docs/deployment-state.json'),JSON.stringify(deployment,null,2)+'\n');
console.log(`public export: current source, ${docs.size} documents and ${model.captures.length} mosaic derivatives; no research Git history copied`);
