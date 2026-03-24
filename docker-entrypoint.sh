#!/bin/bash
set -e

# Railway задає PORT — налаштувати Apache на цей порт
if [ -n "$PORT" ]; then
    sed -i "s/Listen 80/Listen $PORT/" /etc/apache2/ports.conf
    sed -i "s/:80/:$PORT/" /etc/apache2/sites-available/000-default.conf
fi

# Міграції БД
php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>/dev/null || true

# Очистити та прогріти кеш
php bin/console cache:warmup --env=prod

# Запустити Apache
exec apache2-foreground
