# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Мова

Весь код, коментарі та спілкування — **українською**. Технічні терміни залишаються в оригіналі.

## Команди

```bash
# Запуск dev-сервера (порт 8002, бо 8000 зайнятий іншим проектом)
php -S 127.0.0.1:8002 -t public/ public/index.php

# Міграції БД
php bin/console doctrine:migrations:migrate --no-interaction

# Очистити кеш (потрібно після зміни конфігурації/сервісів)
php bin/console cache:clear

# Тести
php bin/phpunit

# Подивитися зареєстровані assets
php bin/console debug:asset-map

# Подивитися маршрути
php bin/console debug:router
```

## Архітектура

### Ігровий движок (розширюваний)

Кожна гра реалізує `GameInterface` і автоматично реєструється через tagged services (`app.game` тег в `config/services.yaml`). `GameRegistry` збирає всі ігри через `#[AutowireIterator('app.game')]`. Щоб додати нову гру — створи клас в `src/Game/` що реалізує `GameInterface`.

### Сесійна система (client-side)

Вся логіка сесії — в JS (`assets/js/session.js`):
- **LEARN** → 20 питань (множення + ділення, вибір з 4 варіантів)
- **TEST** → 10 питань (ті ж комбінації, але треба написати відповідь)
- Помилка або підказка → комбінація повертається пізніше (мінімум 3 питання між повторами)
- Пов'язані операції (3×7 і 21÷3) рознесені в черзі

### Трекінг знань

`KnowledgeTracker` (`assets/js/knowledge-tracker.js`) — кеш в пам'яті + синхронізація з сервером:
- Кожна пара (нормалізована, напр. `2x7`): correct/wrong/hinted/lastSeenAt
- **Старіння**: через 7 днів — "підзабув", через 21 — "забув" (навіть mastered)
- `effectiveScore()` враховує час — score падає з часом
- `getLevel()`: mastered=1.0 бал, good=0.8, решта=0. Рівень = `floor(points * 2 / 10) + 1`
- `getNextMultiplier()`: вибирає найменш вивчений множник для наступної сесії

### Персистентна статистика (User entity)

`totalScore`, `bestStreak`, `level`, `sessionsCompleted` — зберігаються в БД. Оновлюються **з кожною відповіддю** (не тільки в кінці сесії). Рівень і стрік тільки ростуть — ніколи не скидаються.

### Автентифікація

`LoginNoPasswordAuthenticator` — вхід по імені без пароля. Юзер автоматично створюється при першому вході (`UserRepository::findOrCreate`).

### Frontend

**Без Node.js** — Symfony AssetMapper + importmap. Stimulus контролери в `assets/controllers/` авто-завантажуються. JS-модулі (`session.js`, `knowledge-tracker.js`, `celebration.js`) імпортуються напряму.

## БД

SQLite (`var/data.db`). Дві сутності:
- `User` — юзер + статистика (score, streak, level)
- `GameProgress` — прогрес по парах (unique: user + gameSlug + pairKey)

## API ендпоінти (GameController)

- `GET /game/{slug}/progress` → `{pairs: {...}, stats: {...}}`
- `POST /game/{slug}/progress` → зберігає пару + оновлює user stats (score, streak, level, sessionDone)
- `POST /game/{slug}/question` → генерує питання (приймає level, weakPairs)
- `POST /game/{slug}/check` → перевіряє відповідь

## Ідеї на потім

- Монетизація балів (курс до грошей, напр. 1000 балів = 1 EUR)
- Flashcards розминка перед сесією
- Бонус за швидкість відповіді
- Щоденна серія з бонусами
- Досягнення/медалі
- Режим "виклик" на час
