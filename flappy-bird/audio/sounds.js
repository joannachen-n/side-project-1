// Sound effect URLs and volumes
const SOUND_CONFIG = {
    score: {
        url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        volume: 0.3
    },
    gameOver: {
        url: 'audio/sound-affects/gameOver.wav',
        volume: 1.5
    },
    bgMusic: {
        url: 'audio/sound-affects/indie_game_music.wav',
        volume: 0.2,
        loop: true
    }
};

class SoundManager {
    constructor() {
        this.muted = false;
        this.audioBuffers = {};
        this.audioContext = null;
        this.soundInstances = {};
        this.bgMusicSource = null;
        this.bgMusicGain = null;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.hasInteracted = false;
    }

    initAudioContext() {
        if (!this.audioContext) {
            console.log('Initializing AudioContext...', {
                isMobile: this.isMobile,
                hasInteracted: this.hasInteracted
            });
            
            // Create context with mobile-friendly settings
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'interactive',
                sampleRate: 44100
            });

            // For iOS, we need to enable audio on touch
            if (this.isMobile) {
                document.body.addEventListener('touchstart', () => {
                    if (!this.hasInteracted) {
                        this.hasInteracted = true;
                        // Create and play a silent buffer to unlock audio
                        const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
                        const source = this.audioContext.createBufferSource();
                        source.buffer = silentBuffer;
                        source.connect(this.audioContext.destination);
                        source.start();
                        
                        // Resume audio context
                        if (this.audioContext.state === 'suspended') {
                            this.audioContext.resume();
                        }
                    }
                }, { once: true });
            }

            this.loadSounds().then(() => {
                console.log('Sounds loaded, attempting to start background music');
                this.playBackgroundMusic();
            });
        }
    }

    async loadSounds() {
        for (const [name, config] of Object.entries(SOUND_CONFIG)) {
            try {
                console.log(`Attempting to load sound: ${name} from ${config.url}`);
                const response = await fetch(config.url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log(`Successfully fetched ${name}, decoding audio...`);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.audioBuffers[name] = audioBuffer;
                console.log(`Successfully loaded and decoded ${name} sound`);
            } catch (error) {
                console.error(`Failed to load sound: ${name}`, error);
                console.error('Full error details:', {
                    name,
                    url: config.url,
                    error: error.message,
                    stack: error.stack
                });
            }
        }
    }

    playBackgroundMusic() {
        if (this.muted || !this.audioContext || !this.audioBuffers['bgMusic']) {
            console.log('Skipping background music:', {
                muted: this.muted,
                hasContext: !!this.audioContext,
                hasBuffer: !!this.audioBuffers['bgMusic'],
                audioState: this.audioContext?.state
            });
            return;
        }

        try {
            // Stop any existing background music
            if (this.bgMusicSource) {
                this.bgMusicSource.stop();
                this.bgMusicSource.disconnect();
            }

            console.log('Starting background music...');
            this.bgMusicSource = this.audioContext.createBufferSource();
            this.bgMusicSource.buffer = this.audioBuffers['bgMusic'];
            this.bgMusicSource.loop = true;

            if (!this.bgMusicGain) {
                this.bgMusicGain = this.audioContext.createGain();
                this.bgMusicGain.connect(this.audioContext.destination);
            }
            
            // Fade in the music
            this.bgMusicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.bgMusicGain.gain.linearRampToValueAtTime(
                SOUND_CONFIG['bgMusic'].volume,
                this.audioContext.currentTime + 1
            );

            this.bgMusicSource.connect(this.bgMusicGain);
            this.bgMusicSource.start(0);
            console.log('Background music started successfully');
        } catch (error) {
            console.error('Failed to play background music:', error);
        }
    }

    play(soundName) {
        if (this.muted || !this.audioContext || !this.audioBuffers[soundName] || !this.hasInteracted) {
            console.log(`Skipping ${soundName} sound:`, {
                muted: this.muted,
                hasContext: !!this.audioContext,
                hasBuffer: !!this.audioBuffers[soundName],
                hasInteracted: this.hasInteracted,
                audioState: this.audioContext?.state
            });
            return;
        }

        try {
            // Ensure audio context is running
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            console.log(`Playing ${soundName} sound...`);
            const source = this.audioContext.createBufferSource();
            source.buffer = this.audioBuffers[soundName];
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = SOUND_CONFIG[soundName].volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start(0);
            console.log(`${soundName} sound started successfully`);
            
            source.onended = () => {
                console.log(`${soundName} sound finished playing`);
                source.disconnect();
                gainNode.disconnect();
            };
        } catch (error) {
            console.error(`Failed to play sound: ${soundName}`, error);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        console.log('Sound muted:', this.muted);
        
        if (this.bgMusicGain) {
            const targetVolume = this.muted ? 0 : SOUND_CONFIG['bgMusic'].volume;
            // Smooth transition
            this.bgMusicGain.gain.linearRampToValueAtTime(
                targetVolume,
                this.audioContext.currentTime + 0.3
            );
        }
        
        return this.muted;
    }

    resume() {
        if (!this.hasInteracted && this.isMobile) {
            console.log('Waiting for user interaction on mobile...');
            return;
        }

        if (this.audioContext && this.audioContext.state === 'suspended') {
            console.log('Resuming AudioContext...');
            this.audioContext.resume().then(() => {
                if (!this.muted && (!this.bgMusicSource || !this.bgMusicGain)) {
                    this.playBackgroundMusic();
                }
            });
        } else if (!this.bgMusicSource && !this.muted) {
            this.playBackgroundMusic();
        }
    }
}

// Create and export a single instance
const soundManager = new SoundManager(); 