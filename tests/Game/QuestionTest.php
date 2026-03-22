<?php

namespace App\Tests\Game;

use App\Game\Question;
use PHPUnit\Framework\TestCase;

class QuestionTest extends TestCase
{
    public function testIsCorrect(): void
    {
        $q = new Question(text: '2 × 3 = ?', correctAnswer: 6, choices: [6, 7, 8, 5]);

        $this->assertTrue($q->isCorrect(6));
        $this->assertFalse($q->isCorrect(7));
        $this->assertFalse($q->isCorrect(0));
    }

    public function testToArrayContainsAllFields(): void
    {
        $q = new Question(
            text: '3 × 4 = ?',
            correctAnswer: 12,
            choices: [10, 11, 12, 13],
            hint: 'порахуй 3+3+3+3',
            operands: ['a' => 3, 'b' => 4],
        );

        $arr = $q->toArray();

        $this->assertSame('3 × 4 = ?', $arr['text']);
        $this->assertSame(12, $arr['correctAnswer']);
        $this->assertCount(4, $arr['choices']);
        $this->assertContains(12, $arr['choices']);
        $this->assertSame('порахуй 3+3+3+3', $arr['hint']);
        $this->assertSame(['a' => 3, 'b' => 4], $arr['operands']);
    }
}
