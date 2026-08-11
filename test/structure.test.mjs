import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../',import.meta.url).pathname;
const html = readFileSync(join(root,'index.html'),'utf8');

test('charge la fondation Quiet Intelligence',()=>{
  assert.match(html,/css\/legendary\.css/);
  assert.match(html,/js\/28-intelligence\.js/);
  assert.match(html,/js\/29-motion\.js/);
  assert.doesNotMatch(html,/role=["']application["']/);
});

test('le motion design respecte les préférences utilisateur',()=>{
  const motion = readFileSync(join(root,'js/29-motion.js'),'utf8');
  const styles = readFileSync(join(root,'css/legendary.css'),'utf8');
  assert.match(motion,/prefers-reduced-motion/);
  assert.match(motion,/IntersectionObserver/);
  assert.match(motion,/clervio:navigated/);
  assert.match(styles,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(styles,/animation-iteration-count:1/);
});

test('les écrans centraux utilisent des contrôles sémantiques',()=>{
  const home = html.match(/<div class="pg" id="p-home">([\s\S]*?)<!-- ORDERS -->/)?.[1] || '';
  const ai = html.match(/<div class="pg" id="p-ai">([\s\S]*?)<!-- PROFILE -->/)?.[1] || '';
  assert.ok(home.length > 1000);
  assert.ok(ai.length > 1000);
  assert.doesNotMatch(home,/<div[^>]+onclick=/i);
  assert.doesNotMatch(ai,/<div[^>]+onclick=/i);
  assert.match(ai,/role="log"/);
  assert.match(ai,/aria-live="polite"/);
});

test('la navigation ne duplique plus ses identifiants',()=>{
  const nav = readFileSync(join(root,'js/01-nav.js'),'utf8');
  assert.match(nav,/data-nav-page/);
  assert.doesNotMatch(nav,/id="ni-/);
  assert.match(nav,/clervio:navigated/);
  assert.match(nav,/aria-current/);
});

test('le scan exige la validation avant conservation',()=>{
  const scan = readFileSync(join(root,'js/06-scan.js'),'utf8');
  assert.match(scan,/conserver:false/);
  assert.match(scan,/uploadValidatedScanFile/);
  assert.match(scan,/orderNumber:orderNumber/);
  assert.doesNotMatch(scan,/Chiffrement du document/);
});

test('toutes les ressources précachées existent',()=>{
  const worker = readFileSync(join(root,'sw.js'),'utf8');
  const shell = worker.match(/const APP_SHELL = \[([\s\S]*?)\];/)?.[1] || '';
  const paths = [...shell.matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.ok(paths.length > 20);
  for(const path of paths) assert.ok(existsSync(join(root,path.replace(/^\//,''))),`${path} doit exister`);
});
