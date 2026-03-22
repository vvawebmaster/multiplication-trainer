<?php

namespace App\Controller;

use App\Entity\User;
use App\Game\GameRegistry;
use App\Repository\GameProgressRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/game')]
class GameController extends AbstractController
{
    #[Route('/{slug}', name: 'app_game_play')]
    public function play(string $slug, GameRegistry $registry): Response
    {
        $game = $registry->get($slug);

        if (!$game) {
            throw $this->createNotFoundException('Гру не знайдено');
        }

        return $this->render('game/play.html.twig', [
            'game' => $game,
        ]);
    }

    #[Route('/{slug}/question', name: 'app_game_question', methods: ['POST'])]
    public function question(string $slug, Request $request, GameRegistry $registry): JsonResponse
    {
        $game = $registry->get($slug);

        if (!$game) {
            return new JsonResponse(['error' => 'Game not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $level = max(1, min(10, (int) ($data['level'] ?? 1)));
        $weakPairs = $data['weakPairs'] ?? [];

        $sanitized = [];
        foreach ($weakPairs as $pair) {
            if (isset($pair['a'], $pair['b'])) {
                $a = max(1, min(10, (int) $pair['a']));
                $b = max(1, min(10, (int) $pair['b']));
                $sanitized[] = ['a' => $a, 'b' => $b];
            }
        }

        $question = $game->generateQuestion($level, $sanitized);

        return new JsonResponse($question->toArray());
    }

    #[Route('/{slug}/check', name: 'app_game_check', methods: ['POST'])]
    public function check(string $slug, Request $request, GameRegistry $registry): JsonResponse
    {
        $game = $registry->get($slug);

        if (!$game) {
            return new JsonResponse(['error' => 'Game not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $answer = $data['answer'] ?? null;
        $correctAnswer = $data['correctAnswer'] ?? null;

        if ($answer === null || $correctAnswer === null) {
            return new JsonResponse(['error' => 'Missing data'], 400);
        }

        $isCorrect = (int) $answer === (int) $correctAnswer;

        return new JsonResponse([
            'correct' => $isCorrect,
            'correctAnswer' => (int) $correctAnswer,
        ]);
    }

    /** Load all progress + user stats */
    #[Route('/{slug}/progress', name: 'app_game_progress_load', methods: ['GET'])]
    public function loadProgress(string $slug, GameProgressRepository $repo): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $progresses = $repo->findByUserAndGame($user, $slug);

        $pairs = [];
        foreach ($progresses as $p) {
            $pairs[$p->getPairKey()] = $p->toArray();
        }

        return new JsonResponse([
            'pairs' => $pairs,
            'stats' => $user->statsToArray(),
        ]);
    }

    /** Save progress for a single pair + update user stats */
    #[Route('/{slug}/progress', name: 'app_game_progress_save', methods: ['POST'])]
    public function saveProgress(
        string $slug,
        Request $request,
        GameProgressRepository $repo,
        EntityManagerInterface $em,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        $pairKey = $data['pairKey'] ?? null;
        $type = $data['type'] ?? null; // 'correct', 'wrong', 'hinted'
        $scoreToAdd = max(0, (int) ($data['score'] ?? 0));
        $currentStreak = max(0, (int) ($data['streak'] ?? 0));
        $newLevel = max(1, (int) ($data['level'] ?? 0));
        $sessionDone = (bool) ($data['sessionDone'] ?? false);

        // Session complete
        if ($sessionDone) {
            $user->updateBestStreak($currentStreak);
            $user->updateLevel($newLevel);
            $user->incrementSessionsCompleted();

            // Save last session results
            $lastSessionData = $data['lastSessionData'] ?? null;
            if (is_array($lastSessionData)) {
                $user->setLastSessionData($lastSessionData);
            }

            $em->flush();

            return new JsonResponse(['stats' => $user->statsToArray()]);
        }

        // Stats-only update (e.g. level sync on page load)
        if (!$pairKey && $newLevel > 0) {
            $user->updateLevel($newLevel);
            $user->updateBestStreak($currentStreak);
            $em->flush();

            return new JsonResponse(['stats' => $user->statsToArray()]);
        }

        if (!$pairKey || !in_array($type, ['correct', 'wrong', 'hinted'], true)) {
            return new JsonResponse(['error' => 'Invalid data'], 400);
        }

        // Update pair progress
        $progress = $repo->getOrCreate($user, $slug, $pairKey);
        match ($type) {
            'correct' => $progress->incrementCorrect(),
            'wrong' => $progress->incrementWrong(),
            'hinted' => $progress->incrementHinted(),
        };

        // Update user stats with each answer
        if ($scoreToAdd > 0) {
            $user->addScore($scoreToAdd);
        }
        $user->updateBestStreak($currentStreak);
        if ($newLevel > 0) {
            $user->updateLevel($newLevel);
        }

        $em->flush();

        return new JsonResponse([
            'progress' => $progress->toArray(),
            'stats' => $user->statsToArray(),
        ]);
    }
}
