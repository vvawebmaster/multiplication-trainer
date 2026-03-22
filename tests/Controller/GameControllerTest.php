<?php

namespace App\Tests\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class GameControllerTest extends WebTestCase
{
    private function loginAs(string $username): \Symfony\Bundle\FrameworkBundle\KernelBrowser
    {
        $client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $user = $em->getRepository(User::class)->findOneBy(['username' => $username]);
        if (!$user) {
            $user = new User();
            $user->setUsername($username);
            $em->persist($user);
            $em->flush();
        }

        $client->loginUser($user);

        return $client;
    }

    public function testGamePageLoads(): void
    {
        $client = $this->loginAs('TestPlayer');
        $client->request('GET', '/game/multiplication');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('h1', 'Таблиця множення');
    }

    public function testGamePageReturns404ForUnknownSlug(): void
    {
        $client = $this->loginAs('TestPlayer');
        $client->request('GET', '/game/unknown-game');

        $this->assertResponseStatusCodeSame(404);
    }

    public function testProgressLoadReturnsJson(): void
    {
        $client = $this->loginAs('TestPlayer');
        $client->request('GET', '/game/multiplication/progress');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('pairs', $data);
        $this->assertArrayHasKey('stats', $data);
        $this->assertArrayHasKey('totalScore', $data['stats']);
        $this->assertArrayHasKey('level', $data['stats']);
    }

    public function testProgressSaveCorrectAnswer(): void
    {
        $client = $this->loginAs('TestPlayer');
        $client->request('POST', '/game/multiplication/progress', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'pairKey' => '3x7',
            'type' => 'correct',
            'score' => 15,
            'streak' => 1,
            'level' => 1,
        ]));

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame(1, $data['progress']['correct']);
        $this->assertSame(15, $data['stats']['totalScore']);
    }

    public function testProgressSaveWrongAnswer(): void
    {
        $client = $this->loginAs('TestPlayer2');
        $client->request('POST', '/game/multiplication/progress', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'pairKey' => '5x8',
            'type' => 'wrong',
            'score' => 0,
            'streak' => 0,
            'level' => 1,
        ]));

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame(1, $data['progress']['wrong']);
    }

    public function testProgressSaveInvalidTypeReturns400(): void
    {
        $client = $this->loginAs('TestPlayer');
        $client->request('POST', '/game/multiplication/progress', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'pairKey' => '2x3',
            'type' => 'invalid',
        ]));

        $this->assertResponseStatusCodeSame(400);
    }

    public function testSessionDoneUpdatesStats(): void
    {
        $client = $this->loginAs('TestSessionPlayer');

        $client->request('POST', '/game/multiplication/progress', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'sessionDone' => true,
            'level' => 3,
            'streak' => 10,
            'lastSessionData' => [
                'multiplier' => 4,
                'learned' => ['4 × 5', '4 × 6'],
                'mistakes' => ['4 × 7'],
                'score' => 15,
                'date' => '22.03.2026',
            ],
        ]));

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame(3, $data['stats']['level']);
        $this->assertSame(10, $data['stats']['bestStreak']);
        $this->assertSame(1, $data['stats']['sessionsCompleted']);
    }

    public function testLevelOnlyGoesUp(): void
    {
        $client = $this->loginAs('LevelTestPlayer');

        // Set level to 5
        $client->request('POST', '/game/multiplication/progress', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['sessionDone' => true, 'level' => 5, 'streak' => 0]));

        // Try to set level to 2 — should stay 5
        $client->request('POST', '/game/multiplication/progress', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['sessionDone' => true, 'level' => 2, 'streak' => 0]));

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame(5, $data['stats']['level']);
    }
}
