<?php

namespace App\Tests\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class StatsControllerTest extends WebTestCase
{
    public function testStatsPageLoads(): void
    {
        $client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $user = new User();
        $user->setUsername('StatsTestUser');
        $user->addScore(500);
        $user->updateLevel(3);
        $user->updateBestStreak(15);
        $em->persist($user);
        $em->flush();

        $client->loginUser($user);
        $client->request('GET', '/stats');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('.stats-card__value', '3'); // Level
    }

    public function testStatsPageShowsLastSession(): void
    {
        $client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $user = new User();
        $user->setUsername('LastSessionUser');
        $user->setLastSessionData([
            'multiplier' => 5,
            'learned' => ['5 × 3', '5 × 4'],
            'mistakes' => ['5 × 7'],
            'score' => 20,
            'date' => '22.03.2026',
        ]);
        $em->persist($user);
        $em->flush();

        $client->loginUser($user);
        $client->request('GET', '/stats');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('.last-session__header', 'Таблиця на 5');
        $this->assertSelectorExists('.pair-tag--success');
        $this->assertSelectorExists('.pair-tag--danger');
    }

    public function testStatsPageRequiresAuth(): void
    {
        $client = static::createClient();
        $client->request('GET', '/stats');

        $this->assertResponseRedirects('/login');
    }
}
