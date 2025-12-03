const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingElement = document.getElementById('loading');
const promptElement = document.getElementById('prompt-text');
const galleryContainer = document.getElementById('gallery-container');
const galleryText = document.getElementById('gallery-center-text');
const bgm = document.getElementById('bgm');

// State Machine
const STATE = {
    IDLE: 'IDLE',
    TRACKING: 'TRACKING',
    EXPLOSION: 'EXPLOSION',
    GALLERY: 'GALLERY'
};
let currentState = STATE.IDLE;
let galleryStartTime = 0; // Timer for gallery entrance animation

// Configuration
const CONFIG = {
    holdThreshold: 0.85, 
    holdDuration: 2000,  
    photoRadius: 320,    
    // Use gh-proxy.org for photos acceleration
            photos: Array.from({length: 18}, (_, i) => `https://gh-proxy.org/https://raw.githubusercontent.com/MuQY1818/MerryChristmas/main/assets/photos/${i+1}.jpg`)
        };

let isLoaded = false;
let holdStartTime = 0;
let currentScale = 0; // 0 to 1
let particles = []; // Explosion particles
let magicDust = [];
let sparkles = [];
let treeParticles = []; // New Photo Tree Particles
let loadedImages = []; // Preloaded Image objects

// Mouse Interaction
const mouse = { x: -1000, y: -1000 };
let hoveredParticle = null;


// Resize canvas
function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Preload Logic ---
function preloadImages() {
    let count = 0;
    CONFIG.photos.forEach(src => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            loadedImages.push(img);
            count++;
            if (count === CONFIG.photos.length) {
                console.log("All photos preloaded!");
            }
        };
        img.onerror = () => {
            console.warn(`Failed to load ${src}`);
            count++;
        };
    });
}
preloadImages();

// --- Classes ---

class SnowSystem {
    constructor() {
        this.flakes = [];
        // Layered Snow: Back (more, small, slow), Mid, Front (few, fast, large)
        this.createLayer(100, { minSize: 1, maxSize: 2, minSpeed: 0.2, maxSpeed: 0.5, opacity: 0.3, blur: true });
        this.createLayer(50, { minSize: 2, maxSize: 4, minSpeed: 0.5, maxSpeed: 1.0, opacity: 0.6, blur: false });
        this.createLayer(20, { minSize: 4, maxSize: 6, minSpeed: 1.0, maxSpeed: 2.0, opacity: 0.9, blur: false });
    }
    
    createLayer(count, config) {
        for(let i=0; i<count; i++) {
            this.flakes.push(this.createFlake(config));
        }
    }
    
    createFlake(config) {
        return {
            x: Math.random() * canvasElement.width,
            y: Math.random() * canvasElement.height,
            size: config.minSize + Math.random() * (config.maxSize - config.minSize),
            speedY: config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed),
            speedX: (Math.random() - 0.5) * 0.5,
            swaySpeed: Math.random() * 0.05 + 0.01,
            swayPhase: Math.random() * Math.PI * 2,
            opacity: config.opacity,
            blur: config.blur
        };
    }

    update() {
        this.flakes.forEach(flake => {
            flake.y += flake.speedY;
            // Sine wave sway
            flake.x += Math.sin(time * flake.swaySpeed + flake.swayPhase) * 0.5;
            
            if(flake.y > canvasElement.height) {
                flake.y = -10;
                flake.x = Math.random() * canvasElement.width;
            }
            if(flake.x > canvasElement.width) flake.x = 0;
            if(flake.x < 0) flake.x = canvasElement.width;
        });
    }

    draw(ctx) {
        this.flakes.forEach(flake => {
            ctx.save();
            ctx.globalAlpha = flake.opacity;
            
            if (flake.blur) {
                // Simple blur simulation using reduced alpha or shadow
                // Canvas filter is expensive, so we skip actual filter
            }
            
            // Soft snowflake using gradient
            const grad = ctx.createRadialGradient(flake.x, flake.y, 0, flake.x, flake.y, flake.size);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI*2);
            ctx.fill();
            
            ctx.restore();
        });
        ctx.globalAlpha = 1.0;
    }
}

// --- Mouse Interaction & Modal Logic ---

// Mouse Move
canvasElement.addEventListener('mousemove', (e) => {
    const rect = canvasElement.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

// Click to Open Modal
canvasElement.addEventListener('click', () => {
    if (hoveredParticle && hoveredParticle.img && hoveredParticle.type === 'photo') {
        openModal(hoveredParticle.img.src);
    }
});

// Modal Logic
const modal = document.getElementById('photo-modal');
const modalImg = document.getElementById('modal-image');
const closeModalBtn = document.getElementById('close-modal');

function openModal(src) {
    modalImg.src = src;
    modal.classList.add('visible');
}

closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('visible');
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('visible');
    }
});


class MagicDust {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3; // Slightly larger
        this.vx = (Math.random() - 0.5) * 1.5; // More spread
        this.vy = (Math.random() - 0.5) * 1.5 - 0.5; 
        this.life = 1.0;
        // Varied magical colors: Gold, Cyan, Magenta, White
        const hues = [50, 180, 300, 0]; // Gold, Cyan, Magenta, Red/White
        const selectedHue = hues[Math.floor(Math.random() * hues.length)];
        const saturation = selectedHue === 0 ? '0%' : '100%';
        this.color = `hsla(${selectedHue}, ${saturation}, 80%,`; 
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy -= 0.02; // Float up acceleration
        this.life -= 0.015;
        this.size *= 0.95; // Shrink
    }
    
    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color + this.life + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color + '1)';
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.globalAlpha = 1.0;
    }
}

class Sparkle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 0.05 + Math.random() * 0.05;
        this.maxSize = 3 + Math.random() * 2;
    }
    
    draw(ctx) {
        this.phase += this.speed;
        const alpha = (Math.sin(this.phase) + 1) / 2; // 0 to 1
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Core with Gradient for Glow (Performance Optimization: No shadowBlur)
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.maxSize * 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, this.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.maxSize * 2, 0, Math.PI*2);
        ctx.fill();
        
        // Cross flare
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        const len = this.maxSize * alpha * 3;
        
        ctx.beginPath();
        ctx.moveTo(this.x - len, this.y);
        ctx.lineTo(this.x + len, this.y);
        ctx.moveTo(this.x, this.y - len);
        ctx.lineTo(this.x, this.y + len);
        ctx.stroke();
        
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.color = color;
        this.decay = 0.01 + Math.random() * 0.02;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Gravity
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}

class PhotoParticle {
    constructor(x, y, z, img, type = 'photo') {
        this.x = x;
        this.y = y;
        this.z = z;
        this.initialX = x;
        this.initialY = y;
        this.initialZ = z;
        this.img = img;
        this.type = type; // 'photo' or 'light'
        
        if (this.type === 'photo') {
            this.baseSize = 40 + Math.random() * 30; // Bigger photos
        } else {
            this.baseSize = 5 + Math.random() * 10; // Small lights
            this.color = Math.random() > 0.5 ? '#FFD700' : (Math.random() > 0.5 ? '#FF0000' : '#FFFFFF');
        }

        this.angle = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 0.01; // Slower spin
        this.floatOffset = Math.random() * Math.PI * 2;
        this.swayPhase = Math.random() * Math.PI * 2;
        
        // Twinkle properties for lights
        this.twinkleSpeed = 2 + Math.random() * 5;
        this.twinklePhase = Math.random() * Math.PI * 2;

        this.projected = null; // Store projected coordinates
    }
    
    update(treeRotation) {
        // Rotate the particle around the Y axis (which is the center of the tree)
        const cos = Math.cos(treeRotation);
        const sin = Math.sin(treeRotation);
        
        // Apply rotation to initial position
        this.currX = this.initialX * cos - this.initialZ * sin;
        this.currZ = this.initialX * sin + this.initialZ * cos;
        
        // Gentle float & sway
        this.currY = this.initialY + Math.sin(time * 1.5 + this.floatOffset) * 8; 
        
        this.angle += this.spinSpeed;
    }
    
    updateProjection(cx, cy) {
        const fov = 400;
        const zDepth = this.currZ + 400; 
        if (zDepth < 1) {
            this.projected = null;
            return;
        }
        
        const scale = fov / zDepth;
        
        this.projected = {
            x: cx + (this.currX * scale),
            y: cy + (this.currY * scale),
            size: this.baseSize * scale,
            zDepth: zDepth
        };
    }
    
    isHit(mx, my) {
        if (!this.projected || this.type !== 'photo') return false;
        const { x, y, size } = this.projected;
        const half = size / 2;
        // Simple bounding box hit test
        return (mx >= x - half && mx <= x + half && my >= y - half && my <= y + half);
    }
    
    draw(ctx, opacityMultiplier = 1, isHovered = false) {
        if (!this.projected) return;
        
        const { x, y, size, zDepth } = this.projected;
        
        // Apply hover scale
        let drawSize = size;
        let zIndexBias = 0;
        
        if (isHovered) {
            drawSize *= 1.3; // 30% bigger
            zIndexBias = 1000; // Draw on top? No, canvas order matters. 
            // But visually we want it to pop.
            canvasElement.style.cursor = 'pointer';
        }

        // Fade distant particles
        const alpha = Math.min(1, Math.max(0.1, (this.currZ + 200) / 400)); 
        
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = alpha * opacityMultiplier;

        if (this.type === 'photo' && this.img) {
             if (isHovered) {
                 // Reset rotation for hovered item so it's straight? Or keep it?
                 // Let's keep spinning but maybe slower? Or just keep it.
                 ctx.rotate(this.angle);
                 
                 // Extra Glow for hover
                 ctx.shadowBlur = 20;
                 ctx.shadowColor = "rgba(255, 215, 0, 1)";
             } else {
                 ctx.rotate(this.angle);
             }
             
             // Draw Square Photo with Border
             const halfSize = drawSize / 2;
             const borderSize = drawSize * 0.1; // 10% border

             // Gold Frame
             ctx.fillStyle = isHovered ? '#FFFACD' : '#B8860B'; // Lighter gold on hover
             ctx.fillRect(-halfSize - borderSize, -halfSize - borderSize, drawSize + borderSize*2, drawSize + borderSize*2);
             
             // Inner Glow
             ctx.fillStyle = '#FFF8DC'; // Cornsilk
             ctx.fillRect(-halfSize - 1, -halfSize - 1, drawSize + 2, drawSize + 2);

             // Image
             ctx.drawImage(this.img, -halfSize, -halfSize, drawSize, drawSize);
             
             // Dynamic Shine effect
             // Move the shine across the photo based on time
             const shinePos = (time * 2 + this.initialX * 0.01) % 4; // 0 to 4 cycle
             if (shinePos < 2) { // Only show during part of the cycle
                 ctx.save();
                 ctx.beginPath();
                 ctx.rect(-halfSize, -halfSize, drawSize, drawSize);
                 ctx.clip();
                 
                 const shineX = -drawSize + (shinePos * drawSize); 
                 
                 const shineGrad = ctx.createLinearGradient(shineX, -halfSize, shineX + drawSize*0.5, drawSize);
                 shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                 shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)'); // Bright shine
                 shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                 
                 ctx.fillStyle = shineGrad;
                 ctx.beginPath();
                 ctx.moveTo(shineX, -halfSize);
                 ctx.lineTo(shineX + 20, -halfSize); // Slanted
                 ctx.lineTo(shineX + drawSize*0.5 + 20, drawSize);
                 ctx.lineTo(shineX + drawSize*0.5, drawSize);
                 ctx.fill();
                 ctx.restore();
             }

        } else {
            // Light Particle
            ctx.globalCompositeOperation = 'lighter';
            // Performance: Use Gradient instead of shadowBlur
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, drawSize);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            
            // Twinkle
            // More organic twinkle
            const twinkleBase = 0.5 + Math.sin(time * this.twinkleSpeed + this.twinklePhase) * 0.3;
            // Random flash
            const flash = (Math.random() > 0.98) ? 1.5 : 0; 
            const finalScale = twinkleBase + flash;
            
            ctx.scale(finalScale, finalScale);
            
            ctx.beginPath();
            ctx.arc(0, 0, drawSize, 0, Math.PI*2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// --- Advanced Visualization Functions (Legacy for Growing Phase) ---

// Global timer for animations
let lyricsManager; // Global variable
let musicPlayer; // Global Music Player

// Music Player Class
class MusicPlayer {
    constructor(audioElement) {
        this.audio = audioElement;
        this.playerElement = document.getElementById('music-player');
        this.playBtn = document.getElementById('play-pause-btn');
        this.vinyl = document.querySelector('.vinyl-record');
        this.progressContainer = document.getElementById('progress-container');
        this.progressFill = document.getElementById('progress-fill');
        this.currentTimeEl = document.getElementById('current-time');
        this.totalTimeEl = document.getElementById('total-time');
        
        this.isPlaying = false;
        
        this.init();
    }
    
    init() {
        // Play/Pause Click
        this.playBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling
            this.togglePlay();
        });
        
        // Audio Events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.setDuration());
        this.audio.addEventListener('ended', () => this.resetPlayer());
        this.audio.addEventListener('play', () => this.setPlayingState(true));
        this.audio.addEventListener('pause', () => this.setPlayingState(false));
        
        // Seek
        this.progressContainer.addEventListener('click', (e) => this.seek(e));
    }
    
    togglePlay() {
        if (this.audio.paused) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
    }
    
    setPlayingState(isPlaying) {
        this.isPlaying = isPlaying;
        if (isPlaying) {
            this.playBtn.innerHTML = '<span class="icon">❚❚</span>'; // Pause icon
            this.vinyl.classList.add('playing');
            this.playerElement.classList.add('playing');
        } else {
            this.playBtn.innerHTML = '<span class="icon">▶</span>'; // Play icon
            this.vinyl.classList.remove('playing');
            this.playerElement.classList.remove('playing');
        }
    }
    
    updateProgress() {
        if (!this.audio.duration) return;
        
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressFill.style.width = `${percent}%`;
        
        this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }
    
    setDuration() {
        if (this.audio.duration && !isNaN(this.audio.duration)) {
             this.totalTimeEl.textContent = this.formatTime(this.audio.duration);
        }
    }
    
    seek(e) {
        const width = this.progressContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = this.audio.duration;
        
        if (duration) {
            this.audio.currentTime = (clickX / width) * duration;
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    resetPlayer() {
        this.setPlayingState(false);
        this.progressFill.style.width = '0%';
        this.currentTimeEl.textContent = '0:00';
        // Loop is enabled in HTML, so it might restart automatically depending on logic. 
        // If loop is true, 'ended' might not fire or it immediately replays.
        // But for safety:
    }
    
    show() {
        this.playerElement.classList.add('visible');
        this.setDuration(); // Ensure duration is displayed
        // Sync initial state
        this.setPlayingState(!this.audio.paused);
    }
}

// Lyrics Manager Class
class LyricsManager {
    constructor(audioElement) {
        this.audio = audioElement;
        this.lyrics = [];
        this.currentIndex = -1;
        this.activeLyric = null;
        this.activeLyricProgress = 0;
        
        // Default "Surprise" Lyrics (Timeline in seconds)
        this.setLyrics([
            { "time": 0.38, "text": "(Intro Music)" },
            { "time": 23.67, "text": "Snowflakes dancing 'round" },
            { "time": 26.55, "text": "Landing on your brow" },
            { "time": 29.44, "text": "Streetlights fading out" },
            { "time": 31.69, "text": "I only see you now" },
            { "time": 35.3, "text": "Freezing up the time" },
            { "time": 38.29, "text": "Keeping this somehow" },
            { "time": 41.18, "text": "Touch speaks louder than" },
            { "time": 43.4, "text": "Words can disavow" },
            { "time": 46.98, "text": "Leave the noisy world" },
            { "time": 48.29, "text": "Leave it all behind" },
            { "time": 49.85, "text": "Focus on your breath" },
            { "time": 51.25, "text": "Rhythm gentle kind" },
            { "time": 52.77, "text": "Every little thing" },
            { "time": 54.19, "text": "Printed on my mind" },
            { "time": 55.68, "text": "Closer to me now" },
            { "time": 57.09, "text": "No more time to find" },
            { "time": 59.13, "text": "Drowning in this vibe" },
            { "time": 62.05, "text": "On this Christmas Eve" },
            { "time": 65.05, "text": "Looking in your eyes" },
            { "time": 68.05, "text": "It’s all that I believe" },
            { "time": 70.85, "text": "I don’t need no wine" },
            { "time": 73.73, "text": "Just to feel relieved" },
            { "time": 76.69, "text": "Perfect is the world" },
            { "time": 79.91, "text": "When you're here with me" },
            { "time": 86.58, "text": "(Yeah...)" },
            { "time": 88.59, "text": "Red scarf wrapping round" },
            { "time": 90.92, "text": "Weaving up a dream" },
            { "time": 93.87, "text": "Footprints in the snow" },
            { "time": 96.14, "text": "Like a destined team" },
            { "time": 99.73, "text": "Heartbeat losing track" },
            { "time": 102.64, "text": "Flowing like a stream" },
            { "time": 105.49, "text": "Locked inside your gaze" },
            { "time": 107.88, "text": "Glowing like a beam" },
            { "time": 111.31, "text": "Leave the noisy world" },
            { "time": 112.58, "text": "Leave it all behind" },
            { "time": 114.05, "text": "Focus on your breath" },
            { "time": 115.49, "text": "Rhythm gentle kind" },
            { "time": 116.95, "text": "Every little thing" },
            { "time": 118.48, "text": "Printed on my mind" },
            { "time": 119.89, "text": "Closer to me now" },
            { "time": 121.43, "text": "No more time to find" },
            { "time": 123.35, "text": "Drowning in this vibe" },
            { "time": 126.29, "text": "On this Christmas Eve" },
            { "time": 129.06, "text": "Looking in your eyes" },
            { "time": 132.12, "text": "It’s all that I believe" },
            { "time": 134.96, "text": "I don’t need no wine" },
            { "time": 137.9, "text": "Just to feel relieved" },
            { "time": 140.79, "text": "Perfect is the world" },
            { "time": 144.01, "text": "When you're here with me" },
            { "time": 146.49, "text": "Sleigh bells ringing out" },
            { "time": 149.12, "text": "Singing for the night" },
            { "time": 152, "text": "Your love burns so hot" },
            { "time": 155.01, "text": "Brighter than the light" },
            { "time": 157.85, "text": "Like a cocoa cup" },
            { "time": 160.73, "text": "Warming up the fright" },
            { "time": 163.56, "text": "You’re the only one" },
            { "time": 166.46, "text": "Everything is right" },
            { "time": 169.93, "text": "(Instrumental Solo)" },
            { "time": 192.99, "text": "Drowning in this vibe" },
            { "time": 195.7, "text": "On this Christmas Eve" },
            { "time": 198.47, "text": "Looking in your eyes" },
            { "time": 201.46, "text": "It’s all that I believe" },
            { "time": 204.22, "text": "I don’t need no wine" },
            { "time": 207.06, "text": "Just to feel relieved" },
            { "time": 209.98, "text": "Perfect is the world" },
            { "time": 212.9, "text": "When you're here with me" },
            { "time": 215.4, "text": "Snow is falling down" },
            { "time": 218.1, "text": "Under moonlight's glow" },
            { "time": 220.91, "text": "Heaven's right here" },
            { "time": 223.82, "text": "I just want you to know" },
            { "time": 226.69, "text": "Time is moving slow" },
            { "time": 229.39, "text": "Never let you go" },
            { "time": 232.33, "text": "Baby stay with me" },
            { "time": 235.23, "text": "Let the sunrise slow..." }
        ]);
    }

    setLyrics(lyricsData) {
        this.lyrics = lyricsData.sort((a, b) => a.time - b.time);
    }

    update() {
        if (!this.audio || this.audio.paused) return;
        
        const currentTime = this.audio.currentTime;
        
        // Find current lyric
        let foundIndex = -1;
        for (let i = 0; i < this.lyrics.length; i++) {
            if (currentTime >= this.lyrics[i].time) {
                foundIndex = i;
            } else {
                break;
            }
        }

        if (foundIndex !== -1 && foundIndex !== this.currentIndex) {
            this.currentIndex = foundIndex;
            this.activeLyric = this.lyrics[foundIndex];
            this.activeLyricProgress = 0; // Reset animation
        }

        if (this.activeLyric) {
            this.activeLyricProgress += 0.02; // Animation speed
        }
    }

    draw(ctx, width, height) {
        if (!this.activeLyric) return;

        // Calculate precise progress based on timestamps
        let nextTime = 9999;
        if (this.currentIndex < this.lyrics.length - 1) {
            nextTime = this.lyrics[this.currentIndex + 1].time;
        }
        
        // Duration of this specific lyric line
        const duration = nextTime - this.activeLyric.time;
        // Time elapsed since this lyric started
        const elapsed = this.audio.currentTime - this.activeLyric.time;
        
        if (elapsed < 0) return; // Should not happen but safe guard
        
        // Animation Parameters
        const ENTRANCE_DURATION = 0.3; // Much faster entrance
        const EXIT_DURATION = 0.3; // Much faster exit
        
        let alpha = 1;
        let scale = 1;
        let yOffset = 0;
        let rotation = 0;
        let blurAmount = 0;

        // --- 1. ENTRANCE (Pop / Jump Out) ---
        if (elapsed < ENTRANCE_DURATION) {
            const p = elapsed / ENTRANCE_DURATION;
            
            // Elastic Out Easing (The "Jump")
            // c4 = (2 * Math.PI) / 3;
            // easeOutElastic = x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
            
            // Simplified Elastic/Back Out
            // Back Out: overshoot slightly
            const c1 = 1.70158;
            const c3 = c1 + 1;
            const easeBackOut = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
            
            alpha = Math.min(1, p * 2); // Fade in quickly
            
            // Jump from small to normal (with overshoot)
            scale = 0.5 + (0.5 * easeBackOut); 
            
            // Slide up quickly
            yOffset = (1 - easeBackOut) * 30;
            
            // Initial burst blur
            blurAmount = (1 - p) * 5; 
        }
        // --- 2. EXIT (Dissolve / Fly Away) ---
        else if (elapsed > duration - EXIT_DURATION) {
            const remaining = duration - elapsed;
            const p = 1 - (remaining / EXIT_DURATION); // 0 to 1 during exit
            
            alpha = 1 - p;
            yOffset = -p * 40; // Float up
            scale = 1 + p * 0.2; // Expand slightly while fading
            blurAmount = p * 8; // Blur out
        }
        // --- 3. IDLE (Stable but Alive) ---
        else {
            // Very subtle movement, NO jumping
            const stableTime = elapsed - ENTRANCE_DURATION;
            
            // Gentle breathing (Scale) - More organic using multiple sines
            scale = 1 + Math.sin(stableTime * 1.2) * 0.01 + Math.sin(stableTime * 2.5) * 0.005;
            
            // Organic float (Y)
            yOffset = Math.sin(stableTime * 0.8) * 4 + Math.cos(stableTime * 1.5) * 2;
            
            rotation = Math.sin(stableTime * 0.5) * 0.01;
        }

        ctx.save();
        
        const cx = width / 2;
        const cy = height - 250; // Bottom area - Moved up to avoid covering music player
        
        ctx.translate(cx, cy + yOffset);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        
        // Global Alpha
        ctx.globalAlpha = alpha;

        // Apply Filter if supported (for blur effect)
        if (blurAmount > 0) {
            ctx.filter = `blur(${blurAmount}px)`;
        }

        // Font Style - Use new Elegant Font
        // Great Vibes is a script font, so we make it larger to be readable
        ctx.font = "80px 'Great Vibes', cursive"; 
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // --- Stronger Glow for Impact ---
        // Pulse the glow slightly
        const pulse = 15 + Math.sin(elapsed * 3) * 5;
        ctx.shadowBlur = pulse; 
        ctx.shadowColor = "rgba(255, 215, 0, 0.8)"; // Gold glow

        // --- Text Stroke (Depth) ---
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.6)"; 
        ctx.strokeText(this.activeLyric.text, 0, 0);
        
        // --- Gradient Fill (Platinum to Gold, shifting over time) ---
        const gradient = ctx.createLinearGradient(0, -30, 0, 30);
        // Shift colors slightly over time for magical effect
        const shift = Math.sin(time * 0.5); 
        gradient.addColorStop(0, "#FFFFFF"); 
        gradient.addColorStop(0.5, shift > 0 ? "#FFFACD" : "#E0FFFF"); // LemonChiffon or LightCyan
        gradient.addColorStop(1, "#FFD700"); 
        
        ctx.fillStyle = gradient;
        ctx.fillText(this.activeLyric.text, 0, 0);

        ctx.restore();
    }
}

let time = 0;

function drawFancyTree(ctx, scale) {
    if (scale < 0.05) return;
    time += 0.02;

    const centerX = canvasElement.width / 2;
    const bottomY = canvasElement.height - 100;
    const treeHeight = 600 * scale; 
    const maxLayers = 15; 
    
    // Draw Trunk
    ctx.save();
    ctx.fillStyle = '#2e1a0f';
    const trunkWidth = 40 * scale;
    ctx.fillRect(centerX - trunkWidth/2, bottomY, trunkWidth, 50 * scale);
    ctx.restore();

    // Draw Tree Layers
    const currentLayers = Math.max(2, Math.floor(maxLayers * scale));
    
    for (let i = 0; i < currentLayers; i++) {
        const layerProgress = i / (maxLayers - 1); 
        const inverseProgress = 1 - layerProgress;
        
        const layerWidth = 350 * scale * Math.pow(inverseProgress, 0.8); 
        const layerY = bottomY - (layerProgress * treeHeight);
        const layerH = (treeHeight / maxLayers) * 1.5;
        
        drawUltraLayer(ctx, centerX, layerY, layerWidth, layerH, i, scale);
    }
    
    drawSpiralLights(ctx, centerX, bottomY, treeHeight, scale);

    if (scale > 0.8) {
        const topY = bottomY - treeHeight;
        drawUltimateStar(ctx, centerX, topY, scale);
    }
}

function drawUltraLayer(ctx, cx, cy, width, height, index, scale) {
    const sway = Math.sin(time + index * 0.5) * 5 * scale * (index/10);
    const x = cx + sway;
    const y = cy;
    
    ctx.save();
    // Pine Texture Gradient
    const gradient = ctx.createLinearGradient(x - width/2, y, x + width/2, y);
    gradient.addColorStop(0, '#004d00');   // Dark Green
    gradient.addColorStop(0.5, '#2E8B57'); // Sea Green
    gradient.addColorStop(1, '#004d00');    // Dark Green
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    
    // Jagged Pine Shape
    const leftX = x - width / 2;
    const rightX = x + width / 2;
    const topY = y - height * 0.8;
    const bottomY = y + height * 0.2;
    
    // Top point
    ctx.moveTo(x, topY);
    
    // Right side jagged
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const currY = topY + (bottomY - topY) * t;
        const currX = x + (width / 2) * t; 
        
        // Jagged out
        ctx.lineTo(currX, currY - (height/steps)*0.5);
        // Jagged in
        ctx.lineTo(currX - (width/steps)*0.3, currY);
    }
    
    // Bottom curve
    ctx.quadraticCurveTo(x, bottomY + height * 0.2, leftX, bottomY);
    
    // Left side jagged (reverse)
    for (let i = steps; i >= 1; i--) {
        const t = i / steps;
        const currY = topY + (bottomY - topY) * t;
        const currX = x - (width / 2) * t;
        
        // Jagged in
        ctx.lineTo(currX + (width/steps)*0.3, currY);
        // Jagged out
        ctx.lineTo(currX, currY - (height/steps)*0.5);
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Add "Flowing Light"
    const flowOffset = (time * 2 + index) % 10; 
    if (flowOffset < 3) {
        ctx.globalCompositeOperation = 'overlay';
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 - Math.abs(1.5 - flowOffset)/3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    }
    
    if (scale > 0.4) {
        drawLayerOrnaments(ctx, x, y, width, height, index);
    }
    ctx.restore();
}

function drawLayerOrnaments(ctx, cx, cy, width, height, layerIndex) {
    const count = 2 + (layerIndex % 3);
    for(let i=0; i<count; i++) {
        const offset = (i+1) / (count+1);
        const ox = cx - width/2 + width * offset;
        const oy = cy + Math.sin(offset * Math.PI) * height * 0.3;
        const type = (layerIndex + i) % 3;
        
        if (type === 0) {
            const color = ['#FF0000', '#FFD700', '#FF69B4', '#00FFFF'][layerIndex % 4];
            drawBauble(ctx, ox, oy, 6, color);
        } else if (type === 1) {
            drawBell(ctx, ox, oy, 8);
        }
    }
}

function drawBauble(ctx, x, y, r, color) {
    ctx.save();
    const grad = ctx.createRadialGradient(x - r/3, y - r/3, r/4, x, y, r);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, 'black');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    
    // Add subtle glow with gradient overlay instead of shadowBlur
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(x, y, r, x, y, r * 1.5);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.5, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
}

function drawBell(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x + size, y + size, x + size, y + size);
    ctx.lineTo(x - size, y + size);
    ctx.quadraticCurveTo(x - size, y + size, x, y - size);
    ctx.fill();
    ctx.fillStyle = '#B8860B';
    ctx.beginPath();
    ctx.arc(x, y + size, size/3, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
}

function drawSpiralLights(ctx, cx, bottomY, height, scale) {
    if (scale < 0.6) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const loops = 4;
    const pointsPerLoop = 20;
    for(let i=0; i<loops * pointsPerLoop; i++) {
        const progress = i / (loops * pointsPerLoop);
        const y = bottomY - (progress * height);
        const angle = progress * Math.PI * 8 + time; 
        const currentWidth = 350 * scale * (1 - progress) * 0.5; 
        const z = Math.sin(angle);
        if (z < -0.5) continue; 
        const x = cx + Math.cos(angle) * currentWidth;
        const blink = Math.sin(time * 5 + i) > 0;
        const bulbColor = `hsl(${(i * 20) % 360}, 100%, 60%)`;
        
        // Removed shadowBlur
        // Use larger circle with gradient for blink effect
        const size = blink ? 6 : 2;
        
        const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        grad.addColorStop(0, blink ? '#fff' : bulbColor);
        grad.addColorStop(0.5, bulbColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

function drawUltimateStar(ctx, cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.5);
    const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFACD'; 
    
    // Draw Star Shape
    for(let i=0; i<8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(2, -2);
        ctx.lineTo(15 + Math.sin(time*10)*5, 0); 
        ctx.lineTo(2, 2);
        ctx.lineTo(0, 10);
        ctx.lineTo(-2, 2);
        ctx.lineTo(-15 - Math.sin(time*10)*5, 0);
        ctx.lineTo(-2, -2);
        ctx.fill();
    }
    
    // Add extra glow layer
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
    if (Math.random() > 0.9) {
        sparkles.push(new Sparkle(cx, cy, '#FFF'));
    }
}


// --- Hand Visualization ---

const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
];

function drawMagicalHand(ctx, landmarks) {
    const width = canvasElement.width;
    const height = canvasElement.height;

    ctx.save();
    
    // 1. Draw Connections (Constellation Lines)
    ctx.strokeStyle = 'rgba(100, 255, 218, 0.15)'; // Very subtle cyan
    ctx.lineWidth = 1;
    ctx.beginPath();
    HAND_CONNECTIONS.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
    });
    ctx.stroke();

    // 2. Draw Joints (Stars)
    landmarks.forEach((lm, index) => {
        const x = lm.x * width;
        const y = lm.y * height;
        
        // Fingertips (4, 8, 12, 16, 20)
        const isFingertip = [4, 8, 12, 16, 20].includes(index);
        
        // Draw Star/Dot
        ctx.beginPath();
        if (isFingertip) {
            ctx.fillStyle = '#FFD700'; // Gold tips
            // Draw tiny star for fingertips
            const r = 4 + Math.sin(time * 5 + index) * 2;
            ctx.arc(x, y, r, 0, Math.PI * 2);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // White joints
            ctx.arc(x, y, 2, 0, Math.PI * 2);
        }
        ctx.fill();
        
        // Glow
        if (isFingertip) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFD700';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });
    
    ctx.restore();
}

function drawEnergyBetweenFingers(ctx, p1, p2, dist) {
    const opacity = Math.max(0, 1 - (dist / 0.3)); 
    if (opacity <= 0.01) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    // Main Energy Line (Lightning-like)
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    
    // Jitter effect for energy
    const jitter = (val) => val + (Math.random() - 0.5) * 5;
    
    ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`; // Gold energy
    ctx.lineWidth = 2 + opacity * 3;
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(jitter(cx), jitter(cy), p2.x, p2.y);
    ctx.stroke();
    
    // Particles emitting from center
    if (Math.random() > 0.5) {
        // Add temporary sparkle to global array (if we want)
        // Or just draw direct simple particles
        const px = cx + (Math.random() - 0.5) * 20;
        const py = cy + (Math.random() - 0.5) * 20;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 2, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore();
}

// --- Main Logic ---

const snow = new SnowSystem();

// MediaPipe Setup
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0, // Lite
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
hands.onResults(onResults);

const init = () => {
    // --- Init ---
    lyricsManager = new LyricsManager(bgm);
    musicPlayer = new MusicPlayer(bgm);


    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });
    camera.start();
};

init();

let treeRotation = 0;

function onResults(results) {
    if (!isLoaded) {
        isLoaded = true;
        loadingElement.style.display = 'none';
        promptElement.style.opacity = 1;
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw Background Elements
    snow.update();
    snow.draw(canvasCtx);
    
    magicDust.forEach((p, index) => {
        p.update();
        p.draw(canvasCtx);
        if(p.life <= 0) magicDust.splice(index, 1);
    });
    
    sparkles.forEach((s, index) => {
        s.draw(canvasCtx);
        if(s.phase > Math.PI * 4) sparkles.splice(index, 1); 
    });

    if (currentState === STATE.GALLERY) {
        // Render Particle Tree
        treeRotation += 0.005;
        
        // Entrance Animation
        const galleryElapsed = Date.now() - galleryStartTime;
        const entranceDuration = 4000; // 4 seconds slow fade in
        const progress = Math.min(galleryElapsed / entranceDuration, 1);
        // Ease Out Quart
        const ease = 1 - Math.pow(1 - progress, 4);
        
        const opacity = ease;
        const scaleAnim = 0.5 + 0.5 * ease; // Grow from 50%
        const riseAnim = (1 - ease) * 150; // Rise from 150px below
        
        // Sort by Z depth (painters algo) - simple approach: sort by currZ
        treeParticles.sort((a, b) => b.currZ - a.currZ);
        
        const cx = canvasElement.width / 2;
        const cy = canvasElement.height / 2 + 50 + riseAnim; // Shift down a bit + rise animation
        
        canvasCtx.save();
        // Scale from center
        canvasCtx.translate(cx, cy);
        canvasCtx.scale(scaleAnim, scaleAnim);
        canvasCtx.translate(-cx, -cy);
        
        // Handle Hit Detection
        const transformedMouseX = (mouse.x - cx) / scaleAnim + cx;
        const transformedMouseY = (mouse.y - cy) / scaleAnim + cy;
        
        hoveredParticle = null;
        canvasElement.style.cursor = 'default';

        // Update all projections first
        treeParticles.forEach(p => {
            p.update(treeRotation);
            p.updateProjection(cx, cy);
        });

        // Check for hits (Front to Back)
        for (let i = treeParticles.length - 1; i >= 0; i--) {
            const p = treeParticles[i];
            if (p.isHit(transformedMouseX, transformedMouseY)) {
                hoveredParticle = p;
                break;
            }
        }

        // Draw all
        treeParticles.forEach(p => {
            p.draw(canvasCtx, opacity, p === hoveredParticle);
        });
        
        canvasCtx.restore();
        
        // Draw Star on Top
        canvasCtx.globalAlpha = opacity; // Fade in star too
        drawUltimateStar(canvasCtx, cx, cy - 300, 1.0);
        canvasCtx.globalAlpha = 1.0;
        
        // Update and Draw Lyrics (Only in Gallery Mode for now, or always?)
        // Let's show it in Gallery mode since that's when the music plays full volume usually
        if (lyricsManager) {
            lyricsManager.update();
            lyricsManager.draw(canvasCtx, canvasElement.width, canvasElement.height);
        }
        
        return;
    }
    
    if (currentState === STATE.EXPLOSION) {
        particles.forEach((p, index) => {
            p.update();
            p.draw(canvasCtx);
            if(p.life <= 0) particles.splice(index, 1);
        });

        if (particles.length === 0) {
            enterGalleryState();
        }
        return;
    }

    // Tracking Logic
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        if (currentState === STATE.IDLE) {
            currentState = STATE.TRACKING;
            promptElement.innerText = "控制树的生长...";
        }

        const landmarks = results.multiHandLandmarks[0];
        
        // Visualize Full Hand
        drawMagicalHand(canvasCtx, landmarks);

        // Fingers for Interaction
        const thumb = landmarks[4];
        const index = landmarks[8];
        
        const p1 = {x: thumb.x * canvasElement.width, y: thumb.y * canvasElement.height};
        const p2 = {x: index.x * canvasElement.width, y: index.y * canvasElement.height};
        
        const dist = Math.sqrt(
            Math.pow(thumb.x - index.x, 2) + 
            Math.pow(thumb.y - index.y, 2)
        );

        // Visualize Energy Pinch
        drawEnergyBetweenFingers(canvasCtx, p1, p2, dist);

        let rawScale = (dist - 0.05) / 0.2;
        rawScale = Math.max(0, Math.min(1, rawScale));
        currentScale += (rawScale - currentScale) * 0.1;

        drawFancyTree(canvasCtx, currentScale);

        if (currentScale > CONFIG.holdThreshold) {
            if (holdStartTime === 0) holdStartTime = Date.now();
            const elapsed = Date.now() - holdStartTime;
            
            const progress = Math.min(elapsed / CONFIG.holdDuration, 1);
            
            canvasCtx.save();
            canvasCtx.strokeStyle = `rgba(255, 215, 0, ${progress})`;
            canvasCtx.lineWidth = 8;
            
            canvasCtx.beginPath();
            canvasCtx.arc(canvasElement.width/2, canvasElement.height - 100, 60, -Math.PI/2, -Math.PI/2 + Math.PI*2 * progress);
            canvasCtx.stroke();
            
            // Extra glow stroke (Performance: No shadowBlur)
            canvasCtx.strokeStyle = `rgba(255, 215, 0, ${progress * 0.3})`;
            canvasCtx.lineWidth = 15;
            canvasCtx.stroke();
            
            canvasCtx.restore();
            
            for(let i=0; i<2; i++) {
                magicDust.push(new MagicDust(canvasElement.width/2 + (Math.random()-0.5)*100, canvasElement.height - 100 + (Math.random()-0.5)*50));
            }

            if (elapsed > CONFIG.holdDuration) {
                triggerExplosion();
            }
        } else {
            holdStartTime = 0;
        }

    } else {
        if (currentState === STATE.TRACKING) {
            currentState = STATE.IDLE;
            promptElement.innerText = "请开启摄像头，伸出一只手";
            currentScale = 0;
        }
    }
}

function triggerExplosion() {
    currentState = STATE.EXPLOSION;
    promptElement.style.opacity = 0;
    
    bgm.volume = 0;
    bgm.play().then(() => {
        let vol = 0;
        const interval = setInterval(() => {
            vol += 0.05;
            if (vol >= 1) {
                vol = 1;
                clearInterval(interval);
            }
            bgm.volume = vol;
        }, 200);
    }).catch(e => console.log("Audio play failed:", e));
    
    const centerX = canvasElement.width / 2;
    const centerY = canvasElement.height / 2;
    
    for(let i=0; i<300; i++) {
        const color = Math.random() > 0.3 ? `hsl(${Math.random()*60 + 40}, 100%, 70%)` : '#64ffda';
        particles.push(new Particle(centerX, centerY, color));
    }
}

function enterGalleryState() {
    currentState = STATE.GALLERY;
    galleryStartTime = Date.now();
    galleryContainer.style.opacity = 1; // Show container for text
    galleryText.classList.add('visible'); // Keep "Merry Christmas" text
    
    if (musicPlayer) {
        musicPlayer.show();
    }
    
    // Init Particle Tree
    treeParticles = [];
    const photoCount = 150; 
    const lightCount = 600;
    const totalCount = photoCount + lightCount;
    
    const height = 700; // Taller
    const maxRadius = 300; // Wider at bottom
    
    // Create Photos (Spiral)
    for(let i=0; i<photoCount; i++) {
        const h = i / photoCount; // 0 (top) to 1 (bottom)
        const y = (h * height) - height/2 + (Math.random()-0.5)*20; 
        
        // Curved Cone: Power function makes it thinner at top, wider at bottom
        const radius = (Math.pow(h, 0.8) * maxRadius) + 20; 
        
        const angle = h * Math.PI * 20 + (Math.random()-0.5)*0.5; 
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Fluffy randomness
        const rX = x + (Math.random()-0.5) * 30;
        const rZ = z + (Math.random()-0.5) * 30;
        
        const img = loadedImages.length > 0 ? loadedImages[i % loadedImages.length] : null;
        
        treeParticles.push(new PhotoParticle(rX, y, rZ, img, 'photo'));
    }
    
    // Create Lights (Volume Filler)
    for(let i=0; i<lightCount; i++) {
        const h = Math.random(); // Random height
        // Bias towards bottom for volume? No, uniform is okay, but let's match tree shape
        
        const y = (h * height) - height/2;
        
        // Random position WITHIN the cone volume (not just surface)
        const radiusAtHeight = (Math.pow(h, 0.8) * maxRadius) + 20;
        const r = Math.sqrt(Math.random()) * (radiusAtHeight + 40); // +40 for some outer glow
        const theta = Math.random() * Math.PI * 2;
        
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        
        treeParticles.push(new PhotoParticle(x, y, z, null, 'light'));
    }
}
