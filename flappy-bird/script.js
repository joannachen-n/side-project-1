// Game configuration - easy to customize later
const CONFIG = {
    canvas: {
        width: 400,
        height: 600
    },
    bird: {
        radius: 20,
        jumpStrength: -10,
        gravity: 0.5,
        color: '#FFD700',      // Default yellow color
        jumpColor: '#FFA500',  // Orange color when jumping
        strokeColor: '#B8860B',
        colorTransitionSpeed: 0.1,  // Speed of color transition
        hoverAmount: 8,        // Pixels to hover up/down
        hoverSpeed: 0.02       // Speed of hover animation
        // For Figma sprite:
        // spriteWidth: 40,    // Width of your bird sprite
        // spriteHeight: 40,   // Height of your bird sprite
        // flapDuration: 200,  // Duration of flap animation in ms
        // sprites: {
        //     flap1: null,    // Will store Image object for first flap frame
        //     flap2: null,    // Second flap frame
        //     flap3: null     // Third flap frame
        // }
    },
    pipes: {
        width: 60,
        gap: 170,
        speed: 2,
        spawnInterval: 1800,
        initialDelay: 2000,    // Wait 2 seconds before first pipe
        minHeight: 50,
        color: '#43A047',
        strokeColor: '#2E7D32',
        minSpacing: 220  // Minimum horizontal space between pipes
        // For Figma exports:
        // topPipeSprite: null,    // Will store Image object for top pipe
        // bottomPipeSprite: null, // Will store Image object for bottom pipe
        // pipeCapHeight: 30       // Height of pipe cap decoration
    },
    game: {
        isRunning: false,      // Changed to false by default
        score: 0,
        // Track which pipes have been scored
        scoredPipes: new Set(),
        state: 'ready'         // New state system: 'ready', 'playing', 'gameOver'
    },
    ui: {
        scoreColor: 'white',
        scoreFont: '48px Arial',
        scoreStroke: '#2c3e50',
        scoreStrokeWidth: 4,
        fadeSpeed: 0.05,       // Speed of UI fade transitions
        readyTextColor: 'rgba(255, 255, 255, 0.8)',
        readyTextFont: '20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
};

/* To load Figma sprites:
function loadSprites() {
    // Bird sprites
    CONFIG.bird.sprites.flap1 = new Image();
    CONFIG.bird.sprites.flap1.src = './assets/bird-1.png';
    CONFIG.bird.sprites.flap2 = new Image();
    CONFIG.bird.sprites.flap2.src = './assets/bird-2.png';
    CONFIG.bird.sprites.flap3 = new Image();
    CONFIG.bird.sprites.flap3.src = './assets/bird-3.png';
    
    // Pipe sprites
    CONFIG.pipes.topPipeSprite = new Image();
    CONFIG.pipes.topPipeSprite.src = './assets/pipe-top.png';
    CONFIG.pipes.bottomPipeSprite = new Image();
    CONFIG.pipes.bottomPipeSprite.src = './assets/pipe-bottom.png';
    
    // Background layers
    CONFIG.game.backgrounds.day = new Image();
    CONFIG.game.backgrounds.day.src = './assets/background-day.png';
    CONFIG.game.backgrounds.clouds = new Image();
    CONFIG.game.backgrounds.clouds.src = './assets/clouds.png';
}
*/

// Get the canvas and its context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get DOM elements
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Add restart button listener
restartButton.addEventListener('click', () => {
    hideGameOver();
    resetGame();
});

function showGameOver() {
    gameOverScreen.classList.remove('hidden');
    finalScoreElement.textContent = CONFIG.game.score;
}

function hideGameOver() {
    gameOverScreen.classList.add('hidden');
}

// Make canvas responsive
function resizeCanvas() {
    const scale = Math.min(
        window.innerWidth / CONFIG.canvas.width,
        window.innerHeight / CONFIG.canvas.height
    ) * 0.9;

    canvas.style.width = `${CONFIG.canvas.width * scale}px`;
    canvas.style.height = `${CONFIG.canvas.height * scale}px`;
}

// Set initial canvas size
canvas.width = CONFIG.canvas.width;
canvas.height = CONFIG.canvas.height;
resizeCanvas();

// Set up mute button
const muteButton = document.getElementById('muteButton');

// Combined input handler for both keyboard and touch
function handleInput(event) {
    // If clicking the mute button, don't handle game input
    if (event.target === muteButton) {
        return;
    }

    // Prevent default behavior for touch events
    if (event.type === 'touchstart') {
        event.preventDefault();
    }

    // Initialize audio context on first interaction
    if (soundManager.audioContext === null) {
        soundManager.initAudioContext();
    }

    switch (CONFIG.game.state) {
        case 'ready':
            startGame();
            bird.jump(); // Initial jump when starting
            break;
        case 'playing':
            bird.jump();
            break;
        case 'gameOver':
            // Prevent immediate restart on the same click/tap that triggered game over
            if (event.timeStamp - lastGameOverTime > 500) {
                resetGame();
            }
            break;
    }
}

// Set up mute button with its own separate handler
muteButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent event from bubbling up
    const isMuted = soundManager.toggleMute();
    muteButton.textContent = isMuted ? '🔇' : '🔊';
});

// Resume audio context on user interaction
function resumeAudio() {
    soundManager.resume();
}
document.addEventListener('click', resumeAudio);
document.addEventListener('keydown', resumeAudio);
document.addEventListener('touchstart', resumeAudio);

// Bird class - modular for future customization
class Bird {
    constructor() {
        this.reset();
        // For sprite animation:
        // this.flapTime = 0;
        // this.currentFrame = 0;
        this.currentColor = CONFIG.bird.color;
        this.hoverOffset = 0;  // For ready state hovering
        this.hoverTime = 0;    // Track hover animation time
    }

    reset() {
        // Center the bird horizontally and vertically
        this.x = CONFIG.canvas.width / 2;
        this.y = CONFIG.canvas.height / 2;
        this.velocity = 0;
        this.currentColor = CONFIG.bird.color;
        this.hoverTime = 0;
    }

    jump() {
        this.velocity = CONFIG.bird.jumpStrength;
        this.currentColor = CONFIG.bird.jumpColor;  // Change to orange when jumping
        soundManager.play('jump');
    }

    update() {
        if (CONFIG.game.state === 'ready') {
            // Smooth hover animation in ready state
            this.hoverTime += CONFIG.bird.hoverSpeed;
            this.y = CONFIG.canvas.height / 2 + 
                    Math.sin(this.hoverTime) * CONFIG.bird.hoverAmount;
            return;
        }

        if (!CONFIG.game.isRunning) return;
        
        this.velocity += CONFIG.bird.gravity;
        this.y += this.velocity;

        // Color transition
        if (this.currentColor !== CONFIG.bird.color) {
            const currentRGB = this.hexToRgb(this.currentColor);
            const targetRGB = this.hexToRgb(CONFIG.bird.color);
            
            currentRGB.r += (targetRGB.r - currentRGB.r) * CONFIG.bird.colorTransitionSpeed;
            currentRGB.g += (targetRGB.g - currentRGB.g) * CONFIG.bird.colorTransitionSpeed;
            currentRGB.b += (targetRGB.b - currentRGB.b) * CONFIG.bird.colorTransitionSpeed;
            
            this.currentColor = this.rgbToHex(
                Math.round(currentRGB.r),
                Math.round(currentRGB.g),
                Math.round(currentRGB.b)
            );
        }

        // Keep bird within bounds and check for collision
        if (this.y + CONFIG.bird.radius > CONFIG.canvas.height || 
            this.y - CONFIG.bird.radius < 0) {
            gameOver();
        }
    }

    draw() {
        /* To use Figma sprites, replace this draw method with:
        
        const sprites = [
            CONFIG.bird.sprites.flap1,
            CONFIG.bird.sprites.flap2,
            CONFIG.bird.sprites.flap3
        ];
        
        // Calculate rotation based on velocity
        const rotation = Math.atan2(this.velocity, 20);
        
        // Save canvas state for rotation
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(rotation);
        
        // Draw current animation frame
        ctx.drawImage(
            sprites[this.currentFrame],
            -CONFIG.bird.spriteWidth / 2,
            -CONFIG.bird.spriteHeight / 2,
            CONFIG.bird.spriteWidth,
            CONFIG.bird.spriteHeight
        );
        
        ctx.restore();
        
        // Update animation frame
        if (Date.now() - this.flapTime > CONFIG.bird.flapDuration) {
            this.currentFrame = (this.currentFrame + 1) % sprites.length;
            this.flapTime = Date.now();
        }
        */

        // Current simple circle drawing
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.bird.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.currentColor;
        ctx.fill();
        ctx.strokeStyle = CONFIG.bird.strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Helper function to convert hex color to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Helper function to convert RGB to hex
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Check if bird collides with a pipe
    collidesWith(pipe) {
        // For more accurate collision, we check if the bird's elliptical hit box intersects with the pipe rectangle
        // We're making the hit box 10px taller (5px up, 5px down) by adjusting the vertical distance check
        const closestX = Math.max(pipe.x, Math.min(this.x, pipe.x + CONFIG.pipes.width));
        const closestY = Math.max(pipe.y, Math.min(this.y, pipe.y + pipe.height));
        
        const distanceX = this.x - closestX;
        const distanceY = this.y - closestY;
        
        // Original radius for horizontal check
        const horizontalCheck = (distanceX * distanceX) / (CONFIG.bird.radius * CONFIG.bird.radius);
        // Extended radius for vertical check (+5 pixels top and bottom)
        const verticalCheck = (distanceY * distanceY) / ((CONFIG.bird.radius + 5) * (CONFIG.bird.radius + 5));
        
        // If the sum is less than or equal to 1, there's a collision
        return (horizontalCheck + verticalCheck) <= 1;
    }
}

// Pipe class for obstacle management
class Pipe {
    constructor() {
        this.reset();
        this.scored = false; // Track if bird has passed this pipe
    }

    reset() {
        // Start pipe at right edge of canvas
        this.x = CONFIG.canvas.width;
        
        // Calculate gap position ensuring minimum playable space
        const minGapPosition = CONFIG.pipes.minHeight;
        const maxGapPosition = CONFIG.canvas.height - CONFIG.pipes.minHeight - CONFIG.pipes.gap;
        const gapStart = minGapPosition + Math.random() * (maxGapPosition - minGapPosition);
        
        // Set heights based on gap position
        this.topHeight = gapStart;
        this.bottomHeight = CONFIG.canvas.height - gapStart - CONFIG.pipes.gap;
    }

    update() {
        if (!CONFIG.game.isRunning) return;
        this.x -= CONFIG.pipes.speed;
    }

    isOffScreen() {
        return this.x + CONFIG.pipes.width < 0;
    }

    checkScore(bird) {
        // If pipe hasn't been scored and bird has passed it
        if (!this.scored && this.x + CONFIG.pipes.width < bird.x) {
            this.scored = true;
            return true;
        }
        return false;
    }

    draw() {
        // Draw top pipe
        ctx.beginPath();
        ctx.rect(this.x, 0, CONFIG.pipes.width, this.topHeight);
        ctx.fillStyle = CONFIG.pipes.color;
        ctx.fill();
        ctx.strokeStyle = CONFIG.pipes.strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw bottom pipe
        ctx.beginPath();
        ctx.rect(this.x, CONFIG.canvas.height - this.bottomHeight, 
                CONFIG.pipes.width, this.bottomHeight);
        ctx.fillStyle = CONFIG.pipes.color;
        ctx.fill();
        ctx.strokeStyle = CONFIG.pipes.strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Game state management
const bird = new Bird();
const pipes = [];
let lastPipeSpawn = 0;

// Input handlers
function handleJump(event) {
    if (event.code === 'Space' || event.type === 'touchstart') {
        event.preventDefault();
        
        if (!CONFIG.game.isRunning) {
            resetGame();
        } else {
            bird.jump();
        }
    }
}

// Remove old event listeners and update with new ones
document.removeEventListener('keydown', handleJump);
document.removeEventListener('touchstart', handleJump);

// Add new event listeners
document.addEventListener('keydown', handleInput);
document.addEventListener('touchstart', handleInput);
window.addEventListener('resize', resizeCanvas);

// Track when game starts for pipe delay
let startGameTime = 0;

function startGame() {
    if (CONFIG.game.state === 'ready') {
        CONFIG.game.state = 'playing';
        CONFIG.game.isRunning = true;
        startGameTime = performance.now();  // Record when game starts
        // Reset pipe position when game actually starts
        pipes.length = 0;  // Clear any existing pipes
        // Hide mute button
        muteButton.classList.add('hidden');
        // Ensure background music is playing
        soundManager.resume();
    }
}

function gameOver() {
    CONFIG.game.isRunning = false;
    CONFIG.game.state = 'gameOver';
    lastGameOverTime = performance.now();
    soundManager.play('gameOver');
    showGameOver();
    // Show mute button
    muteButton.classList.remove('hidden');
}

function resetGame() {
    CONFIG.game.isRunning = false;
    CONFIG.game.state = 'ready';
    CONFIG.game.score = 0;
    CONFIG.game.scoredPipes.clear();
    bird.reset();
    
    // Keep one pipe pair at starting position
    pipes.length = 0;
    spawnPipe();
    pipes[0].x = CONFIG.canvas.width + 50; // Position slightly off-screen
    
    lastPipeSpawn = 0;
    hideGameOver();
    // Show mute button
    muteButton.classList.remove('hidden');
    // Ensure background music is playing
    soundManager.resume();
}

function spawnPipe() {
    pipes.push(new Pipe());
}

function drawScore() {
    ctx.save();
    
    // Set up score text style
    ctx.font = CONFIG.ui.scoreFont;
    ctx.fillStyle = CONFIG.ui.scoreColor;
    ctx.strokeStyle = CONFIG.ui.scoreStroke;
    ctx.lineWidth = CONFIG.ui.scoreStrokeWidth;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Position score at top center with padding
    const x = CONFIG.canvas.width / 2;
    const y = 20;
    
    // Draw score with stroke for better visibility
    ctx.strokeText(CONFIG.game.score.toString(), x, y);
    ctx.fillText(CONFIG.game.score.toString(), x, y);
    
    ctx.restore();
}

function drawReadyState() {
    if (CONFIG.game.state === 'ready') {
        ctx.save();
        ctx.fillStyle = CONFIG.ui.readyTextColor;
        ctx.font = CONFIG.ui.readyTextFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Press any key or tap to start', CONFIG.canvas.width / 2, CONFIG.canvas.height * 0.4);
        ctx.restore();
    }
}

// Game loop
function gameLoop(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Only spawn new pipes during gameplay after initial delay
    if (CONFIG.game.state === 'playing') {
        // Calculate time since game started
        const gameTime = timestamp - startGameTime;
        
        // Only start spawning pipes after initial delay
        if (gameTime > CONFIG.pipes.initialDelay && 
            (!lastPipeSpawn || timestamp - lastPipeSpawn >= CONFIG.pipes.spawnInterval)) {
            
            const canSpawnPipe = !pipes.some(pipe => 
                pipe.x > CONFIG.canvas.width - CONFIG.pipes.minSpacing
            );
            
            if (canSpawnPipe) {
                spawnPipe();
                lastPipeSpawn = timestamp;
            }
        }
    }
    
    // Update and draw pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        // Only move pipes during gameplay
        if (CONFIG.game.state === 'playing') {
            pipes[i].update();
        }
        
        if (pipes[i].isOffScreen()) {
            pipes.splice(i, 1);
            continue;
        }
        
        pipes[i].draw();
        
        if (CONFIG.game.state === 'playing') {
            // Check for score
            if (pipes[i].checkScore(bird)) {
                CONFIG.game.score++;
                soundManager.play('score');
            }
            
            // Check collision
            if (bird.collidesWith({
                x: pipes[i].x,
                y: CONFIG.canvas.height - pipes[i].bottomHeight,
                height: pipes[i].bottomHeight
            }) || bird.collidesWith({
                x: pipes[i].x,
                y: 0,
                height: pipes[i].topHeight
            })) {
                gameOver();
            }
        }
    }
    
    bird.update();
    bird.draw();
    
    // Only draw score during gameplay
    if (CONFIG.game.state === 'playing') {
        drawScore();
    }
    
    // Draw ready state message
    if (CONFIG.game.state === 'ready') {
        drawReadyState();
    }
    
    requestAnimationFrame(gameLoop);
}

// Start the game
/* To use Figma sprites:
loadSprites();  // Load all sprites first
// Wait for all sprites to load
Promise.all([
    ...Object.values(CONFIG.bird.sprites),
    CONFIG.pipes.topPipeSprite,
    CONFIG.pipes.bottomPipeSprite,
    ...Object.values(CONFIG.game.backgrounds)
].map(img => new Promise(resolve => img.onload = resolve)))
.then(() => {
    gameLoop();  // Start game after all sprites are loaded
});
*/

gameLoop();  // Current simple start 