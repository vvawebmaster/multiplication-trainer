FROM php:8.2-apache

# Встановити системні залежності
RUN apt-get update && apt-get install -y \
    libicu-dev \
    libzip-dev \
    unzip \
    && docker-php-ext-install intl zip opcache \
    && rm -rf /var/lib/apt/lists/*

# Увімкнути Apache mod_rewrite
RUN a2enmod rewrite

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

# Створити директорії для SQLite та кешу
RUN mkdir -p var/data var/cache var/log \
    && chown -R www-data:www-data var

# Apache конфігурація — вказати на public/
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Дозволити .htaccess override
RUN sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Продакшн env
ENV APP_ENV=prod
ENV APP_SECRET=change-me-in-railway
ENV DATABASE_URL="sqlite:///%kernel.project_dir%/var/data.db"

# Кеш та міграції при старті
RUN php bin/console cache:warmup --env=prod || true

EXPOSE 80

# Стартовий скрипт
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

CMD ["docker-entrypoint.sh"]
