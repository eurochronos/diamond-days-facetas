import {facets} from './content.js';
import {createResult, readResult, SESSION_KEY} from './core.js';
import {notifyResult} from './integration.js';
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let currentScreen = 'welcome', busy = false, activeResult = null, wakeLock;
const memoryLast = {};
function store(key, value) {try {sessionStorage.setItem(key, JSON.stringify(value));} catch { /* Kiosco sin almacenamiento: sigue en memoria. */ }}
function lastIndex(id) {try{return JSON.parse(sessionStorage.getItem('dd-last-'+id)) ?? -1;}catch{return memoryLast[id] ?? -1;}}
function gemstone(element, facet) {
  element.replaceChildren();
  const img = new Image(); img.src = 'assets/'+facet.id+'.png'; img.alt = ''; img.draggable = false;
  element.append(img);
}
async function show(next) {
  const old = $(currentScreen); old.classList.add('leaving');
  await sleep(reduced.matches ? 0 : 450);
  old.hidden = true; old.classList.remove('leaving');
  currentScreen = next; $(next).hidden = false;
  window.scrollTo(0, 0);
  const heading = $(next).querySelector('h1');
  if (heading) {heading.tabIndex = -1; heading.focus({preventScroll:true});}
}
async function keepAwake() {
  try {if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');} catch { /* Navegador sin soporte: no interrumpe la experiencia. */ }
}
document.addEventListener('visibilitychange', () => {if (document.visibilityState === 'visible' && currentScreen !== 'welcome') keepAwake();});
function fillResult(r) {
  const f = facets.find(f => f.id === r.facetId);
  gemstone($('result-gem'), f);
  $('result-trait').textContent = f.trait;
  $('result-title').textContent = 'Corte '+f.name;
  $('meaning').textContent = f.messages[r.messageIndex];
  $('discount').textContent = r.discount;
}
async function reveal(r, restored = false) {
  fillResult(r);
  $('gift').classList.remove('revealed'); $('gift').setAttribute('aria-hidden','true');
  $('result-actions').classList.remove('visible'); $('restart').disabled = true;
  await show('result');
  // Dar tiempo real de lectura antes de mostrar el beneficio.
  await sleep(restored || reduced.matches ? 0 : 4200);
  $('gift').classList.add('revealed'); $('gift').removeAttribute('aria-hidden');
  $('result-actions').classList.add('visible');
  notifyResult(r);
  await sleep(reduced.matches ? 0 : 1400);
  $('restart').disabled = false; busy = false;
}
async function choose(facet, button) {
  if (busy || currentScreen !== 'selection') return;
  busy = true;
  const buttons = [...$('facet-grid').querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
  button.classList.add('selected');
  // Un único resultado, calculado antes de animar. Los toques no vuelven a sortearlo.
  activeResult = createResult(facet.id, lastIndex(facet.id));
  memoryLast[facet.id] = activeResult.messageIndex;
  store('dd-last-'+facet.id, activeResult.messageIndex); store(SESSION_KEY, activeResult);
  gemstone($('discovery-gem'), facet); $('discovery-title').textContent = 'Corte '+facet.name;
  await sleep(reduced.matches ? 0 : 380);
  await show('discovery');
  await sleep(reduced.matches ? 400 : 6200);
  await reveal(activeResult);
  buttons.forEach(b => b.disabled = false); button.classList.remove('selected');
}
for (const [i, facet] of facets.entries()) {
  const b = document.createElement('button'); b.className = 'facet-card'; b.style.animationDelay = i*65+'ms'; b.setAttribute('aria-label','Descubrir corte '+facet.name);
  const gem = document.createElement('span'); gem.className='gem';gem.style.display='block';gemstone(gem,facet);
  const cut=document.createElement('span');cut.className='cut';cut.textContent='CORTE';
  const name=document.createElement('span');name.className='name';name.textContent=facet.name;
  b.append(gem,cut,name); b.addEventListener('click',()=>choose(facet,b)); $('facet-grid').append(b);
}
$('start').addEventListener('click',async()=>{if(busy)return;busy=true;keepAwake();await show('selection');busy=false;});
$('home').addEventListener('click',async()=>{if(busy)return;busy=true;await show('welcome');busy=false;});
$('restart').addEventListener('click',async()=>{
  if(busy)return;busy=true;
  try{sessionStorage.removeItem(SESSION_KEY);}catch{}
  activeResult=null;await show('welcome');busy=false;
});
// La experiencia empieza únicamente cuando los seis cortes se pueden mostrar.
$('start').disabled=true;
async function preload() {
  $('asset-error').hidden=true; $('retry-assets').hidden=true;
  try {
    await Promise.all(facets.map(f=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src='assets/'+f.id+'.png';})));
    $('start').disabled=false; $('start-label').textContent='Toca para descubrir';
    const saved=(()=>{try{return readResult(sessionStorage);}catch{return null;}})();
    if(saved){busy=true;activeResult=saved;await reveal(saved,true);}
  } catch {
    $('asset-error').hidden=false;$('asset-error').textContent='No pudimos cargar las tarjetas. Revisa la conexión e inténtalo de nuevo.'; $('retry-assets').hidden=false;
  }
}
$('retry-assets').addEventListener('click',preload);
preload();
