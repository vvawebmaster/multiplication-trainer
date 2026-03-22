/**
 * JS tests for Session logic.
 * Run: node tests/js/session.test.mjs
 */

import { Session, STAGE_LEARN, STAGE_TEST, STAGE_DONE } from '../../assets/js/session.js'
import assert from 'node:assert'
import { describe, it } from 'node:test'

describe('Session', () => {

    it('should create a session with 20 LEARN questions for multiplier 2', () => {
        const session = new Session(2)
        assert.strictEqual(session.stage, STAGE_LEARN)
        assert.strictEqual(session.multiplier, 2)
        // 10 combos × 2 (multiply + divide) = 20 base questions
        assert.strictEqual(session.stageBaseCount, 20)
    })

    it('correct answer without hint should NOT go to retry (bug fix)', () => {
        const session = new Session(2)

        const q = session.next()
        assert.ok(q)
        assert.ok(q.text)

        const retryBefore = session.retryQueue.length

        // Answer correctly without hint
        session.recordAnswer(true, false)

        // Retry queue should NOT grow
        assert.strictEqual(session.retryQueue.length, retryBefore,
            'Correct answer without hint must NOT be added to retry queue')

        // Stats should count as correct
        assert.strictEqual(session.stats.correct, 1)
        assert.strictEqual(session.stats.wrong, 0)
        assert.strictEqual(session.stats.hinted, 0)
    })

    it('wrong answer should go to retry', () => {
        const session = new Session(2)
        session.next()

        session.recordAnswer(false, false)

        assert.strictEqual(session.retryQueue.length, 1,
            'Wrong answer must be added to retry queue')
        assert.strictEqual(session.stats.wrong, 1)
        assert.strictEqual(session.stats.correct, 0)
    })

    it('correct answer with hint should go to retry', () => {
        const session = new Session(2)
        session.next()

        session.recordAnswer(true, true)

        assert.strictEqual(session.retryQueue.length, 1,
            'Hinted answer must be added to retry queue')
        assert.strictEqual(session.stats.hinted, 1)
        assert.strictEqual(session.stats.correct, 0)
    })

    it('session should complete after answering all questions correctly', () => {
        const session = new Session(2)
        let stageChanges = 0
        let totalQuestions = 0

        // Play through entire session — answer everything correctly
        for (let i = 0; i < 200; i++) { // Safety limit
            const q = session.next()
            if (q === 'stage_change') {
                stageChanges++
                continue
            }
            if (q === null) break

            totalQuestions++
            session.recordAnswer(true, false)
        }

        assert.strictEqual(session.stage, STAGE_DONE)
        assert.strictEqual(stageChanges, 1, 'Should transition from LEARN to TEST once')
        assert.strictEqual(totalQuestions, 30, '20 LEARN + 10 TEST = 30 questions')
        assert.strictEqual(session.retryQueue.length, 0, 'No retries when all correct')
    })

    it('session should NOT loop infinitely with correct answers', () => {
        const session = new Session(3)
        let count = 0

        for (let i = 0; i < 100; i++) {
            const q = session.next()
            if (q === 'stage_change') continue
            if (q === null) break

            count++
            session.recordAnswer(true, false)
        }

        // With perfect answers: 20 LEARN + 10 TEST = 30
        assert.ok(count <= 35, `Expected ≤35 questions with perfect answers, got ${count}`)
    })

    it('wrong answers add retries but session still completes', () => {
        const session = new Session(2)
        let count = 0
        let wrongOnFirst = true

        for (let i = 0; i < 200; i++) {
            const q = session.next()
            if (q === 'stage_change') continue
            if (q === null) break

            count++
            // Make 1 mistake on first question, then answer everything correctly
            if (wrongOnFirst) {
                session.recordAnswer(false, false)
                wrongOnFirst = false
            } else {
                session.recordAnswer(true, false)
            }
        }

        assert.strictEqual(session.stage, STAGE_DONE)
        // 30 base + 1 retry = 31
        assert.ok(count >= 31 && count <= 35, `Expected 31-35 questions, got ${count}`)
    })

    it('progress should be 0 at start and 100 at end', () => {
        const session = new Session(2)
        assert.strictEqual(session.progress, 0)

        // Answer all LEARN questions
        for (let i = 0; i < 100; i++) {
            const q = session.next()
            if (q === 'stage_change' || q === null) break
            session.recordAnswer(true, false)
        }

        // After LEARN, progress resets for TEST
        // Answer all TEST questions
        for (let i = 0; i < 100; i++) {
            const q = session.next()
            if (q === null) break
            if (q === 'stage_change') continue
            session.recordAnswer(true, false)
        }

        assert.strictEqual(session.progress, 100)
    })

    it('progress should not be 100 while retries remain', () => {
        const session = new Session(2)

        // Answer first question wrong
        session.next()
        session.recordAnswer(false, false)

        // Answer second correctly
        session.next()
        session.recordAnswer(true, false)

        // Progress should not be 100 because retry is pending
        assert.ok(session.progress < 100, `Progress should be <100 with retries, got ${session.progress}`)
    })

    it('spacing: same combo should not appear back-to-back', () => {
        const session = new Session(2)
        let prevComboKey = null

        for (let i = 0; i < 100; i++) {
            const q = session.next()
            if (q === 'stage_change') continue
            if (q === null) break

            if (prevComboKey !== null) {
                assert.notStrictEqual(q.comboKey, prevComboKey,
                    `Same combo ${q.comboKey} appeared back-to-back at question ${i}`)
            }
            prevComboKey = q.comboKey
            session.recordAnswer(true, false)
        }
    })

    it('getResults should track learned and mistakes', () => {
        const session = new Session(2)

        // Answer first correctly
        session.next()
        session.recordAnswer(true, false)

        // Answer second wrong
        session.next()
        session.recordAnswer(false, false)

        const results = session.getResults()
        assert.strictEqual(results.multiplier, 2)
        assert.ok(results.learned.length >= 1)
        assert.ok(results.mistakes.length >= 1)
        assert.ok(results.date)
    })
})
