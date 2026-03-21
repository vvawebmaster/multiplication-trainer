<?php

namespace App\Game;

use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;

/**
 * Collects all registered games via tagged services.
 * Any service implementing GameInterface is automatically available here.
 */
final class GameRegistry
{
    /** @var array<string, GameInterface> */
    private array $games = [];

    public function __construct(
        #[AutowireIterator('app.game')]
        iterable $games,
    ) {
        foreach ($games as $game) {
            $this->games[$game->getSlug()] = $game;
        }
    }

    public function get(string $slug): ?GameInterface
    {
        return $this->games[$slug] ?? null;
    }

    /** @return array<string, GameInterface> */
    public function all(): array
    {
        return $this->games;
    }

    /** @return array<string, GameInterface[]> Games grouped by category */
    public function byCategory(): array
    {
        $grouped = [];
        foreach ($this->games as $game) {
            $grouped[$game->getCategory()][] = $game;
        }

        return $grouped;
    }
}
