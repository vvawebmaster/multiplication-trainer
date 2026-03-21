<?php

namespace App\Entity;

use App\Repository\GameProgressRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GameProgressRepository::class)]
#[ORM\UniqueConstraint(fields: ['user', 'gameSlug', 'pairKey'])]
class GameProgress
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'progresses')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    /** Game identifier (e.g., 'multiplication') */
    #[ORM\Column(length: 50)]
    private ?string $gameSlug = null;

    /** Normalized pair key (e.g., '3x7') */
    #[ORM\Column(length: 20)]
    private ?string $pairKey = null;

    #[ORM\Column]
    private int $correct = 0;

    #[ORM\Column]
    private int $wrong = 0;

    #[ORM\Column]
    private int $hinted = 0;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $lastSeenAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;
        return $this;
    }

    public function getGameSlug(): ?string
    {
        return $this->gameSlug;
    }

    public function setGameSlug(string $gameSlug): static
    {
        $this->gameSlug = $gameSlug;
        return $this;
    }

    public function getPairKey(): ?string
    {
        return $this->pairKey;
    }

    public function setPairKey(string $pairKey): static
    {
        $this->pairKey = $pairKey;
        return $this;
    }

    public function getCorrect(): int
    {
        return $this->correct;
    }

    public function incrementCorrect(): static
    {
        $this->correct++;
        $this->lastSeenAt = new \DateTimeImmutable();
        return $this;
    }

    public function getWrong(): int
    {
        return $this->wrong;
    }

    public function incrementWrong(): static
    {
        $this->wrong++;
        $this->lastSeenAt = new \DateTimeImmutable();
        return $this;
    }

    public function getHinted(): int
    {
        return $this->hinted;
    }

    public function incrementHinted(): static
    {
        $this->hinted++;
        $this->lastSeenAt = new \DateTimeImmutable();
        return $this;
    }

    public function getLastSeenAt(): ?\DateTimeImmutable
    {
        return $this->lastSeenAt;
    }

    public function toArray(): array
    {
        return [
            'pairKey' => $this->pairKey,
            'correct' => $this->correct,
            'wrong' => $this->wrong,
            'hinted' => $this->hinted,
            'lastSeenAt' => $this->lastSeenAt?->getTimestamp(),
        ];
    }
}
