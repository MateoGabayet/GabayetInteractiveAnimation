export type Controls = {
    speed: number;
    rotation: number;
    size: number;
    opacity: number;
    density: number;
    reactivity: number;
    background: string;
    auto: boolean;
    rate: number;
    palette: string;
};
export type Shape = {
    id: string;
    asset: string;
    color: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    spin: number;
    born: number;
};
export type Composition = {
    version: 1;
    name: string;
    controls: Controls;
    shapes: Shape[];
};
export const DEFAULTS: Controls = { speed: 1, rotation: 1, size: 160, opacity: .75, density: 180, reactivity: 1, background: '#F9F6EE', auto: false, rate: 2, palette: 'spectrum' };
export function randomColor(palette = 'spectrum') { const hues = palette === 'warm' ? [0, 18, 35, 48] : palette === 'cool' ? [165, 190, 215, 260] : [Math.random() * 360]; return `hsl(${hues[Math.floor(Math.random() * hues.length)]} 85% 52%)`; }
export function newShape(asset: string, color: string): Shape { return { id: crypto.randomUUID(), asset, color, x: Math.random(), y: Math.random(), vx: (Math.random() > .5 ? 1 : -1) * (.025 + Math.random() * .055), vy: (Math.random() > .5 ? 1 : -1) * (.025 + Math.random() * .055), angle: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * 1.5, born: Date.now() }; }
export function advance(s: Shape, dt: number, c: Controls, energy: number) { const speed = c.speed * (1 + energy * c.reactivity * 3); s.x += s.vx * dt * speed; s.y += s.vy * dt * speed; if (s.x < 0 || s.x > 1) {
    s.x = Math.max(0, Math.min(1, s.x));
    s.vx *= -1;
} if (s.y < 0 || s.y > 1) {
    s.y = Math.max(0, Math.min(1, s.y));
    s.vy *= -1;
} s.angle += s.spin * dt * c.rotation * (1 + energy * c.reactivity); }
const finite = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function validColor(v: unknown): v is string { return typeof v === 'string' && (/^#[0-9a-f]{6}$/i.test(v) || /^hsl\(\d+(\.\d+)? 85% 52%\)$/.test(v)); }
export function parseComposition(raw: unknown, assets: Set<string>): Composition {
    if (!raw || typeof raw !== 'object')
        throw Error('Invalid composition file.');
    const d = raw as Composition, c = d.controls;
    if (d.version !== 1 || !c || !Array.isArray(d.shapes) || d.shapes.length > 1200)
        throw Error('Unsupported composition or too many shapes.');
    for (const [key, min, max] of [['speed', 0, 4], ['rotation', 0, 4], ['size', 30, 400], ['opacity', .1, 1], ['density', 1, 1200], ['reactivity', 0, 3], ['rate', .5, 10]] as const) {
        if (!finite(c[key], min, max))
            throw Error('Invalid control values.');
    }
    if (!/^#[0-9a-f]{6}$/i.test(c.background) || !['spectrum', 'warm', 'cool'].includes(c.palette) || typeof c.auto !== 'boolean')
        throw Error('Invalid palette.');
    for (const s of d.shapes) {
        if (!s || !assets.has(s.asset) || !validColor(s.color) || !finite(s.x, 0, 1) || !finite(s.y, 0, 1) || !finite(s.vx, -1, 1) || !finite(s.vy, -1, 1) || !finite(s.angle, -1e8, 1e8) || !finite(s.spin, -10, 10))
            throw Error('Invalid shape in composition.');
    }
    return { version: 1, name: typeof d.name === 'string' ? d.name.slice(0, 80) : 'Untitled', controls: { ...c }, shapes: d.shapes.map(s => ({ ...s, id: crypto.randomUUID(), born: Date.now() })) };
}
