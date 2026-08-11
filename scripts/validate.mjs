import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = new URL('../', import.meta.url).pathname;
const failures = [];

function walk(directory){
  return readdirSync(directory).flatMap(name => {
    const full = join(directory,name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const javascript = walk(join(root,'js')).filter(file => file.endsWith('.js'))
  .concat([join(root,'sw.js'),join(root,'app.js')]);

for(const file of javascript){
  const result = spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status !== 0) failures.push(`${relative(root,file)}: ${result.stderr.trim()}`);
}

const html = readFileSync(join(root,'index.html'),'utf8');
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
inlineScripts.forEach((match,index) => {
  try{ new vm.Script(match[1],{filename:`index-inline-${index+1}.js`}); }
  catch(error){ failures.push(error.message); }
});

for(const file of ['manifest.json','vercel.json']){
  try{ JSON.parse(readFileSync(join(root,file),'utf8')); }
  catch(error){ failures.push(`${file}: ${error.message}`); }
}

for(const css of walk(join(root,'css')).filter(file => file.endsWith('.css'))){
  if(readFileSync(css,'utf8').includes('</style>')) failures.push(`${relative(root,css)} contient une balise </style> parasite`);
}

const localAssets = [
  ...html.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/gi)
].map(match => match[1]).filter(value => !/^(?:https?:|#|data:)/.test(value));
for(const asset of localAssets){
  const clean = asset.split(/[?#]/)[0].replace(/^\//,'');
  if(clean && !existsSync(join(root,clean))) failures.push(`Ressource absente : ${asset}`);
}

if(failures.length){
  console.error(failures.map(message => `✗ ${message}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${javascript.length} fichiers JavaScript, ${inlineScripts.length} scripts inline, JSON, CSS et ressources validés`);
