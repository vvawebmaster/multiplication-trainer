#!/bin/bash
set -e

# Міграції БД
php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>/dev/null || true

# Очистити та прогріти кеш
php bin/console cache:warmup --env=prod

# Запустити Apache
exec apache2-foreground
