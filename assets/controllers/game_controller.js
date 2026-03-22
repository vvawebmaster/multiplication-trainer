import { Controller } from '@hotwired/stimulus'
import { CelebrationEngine } from '../js/celebration.js'
import { KnowledgeTracker } from '../js/knowledge-tracker.js'
import { Session, STAGE_LEARN, STAGE_TEST, STAGE_DONE } from '../js/session.js'

const CORRECT_MESSAGES = ['Молодець!', 'Супер!', 'Чудово!', 'Правильно!', 'Так тримати!', 'Геній!', 'Бомба!', 'Красунчик!']
const WRONG_MESSAGES = ['Спробуй ще!', 'Майже!', 'Нічого, буває!', 'Наступного разу вийде!']

export default class extends Controller {
    static targets = [
        'score', 'streak', 'level', 'levelBadge',
        'startScreen', 'questionScreen', 'completeScreen', 'stageTransition',
        'questionText', 'choices', 'hint', 'hintBtn', 'progressBar',
        'feedback', 'feedbackEmoji', 'feedbackText',
        'levelCorrect', 'levelTotal', 'levelStreak',
        'celebrationCanvas', 'knowledgeMap', 'progressPercent',
        'modeLabel', 'mapHint', 'completeTitle',
        'testInput', 'answerField', 'correctDisplay',
        'stageTitle', 'stageSubtitle',
        'wrongOverlay', 'wrongYourAnswer', 'wrongCorrectAnswer', 'wrongExpression',
    ]

    static values = {
        slug: String,
        progressUrl: String,
    }

    async connect() {
        this.session = null
        this.hintUsed = false
        this.isAnswering = false
        this.currentMultiplier = null
        this.sessionScore = 0 // Score earned in current session (for display delta)

        this.tracker = new KnowledgeTracker(this.slugValue, this.progressUrlValue)
        this.celebration = new CelebrationEngine(this.celebrationCanvasTarget)

        await this.tracker.load()

        // Restore stats from DB, but level = max(DB, calculated from knowledge)
        const stats = this.tracker.userStats
        this.currentScore = stats.totalScore
        this.currentStreak = 0
        this.bestStreak = stats.bestStreak
        const calculatedLevel = this.tracker.getLevel()
        this.currentLevel = Math.max(stats.level, calculatedLevel)

        // If calculated level is higher, save it to DB immediately
        if (calculatedLevel > stats.level) {
            fetch(this.progressUrlValue, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionDone: false, level: this.currentLevel, streak: this.bestStreak }),
            })
        }

        this.renderKnowledgeMap()
        this.updateProgressPercent()
        this.updateMapHint()
        this.updateStats()
    }

    // ==================== SESSION START ====================

    startSession() {
        this.currentScore = 0
        this.currentStreak = 0
        this.bestStreak = 0
        this.currentMultiplier = this.tracker.getNextMultiplier()
        this.session = new Session(this.currentMultiplier)
        this.updateStats()
        this.showNextQuestion()
    }

    // ==================== QUESTION FLOW ====================

    showNextQuestion() {
        this.isAnswering = false
        this.hintUsed = false

        const next = this.session.next()

        if (next === 'stage_change') {
            // Transition from LEARN → TEST
            this.showStageTransition()
            return
        }

        if (next === null) {
            // Session complete
            this.showSessionComplete()
            return
        }

        this.showScreen('question')
        this.renderCurrentQuestion()
    }

    renderCurrentQuestion() {
        const q = this.session.current
        this.questionTextTarget.textContent = q.text

        // Mode label
        if (this.session.stage === STAGE_LEARN) {
            this.modeLabelTarget.textContent = '📚 Вивчення — обери правильну відповідь'
            this.modeLabelTarget.classList.remove('hidden')
        } else {
            this.modeLabelTarget.textContent = '📝 Тест — напиши відповідь сам!'
            this.modeLabelTarget.classList.remove('hidden')
        }

        // Progress bar — based on cleanly completed questions
        this.progressBarTarget.style.width = `${this.session.progress}%`

        // Hint
        this.hintTarget.textContent = q.hint
        this.hintTarget.classList.add('hidden')
        this.hintBtnTarget.classList.remove('hidden')

        if (this.session.stage === STAGE_LEARN) {
            // Show choices, hide input
            this.choicesTarget.classList.remove('hidden')
            this.testInputTarget.classList.add('hidden')

            while (this.choicesTarget.firstChild) {
                this.choicesTarget.removeChild(this.choicesTarget.firstChild)
            }
            q.choices.forEach((choice, i) => {
                const btn = document.createElement('button')
                btn.className = 'choice-btn'
                btn.textContent = choice
                btn.dataset.answer = choice
                btn.dataset.action = 'game#answer'
                btn.style.animationDelay = `${i * 0.08}s`
                btn.classList.add('animate-slide-in')
                this.choicesTarget.appendChild(btn)
            })
        } else {
            // Show input, hide choices
            this.choicesTarget.classList.add('hidden')
            this.testInputTarget.classList.remove('hidden')
            this.answerFieldTarget.value = ''
            this.answerFieldTarget.classList.remove('test-input__field--correct', 'test-input__field--wrong', 'animate-shake')
            this.correctDisplayTarget.classList.add('hidden')
            setTimeout(() => this.answerFieldTarget.focus(), 100)
        }

        // Animate question
        this.questionTextTarget.classList.add('animate-pop')
        setTimeout(() => this.questionTextTarget.classList.remove('animate-pop'), 400)
    }

    // ==================== STAGE TRANSITION ====================

    showStageTransition() {
        this.stageTitleTarget.textContent = 'Молодець! Вивчення пройдено! 🎉'
        this.stageSubtitleTarget.textContent = 'Тепер перевіримо — напиши відповіді сам!'
        this.showScreen('stageTransition')
        this.celebration.celebrate(5)
    }

    continueToTest() {
        this.showNextQuestion()
    }

    // ==================== ANSWER: CHOICES (LEARN) ====================

    answer(event) {
        if (this.isAnswering) return
        this.isAnswering = true

        const selectedAnswer = Number(event.currentTarget.dataset.answer)
        const btn = event.currentTarget
        const q = this.session.current
        const isCorrect = selectedAnswer === q.correctAnswer

        this.session.recordAnswer(isCorrect, this.hintUsed)

        let earned = 0
        if (isCorrect) {
            btn.classList.add('choice-btn--correct')
            earned = this.onCorrect()
            this.trackProgress(q, isCorrect, earned)
            setTimeout(() => this.showNextQuestion(), 1200)
        } else {
            btn.classList.add('choice-btn--wrong')
            btn.classList.add('animate-shake')
            const buttons = this.choicesTarget.querySelectorAll('.choice-btn')
            buttons.forEach(b => {
                if (Number(b.dataset.answer) === q.correctAnswer) {
                    b.classList.add('choice-btn--correct')
                    b.classList.add('animate-glow')
                }
            })
            this.onWrong()
            this.trackProgress(q, isCorrect, 0)
            this.showWrongOverlay(q, String(selectedAnswer))
        }
    }

    // ==================== ANSWER: TYPED (TEST) ====================

    onAnswerKey(event) {
        if (event.key === 'Enter') this.submitAnswer()
    }

    submitAnswer() {
        if (this.isAnswering) return
        const value = this.answerFieldTarget.value.trim()
        if (value === '') return

        this.isAnswering = true
        const typedAnswer = Number(value)
        const q = this.session.current
        const isCorrect = typedAnswer === q.correctAnswer

        this.session.recordAnswer(isCorrect, this.hintUsed)

        let earned = 0
        if (isCorrect) {
            this.answerFieldTarget.classList.add('test-input__field--correct')
            earned = this.onCorrect()
            this.trackProgress(q, isCorrect, earned)
            setTimeout(() => this.showNextQuestion(), 1200)
        } else {
            this.answerFieldTarget.classList.add('test-input__field--wrong')
            this.answerFieldTarget.classList.add('animate-shake')
            this.onWrong()
            this.trackProgress(q, isCorrect, 0)
            this.showWrongOverlay(q, value)
        }
    }

    // ==================== SHARED ANSWER LOGIC ====================

    trackProgress(question, isCorrect, earnedPoints = 0) {
        const { a, b } = question.operands
        if (!a || !b) return

        // Calculate level from knowledge (only goes up)
        const calculatedLevel = this.tracker.getLevel()
        const level = Math.max(this.currentLevel, calculatedLevel)

        const extra = {
            score: earnedPoints,
            streak: this.currentStreak,
            level,
        }

        if (isCorrect && !this.hintUsed) {
            this.tracker.recordCorrect(a, b, extra)
        } else if (isCorrect && this.hintUsed) {
            this.tracker.recordHinted(a, b, extra)
        } else {
            this.tracker.recordWrong(a, b, extra)
        }
    }

    /** Returns earned points */
    onCorrect() {
        const isTest = this.session.stage === STAGE_TEST
        const basePoints = isTest ? 20 : 10
        const hintBonus = this.hintUsed ? 0 : 5
        const earned = basePoints + this.currentStreak * 2 + hintBonus
        this.currentScore += earned
        this.currentStreak++
        if (this.currentStreak > this.bestStreak) {
            this.bestStreak = this.currentStreak
        }
        this.updateStats()

        if (!this.hintUsed) {
            this.celebration.celebrate(this.currentStreak)
            this.showFeedback(true)
        } else {
            this.feedbackEmojiTarget.textContent = '👍'
            this.feedbackTextTarget.textContent = 'Добре! Але повернемось до цього ще раз'
            this.feedbackTarget.classList.remove('hidden', 'game-feedback--wrong')
            this.feedbackTarget.classList.add('game-feedback--hint')
            setTimeout(() => this.feedbackTarget.classList.add('hidden'), 1500)
        }

        return earned
    }

    onWrong() {
        this.currentStreak = 0
        this.updateStats()
        this.showFeedback(false)
    }

    showFeedback(correct) {
        if (!correct) return // Wrong answers use the overlay instead

        const msg = CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)]

        this.feedbackEmojiTarget.textContent = '✅'
        this.feedbackTextTarget.textContent = msg
        this.feedbackTarget.classList.remove('hidden', 'game-feedback--hint', 'game-feedback--wrong')
        this.feedbackTarget.classList.add('game-feedback--correct')

        setTimeout(() => this.feedbackTarget.classList.add('hidden'), 1500)
    }

    showHint() {
        this.hintUsed = true
        this.hintTarget.classList.remove('hidden')
        this.hintBtnTarget.classList.add('hidden')
    }

    showWrongOverlay(question, yourAnswer) {
        // Build the full expression with answer
        const text = question.text.replace('?', String(question.correctAnswer))

        this.wrongYourAnswerTarget.textContent = yourAnswer
        this.wrongCorrectAnswerTarget.textContent = question.correctAnswer
        this.wrongExpressionTarget.textContent = text
        this.wrongOverlayTarget.classList.remove('hidden')

        // Hide the brief feedback popup if visible
        this.feedbackTarget.classList.add('hidden')
    }

    dismissWrong() {
        this.wrongOverlayTarget.classList.add('hidden')
        this.showNextQuestion()
    }

    // ==================== SESSION COMPLETE ====================

    showSessionComplete() {
        const stats = this.session.stats
        this.levelCorrectTarget.textContent = stats.correct
        this.levelTotalTarget.textContent = stats.total
        this.levelStreakTarget.textContent = this.bestStreak

        // Update level — take max of current and calculated (level only goes up)
        const calculatedLevel = this.tracker.getLevel()
        const newLevel = Math.max(this.currentLevel, calculatedLevel)
        const leveledUp = newLevel > this.currentLevel
        this.currentLevel = newLevel

        // Mark session as done on server + save last session results
        fetch(this.progressUrlValue, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionDone: true,
                level: this.currentLevel,
                streak: this.bestStreak,
                lastSessionData: this.session.getResults(),
            }),
        })

        if (leveledUp) {
            this.completeTitleTarget.textContent = `Новий рівень ${this.currentLevel}! 🎉`
        } else {
            this.completeTitleTarget.textContent = `Таблиця на ${this.currentMultiplier} — сесію завершено!`
        }

        this.renderKnowledgeMap()
        this.updateProgressPercent()
        this.updateMapHint()
        this.updateStats()
        this.showScreen('complete')

        if (stats.correct / stats.total >= 0.8) {
            this.celebration.celebrate(10)
        }
    }

    nextLevel() {
        // Level & multiplier recalculated automatically in startSession
        this.startSession()
    }

    backToMenu() {
        this.renderKnowledgeMap()
        this.updateProgressPercent()
        this.updateMapHint()
        this.showScreen('start')
    }

    // ==================== UI UPDATES ====================

    updateStats() {
        this.scoreTarget.textContent = this.currentScore
        this.streakTarget.textContent = this.currentStreak
        this.levelTarget.textContent = this.currentLevel

        const badge = this.levelBadgeTarget
        const levelSpan = this.levelTarget
        // Show multiplier only during active session
        const inSession = this.session && !this.session.isComplete
        const suffix = inSession && this.currentMultiplier ? ` (×${this.currentMultiplier})` : ''

        while (badge.firstChild) badge.removeChild(badge.firstChild)
        badge.appendChild(document.createTextNode('📊 Рівень '))
        badge.appendChild(levelSpan)
        if (suffix) badge.appendChild(document.createTextNode(suffix))
    }

    updateMapHint() {
        if (!this.hasMapHintTarget) return
        const weakCount = this.tracker.getWeakPairs(20).length
        const progress = this.tracker.getProgress()

        if (progress === 0) {
            this.mapHintTarget.textContent = 'Починай грати — карта заповнюватиметься!'
        } else if (weakCount > 0) {
            this.mapHintTarget.textContent = `${weakCount} прикладів потребують повторення`
        } else if (progress < 100) {
            this.mapHintTarget.textContent = 'Продовжуй вивчати нові приклади!'
        } else {
            this.mapHintTarget.textContent = 'Ти знаєш всю таблицю! 🏆'
        }
    }

    updateProgressPercent() {
        if (this.hasProgressPercentTarget) {
            this.progressPercentTarget.textContent = this.tracker.getProgress()
        }
    }

    // ==================== KNOWLEDGE MAP ====================

    renderKnowledgeMap() {
        if (!this.hasKnowledgeMapTarget) return
        const map = this.tracker.getKnowledgeMap()
        for (const container of this.knowledgeMapTargets) {
            while (container.firstChild) {
                container.removeChild(container.firstChild)
            }
            this.buildKnowledgeGrid(container, map)
        }
    }

    buildKnowledgeGrid(container, map) {
        const headerRow = document.createElement('div')
        headerRow.className = 'km-row km-header'
        const corner = document.createElement('div')
        corner.className = 'km-cell km-corner'
        corner.textContent = '×'
        headerRow.appendChild(corner)

        for (let b = 1; b <= 10; b++) {
            const cell = document.createElement('div')
            cell.className = 'km-cell km-header-cell'
            cell.textContent = b
            headerRow.appendChild(cell)
        }
        container.appendChild(headerRow)

        for (let a = 0; a < 10; a++) {
            const row = document.createElement('div')
            row.className = 'km-row'
            const label = document.createElement('div')
            label.className = 'km-cell km-label'
            label.textContent = a + 1
            row.appendChild(label)

            for (let b = 0; b < 10; b++) {
                const cell = document.createElement('div')
                const info = map[a][b]
                cell.className = `km-cell km-cell--${info.mastery}`
                cell.textContent = (a + 1) * (b + 1)
                cell.title = `${a + 1} × ${b + 1} = ${(a + 1) * (b + 1)} | ✅${info.correct} ❌${info.wrong}`
                row.appendChild(cell)
            }
            container.appendChild(row)
        }
    }

    // ==================== SCREENS ====================

    showScreen(name) {
        this.startScreenTarget.classList.toggle('hidden', name !== 'start')
        this.questionScreenTarget.classList.toggle('hidden', name !== 'question')
        this.completeScreenTarget.classList.toggle('hidden', name !== 'complete')
        this.stageTransitionTarget.classList.toggle('hidden', name !== 'stageTransition')
    }
}
