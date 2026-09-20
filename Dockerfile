FROM php:8.4-apache

# 1. Install system dependencies & Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 3. Configure Apache DocumentRoot to Laravel public/
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && a2enmod rewrite

# 4. Set Working Directory
WORKDIR /var/www/html

# 5. Copy Application Source Code
COPY . .

# 6. Install PHP & Node Dependencies & Build Frontend
RUN composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-* \
    && npm install \
    && npm run build

# 7. Set Permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# 8. Start script to bind Render's dynamic 
RUN echo '#!/bin/sh' > /start.sh \
    && echo 'sed -i s/80//g /etc/apache2/ports.conf /etc/apache2/sites-available/*.conf' >> /start.sh \
    && echo 'php artisan config:clear || true' >> /start.sh \
    && echo 'php artisan storage:link || true' >> /start.sh \
    && echo 'exec apache2-foreground' >> /start.sh \
    && chmod +x /start.sh

EXPOSE 80

CMD [/start.sh]
