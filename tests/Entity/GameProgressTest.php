<?php

namespace App\Tests\Entity;

use App\Entity\GameProgress;
use PHPUnit\Framework\TestCase;

class GameProgressTest extends TestCase
{
    public function testIncrementCorrect(): void
    {
        $gp = new GameProgress();
        $this->assertSame(0, $gp->getCorrect());

        $gp->incrementCorrect();
        $gp->incrementCorrect();
        $this->assertSame(2, $gp->getCorrect());
        $this->assertNotNull($gp->getLastSeenAt());
    }

    public function testIncrementWrong(): void
    {
        $gp = new GameProgress();
        $gp->incrementWrong();
        $this->assertSame(1, $gp->getWrong());
    }

    public function testIncrementHinted(): void
    {
        $gp = new GameProgress();
        $gp->incrementHinted();
        $gp->incrementHinted();
        $this->assertSame(2, $gp->getHinted());
    }

    public function testToArray(): void
    {
        $gp = new GameProgress();
        $gp->setPairKey('3x7');
        $gp->incrementCorrect();
        $gp->incrementCorrect();
        $gp->incrementWrong();

        $arr = $gp->toArray();

        $this->assertSame('3x7', $arr['pairKey']);
        $this->assertSame(2, $arr['correct']);
        $this->assertSame(1, $arr['wrong']);
        $this->assertSame(0, $arr['hinted']);
        $this->assertArrayHasKey('lastSeenAt', $arr);
    }
}
