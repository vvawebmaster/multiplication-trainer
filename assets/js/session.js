/**
 * Session manager — handles the learning flow:
 *   Stage 1 (LEARN): multiple choice questions
 *   Stage 2 (TEST): type the answer
 *
 * Each level = 10 combinations (e.g., ×2: 2×1, 2×2...2×10)
 * Each combination generates multiplication AND division questions.
 * Spacing rules ensure no related questions appear back-to-back.
 */

const MIN_SPACING = 3 // Minimum questions between related combos

export const STAGE_LEARN = 'learn'
export const STAGE_TEST = 'test'
export const STAGE_DONE = 'done'

/**
 * Generate all combinations for a given multiplier (2-10).
 */
function getMultiplierCombos(multiplier) {
    const combos = []
    for (let i = 1; i <= 10; i++) {
        combos.push({ a: multiplier, b: i })
    }
    return combos
}

/**
 * Generate a question object from a combo + operation.
 */
function makeQuestion(combo, operation) {
    const { a, b } = combo
    const product = a * b

    if (operation === 'multiply') {
        // Randomly swap multipliers
        const swap = Math.random() > 0.5
        const left = swap ? b : a
        const right = swap ? a : b
        return {
            text: `${left} × ${right} = ?`,
            correctAnswer: product,
            operands: { a, b },
            operation: 'multiply',
            comboKey: comboKey(a, b),
            choices: generateChoices(product, left, right, 'multiply'),
            hint: generateMultiplyHint(left, right),
        }
    } else {
        // Division: product ÷ a = b  OR  product ÷ b = a
        const swap = Math.random() > 0.5
        const divisor = swap ? a : b
        const answer = swap ? b : a
        return {
            text: `${product} ÷ ${divisor} = ?`,
            correctAnswer: answer,
            operands: { a, b },
            operation: 'divide',
            comboKey: comboKey(a, b),
            choices: generateChoices(answer, product, divisor, 'divide'),
            hint: `Підказка: ${divisor} × ? = ${product}`,
        }
    }
}

function comboKey(a, b) {
    return `${Math.min(a, b)}x${Math.max(a, b)}`
}

function generateChoices(correct, x, y, op) {
    const choices = new Set([correct])

    // Near misses
    const candidates = [correct + 1, correct - 1, correct + 2, correct - 2]
    if (op === 'multiply') {
        candidates.push(x * (y + 1), x * (y - 1), (x + 1) * y, (x - 1) * y)
    } else {
        candidates.push(correct + x, correct - x)
    }

    for (const c of candidates) {
        if (c > 0 && c !== correct) choices.add(c)
        if (choices.size >= 4) break
    }

    // Fill remaining
    while (choices.size < 4) {
        const r = correct + Math.floor(Math.random() * 10) - 5
        if (r > 0 && r !== correct) choices.add(r)
    }

    return shuffle([...choices].slice(0, 4))
}

function generateMultiplyHint(a, b) {
    if (b <= 2 || a <= 2) {
        return `Порахуй ${a} + ${a}` + ' + ' + `${a} `.repeat(Math.max(0, b - 2)).trim()
    }
    const prev = a * (b - 1)
    return `${a} × ${b - 1} = ${prev}, тепер додай ще ${a}`
}

function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

/**
 * Build a queue of questions with spacing rules.
 * - No same comboKey within MIN_SPACING questions
 * - Related operations (mul/div of same combo) not adjacent
 */
function buildSpacedQueue(questions) {
    const result = []
    const remaining = [...questions]
    let attempts = 0
    const maxAttempts = remaining.length * 10

    while (remaining.length > 0 && attempts < maxAttempts) {
        attempts++
        // Find a valid next question
        let placed = false
        for (let i = 0; i < remaining.length; i++) {
            if (canPlace(result, remaining[i])) {
                result.push(remaining.splice(i, 1)[0])
                placed = true
                break
            }
        }
        if (!placed) {
            // Force place the first remaining item
            result.push(remaining.shift())
        }
    }
    // Append any remaining
    result.push(...remaining)
    return result
}

function canPlace(queue, question) {
    const tail = queue.slice(-MIN_SPACING)
    for (const prev of tail) {
        if (prev.comboKey === question.comboKey) return false
    }
    return true
}

// ==================== SESSION CLASS ====================

export class Session {
    constructor(multiplier) {
        this.multiplier = multiplier
        this.combos = getMultiplierCombos(multiplier)
        this.stage = STAGE_LEARN
        this.queue = []
        this.retryQueue = []
        this.current = null
        this.stats = { correct: 0, wrong: 0, hinted: 0, total: 0 }
        this.lastComboKeys = []
        this.stageBaseCount = 0
        this.stageCompleted = 0
        this.learnedSet = new Set()  // Combo keys answered correctly (no hint)
        this.mistakeSet = new Set()  // Combo keys where mistakes were made

        this.buildLearnQueue()
    }

    /**
     * LEARN stage: each combo gets 1 multiply + 1 divide question = 20 questions.
     * Shuffle with spacing rules.
     */
    buildLearnQueue() {
        const questions = []
        for (const combo of this.combos) {
            questions.push(makeQuestion(combo, 'multiply'))
            questions.push(makeQuestion(combo, 'divide'))
        }
        this.queue = buildSpacedQueue(shuffle(questions))
        this.retryQueue = []
        this.stageBaseCount = questions.length
        this.stageCompleted = 0
        this.stage = STAGE_LEARN
    }

    /**
     * TEST stage: each combo gets 1 question (random mul or div) = 10 questions.
     */
    buildTestQueue() {
        const questions = []
        for (const combo of this.combos) {
            const op = Math.random() > 0.5 ? 'multiply' : 'divide'
            questions.push(makeQuestion(combo, op))
        }
        this.queue = buildSpacedQueue(shuffle(questions))
        this.retryQueue = []
        this.stageBaseCount = questions.length
        this.stageCompleted = 0
        this.stage = STAGE_TEST
    }

    /**
     * Get next question, or null if stage is done.
     */
    next() {
        // First try retry queue if enough spacing
        if (this.retryQueue.length > 0) {
            for (let i = 0; i < this.retryQueue.length; i++) {
                if (this.canPlaceNow(this.retryQueue[i])) {
                    this.current = this.retryQueue.splice(i, 1)[0]
                    this.trackComboKey(this.current.comboKey)
                    return this.current
                }
            }
        }

        // Then main queue
        if (this.queue.length > 0) {
            this.current = this.queue.shift()
            this.trackComboKey(this.current.comboKey)
            return this.current
        }

        // Check retry queue again (force if needed)
        if (this.retryQueue.length > 0) {
            this.current = this.retryQueue.shift()
            this.trackComboKey(this.current.comboKey)
            return this.current
        }

        // Stage complete
        if (this.stage === STAGE_LEARN) {
            this.buildTestQueue()
            return 'stage_change'
        }

        this.stage = STAGE_DONE
        return null
    }

    canPlaceNow(question) {
        return !this.lastComboKeys.slice(-MIN_SPACING).includes(question.comboKey)
    }

    trackComboKey(key) {
        this.lastComboKeys.push(key)
        if (this.lastComboKeys.length > MIN_SPACING * 2) {
            this.lastComboKeys.shift()
        }
    }

    /**
     * Record an answer.
     * @param {boolean} correct
     * @param {boolean} hintUsed
     * @returns {{ correct: boolean, needsRetry: boolean }}
     */
    recordAnswer(correct, hintUsed) {
        this.stats.total++
        const needsRetry = !correct || hintUsed
        const key = this.current.comboKey
        const label = this.current.text.replace(' = ?', '')

        if (correct && !hintUsed) {
            this.stats.correct++
            this.stageCompleted++
            this.learnedSet.add(label)
        } else if (!correct) {
            this.mistakeSet.add(label)
        }

        if (correct && hintUsed) {
            this.stats.hinted++
            // Re-add with new random variant
            const combo = this.current.operands
            const op = this.current.operation
            this.retryQueue.push(makeQuestion(combo, op))
        } else {
            this.stats.wrong++
            // Re-add same operation for retry
            const combo = this.current.operands
            const op = this.current.operation
            this.retryQueue.push(makeQuestion(combo, op))
        }

        return { correct, needsRetry }
    }

    get remaining() {
        return this.queue.length + this.retryQueue.length
    }

    /** Progress 0-100 for current stage. Based on cleanly completed / base count. */
    get progress() {
        if (this.stageBaseCount === 0) return 0
        return Math.min(100, Math.round((this.stageCompleted / this.stageBaseCount) * 100))
    }

    /**
     * Get total questions for progress bar.
     */
    /** Get session results for saving to server */
    getResults() {
        return {
            multiplier: this.multiplier,
            learned: [...this.learnedSet],
            mistakes: [...this.mistakeSet],
            score: this.stats.correct,
            date: new Date().toLocaleDateString('uk-UA'),
        }
    }

    get totalForStage() {
        if (this.stage === STAGE_LEARN) return this.combos.length * 2
        return this.combos.length
    }

    get questionsAnswered() {
        return this.stats.total
    }

    get isComplete() {
        return this.stage === STAGE_DONE
    }
}
