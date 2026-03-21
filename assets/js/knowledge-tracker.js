/**
 * Tracks what the child knows/doesn't know per game.
 * Stores progress on the server (per user) via API.
 *
 * Knowledge aging: if a pair was last seen more than STALE_DAYS ago,
 * it is considered "rusty" and needs review — even if it was mastered.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const STALE_DAYS = 7    // After 7 days without practice, pair becomes "rusty"
const FORGOTTEN_DAYS = 21 // After 21 days, treat it as almost forgotten

export class KnowledgeTracker {
    constructor(gameSlug, progressUrl) {
        this.gameSlug = gameSlug
        this.progressUrl = progressUrl
        this.data = {}
        this.userStats = { totalScore: 0, bestStreak: 0, level: 1, sessionsCompleted: 0 }
        this.loaded = false
    }

    async load() {
        try {
            const response = await fetch(this.progressUrl)
            if (response.ok) {
                const result = await response.json()
                this.data = result.pairs || {}
                this.userStats = result.stats || this.userStats
            }
        } catch (e) {
            console.error('Failed to load progress:', e)
        }
        this.loaded = true
    }

    /**
     * Save pair progress + user stats in one call.
     * @param {object} extra - { score, streak, level, sessionDone }
     */
    async saveToServer(pairKey, type, extra = {}) {
        try {
            const response = await fetch(this.progressUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pairKey, type, ...extra }),
            })
            if (response.ok) {
                const result = await response.json()
                if (result.stats) {
                    this.userStats = result.stats
                }
            }
        } catch (e) {
            console.error('Failed to save progress:', e)
        }
    }

    pairKey(a, b) {
        return `${Math.min(a, b)}x${Math.max(a, b)}`
    }

    /**
     * Record answer and sync stats to server.
     * @param {object} extra - { score, streak, level, sessionDone }
     */
    recordCorrect(a, b, extra = {}) {
        const key = this.pairKey(a, b)
        if (!this.data[key]) this.data[key] = { correct: 0, wrong: 0, hinted: 0 }
        this.data[key].correct++
        this.data[key].lastSeenAt = Math.floor(Date.now() / 1000)
        this.saveToServer(key, 'correct', extra)
    }

    recordWrong(a, b, extra = {}) {
        const key = this.pairKey(a, b)
        if (!this.data[key]) this.data[key] = { correct: 0, wrong: 0, hinted: 0 }
        this.data[key].wrong++
        this.data[key].lastSeenAt = Math.floor(Date.now() / 1000)
        this.saveToServer(key, 'wrong', extra)
    }

    recordHinted(a, b, extra = {}) {
        const key = this.pairKey(a, b)
        if (!this.data[key]) this.data[key] = { correct: 0, wrong: 0, hinted: 0 }
        this.data[key].hinted++
        this.data[key].lastSeenAt = Math.floor(Date.now() / 1000)
        this.saveToServer(key, 'hinted', extra)
    }

    /**
     * How many days since the pair was last seen.
     */
    daysSinceLastSeen(stats) {
        if (!stats.lastSeenAt) return 999
        const now = Math.floor(Date.now() / 1000)
        return (now - stats.lastSeenAt) / (24 * 3600)
    }

    /**
     * Effective score accounting for time decay.
     * Even a mastered pair loses "freshness" over time.
     */
    effectiveScore(stats) {
        const total = stats.correct + stats.wrong + stats.hinted
        if (total === 0) return 0

        const baseScore = stats.correct / (stats.correct + stats.wrong + stats.hinted * 0.5)
        const daysSince = this.daysSinceLastSeen(stats)

        if (daysSince < STALE_DAYS) {
            return baseScore // Fresh — no decay
        }

        // Decay: score drops over time
        // After STALE_DAYS: multiply by 0.7
        // After FORGOTTEN_DAYS: multiply by 0.3
        const decayFactor = daysSince >= FORGOTTEN_DAYS
            ? 0.3
            : 0.7 - (0.4 * (daysSince - STALE_DAYS) / (FORGOTTEN_DAYS - STALE_DAYS))

        return baseScore * decayFactor
    }

    /**
     * Get weak pairs — ones the child struggles with OR has forgotten.
     */
    getWeakPairs(maxCount = 5) {
        const pairs = []

        for (const [key, stats] of Object.entries(this.data)) {
            const [a, b] = key.split('x').map(Number)
            const total = stats.correct + stats.wrong + stats.hinted
            if (total === 0) continue

            const score = this.effectiveScore(stats)
            const daysSince = this.daysSinceLastSeen(stats)

            // Include if: low score, has errors, or hasn't been seen in a while
            if (score < 0.75 || stats.wrong > 0 || daysSince >= STALE_DAYS) {
                pairs.push({ a, b, score, daysSince, stats })
            }
        }

        pairs.sort((a, b) => a.score - b.score)
        return pairs.slice(0, maxCount)
    }

    /**
     * Get knowledge map for display.
     * Mastery now accounts for time decay.
     */
    getKnowledgeMap() {
        const map = []
        for (let a = 1; a <= 10; a++) {
            const row = []
            for (let b = 1; b <= 10; b++) {
                const key = this.pairKey(a, b)
                const stats = this.data[key]

                if (!stats) {
                    row.push({ a, b, mastery: 'unseen', score: 0, correct: 0, wrong: 0 })
                } else {
                    const total = stats.correct + stats.wrong + stats.hinted
                    const score = this.effectiveScore(stats)
                    const daysSince = this.daysSinceLastSeen(stats)

                    let mastery
                    if (total < 2) {
                        mastery = 'learning'
                    } else if (daysSince >= FORGOTTEN_DAYS) {
                        mastery = 'rusty' // Was known, but forgotten
                    } else if (daysSince >= STALE_DAYS) {
                        mastery = score >= 0.6 ? 'stale' : 'rusty'
                    } else if (score >= 0.9) {
                        mastery = 'mastered'
                    } else if (score >= 0.6) {
                        mastery = 'good'
                    } else {
                        mastery = 'weak'
                    }

                    row.push({ a, b, mastery, score, correct: stats.correct, wrong: stats.wrong, daysSince })
                }
            }
            map.push(row)
        }
        return map
    }

    /** Get overall progress — only fresh mastered pairs count */
    getProgress() {
        let mastered = 0
        const seen = new Set()

        for (const [key, stats] of Object.entries(this.data)) {
            if (seen.has(key)) continue
            seen.add(key)
            const t = stats.correct + stats.wrong + stats.hinted
            const score = this.effectiveScore(stats)
            if (t >= 2 && score >= 0.9) {
                mastered++
            }
        }

        return Math.round((mastered / 55) * 100)
    }

    /**
     * Calculate level from total knowledge across the entire table.
     * 10 points = 1 level. Minimum level = 1.
     *
     * Scoring per combination:
     * - mastered (score >= 0.9, fresh) = 1.0
     * - good (score >= 0.6)           = 0.8
     * - weak/learning/stale/rusty     = 0
     * - unseen                        = 0
     *
     * Level = floor(totalPoints / 10) + 1.
     */
    getLevel() {
        let totalPoints = 0
        const seen = new Set()

        for (const [key, stats] of Object.entries(this.data)) {
            if (seen.has(key)) continue
            seen.add(key)

            const total = stats.correct + stats.wrong + stats.hinted
            if (total < 2) continue

            const score = this.effectiveScore(stats)

            if (score >= 0.9) {
                totalPoints += 1.0
            } else if (score >= 0.6) {
                totalPoints += 0.8
            }
            // weak/rusty = 0, don't count
        }

        return Math.floor(totalPoints * 2 / 10) + 1
    }

    /**
     * Get the next multiplier to study.
     * Finds the least-learned multiplier (2-10) to suggest for the next session.
     */
    getNextMultiplier() {
        let bestMultiplier = 2
        let bestScore = Infinity

        for (let m = 2; m <= 10; m++) {
            let masteredCount = 0
            for (let i = 1; i <= 10; i++) {
                const key = this.pairKey(m, i)
                const stats = this.data[key]
                if (!stats) continue
                const total = stats.correct + stats.wrong + stats.hinted
                if (total >= 2 && this.effectiveScore(stats) >= 0.7) {
                    masteredCount++
                }
            }
            // Find multiplier with least mastered combos (but not fully done)
            if (masteredCount < 10 && masteredCount < bestScore) {
                bestScore = masteredCount
                bestMultiplier = m
            }
        }

        return bestMultiplier
    }
}
