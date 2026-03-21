<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260321124732 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add totalScore, bestStreak, level, sessionsCompleted to User. Calculate level for existing users.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD COLUMN total_score INTEGER DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE user ADD COLUMN best_streak INTEGER DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE user ADD COLUMN level INTEGER DEFAULT 1 NOT NULL');
        $this->addSql('ALTER TABLE user ADD COLUMN sessions_completed INTEGER DEFAULT 0 NOT NULL');

        // Calculate level for existing users from their game_progress data
        // Level = floor(total_points / 10) + 1
        // mastered (correct/(correct+wrong+hinted) >= 0.9 AND correct+wrong+hinted >= 2) = 1.0 point
        // good (score >= 0.6) = 0.8 point
        // Using a subquery to calculate per-user
        $this->addSql("
            UPDATE \"user\" SET level = MAX(1, (
                SELECT COALESCE(
                    CAST((
                        SUM(
                            CASE
                                WHEN (gp.correct + gp.wrong + gp.hinted) >= 2
                                     AND CAST(gp.correct AS REAL) / (gp.correct + gp.wrong + gp.hinted * 0.5) >= 0.9
                                THEN 10  -- 1.0 * 10 (scaled to avoid float)
                                WHEN (gp.correct + gp.wrong + gp.hinted) >= 2
                                     AND CAST(gp.correct AS REAL) / (gp.correct + gp.wrong + gp.hinted * 0.5) >= 0.6
                                THEN 8   -- 0.8 * 10
                                ELSE 0
                            END
                        ) / 100  -- divide by 100 to get floor(points/10)
                    ) AS INTEGER) + 1,
                    1
                )
                FROM game_progress gp
                WHERE gp.user_id = \"user\".id
            ))
        ");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE TEMPORARY TABLE __temp__user AS SELECT id, username, roles FROM "user"');
        $this->addSql('DROP TABLE "user"');
        $this->addSql('CREATE TABLE "user" (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, username VARCHAR(180) NOT NULL, roles CLOB NOT NULL)');
        $this->addSql('INSERT INTO "user" (id, username, roles) SELECT id, username, roles FROM __temp__user');
        $this->addSql('DROP TABLE __temp__user');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8D93D649F85E0677 ON "user" (username)');
    }
}
