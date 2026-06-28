// ============================================================
//  Terminal background - a wall of self-typing code streams
// ============================================================

// ---- Canvas setup ----
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
if (!ctx) {
    document.body.innerHTML = '<p style="font-family:sans-serif;padding:2rem;">2D canvas is unavailable in this browser. Try updating it or opening this page elsewhere.</p>';
    throw new Error('2D canvas unavailable');
}
document.body.appendChild(canvas);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Look & feel ----
const FONT_SIZE = 13;
const LINE_HEIGHT = 18;
const COL_WIDTH = 280;   // target px width per terminal column
const COL_GAP = 30;
const PAD = 18;
const GLOBAL_ALPHA = 0.52;

// Blue -> cyan palette, plus status accents
const BASE = [125, 215, 245];
const DIM = [80, 140, 175];
const OK = [90, 230, 165];
const WARN = [255, 195, 100];
const FAIL = [255, 105, 105];

// ---- Small helpers ----
const rand = (a, b) => a + Math.random() * (b - a);
const randint = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[randint(0, arr.length - 1)];
const hex = (n) => Array.from({ length: n }, () => '0123456789ABCDEF'[randint(0, 15)]).join('');
const seg = (t, c) => ({ t, c: c || BASE });

// ---- Content pools ----
const ACTIONS = [
    'init renderer', 'compile shaders', 'load geometry', 'mount /dev/gpu',
    'spawn worker pool', 'link libcore', 'alloc framebuffer', 'warm cache',
    'negotiate tls', 'seed prng', 'index modules', 'boot scheduler',
    'map memory pages', 'open socket :8443', 'verify checksum', 'deflate assets',
    'resolve deps', 'jit warmup', 'attach debugger', 'flush pipeline'
];
const CODE = [
    'for (i = 0; i < n; i++) {', '  spawn(node[i]);', '}',
    'const k = hash(seed);', 'if (ready) flush();', 'await nextFrame();',
    'render(scene, cam);', 'vec3 p = noise(uv);', 'return p * 0.5 + 0.5;',
    'queue.push(task);', 'while (q.len) tick();', 'gpu.dispatch(64, 1, 1);',
    'let mask = 1 << bit;', 'ptr = malloc(size);', 'free(ptr); ptr = 0;',
    'emit("ready", ctx);', 'state = State.LIVE;'
];
const ASM = [
    'mov  rax, [rbx]', 'xor  edx, edx', 'lea  rsi, [rip+0x2c]', 'test eax, eax',
    'jne  0x4af3', 'push rbp', 'call qword [rax]', 'add  rsp, 0x20',
    'cmp  rcx, rdx', 'ret'
];

function genBoot() {
    const r = Math.random();
    const status = r < 0.84 ? seg('[ ok ]', OK) : r < 0.95 ? seg('[warn]', WARN) : seg('[fail]', FAIL);
    return [seg('> ' + pick(ACTIONS) + ' '), seg('.'.repeat(randint(2, 8)) + ' ', DIM), status];
}
function genCode() { return [seg(pick(CODE))]; }
function genHex() { return [seg('trace 0x' + hex(randint(4, 6)) + ' ', DIM), seg(pick(['mov', 'add', 'cmp', 'jmp']) + ' r' + randint(0, 9))]; }
function genAsm() { return [seg('0x' + hex(4) + '  ', DIM), seg(pick(ASM))]; }
function genProg() {
    const n = 12, f = randint(0, n);
    return [seg('build [', DIM), seg('#'.repeat(f) + ' '.repeat(n - f)), seg('] ' + Math.round((f / n) * 100) + '%', DIM)];
}
function genBlank() { return [seg('')]; }

const GENERATORS = [genCode, genCode, genBoot, genBoot, genHex, genAsm, genProg, genBlank];
const newLine = () => pick(GENERATORS)();
const lineLen = (line) => line.reduce((s, g) => s + g.t.length, 0);

// ---- Columns ----
let W = 0, H = 0, dpr = 1, columns = [], visibleRows = 0;

function buildColumns() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT_SIZE + "px 'Space Mono', monospace";
    ctx.textBaseline = 'alphabetic';

    visibleRows = Math.ceil(H / LINE_HEIGHT) + 2;
    const count = Math.max(1, Math.floor((W - 2 * PAD + COL_GAP) / (COL_WIDTH + COL_GAP)));
    const span = (W - 2 * PAD - count * COL_WIDTH) / Math.max(1, count - 1 || 1);

    columns = Array.from({ length: count }, (_, i) => {
        const lines = Array.from({ length: visibleRows }, newLine);
        const head = newLine();
        return {
            x: PAD + i * (COL_WIDTH + (count > 1 ? span : 0)),
            lines,                                   // committed lines, newest last
            head,                                    // line currently being typed
            reveal: 0,                               // chars of head shown
            done: false,
            pause: 0,                                // time since head finished
            scroll: 0,                               // slide animation offset (px)
            speed: rand(32, 78) * (reduceMotion ? 0.4 : 1),  // chars / sec
            holdFor: rand(0.1, 0.5) / (reduceMotion ? 0.5 : 1)
        };
    });
}

// ---- Per-frame update ----
function update(col, dt) {
    if (!col.done) {
        col.reveal += col.speed * dt;
        if (col.reveal >= lineLen(col.head)) {
            col.reveal = lineLen(col.head);
            col.done = true;
            col.pause = 0;
        }
    } else {
        col.pause += dt;
        if (col.pause >= col.holdFor) {
            col.lines.push(col.head);
            if (col.lines.length > visibleRows + 1) col.lines.shift();
            col.head = newLine();
            col.reveal = 0;
            col.done = false;
            col.scroll = LINE_HEIGHT;            // start one line low, slide up
            col.holdFor = rand(0.1, 0.5) / (reduceMotion ? 0.5 : 1);
        }
    }
    if (col.scroll > 0) col.scroll = Math.max(0, col.scroll - (LINE_HEIGHT / 0.12) * dt);
}

// ---- Draw one terminal column ----
function drawColumn(col, blink) {
    const bottom = H - PAD;

    // committed lines, from newest (just above head) upward
    for (let k = 0; k < col.lines.length; k++) {
        const v = col.lines.length - k;                 // visual row from bottom (head = 0)
        const y = bottom - v * LINE_HEIGHT + col.scroll;
        const a = Math.pow(Math.max(0, 1 - v / visibleRows), 1.3) * GLOBAL_ALPHA;
        if (a < 0.025 || y < -LINE_HEIGHT) continue;
        drawSegments(col.lines[k], col.x, y, a, Infinity);
    }

    // head line (typing), brightest, with cursor
    const yHead = bottom + col.scroll;
    const headAlpha = GLOBAL_ALPHA * 1.15;
    const endX = drawSegments(col.head, col.x, yHead, headAlpha, col.reveal);
    if (blink || !col.done) {
        ctx.fillStyle = `rgba(${BASE[0]},${BASE[1]},${BASE[2]},${headAlpha})`;
        ctx.fillRect(endX, yHead - FONT_SIZE + 1, FONT_SIZE * 0.62, FONT_SIZE);
    }
}

// Draw segments left to right, up to `limit` revealed chars. Returns final x.
function drawSegments(line, x, y, alpha, limit) {
    let shown = 0;
    for (const g of line) {
        if (shown >= limit) break;
        const take = Math.min(g.t.length, Math.floor(limit - shown));
        const str = take >= g.t.length ? g.t : g.t.slice(0, take);
        if (str) {
            ctx.fillStyle = `rgba(${g.c[0]},${g.c[1]},${g.c[2]},${alpha})`;
            ctx.fillText(str, x, y);
            x += ctx.measureText(str).width;
        }
        shown += g.t.length;
    }
    return x;
}

// ---- Glitch: occasional horizontal slice shift ----
let glitchIn = rand(2, 6);
let glitchFor = 0;
function maybeGlitch(dt) {
    if (reduceMotion) return;
    if (glitchFor > 0) {
        glitchFor -= dt;
        const by = randint(0, H - 40);
        const bh = randint(8, 40);
        const dx = randint(-12, 12);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(canvas, 0, by * dpr, W * dpr, bh * dpr, dx, by, W, bh);
        ctx.globalCompositeOperation = 'source-over';
        return;
    }
    glitchIn -= dt;
    if (glitchIn <= 0) {
        glitchIn = rand(2.5, 7);
        glitchFor = rand(0.06, 0.16);
    }
}

// ---- Main loop ----
let last = performance.now();
function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, W, H);

    const blink = (now / 1000) % 1 < 0.55;
    for (const col of columns) {
        update(col, dt);
        drawColumn(col, blink);
    }
    maybeGlitch(dt);
}

buildColumns();
frame();

// ---- Resize ----
let resizeTimer;
addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildColumns, 150);
});

// ---- Atmospheric music ----
const ATMOS_VIDEO_ID = 'bV-hSgL1R74';
const LABEL_PLAY = '♪ Make it atmospheric';
const LABEL_STOP = '■ Stop the atmosphere';

const atmosphereBtn = document.getElementById('atmosphere-btn');
let ytPlayer = null;
let ytReady = false;
let isPlaying = false;
let pendingPlay = false;

function updateAtmosphereButton() {
    if (!atmosphereBtn) return;
    atmosphereBtn.textContent = isPlaying ? LABEL_STOP : LABEL_PLAY;
    atmosphereBtn.setAttribute('aria-pressed', String(isPlaying));
}

function startAtmosphere() {
    if (!ytPlayer) return;
    ytPlayer.playVideo();
    isPlaying = true;
    updateAtmosphereButton();
}

function stopAtmosphere() {
    if (!ytPlayer) return;
    ytPlayer.pauseVideo();
    isPlaying = false;
    updateAtmosphereButton();
}

if (atmosphereBtn) {
    // Load the IFrame Player API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    // The API calls this global once it has loaded
    window.onYouTubeIframeAPIReady = () => {
        ytPlayer = new window.YT.Player('yt-player', {
            videoId: ATMOS_VIDEO_ID,
            playerVars: {
                loop: 1,
                playlist: ATMOS_VIDEO_ID,
                controls: 0,
                disablekb: 1,
                playsinline: 1,
                start: 120
            },
            events: {
                onReady: () => {
                    ytReady = true;
                    if (pendingPlay) {
                        pendingPlay = false;
                        startAtmosphere();
                    }
                }
            }
        });
    };

    atmosphereBtn.addEventListener('click', () => {
        if (isPlaying) {
            stopAtmosphere();
        } else if (ytReady) {
            startAtmosphere();
        } else {
            pendingPlay = true;
            atmosphereBtn.textContent = '… loading';
        }
    });
}
