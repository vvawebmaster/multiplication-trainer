<?php

namespace App\Game;

final class Question
{
    /**
     * @param string    $text           Question text (e.g., "7 × 8 = ?")
     * @param int|float $correctAnswer  The correct answer
     * @param int[]     $choices        Multiple choice options (including the correct answer)
     * @param string    $hint           Optional hint for the player
     * @param array     $operands       Original operands for tracking (e.g., ['a' => 3, 'b' => 7])
     */
    public function __construct(
        public readonly string $text,
        public readonly int|float $correctAnswer,
        public readonly array $choices = [],
        public readonly string $hint = '',
        public readonly array $operands = [],
    ) {
    }

    public function isCorrect(int|float $answer): bool
    {
        return $answer == $this->correctAnswer;
    }

    public function toArray(): array
    {
        return [
            'text' => $this->text,
            'correctAnswer' => $this->correctAnswer,
            'choices' => $this->choices,
            'hint' => $this->hint,
            'operands' => $this->operands,
        ];
    }
}
