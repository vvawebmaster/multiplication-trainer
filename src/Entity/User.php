<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
class User implements UserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    private ?string $username = null;

    /** @var list<string> */
    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column(options: ['default' => 0])]
    private int $totalScore = 0;

    #[ORM\Column(options: ['default' => 0])]
    private int $bestStreak = 0;

    #[ORM\Column(options: ['default' => 1])]
    private int $level = 1;

    #[ORM\Column(options: ['default' => 0])]
    private int $sessionsCompleted = 0;

    /** @var Collection<int, GameProgress> */
    #[ORM\OneToMany(targetEntity: GameProgress::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
    private Collection $progresses;

    public function __construct()
    {
        $this->progresses = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(string $username): static
    {
        $this->username = $username;
        return $this;
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->username;
    }

    /** @return list<string> */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';
        return array_unique($roles);
    }

    /** @param list<string> $roles */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;
        return $this;
    }

    public function eraseCredentials(): void
    {
    }

    /** @return Collection<int, GameProgress> */
    public function getProgresses(): Collection
    {
        return $this->progresses;
    }

    public function getTotalScore(): int
    {
        return $this->totalScore;
    }

    public function addScore(int $score): static
    {
        $this->totalScore += $score;
        return $this;
    }

    public function getBestStreak(): int
    {
        return $this->bestStreak;
    }

    public function updateBestStreak(int $streak): static
    {
        if ($streak > $this->bestStreak) {
            $this->bestStreak = $streak;
        }
        return $this;
    }

    public function getLevel(): int
    {
        return $this->level;
    }

    /** Level can only go up */
    public function updateLevel(int $level): static
    {
        if ($level > $this->level) {
            $this->level = $level;
        }
        return $this;
    }

    public function getSessionsCompleted(): int
    {
        return $this->sessionsCompleted;
    }

    public function incrementSessionsCompleted(): static
    {
        $this->sessionsCompleted++;
        return $this;
    }

    public function statsToArray(): array
    {
        return [
            'totalScore' => $this->totalScore,
            'bestStreak' => $this->bestStreak,
            'level' => $this->level,
            'sessionsCompleted' => $this->sessionsCompleted,
        ];
    }
}
