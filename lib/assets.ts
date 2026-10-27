import entries from './stencils.json';
export const STENCILS = entries;
export const ASSET_IDS = new Set(entries.map(s => s.id));
const cache = new Map<string, Promise<HTMLImageElement>>();
export function loadStencil(id: string) { let p = cache.get(id); if (p)
    return p; p = (async () => { const response = await fetch(`/stencils/${id}.svg.gz`); if (!response.ok || !response.body)
    throw Error('Could not load stencil.'); const bytes = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text(); const url = URL.createObjectURL(new Blob([bytes], { type: 'image/svg+xml' })); try {
    return await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('Invalid stencil image.')); img.src = url; });
}
finally {
    URL.revokeObjectURL(url);
} })(); if (cache.size >= 80)
    cache.delete(cache.keys().next().value!); cache.set(id, p); p.catch(() => cache.delete(id)); return p; }
const tinted = new Map<string, HTMLCanvasElement>();
export async function colorStencil(id: string, color: string) { const key = id + color; const hit = tinted.get(key); if (hit)
    return hit; const img = await loadStencil(id); const c = document.createElement('canvas'); const ratio = img.naturalWidth / img.naturalHeight; c.width = ratio >= 1 ? 384 : Math.max(1, Math.round(384 * ratio)); c.height = ratio >= 1 ? Math.max(1, Math.round(384 / ratio)) : 384; const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0, c.width, c.height); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height); if (tinted.size >= 256)
    tinted.delete(tinted.keys().next().value!); tinted.set(key, c); return c; }
