class InteractiveWebsite {
    constructor() {
        this.canvas = document.getElementById('cursor-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.mainText = document.getElementById('main-text');
        this.body = document.body;
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.isMagicMode = false;
        
        this.rainbowColors = [
            '#ff0000', '#ff8000', '#ffff00', '#80ff00', 
            '#00ff00', '#00ff80', '#00ffff', '#0080ff', 
            '#0000ff', '#8000ff', '#ff00ff', '#ff0080'
        ];
        this.currentColorIndex = 0;
        this.colorTransitionSpeed = 0.04;
        this.colorProgress = 0;
        
        this.particles = [];
        this.maxParticles = 50;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        this.animate();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        
        document.addEventListener('mousedown', () => {
            this.isMouseDown = true;
            this.enterMagicMode();
        });
        
        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.exitMagicMode();
        });
        
        // Handle touch events for mobile
        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isMouseDown = true;
            this.enterMagicMode();
        });
        
        document.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isMouseDown = false;
            this.exitMagicMode();
        });
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.mouseX = touch.clientX;
            this.mouseY = touch.clientY;
        });
    }
    
    enterMagicMode() {
        this.isMagicMode = true;
        this.mainText.textContent = "Isn't it cool?!";
        this.body.style.backgroundColor = this.getCurrentColor();
    }
    
    exitMagicMode() {
        this.isMagicMode = false;
        this.mainText.textContent = "Click to see magic.";
        this.body.style.backgroundColor = '#000';
    }
    
    getCurrentColor() {
        const color1 = this.rainbowColors[this.currentColorIndex];
        const color2 = this.rainbowColors[(this.currentColorIndex + 1) % this.rainbowColors.length];
        return this.interpolateColor(color1, color2, this.colorProgress);
    }
    
    interpolateColor(color1, color2, factor) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    updateColor() {
        this.colorProgress += this.colorTransitionSpeed;
        if (this.colorProgress >= 1) {
            this.colorProgress = 0;
            this.currentColorIndex = (this.currentColorIndex + 1) % this.rainbowColors.length;
        }
        
        if (this.isMagicMode) {
            this.body.style.backgroundColor = this.getCurrentColor();
        }
    }
    
    createParticle() {
        if (this.particles.length >= this.maxParticles) return;
        
        const particle = {
            x: this.mouseX,
            y: this.mouseY,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2 + 1,
            size: this.isMagicMode ? Math.random() * 8 + 4 : Math.random() * 4 + 2,
            life: 1,
            decay: 0.02 + Math.random() * 0.03,
            color: this.isMagicMode ? '#ffffff' : this.getCurrentColor()
        };
        
        this.particles.push(particle);
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            
            if (this.isMagicMode) {
                // Glowing white balls for magic mode
                this.ctx.shadowColor = '#ffffff';
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Colored pixel particles for normal mode
                this.ctx.fillStyle = particle.color;
                this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            }
            
            this.ctx.restore();
        });
    }
    
    drawCursor() {
        const currentColor = this.getCurrentColor();
        
        // Main cursor circle
        this.ctx.save();
        this.ctx.shadowColor = currentColor;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = currentColor;
        this.ctx.beginPath();
        this.ctx.arc(this.mouseX, this.mouseY, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner white circle
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(this.mouseX, this.mouseY, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.updateColor();
        this.createParticle();
        this.updateParticles();
        this.drawParticles();
        this.drawCursor();
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the website when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new InteractiveWebsite();
});
