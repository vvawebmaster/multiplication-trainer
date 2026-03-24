FROM php:8.3-cli

# Встановити системні залежності
RUN apt-get update && apt-get install -y \
    libicu-dev \
    libzip-dev \
    unzip \
    && docker-php-ext-install intl zip opcache \
    && rm -rf /var/lib/apt/lists/*

# Встановити Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Робоча директорія
WORKDIR /var/www/html

# Скопіювати composer файли та встановити залежності
COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Скопіювати весь проект
COPY . .

# Завершити composer install (з скриптами)
RUN composer run-script post-install-cmd --no-interaction 2>/dev/null || true

# Створити директорії для SQLite та кешу, дати повні права
RUN mkdir -p var/data var/cache var/log \
    && chmod -R 777 var

# Продакшн env
ENV APP_ENV=prod
ENV APP_SECRET=a1b2c3d4e5f6789012345678abcdef90
ENV DATABASE_URL="sqlite:///%kernel.project_dir%/var/data.db"

# Кеш
RUN php bin/console cache:warmup --env=prod || true
RUN chmod -R 777 var

# Стартовий скрипт
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

CMD ["docker-entrypoint.sh"]
