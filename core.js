import {facets, discounts} from './content.js';
export const SESSION_KEY = 'dd-facetas-v2-current';
// Rejection sampling: probabilidad uniforme sin sesgo de módulo.
export function randomIndex(count, fill = a => crypto.getRandomValues(a)) {
  if (!Number.isInteger(count) || count < 1 || count > 4294967296) throw new RangeError('Cantidad inválida');
  const limit = Math.floor(4294967296 / count) * count;
  const a = new Uint32Array(1);
  do { fill(a); } while (a[0] >= limit);
  return a[0] % count;
}
function resultId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const h = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
export function createResult(facetId, previousIndex = -1, pick = randomIndex) {
  const facet = facets.find(f => f.id === facetId);
  if (!facet) throw new Error('Faceta desconocida');
  const indexes = facet.messages.map((_, i) => i).filter(i => i !== previousIndex);
  const messageIndex = indexes[pick(indexes.length)];
  return {version:2, id:resultId(), createdAt:new Date().toISOString(), facetId, messageIndex, discount:discounts[pick(2)]};
}
export function isResult(r) {
  const f = facets.find(f => f.id === r?.facetId);
  return r?.version === 2 && typeof r.id === 'string' && typeof r.createdAt === 'string' &&
    !!f && Number.isInteger(r.messageIndex) && r.messageIndex >= 0 && r.messageIndex < f.messages.length && discounts.includes(r.discount);
}
export function readResult(storage) {
  try { const r = JSON.parse(storage.getItem(SESSION_KEY)); return isResult(r) ? r : null; } catch { return null; }
}
