/**
 * Celebration system — confetti, stars, fireworks!
 * Escalates effects based on streak count.
 */

const COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#ff9f43', '#00d2d3']
const STAR_COLORS = ['#ffd700', '#ffec8b', '#fff68f', '#fffacd']

class Particle {
    constructor(x, y, color, type = 'confetti') {
        this.x = x
        this.y = y
        this.color = color
        this.type = type
        this.life = 1.0
        this.decay = 0.01 + Math.random() * 0.02

        if (type === 'confetti') {
            this.vx = (Math.random() - 0.5) * 12
            this.vy = -Math.random() * 15 - 5
            this.gravity = 0.3
            this.rotation = Math.random() * 360
            this.rotationSpeed = (Math.random() - 0.5) * 15
            this.size = Math.random() * 8 + 4
            this.shape = Math.random() > 0.5 ? 'rect' : 'circle'
        } else if (type === 'star') {
            const angle = Math.random() * Math.PI * 2
            const speed = Math.random() * 8 + 3
            this.vx = Math.cos(angle) * speed
            this.vy = Math.sin(angle) * speed
            this.gravity = 0.05
            this.size = Math.random() * 15 + 10
            this.rotation = Math.random() * 360
            this.rotationSpeed = (Math.random() - 0.5) * 10
        } else if (type === 'firework') {
            const angle = Math.random() * Math.PI * 2
            const speed = Math.random() * 6 + 2
            this.vx = Math.cos(angle) * speed
            this.vy = Math.sin(angle) * speed
            this.gravity = 0.08
            this.size = Math.random() * 4 + 2
            this.trail = []
            this.decay = 0.015 + Math.random() * 0.01
        } else if (type === 'sparkle') {
            this.vx = (Math.random() - 0.5) * 3
            this.vy = -Math.random() * 3 - 1
            this.gravity = 0.02
            this.size = Math.random() * 6 + 2
            this.twinkle = 0
            this.twinkleSpeed = Math.random() * 0.3 + 0.1
        }
    }

    update() {
        this.x += this.vx
        this.vy += this.gravity
        this.y += this.vy
        this.life -= this.decay

        if (this.type === 'confetti') {
            this.rotation += this.rotationSpeed
            this.vx *= 0.99
        } else if (this.type === 'firework') {
            this.trail.push({ x: this.x, y: this.y, life: this.life })
            if (this.trail.length > 5) this.trail.shift()
        } else if (this.type === 'sparkle') {
            this.twinkle += this.twinkleSpeed
        }

        return this.life > 0
    }

    draw(ctx) {
        ctx.save()
        ctx.globalAlpha = Math.max(0, this.life)

        if (this.type === 'confetti') {
            ctx.translate(this.x, this.y)
            ctx.rotate((this.rotation * Math.PI) / 180)
            ctx.fillStyle = this.color
            if (this.shape === 'rect') {
                ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2)
            } else {
                ctx.beginPath()
                ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2)
                ctx.fill()
            }
        } else if (this.type === 'star') {
            ctx.translate(this.x, this.y)
            ctx.rotate((this.rotation * Math.PI) / 180)
            this.drawStar(ctx, 0, 0, 5, this.size / 2, this.size / 4)
        } else if (this.type === 'firework') {
            // Trail
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i]
                ctx.globalAlpha = (i / this.trail.length) * this.life * 0.5
                ctx.fillStyle = this.color
                ctx.beginPath()
                ctx.arc(t.x, t.y, this.size * 0.6, 0, Math.PI * 2)
                ctx.fill()
            }
            // Head
            ctx.globalAlpha = this.life
            ctx.fillStyle = this.color
            ctx.shadowColor = this.color
            ctx.shadowBlur = 10
            ctx.beginPath()
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
            ctx.fill()
        } else if (this.type === 'sparkle') {
            const alpha = Math.max(0, this.life) * (0.5 + 0.5 * Math.sin(this.twinkle))
            ctx.globalAlpha = alpha
            ctx.fillStyle = this.color
            ctx.shadowColor = this.color
            ctx.shadowBlur = 15
            this.drawStar(ctx, this.x, this.y, 4, this.size, this.size / 3)
        }

        ctx.restore()
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        ctx.fillStyle = this.color
        ctx.beginPath()
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius
            const angle = (i * Math.PI) / spikes - Math.PI / 2
            const x = cx + Math.cos(angle) * radius
            const y = cy + Math.sin(angle) * radius
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
    }
}

export class CelebrationEngine {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.particles = []
        this.animating = false
        this.resize()
        window.addEventListener('resize', () => this.resize())
    }

    resize() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
    }

    /**
     * Celebrate! Streak determines intensity.
     * @param {number} streak — current streak count
     */
    celebrate(streak) {
        const cx = this.canvas.width / 2
        const cy = this.canvas.height / 2

        if (streak >= 8) {
            // MEGA celebration — fireworks + stars + confetti
            this.spawnFireworks(cx, cy, 3)
            this.spawnStars(cx, cy, 20)
            this.spawnConfetti(60)
            this.spawnSparkles(cx, cy, 30)
            this.showComboText(streak)
        } else if (streak >= 5) {
            // Big celebration — stars + lots of confetti
            this.spawnStars(cx, cy, 12)
            this.spawnConfetti(40)
            this.spawnSparkles(cx, cy, 15)
            this.showComboText(streak)
        } else if (streak >= 3) {
            // Medium — some stars + confetti
            this.spawnStars(cx, cy, 6)
            this.spawnConfetti(25)
        } else {
            // Basic — just confetti burst
            this.spawnConfetti(15)
        }

        if (!this.animating) {
            this.animating = true
            this.animate()
        }
    }

    spawnConfetti(count) {
        const cx = this.canvas.width / 2
        for (let i = 0; i < count; i++) {
            const x = cx + (Math.random() - 0.5) * 200
            const color = COLORS[Math.floor(Math.random() * COLORS.length)]
            this.particles.push(new Particle(x, this.canvas.height * 0.4, color, 'confetti'))
        }
    }

    spawnStars(cx, cy, count) {
        for (let i = 0; i < count; i++) {
            const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
            this.particles.push(new Particle(cx, cy, color, 'star'))
        }
    }

    spawnFireworks(cx, cy, count) {
        for (let f = 0; f < count; f++) {
            const fx = cx + (Math.random() - 0.5) * 300
            const fy = cy + (Math.random() - 0.5) * 200
            const color = COLORS[Math.floor(Math.random() * COLORS.length)]
            for (let i = 0; i < 25; i++) {
                this.particles.push(new Particle(fx, fy, color, 'firework'))
            }
        }
    }

    spawnSparkles(cx, cy, count) {
        for (let i = 0; i < count; i++) {
            const x = cx + (Math.random() - 0.5) * 400
            const y = cy + (Math.random() - 0.5) * 300
            const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
            this.particles.push(new Particle(x, y, color, 'sparkle'))
        }
    }

    showComboText(streak) {
        const texts = {
            3: 'Комбо! 🔥',
            5: 'СУПЕР КОМБО! ⚡',
            8: 'МЕГА КОМБО!! 🌟',
            10: 'НЕЙМОВІРНО!!! 💥',
        }
        // Find the best matching text
        let text = ''
        for (const [threshold, t] of Object.entries(texts)) {
            if (streak >= Number(threshold)) text = t
        }
        if (!text) return

        this.comboText = { text, life: 1.0, scale: 0 }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        this.particles = this.particles.filter(p => p.update())
        this.particles.forEach(p => p.draw(this.ctx))

        // Draw combo text
        if (this.comboText && this.comboText.life > 0) {
            const ct = this.comboText
            ct.scale = Math.min(ct.scale + 0.08, 1.0)
            ct.life -= 0.012

            const scale = ct.scale * (0.8 + 0.2 * Math.sin(Date.now() / 100))
            this.ctx.save()
            this.ctx.globalAlpha = Math.max(0, ct.life)
            this.ctx.font = `bold ${60 * scale}px system-ui, sans-serif`
            this.ctx.textAlign = 'center'
            this.ctx.fillStyle = '#ffd700'
            this.ctx.shadowColor = '#ff6b00'
            this.ctx.shadowBlur = 20
            this.ctx.fillText(ct.text, this.canvas.width / 2, this.canvas.height * 0.3)
            this.ctx.restore()

            if (ct.life <= 0) this.comboText = null
        }

        if (this.particles.length > 0 || (this.comboText && this.comboText.life > 0)) {
            requestAnimationFrame(() => this.animate())
        } else {
            this.animating = false
        }
    }
}
