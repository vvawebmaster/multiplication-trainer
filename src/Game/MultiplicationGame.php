<?php

namespace App\Game;

final class MultiplicationGame implements GameInterface
{
    public function getSlug(): string
    {
        return 'multiplication';
    }

    public function getName(): string
    {
        return 'Таблиця множення';
    }

    public function getDescription(): string
    {
        return 'Вивчай таблицю множення від 1 до 10 граючись!';
    }

    public function getIcon(): string
    {
        return '🔢';
    }

    public function getCategory(): string
    {
        return 'Множення';
    }

    public function generateQuestion(int $level = 1, array $weakPairs = []): Question
    {
        // 70% chance to pick from weak pairs if available
        if ($weakPairs && random_int(1, 100) <= 70) {
            $pair = $weakPairs[array_rand($weakPairs)];
            $a = (int) $pair['a'];
            $b = (int) $pair['b'];
        } else {
            $maxNumber = min($level + 1, 10);
            $a = random_int(1, $maxNumber);
            $b = random_int(1, 10);

            if (random_int(0, 1)) {
                [$a, $b] = [$b, $a];
            }
        }

        $correct = $a * $b;
        $choices = $this->generateChoices($correct, $a, $b);

        return new Question(
            text: "{$a} × {$b} = ?",
            correctAnswer: $correct,
            choices: $choices,
            hint: $this->generateHint($a, $b),
            operands: ['a' => $a, 'b' => $b],
        );
    }

    /** @return int[] */
    private function generateChoices(int $correct, int $a, int $b): array
    {
        $choices = [$correct];

        $candidates = [
            $a * ($b + 1),
            $a * ($b - 1),
            ($a + 1) * $b,
            ($a - 1) * $b,
            $correct + $a,
            $correct - $a,
            $correct + $b,
            $correct - $b,
        ];

        $candidates = array_unique(array_filter($candidates, fn(int $v) => $v > 0 && $v !== $correct));
        shuffle($candidates);

        foreach ($candidates as $c) {
            if (count($choices) >= 4) {
                break;
            }
            $choices[] = $c;
        }

        while (count($choices) < 4) {
            $rand = random_int(1, 100);
            if (!in_array($rand, $choices, true)) {
                $choices[] = $rand;
            }
        }

        shuffle($choices);

        return $choices;
    }

    private function generateHint(int $a, int $b): string
    {
        if ($b <= 2 || $a <= 2) {
            return "Порахуй {$a} + {$a} " . str_repeat("+ {$a} ", max(0, $b - 2));
        }

        $prev = $a * ($b - 1);
        return "Підказка: {$a} × " . ($b - 1) . " = {$prev}, тепер додай ще {$a}";
    }
}
