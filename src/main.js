import { startCity } from './city.js';

document.fonts.load("10px 'Space Mono'").catch(() => {}).finally(startCity);

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
