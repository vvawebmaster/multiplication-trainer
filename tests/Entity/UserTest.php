<?php

namespace App\Tests\Entity;

use App\Entity\User;
use PHPUnit\Framework\TestCase;

class UserTest extends TestCase
{
    public function testScoreOnlyGrows(): void
    {
        $user = new User();
        $this->assertSame(0, $user->getTotalScore());

        $user->addScore(100);
        $this->assertSame(100, $user->getTotalScore());

        $user->addScore(50);
        $this->assertSame(150, $user->getTotalScore());
    }

    public function testBestStreakOnlyGrows(): void
    {
        $user = new User();
        $user->updateBestStreak(5);
        $this->assertSame(5, $user->getBestStreak());

        $user->updateBestStreak(3); // Lower — should not change
        $this->assertSame(5, $user->getBestStreak());

        $user->updateBestStreak(10);
        $this->assertSame(10, $user->getBestStreak());
    }

    public function testLevelOnlyGrows(): void
    {
        $user = new User();
        $this->assertSame(1, $user->getLevel());

        $user->updateLevel(3);
        $this->assertSame(3, $user->getLevel());

        $user->updateLevel(2); // Lower — should not change
        $this->assertSame(3, $user->getLevel());

        $user->updateLevel(5);
        $this->assertSame(5, $user->getLevel());
    }

    public function testSessionsCompleted(): void
    {
        $user = new User();
        $this->assertSame(0, $user->getSessionsCompleted());

        $user->incrementSessionsCompleted();
        $user->incrementSessionsCompleted();
        $this->assertSame(2, $user->getSessionsCompleted());
    }

    public function testLastSessionData(): void
    {
        $user = new User();
        $this->assertNull($user->getLastSessionData());

        $data = ['multiplier' => 3, 'learned' => ['3 × 4'], 'mistakes' => ['3 × 7']];
        $user->setLastSessionData($data);
        $this->assertSame($data, $user->getLastSessionData());
    }

    public function testRolesAlwaysIncludeRoleUser(): void
    {
        $user = new User();
        $this->assertContains('ROLE_USER', $user->getRoles());
    }

    public function testStatsToArray(): void
    {
        $user = new User();
        $user->addScore(500);
        $user->updateBestStreak(12);
        $user->updateLevel(4);

        $stats = $user->statsToArray();

        $this->assertSame(500, $stats['totalScore']);
        $this->assertSame(12, $stats['bestStreak']);
        $this->assertSame(4, $stats['level']);
        $this->assertSame(0, $stats['sessionsCompleted']);
    }
}
