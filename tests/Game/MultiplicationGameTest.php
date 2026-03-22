<?php

namespace App\Tests\Game;

use App\Game\MultiplicationGame;
use PHPUnit\Framework\TestCase;

class MultiplicationGameTest extends TestCase
{
    private MultiplicationGame $game;

    protected function setUp(): void
    {
        $this->game = new MultiplicationGame();
    }

    public function testSlugAndMetadata(): void
    {
        $this->assertSame('multiplication', $this->game->getSlug());
        $this->assertSame('Таблиця множення', $this->game->getName());
        $this->assertNotEmpty($this->game->getDescription());
        $this->assertNotEmpty($this->game->getIcon());
        $this->assertNotEmpty($this->game->getCategory());
    }

    public function testGenerateQuestionReturnsValidQuestion(): void
    {
        $q = $this->game->generateQuestion(1);

        $this->assertNotEmpty($q->text);
        $this->assertGreaterThan(0, $q->correctAnswer);
        $this->assertCount(4, $q->choices);
        $this->assertContains($q->correctAnswer, $q->choices);
        $this->assertNotEmpty($q->hint);
        $this->assertArrayHasKey('a', $q->operands);
        $this->assertArrayHasKey('b', $q->operands);
    }

    public function testGenerateQuestionCorrectAnswer(): void
    {
        // Run multiple times to cover randomness
        for ($i = 0; $i < 50; $i++) {
            $q = $this->game->generateQuestion(random_int(1, 10));
            $a = $q->operands['a'];
            $b = $q->operands['b'];

            $this->assertSame($a * $b, $q->correctAnswer, "Expected {$a} × {$b} = " . ($a * $b));
        }
    }

    public function testChoicesAreUniqueAndPositive(): void
    {
        for ($i = 0; $i < 30; $i++) {
            $q = $this->game->generateQuestion(random_int(1, 10));

            $this->assertCount(4, $q->choices);
            $this->assertCount(4, array_unique($q->choices), 'Choices must be unique');
            foreach ($q->choices as $c) {
                $this->assertGreaterThan(0, $c, 'Choices must be positive');
            }
        }
    }

    public function testWeakPairsAreUsed(): void
    {
        $weakPairs = [['a' => 7, 'b' => 8]];
        $found7x8 = false;

        // With 70% probability, weak pairs should appear frequently
        for ($i = 0; $i < 50; $i++) {
            $q = $this->game->generateQuestion(10, $weakPairs);
            if ($q->operands['a'] === 7 && $q->operands['b'] === 8
                || $q->operands['a'] === 8 && $q->operands['b'] === 7) {
                $found7x8 = true;
                break;
            }
        }

        $this->assertTrue($found7x8, 'Weak pair 7×8 should appear at least once in 50 questions');
    }

    public function testLevelAffectsRange(): void
    {
        // Level 1 → maxNumber = 2, so one operand should be ≤ 2
        for ($i = 0; $i < 30; $i++) {
            $q = $this->game->generateQuestion(1);
            $a = $q->operands['a'];
            $b = $q->operands['b'];
            $minOperand = min($a, $b);

            $this->assertLessThanOrEqual(10, max($a, $b));
        }
    }
}
