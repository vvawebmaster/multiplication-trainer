#!/bin/bash
set -e

# Повні права на var (кеш, логи, SQLite)
chmod -R 777 var

# Міграції БД
php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>/dev/null || true

# Очистити та прогріти кеш
php bin/console cache:warmup --env=prod

# Знову права після warmup
chmod -R 777 var

# Запустити PHP built-in server на порту Railway (або 8080)
exec php -S 0.0.0.0:${PORT:-8080} -t public/ public/index.php
