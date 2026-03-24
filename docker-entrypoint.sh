#!/bin/bash
set -e

# Міграції БД
php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>/dev/null || true

# Очистити та прогріти кеш
php bin/console cache:warmup --env=prod

# Запустити PHP built-in server на порту Railway (або 80)
exec php -S 0.0.0.0:${PORT:-80} -t public/ public/index.php
