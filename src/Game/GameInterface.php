<?php

namespace App\Game;

/**
 * Interface for all math games.
 * Implement this interface and tag with #[AutoconfigureTag('app.game')] to register a new game.
 */
interface GameInterface
{
    /** Unique game identifier (e.g., 'multiplication', 'division') */
    public function getSlug(): string;

    /** Display name shown in the menu */
    public function getName(): string;

    /** Short description of the game */
    public function getDescription(): string;

    /** Emoji icon for the game card */
    public function getIcon(): string;

    /** Category for grouping (e.g., 'multiplication', 'division', 'arithmetic') */
    public function getCategory(): string;

    /**
     * Generate a question.
     *
     * @param int $level Difficulty level (1-10)
     * @param array $weakPairs Pairs the player struggles with, e.g. [['a' => 3, 'b' => 7], ...]
     * @return Question
     */
    public function generateQuestion(int $level = 1, array $weakPairs = []): Question;
}
