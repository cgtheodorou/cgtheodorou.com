import * as THREE from 'three';

// ---- Renderer with WebGL fallback ----
let renderer;
try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
    document.body.innerHTML = '<p style="font-family:sans-serif;padding:2rem;">WebGL is unavailable in this browser. Try enabling hardware acceleration, updating your graphics driver, or opening this page in another browser.</p>';
    throw e;
}
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x02030a, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 120;

// ---- Particle geometry ----
const COUNT = 2600;
const SPREAD = 220;
const positions = new Float32Array(COUNT * 3);
const scales = new Float32Array(COUNT);
const colors = new Float32Array(COUNT * 3);

// Deep-blue -> cyan palette
const cDeep = new THREE.Color(0x003066);
const cCyan = new THREE.Color(0x2bd6ff);

for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * SPREAD;
    positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD;
    positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;

    scales[i] = 0.5 + Math.random() * 2.0;

    const mix = Math.pow(Math.random(), 1.6); // bias toward deep blue
    const c = cDeep.clone().lerp(cCyan, mix);
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

// ---- Shader ----
const vertexShader = `
uniform float uTime;
uniform float uSize;
attribute float aScale;
attribute vec3 aColor;
varying vec3 vColor;
varying float vDepth;

// Ashima simplex noise 3D
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main() {
  vec3 pos = position;
  float t = uTime * 0.05;
  float n1 = snoise(pos * 0.012 + vec3(t, 0.0, 0.0));
  float n2 = snoise(pos * 0.012 + vec3(0.0, t, 100.0));
  float n3 = snoise(pos * 0.012 + vec3(100.0, 0.0, t));
  pos += vec3(n1, n2, n3) * 10.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * aScale * (300.0 / -mvPosition.z);
  vColor = aColor;
  vDepth = -mvPosition.z;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vDepth;
uniform float uFogNear;
uniform float uFogFar;
void main() {
  float d = distance(gl_PointCoord, vec2(0.5));
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d);
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = vec4(vColor, alpha * fog * 0.55);
}
`;

const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uSize: { value: 5.0 },
        uFogNear: { value: 120.0 },
        uFogFar: { value: 320.0 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const points = new THREE.Points(geometry, material);
scene.add(points);

// ---- Mouse parallax ----
const mouse = { x: 0, y: 0 };
const target = { x: 0, y: 0 };
addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / innerHeight) * 2 + 1;
});

// ---- Reduced motion ----
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const timeScale = reduceMotion ? 0.15 : 1.0;

// ---- Animation loop ----
let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    material.uniforms.uTime.value += delta * timeScale;

    target.x = mouse.x * 0.15;
    target.y = mouse.y * 0.15;
    points.rotation.y += (target.x - points.rotation.y) * 0.03;
    points.rotation.x += (-target.y - points.rotation.x) * 0.03;

    renderer.render(scene, camera);
}
animate();

// ---- Resize ----
addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
});

// ---- Atmospheric music ----
const ATMOS_VIDEO_ID = 'Xu2eAI7viFw';
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
                playsinline: 1
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
