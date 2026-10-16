import * as THREE from 'three';

const BG = 0x02030a;
const CYAN = '#7fdcff';
const VIOLET = '#b48cff';
const MAGENTA = '#ff2bd6';

const LOT = 16;
const STREET_HALF = 11;
const LOTS_X = 7;
const DEPTH = 34 * LOT;
const TRACE_TILE = 128;

const rand = (a, b) => a + Math.random() * (b - a);
const randint = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[randint(0, arr.length - 1)];

const SNIPPETS = [
    'mov rax, [rbx]', 'xor edx, edx', 'jne 0x4af3', 'call [rax+8]', 'push rbp',
    'for(i=0;i<n;i++)', 'spawn(node[i]);', 'gpu.dispatch(64)', 'free(ptr);',
    'ACCESS GRANTED', 'GIBSON.SYS', 'root@ellingson:~#', 'chmod 777 /garbage',
    'trace 0x7FA3', 'ping 10.0.0.1', 'SYN ACK', 'payload.bin', 'kernel: ok'
];
const HEX = '0123456789ABCDEF';

function codeTexture(fontFamily) {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');

    const grad = g.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, 'rgb(14, 30, 58)');
    grad.addColorStop(1, 'rgb(22, 18, 54)');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);

    g.textBaseline = 'top';
    for (let b = 0; b < 26; b++) {
        const x = randint(0, S - 60);
        const y = randint(0, S - 40);
        const w = randint(50, 190);
        const kind = Math.random();
        const color = Math.random() < 0.55 ? CYAN : VIOLET;
        g.fillStyle = color;
        g.strokeStyle = color;
        g.globalAlpha = rand(0.45, 1);

        if (kind < 0.7) {
            const size = pick([7, 8, 9, 10]);
            g.font = `${size}px ${fontFamily}`;
            const rows = randint(3, 14);
            for (let r = 0; r < rows; r++) {
                const line = Math.random() < 0.5
                    ? pick(SNIPPETS)
                    : Array.from({ length: randint(4, 22) }, () => HEX[randint(0, 15)] + (Math.random() < 0.2 ? ' ' : '')).join('');
                g.fillText(line.slice(0, Math.floor(w / (size * 0.6))), x, y + r * (size + 2));
            }
        } else if (kind < 0.85) {
            const bars = randint(5, 12);
            const h = randint(20, 50);
            for (let i = 0; i < bars; i++) {
                const bh = rand(0.15, 1) * h;
                g.fillRect(x + i * 6, y + h - bh, 4, bh);
            }
            g.strokeRect(x - 3, y - 3, bars * 6 + 4, h + 6);
        } else {
            g.lineWidth = 1;
            g.strokeRect(x, y, w * 0.6, randint(20, 60));
            g.beginPath();
            for (let i = 0; i < 4; i++) {
                const yy = y + 6 + i * 8;
                g.moveTo(x + 4, yy);
                g.lineTo(x + rand(10, w * 0.55), yy);
            }
            g.stroke();
        }
    }
    g.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
}

function traceTexture() {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);

    g.strokeStyle = MAGENTA;
    g.fillStyle = MAGENTA;
    g.lineCap = 'square';

    const grid = 32;
    const snap = (v) => Math.round(v / grid) * grid;

    // Main buses along the lot boundaries so the board lines up with the city grid
    g.lineWidth = 3;
    g.globalAlpha = 0.9;
    for (let i = 0; i <= S; i += S / 8) {
        g.beginPath();
        g.moveTo(i, 0); g.lineTo(i, S);
        g.moveTo(0, i); g.lineTo(S, i);
        g.stroke();
    }

    for (let t = 0; t < 70; t++) {
        let x = snap(rand(0, S));
        let y = snap(rand(0, S));
        g.lineWidth = pick([1, 1.5, 2, 2]);
        g.globalAlpha = rand(0.45, 0.95);
        g.beginPath();
        g.moveTo(x, y);
        const segs = randint(2, 5);
        for (let s = 0; s < segs; s++) {
            if (s % 2 === 0) x = snap(x + rand(-260, 260));
            else y = snap(y + rand(-260, 260));
            g.lineTo(x, y);
        }
        g.stroke();
        if (Math.random() < 0.6) g.fillRect(x - 4, y - 4, 8, 8);
        else g.strokeRect(x - 8, y - 6, 16, 12);
    }

    for (let p = 0; p < 10; p++) {
        const x = snap(rand(0, S - 120));
        const y = snap(rand(0, S - 80));
        const w = snap(rand(48, 120));
        const h = snap(rand(32, 80));
        g.lineWidth = 1.5;
        g.globalAlpha = 0.8;
        g.strokeRect(x, y, w, h);
        for (let k = 8; k < w; k += 8) {
            g.beginPath();
            g.moveTo(x + k, y); g.lineTo(x + k, y - 6);
            g.moveTo(x + k, y + h); g.lineTo(x + k, y + h + 6);
            g.stroke();
        }
    }
    g.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
}

// Box whose side UVs are scaled by world size so text keeps its proportions on any tower
function towerGeometry(w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    const scale = 1 / 24;
    // Face order: +x, -x, +y, -y, +z, -z (4 verts each)
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    const offset = [Math.random(), Math.random()];
    for (let f = 0; f < 6; f++) {
        for (let v = 0; v < 4; v++) {
            const i = f * 4 + v;
            uv.setXY(i, uv.getX(i) * dims[f][0] * scale + offset[0], uv.getY(i) * dims[f][1] * scale + offset[1]);
        }
    }
    geo.translate(0, h / 2, 0);
    return geo;
}

export function startCity() {
    const canvas = document.createElement('canvas');
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
        console.warn('WebGL unavailable, skipping city background', err);
        return;
    }
    document.body.prepend(canvas);
    renderer.setClearColor(BG);

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BG, 30, DEPTH * 0.48);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.5, DEPTH);

    const font = "'Space Mono', monospace";
    const towerMats = Array.from({ length: 5 }, () => new THREE.MeshBasicMaterial({
        map: codeTexture(font),
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    }));
    const edgeMat = new THREE.LineBasicMaterial({
        color: 0x8fe6ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const traces = traceTexture();
    const groundSize = DEPTH * 2;
    traces.repeat.set(groundSize / TRACE_TILE, groundSize / TRACE_TILE);
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(groundSize, groundSize),
        new THREE.MeshBasicMaterial({ map: traces, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const towers = [];
    const rows = DEPTH / LOT;
    for (let r = 0; r < rows; r++) {
        for (let side = -1; side <= 1; side += 2) {
            for (let k = 0; k < LOTS_X; k++) {
                if (Math.random() < 0.28) continue;
                const chip = Math.random() < 0.22;
                const w = rand(6, LOT - 3);
                const d = rand(6, LOT - 3);
                const nearStreet = k < 2;
                const h = chip ? rand(1, 3) : rand(nearStreet ? 14 : 20, nearStreet ? 55 : 95);
                const geo = towerGeometry(w, h, d);
                const group = new THREE.Group();
                group.add(new THREE.Mesh(geo, pick(towerMats)));
                group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
                group.position.set(side * (STREET_HALF + LOT / 2 + k * LOT) + rand(-1.5, 1.5), 0, -r * LOT);
                scene.add(group);
                towers.push(group);
            }
        }
    }

    let W = 0, H = 0;
    function resize() {
        W = innerWidth;
        H = innerHeight;
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.fov = W < H ? 85 : 70;
        camera.updateProjectionMatrix();
    }
    resize();
    let resizeTimer;
    addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 100);
    });

    const speed = reduceMotion ? 2 : 22;
    let z = 0;
    let t = 0;
    let last = performance.now();
    let running = true;

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        last = performance.now();
        if (running) requestAnimationFrame(frame);
    });

    function frame(now) {
        if (!running) return;
        requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        t += dt;
        z -= speed * dt;

        const sway = reduceMotion ? 0 : 1;
        const x = Math.sin(t * 0.21) * 5 * sway;
        const y = 9 + Math.sin(t * 0.13) * 5 * sway;
        camera.position.set(x, y, z);
        camera.rotation.set(
            -0.12 + Math.sin(t * 0.17) * 0.06 * sway,
            Math.sin(t * 0.21 + 1.2) * 0.12 * sway,
            -Math.cos(t * 0.21) * 0.08 * sway
        );

        for (const tw of towers) {
            if (tw.position.z > z + LOT) tw.position.z -= DEPTH;
        }
        ground.position.set(0, 0, Math.round(z / TRACE_TILE) * TRACE_TILE);

        for (let i = 0; i < towerMats.length; i++) {
            towerMats[i].map.offset.y += dt * (0.02 + i * 0.008);
        }

        renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
}
