<?php

namespace App\Tests\Game;

use App\Game\GameRegistry;
use App\Game\MultiplicationGame;
use PHPUnit\Framework\TestCase;

class GameRegistryTest extends TestCase
{
    private GameRegistry $registry;

    protected function setUp(): void
    {
        $this->registry = new GameRegistry([new MultiplicationGame()]);
    }

    public function testGetBySlug(): void
    {
        $game = $this->registry->get('multiplication');
        $this->assertInstanceOf(MultiplicationGame::class, $game);
    }

    public function testGetUnknownReturnsNull(): void
    {
        $this->assertNull($this->registry->get('unknown'));
    }

    public function testAllReturnsAllGames(): void
    {
        $all = $this->registry->all();
        $this->assertCount(1, $all);
        $this->assertArrayHasKey('multiplication', $all);
    }

    public function testByCategoryGroupsCorrectly(): void
    {
        $grouped = $this->registry->byCategory();
        $this->assertArrayHasKey('Множення', $grouped);
        $this->assertCount(1, $grouped['Множення']);
    }
}
