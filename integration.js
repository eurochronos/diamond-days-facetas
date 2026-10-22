/** Punto de integración OPCIONAL. La versión entregada no envía datos.
 * Evento una vez por revelación, puede repetirse al recargar: deduplicar por id en servidor.
 * No colocar credenciales ni enlaces privados de Google Sheets en este archivo.
 * Ver docs/INTEGRACION.md antes de conectar un backend.
 */
export function notifyResult(result) {
  window.dispatchEvent(new CustomEvent('diamond-days:facet-revealed', { detail: Object.freeze({...result}) }));
}
