'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataConnection, Peer } from 'peerjs';
import { STENCILS, ASSET_IDS, colorStencil } from '../../lib/assets';
import { DEFAULTS, advance, newShape, parseComposition, randomColor, validColor } from '../../lib/scene';
import type { Controls, Shape, Composition } from '../../lib/scene';
type Asset = typeof STENCILS[number];
function Thumbnail({ asset, color, large = false }: {
    asset: Asset;
    color: string;
    large?: boolean;
}) {
    const ref = useRef<HTMLCanvasElement>(null), [status, setStatus] = useState('loading');
    useEffect(() => { let alive = true; setStatus('loading'); colorStencil(asset.id, color).then(image => { if (!alive || !ref.current)
        return; const canvas = ref.current; canvas.width = image.width; canvas.height = image.height; canvas.getContext('2d')!.drawImage(image, 0, 0); setStatus('ready'); }).catch(() => alive && setStatus('error')); return () => { alive = false; }; }, [asset.id, color]);
    return <><canvas ref={ref} role="img" aria-label={asset.name} style={{ display: status === 'ready' ? 'block' : 'none' }}/>{status !== 'ready' && <span className="loading" style={large ? { height: 260 } : undefined}>{status === 'error' ? 'Unable to load — try again' : 'Loading stencil…'}</span>}</>;
}
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
export default function Studio() {
    const [view, setView] = useState<'gallery' | 'stage'>('gallery'), [controls, setControls] = useState<Controls>({ ...DEFAULTS }), [selected, setSelected] = useState<Asset | null>(null), [color, setColor] = useState('#e85c35'), [panel, setPanel] = useState(true), [projection, setProjection] = useState(false), [count, setCount] = useState(0), [limit, setLimit] = useState(1200), [page, setPage] = useState(25), [query, setQuery] = useState(''), [shuffle, setShuffle] = useState(0), [colors, setColors] = useState<Record<string, string>>({}), [message, setMessage] = useState(''), [modal, setModal] = useState<'save' | 'audience' | null>(null), [saved, setSaved] = useState<Composition[]>([]), [saveName, setSaveName] = useState('My composition'), [mic, setMic] = useState(false), [level, setLevel] = useState(0), [recording, setRecording] = useState(false), [recordTime, setRecordTime] = useState(0), [join, setJoin] = useState(''), [connectionState, setConnectionState] = useState(''), [room, setRoom] = useState(''), [qr, setQr] = useState(''), [guests, setGuests] = useState(0), [acceptAudience, setAcceptAudience] = useState(true), [sending, setSending] = useState(false);
    const shapes = useRef<Shape[]>([]), canvas = useRef<HTMLCanvasElement>(null), settings = useRef(controls), scroll = useRef(0), analyser = useRef<AnalyserNode | null>(null), audio = useRef<AudioContext | null>(null), microphone = useRef<MediaStream | null>(null), recorder = useRef<MediaRecorder | null>(null), peer = useRef<Peer | null>(null), connection = useRef<DataConnection | null>(null), accept = useRef(true), max = useRef(1200), toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null), requestingMic = useRef(false);
    settings.current = controls;
    accept.current = acceptAudience;
    max.current = limit;
    const tell = useCallback((text: string) => { setMessage(text); if (toastTimer.current)
        clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setMessage(''), 6500); }, []);
    useEffect(() => { const narrow = matchMedia('(max-width:700px)').matches; setLimit(narrow ? 240 : 1200); setControls(c => ({ ...c, density: narrow ? 90 : 180 })); setJoin(new URLSearchParams(location.search).get('join') || ''); setShuffle(Math.floor(Math.random() * 100000) + 1); try {
        const stored = JSON.parse(localStorage.getItem('gabayet-compositions-v1') || '[]');
        if (Array.isArray(stored))
            setSaved(stored.slice(0, 20).map(x => parseComposition(x, ASSET_IDS)));
    }
    catch {
        tell('Some saved compositions could not be loaded. You can still import a backup.');
    } return () => { if (toastTimer.current)
        clearTimeout(toastTimer.current); }; }, [tell]);
    const add = useCallback((asset: string, fill: string, copies = 3) => { if (!ASSET_IDS.has(asset) || !validColor(fill))
        return; const cap = Math.min(max.current, settings.current.density); const fresh = Array.from({ length: Math.min(copies, cap) }, () => newShape(asset, fill)); shapes.current = [...shapes.current, ...fresh].slice(-cap); setCount(shapes.current.length); }, []);
    const addRandom = useCallback(() => { const item = STENCILS[Math.floor(Math.random() * STENCILS.length)]; add(item.id, randomColor(settings.current.palette), 1); }, [add]);
    const goStage = () => { if (join)
        return; scroll.current = window.scrollY; if (shapes.current.length === 0)
        for (let i = 0; i < 9; i++)
            addRandom(); setView('stage'); window.scrollTo(0, 0); };
    const back = () => { setProjection(false); setView('gallery'); requestAnimationFrame(() => window.scrollTo(0, scroll.current)); };
    useEffect(() => {
        if (view !== 'stage' || !canvas.current)
            return;
        const el = canvas.current, ctx = el.getContext('2d', { alpha: false })!;
        let width = 0, height = 0, dpr = 1, frame = 0, last = 0, lastAuto = 0, lastUI = 0;
        const images = new Map<string, HTMLCanvasElement>(), loading = new Set<string>(), failed = new Set<string>();
        const buffer = new Uint8Array(256);
        const resize = () => { const r = el.getBoundingClientRect(); width = r.width; height = r.height; dpr = Math.min(devicePixelRatio || 1, 2); el.width = Math.round(width * dpr); el.height = Math.round(height * dpr); };
        const observer = new ResizeObserver(resize);
        observer.observe(el);
        resize();
        const draw = (time: number) => {
            const dt = last ? Math.min((time - last) / 1000, .05) : 0;
            last = time;
            const c = settings.current;
            let energy = 0;
            if (analyser.current) {
                analyser.current.getByteFrequencyData(buffer);
                let sum = 0;
                for (let i = 0; i < 80; i++)
                    sum += buffer[i];
                energy = sum / (80 * 255);
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.globalAlpha = 1;
            ctx.fillStyle = c.background;
            ctx.fillRect(0, 0, width, height);
            if (c.auto && time - lastAuto > 1000 / c.rate) {
                addRandom();
                lastAuto = time;
            }
            shapes.current = shapes.current.filter(s => Date.now() - s.born < 15 * 60 * 1000).slice(-Math.min(c.density, max.current));
            const used = new Set<string>();
            for (const s of shapes.current) {
                advance(s, dt, c, energy);
                const key = s.asset + s.color;
                used.add(key);
                let image = images.get(key);
                if (!image && !loading.has(key) && !failed.has(key)) {
                    loading.add(key);
                    colorStencil(s.asset, s.color).then(value => { images.set(key, value); loading.delete(key); }).catch(() => { loading.delete(key); failed.add(key); });
                }
                image = images.get(key);
                if (!image)
                    continue;
                const pulse = 1 + energy * c.reactivity * .7, size = Math.min(c.size * pulse, width * .9, height * .9), ratio = image.width / image.height;
                const w = ratio >= 1 ? size : size * ratio, h = ratio >= 1 ? size / ratio : size;
                ctx.save();
                ctx.translate(w / 2 + s.x * Math.max(0, width - w), h / 2 + s.y * Math.max(0, height - h));
                ctx.rotate(s.angle);
                ctx.globalAlpha = c.opacity;
                ctx.drawImage(image, -w / 2, -h / 2, w, h);
                ctx.restore();
            }
            for (const key of images.keys())
                if (!used.has(key))
                    images.delete(key);
            if (time - lastUI > 160) {
                setCount(shapes.current.length);
                setLevel(energy);
                lastUI = time;
            }
            frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(frame); observer.disconnect(); };
    }, [view, addRandom]);
    useEffect(() => { if (!recording)
        return; const id = setInterval(() => setRecordTime(t => t + 1), 1000); return () => clearInterval(id); }, [recording]);
    const stopMic = () => { microphone.current?.getTracks().forEach(t => t.stop()); microphone.current = null; analyser.current = null; audio.current?.close().catch(() => { }); audio.current = null; setMic(false); setLevel(0); };
    const toggleMic = async () => { if (mic) {
        stopMic();
        return;
    } if (requestingMic.current)
        return; requestingMic.current = true; let stream: MediaStream | null = null; try {
        if (!navigator.mediaDevices?.getUserMedia)
            throw Error('Microphone is unavailable. Open the app over HTTPS.');
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        const context = new AudioContext();
        await context.resume();
        const meter = context.createAnalyser();
        meter.fftSize = 512;
        meter.smoothingTimeConstant = .75;
        context.createMediaStreamSource(stream).connect(meter);
        audio.current = context;
        microphone.current = stream;
        analyser.current = meter;
        setMic(true);
        tell('Sound reactive mode is on. Audio is analysed on this device.');
    }
    catch (err) {
        stream?.getTracks().forEach(t => t.stop());
        tell(err instanceof Error ? err.message : 'Microphone permission was denied.');
    }
    finally {
        requestingMic.current = false;
    } };
    const stopRecording = () => { if (recorder.current?.state === 'recording')
        recorder.current.stop(); };
    const startRecording = () => { try {
        if (!canvas.current?.captureStream || typeof MediaRecorder === 'undefined')
            throw Error('This browser does not support video recording. Try Chrome or Edge.');
        const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/mp4', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
        if (!mime)
            throw Error('No supported recording format. Try Chrome.');
        const stream = canvas.current.captureStream(30);
        if (microphone.current)
            for (const track of microphone.current.getAudioTracks())
                stream.addTrack(track.clone());
        const chunks: BlobPart[] = [];
        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 });
        rec.ondataavailable = e => { if (e.data.size)
            chunks.push(e.data); };
        rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); if (chunks.length)
            download(new Blob(chunks, { type: rec.mimeType }), `gabayet-performance-${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`); setRecording(false); recorder.current = null; };
        rec.onerror = () => { tell('Recording failed. Try a smaller browser window.'); stopRecording(); };
        rec.start(1000);
        recorder.current = rec;
        setRecordTime(0);
        setRecording(true);
        tell(mic ? 'Recording visuals and microphone audio.' : 'Recording visuals. Enable the microphone first to include audio.');
    }
    catch (err) {
        tell(err instanceof Error ? err.message : 'Could not start recording.');
    } };
    useEffect(() => { if (view === 'gallery' && recorder.current?.state === 'recording')
        recorder.current.stop(); }, [view]);
    useEffect(() => () => { peer.current?.destroy(); microphone.current?.getTracks().forEach(t => t.stop()); audio.current?.close().catch(() => { }); if (recorder.current?.state === 'recording')
        recorder.current.stop(); }, []);
    useEffect(() => { if (!modal && !selected)
        return; const previous = document.activeElement as HTMLElement | null; const el = document.querySelector<HTMLElement>('[role=dialog]'); const focusable = () => Array.from(el?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href]') || []); focusable()[0]?.focus(); const key = (e: KeyboardEvent) => { if (e.key === 'Escape') {
        setModal(null);
        setSelected(null);
    } if (e.key === 'Tab') {
        const all = focusable(), first = all[0], last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    } }; document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); previous?.focus(); }; }, [modal, selected]);
    const persist = (items: Composition[]) => { try {
        localStorage.setItem('gabayet-compositions-v1', JSON.stringify(items));
        setSaved(items);
        return true;
    }
    catch {
        tell('Device storage is full. Use Export JSON to keep a backup.');
        return false;
    } };
    const capture = (): Composition => ({ version: 1, name: saveName.trim() || 'Untitled composition', controls: { ...settings.current }, shapes: shapes.current.map(s => ({ ...s })) });
    const restore = (value: unknown) => { try {
        const parsed = parseComposition(value, ASSET_IDS);
        shapes.current = parsed.shapes.slice(-limit);
        setControls({ ...parsed.controls, density: Math.min(limit, parsed.controls.density), auto: false });
        setCount(shapes.current.length);
        setModal(null);
        setView('stage');
        setSaveName(parsed.name);
        tell(`Loaded ${parsed.name}`);
    }
    catch (err) {
        tell(err instanceof Error ? err.message : 'Could not load composition.');
    } };
    const importFile = async (file?: File) => { if (!file)
        return; if (file.size > 2 * 1024 * 1024) {
        tell('Choose a composition smaller than 2 MB.');
        return;
    } try {
        restore(JSON.parse(await file.text()));
    }
    catch {
        tell('That file is not a valid composition.');
    } };
    const closeSession = () => { peer.current?.destroy(); peer.current = null; connection.current = null; setRoom(''); setQr(''); setGuests(0); setConnectionState(''); };
    const startSession = async () => { if (peer.current) {
        setModal('audience');
        return;
    } setModal('audience'); setConnectionState('Connecting…'); try {
        const { default: PeerClient } = await import('peerjs');
        const p = new PeerClient();
        peer.current = p;
        p.on('open', async (id) => { setRoom(id); setConnectionState('Session open'); const {default:QRCode} = await import('qrcode-generator'); const code=QRCode(0,'M'); code.addData(`${location.origin}/gallery?join=${encodeURIComponent(id)}`); code.make(); setQr(code.createDataURL(6,12)); });
        p.on('connection', conn => { let last = 0; conn.on('open', () => { setGuests(n => n + 1); conn.send({ type: 'hello' }); }); conn.on('close', () => setGuests(n => Math.max(0, n - 1))); conn.on('data', data => { if (!data || typeof data !== 'object')
            return; const packet = data as {
            type?: string;
            asset?: string;
            color?: string;
            request?: string;
        }; if (packet.type !== 'shape' || typeof packet.asset !== 'string' || !ASSET_IDS.has(packet.asset) || !validColor(packet.color) || typeof packet.request !== 'string' || packet.request.length > 80)
            return; if (Date.now() - last < 700) {
            conn.send({ type: 'busy', request: packet.request });
            return;
        } last = Date.now(); if (!accept.current) {
            conn.send({ type: 'paused', request: packet.request });
            return;
        } add(packet.asset, packet.color); conn.send({ type: 'added', request: packet.request }); }); conn.on('error', () => conn.close()); });
        p.on('error', err => { setConnectionState(`Connection problem: ${err.type}. Try another network.`); });
        p.on('disconnected', () => setConnectionState('Session disconnected. Close and reopen to reconnect.'));
    }
    catch {
        setConnectionState('Could not start a session. Check your connection.');
    } };
    useEffect(() => { if (!join)
        return; let alive = true; let timeout: ReturnType<typeof setTimeout>; let p: Peer; setConnectionState('Connecting to the projection…'); import('peerjs').then(({ default: PeerClient }) => { if (!alive)
        return; p = new PeerClient(); peer.current = p; p.on('open', () => { const conn = p.connect(join, { reliable: true }); connection.current = conn; timeout = setTimeout(() => { if (alive && !conn.open)
        setConnectionState('Connection timed out. The host must be online; try the same Wi-Fi network.'); }, 18000); conn.on('open', () => { clearTimeout(timeout); setConnectionState('Connected — choose a stencil to join the projection.'); }); conn.on('data', data => { if (!alive || !data || typeof data !== 'object')
        return; const d = data as {
        type?: string;
    }; if (['added', 'busy', 'paused'].includes(d.type || '')) {
        setSending(false);
        tell(d.type === 'added' ? 'Your stencil is on the projection.' : d.type === 'paused' ? 'The host has paused contributions.' : 'Please wait a moment before adding another.');
    } }); conn.on('close', () => { setConnectionState('The host ended this session.'); setSending(false); }); }); p.on('error', () => setConnectionState('Unable to join. Ask the host for a new QR code or try the same Wi-Fi network.')); }); return () => { alive = false; clearTimeout(timeout); p?.destroy(); connection.current = null; }; }, [join, tell]);
    const applySelection = () => { if (!selected)
        return; if (join) {
        const conn = connection.current;
        if (!conn?.open) {
            tell('Wait for the projection connection before sending.');
            return;
        }
        setSending(true);
        conn.send({ type: 'shape', asset: selected.id, color, request: crypto.randomUUID() });
        setTimeout(() => setSending(false), 8000);
        setSelected(null);
        return;
    } add(selected.id, color); setSelected(null); setView('stage'); };
    const filtered = STENCILS.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
    const ordered = shuffle ? filtered.slice().sort((a, b) => { const hash = (s: string) => Array.from(s).reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, shuffle); return hash(a.id) - hash(b.id); }) : filtered;
    const control = (key: keyof Controls, value: number | string | boolean) => setControls(c => ({ ...c, [key]: value }));
    const sliders: [
        keyof Controls,
        string,
        number,
        number,
        number
    ][] = [['speed', 'Speed', 0, 4, .05], ['rotation', 'Rotation', 0, 4, .05], ['size', 'Size', 30, 400, 5], ['opacity', 'Opacity', .1, 1, .05], ['density', 'Shape limit', 1, limit, 1], ['reactivity', 'Sound response', 0, 3, .1]];
    return <main className={projection ? 'only-projection' : ''}>
 {!projection && <header className="studio-header"><div><a className="wordmark" href="/gallery">GABAYET<span style={{ fontWeight: 400 }}> / LIVE STUDIO</span></a><span className="badge">Image · Sound · Participation</span></div><nav aria-label="Studio navigation"><button className={view === 'gallery' ? 'active' : ''} onClick={back}>Archive</button>{!join && <><button className={view === 'stage' ? 'active' : ''} onClick={goStage}>Stage {count > 0 && `(${count})`}</button><button onClick={() => setModal('save')}>Compositions</button></>}</nav></header>}
 {join && <div className={`participant-banner ${connectionState.includes('Unable') ? 'error' : ''}`} role="status">Audience session · {connectionState}</div>}
 {view === 'gallery' && <><section className="gallery-intro"><div><span className="eyebrow">Original stencil archive / {STENCILS.length.toLocaleString()} forms</span><h1>Choose a form.<br />Set it in motion.</h1><p>{join ? 'Select a stencil, choose its colour, and contribute to the live projection.' : 'An evolving vocabulary of original forms. Choose a stencil and colour, or open the stage to compose a live performance.'}</p></div><div className="gallery-tools"><label><span className="sr-only">Search stencils</span><input placeholder="Find a stencil…" value={query} onChange={e => { setQuery(e.target.value); setPage(25); }}/></label><button onClick={() => { setShuffle(Math.floor(Math.random() * 100000) + 1); setPage(25); }}>Shuffle</button><button onClick={() => { setColors(Object.fromEntries(STENCILS.map(a => [a.id, randomColor()]))); setShuffle(Math.floor(Math.random() * 100000) + 1); }}>New colours</button></div></section><section className="shape-grid" aria-label="Stencil archive">{ordered.slice(0, page).map(asset => <button className="shape-tile" key={`${asset.id}-${shuffle}`} aria-label={`Choose ${asset.name}`} onClick={() => { scroll.current = window.scrollY; setSelected(asset); const h = Math.floor(Math.random() * 360); setColor(hslToHex(h)); }}><Thumbnail asset={asset} color={colors[asset.id] || seedColor(asset.id, shuffle)}/><span>{asset.name}</span></button>)}</section><div className="load-more">{page < ordered.length ? <button onClick={() => setPage(p => p + 25)}>Load more · {Math.min(page, ordered.length)} / {ordered.length}</button> : <p>{ordered.length} original forms</p>}</div></>}
 {view === 'stage' && <section className="stage" aria-label="Live animation stage"><canvas ref={canvas} aria-label="Animated stencil composition"/>{projection && <button className="show-controls" onClick={() => { setProjection(false); if (document.fullscreenElement)
        document.exitFullscreen().catch(() => { }); }}>Show controls</button>}{!projection && <><div className="stage-overlay"><button className="back-gallery" onClick={back}>← Back to gallery</button><span>{count} shapes</span>{recording && <span className="recording">● REC {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}</span>}<button onClick={() => setPanel(!panel)}>{panel ? 'Hide' : 'Show'} controls</button></div>{panel && <aside className="panel" aria-label="VJ controls"><span className="eyebrow">Performance desk</span><h2>Shape the rhythm.</h2><div className="button-row"><button onClick={addRandom}>+ Random form</button><button className={controls.auto ? 'active' : ''} onClick={() => control('auto', !controls.auto)}>{controls.auto ? 'Stop auto' : 'Auto mode'}</button></div><label className="slider"><span>Auto rate <b>{controls.rate}/sec</b></span><input aria-label="Auto rate" type="range" min="0.5" max="10" step="0.5" value={controls.rate} onChange={e => control('rate', +e.target.value)}/></label>{sliders.map(([key, label, min, max, step]) => <label className="slider" key={key}><span>{label}<b>{String(controls[key])}</b></span><input aria-label={label} type="range" min={min} max={max} step={step} value={controls[key] as number} onChange={e => control(key, +e.target.value)}/></label>)}<label className="color">Background<input aria-label="Background colour" type="color" value={controls.background} onChange={e => control('background', e.target.value)}/></label><div className="panel-group"><label>Random colour palette<select aria-label="Random colour palette" value={controls.palette} onChange={e => control('palette', e.target.value)}><option value="spectrum">Full spectrum</option><option value="warm">Warm frequencies</option><option value="cool">Cool frequencies</option></select></label><div className="button-row"><button onClick={() => { shapes.current = shapes.current.map(s => ({ ...s, color: randomColor(controls.palette) })); }}>Recolour all</button><button onClick={() => { shapes.current = []; setCount(0); }}>Clear stage</button></div></div><div className="panel-group"><span className="eyebrow">Sound input</span><div className="button-row"><button className={mic ? 'active' : ''} onClick={toggleMic}>{mic ? 'Disable microphone' : 'Enable microphone'}</button></div><div className="meter" role="meter" aria-label="Microphone level" aria-valuenow={Math.round(level * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${level * 100}%` }}/></div><p>Volume and low frequencies influence speed, rotation and scale. Audio stays on this device unless you include it in a recording.</p></div><div className="panel-group"><span className="eyebrow">Output & participation</span><div className="button-row"><button onClick={recording ? stopRecording : startRecording}>{recording ? 'Stop & download' : 'Record video'}</button><button onClick={() => { setProjection(true); document.documentElement.requestFullscreen?.().catch(() => tell('Fullscreen is unavailable. Controls are hidden for projection.')); }}>Project fullscreen</button></div><div className="button-row"><button onClick={startSession}>Audience QR</button><button onClick={() => setModal('save')}>Save / load</button></div><p>Each form lives for 15 minutes. Recordings capture the stage without controls.</p></div></aside>}</>}{count === 0 && <div className="empty-stage"><h2>A space for possibility.</h2><p>Add a form or start Auto mode.</p></div>}</section>}
 {selected && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Choose stencil colour"><button className="modal-close" aria-label="Close colour selector" onClick={() => setSelected(null)}>×</button><span className="eyebrow">{selected.name}</span><h2>HUE select</h2><div className="color-preview"><Thumbnail asset={selected} color={color} large/></div><label>Choose your colour<input aria-label="Stencil colour" type="color" value={color} onChange={e => setColor(e.target.value)}/></label><div className="button-row"><button onClick={() => setColor(hslToHex(Math.random() * 360))}>Random colour</button><button className="primary" disabled={sending} onClick={applySelection}>{join ? 'Send to projection' : 'Add 3 to stage →'}</button></div></section></div>}
 {modal === 'save' && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Saved compositions"><button className="modal-close" aria-label="Close compositions" onClick={() => setModal(null)}>×</button><span className="eyebrow">Your visual sets</span><h2>Keep the composition.</h2><label>Name<input type="text" aria-label="Composition name" value={saveName} maxLength={80} onChange={e => setSaveName(e.target.value)} style={{ display: 'block', width: '100%', padding: 12, marginTop: 8 }}/></label><div className="button-row"><button className="primary" onClick={() => { const snapshot = capture(); if (persist([snapshot, ...saved.filter(s => s.name !== snapshot.name)].slice(0, 20)))
        tell('Composition saved on this device.'); }}>Save on device</button><button onClick={() => download(new Blob([JSON.stringify(capture())], { type: 'application/json' }), 'gabayet-composition.json')}>Export JSON</button></div><label>Import composition<input aria-label="Import composition" type="file" accept="application/json,.json" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'block', margin: '10px 0 22px' }}/></label>{saved.map((s, i) => <div className="saved-row" key={`${s.name}-${i}`}><span>{s.name}<small style={{ display: 'block', marginTop: 5 }}>{s.shapes.length} forms</small></span><button onClick={() => restore(s)}>Load</button><button aria-label={`Delete ${s.name}`} onClick={() => persist(saved.filter((_, n) => n !== i))}>×</button></div>)}<p>Saved sets stay in this browser. Export a JSON backup to move them to another device. Loaded forms receive a fresh 15-minute lifespan.</p></section></div>}
 {modal === 'audience' && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Audience participation"><button className="modal-close" aria-label="Close audience panel" onClick={() => setModal(null)}>×</button><span className="eyebrow">A shared visual field</span><h2>Invite the room.</h2><p role="status">{connectionState} · {guests} connected</p>{qr && <img className="session-qr" src={qr} width={220} height={220} alt="Scan to contribute shapes to this projection"/>}{room && <p className="session-url">{`${typeof location !== 'undefined' ? location.origin : ''}/gallery?join=${room}`}</p>}<div className="button-row"><button disabled={!room} onClick={() => navigator.clipboard.writeText(`${location.origin}/gallery?join=${room}`).then(() => tell('Audience link copied.')).catch(() => tell('Copy the audience link above.'))}>Copy link</button><button onClick={() => setAcceptAudience(v => !v)}>{acceptAudience ? 'Pause contributions' : 'Resume contributions'}</button><button onClick={closeSession}>End session</button></div><p>Keep this host tab open on Stage. Guests select a form and colour on their phones. Sessions are live and temporary. If a venue network blocks connections, try a shared Wi-Fi or hotspot. PeerJS Cloud provides connection signalling.</p></section></div>}
 {message && <div className="toast" role="status">{message}</div>}
 </main>;
}
function seedColor(id: string, seed: number) { let n = seed; for (const c of id)
    n = (n * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${n % 360} 85% 52%)`; }
function hslToHex(h: number) { const s = .85, l = .52, a = s * Math.min(l, 1 - l); const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`; }
