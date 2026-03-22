<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\GameProgressRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class StatsController extends AbstractController
{
    #[Route('/stats', name: 'app_stats')]
    public function index(GameProgressRepository $repo): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        $progresses = $repo->findByUserAndGame($user, 'multiplication');

        // Per-multiplier stats (×2 through ×10)
        $multiplierStats = [];
        for ($m = 2; $m <= 10; $m++) {
            $mastered = 0;
            $good = 0;
            $total = 10;

            for ($i = 1; $i <= 10; $i++) {
                $key = min($m, $i) . 'x' . max($m, $i);
                $found = false;
                foreach ($progresses as $p) {
                    if ($p->getPairKey() === $key) {
                        $t = $p->getCorrect() + $p->getWrong() + $p->getHinted();
                        if ($t >= 2) {
                            $score = $p->getCorrect() / ($p->getCorrect() + $p->getWrong() + $p->getHinted() * 0.5);
                            if ($score >= 0.9) {
                                $mastered++;
                            } elseif ($score >= 0.6) {
                                $good++;
                            }
                        }
                        $found = true;
                        break;
                    }
                }
            }

            $percent = round(($mastered * 1.0 + $good * 0.8) / $total * 100);
            $multiplierStats[] = [
                'multiplier' => $m,
                'mastered' => $mastered,
                'good' => $good,
                'percent' => min(100, $percent),
            ];
        }

        // Top weak pairs
        $weakPairs = [];
        foreach ($progresses as $p) {
            $t = $p->getCorrect() + $p->getWrong() + $p->getHinted();
            if ($t < 2) {
                continue;
            }
            $score = $p->getCorrect() / ($p->getCorrect() + $p->getWrong() + $p->getHinted() * 0.5);
            if ($score < 0.75 || $p->getWrong() > 0) {
                [$a, $b] = explode('x', $p->getPairKey());
                $weakPairs[] = [
                    'pair' => $a . ' × ' . $b,
                    'correct' => $p->getCorrect(),
                    'wrong' => $p->getWrong(),
                    'score' => round($score * 100),
                ];
            }
        }
        usort($weakPairs, fn($a, $b) => $a['score'] <=> $b['score']);
        $weakPairs = array_slice($weakPairs, 0, 8);

        // Fun facts
        $totalCorrect = 0;
        $totalWrong = 0;
        $totalAnswers = 0;
        $hardestPair = null;
        $hardestWrong = 0;

        foreach ($progresses as $p) {
            $totalCorrect += $p->getCorrect();
            $totalWrong += $p->getWrong();
            $totalAnswers += $p->getCorrect() + $p->getWrong() + $p->getHinted();
            if ($p->getWrong() > $hardestWrong) {
                $hardestWrong = $p->getWrong();
                [$a, $b] = explode('x', $p->getPairKey());
                $hardestPair = $a . ' × ' . $b;
            }
        }

        return $this->render('stats/index.html.twig', [
            'user' => $user,
            'multiplierStats' => $multiplierStats,
            'weakPairs' => $weakPairs,
            'totalCorrect' => $totalCorrect,
            'totalWrong' => $totalWrong,
            'totalAnswers' => $totalAnswers,
            'hardestPair' => $hardestPair,
            'lastSession' => $user->getLastSessionData(),
        ]);
    }
}
