<?php

namespace App\Repository;

use App\Entity\GameProgress;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GameProgress>
 */
class GameProgressRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GameProgress::class);
    }

    /** @return GameProgress[] */
    public function findByUserAndGame(User $user, string $gameSlug): array
    {
        return $this->findBy(['user' => $user, 'gameSlug' => $gameSlug]);
    }

    public function findOneByUserGameAndPair(User $user, string $gameSlug, string $pairKey): ?GameProgress
    {
        return $this->findOneBy([
            'user' => $user,
            'gameSlug' => $gameSlug,
            'pairKey' => $pairKey,
        ]);
    }

    public function getOrCreate(User $user, string $gameSlug, string $pairKey): GameProgress
    {
        $progress = $this->findOneByUserGameAndPair($user, $gameSlug, $pairKey);

        if (!$progress) {
            $progress = new GameProgress();
            $progress->setUser($user);
            $progress->setGameSlug($gameSlug);
            $progress->setPairKey($pairKey);
            $this->getEntityManager()->persist($progress);
        }

        return $progress;
    }
}
