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

# 6. Build environment variables for Vite
ENV VITE_PUSHER_APP_KEY=d294ca82c68cfe7b7258
ENV VITE_PUSHER_APP_CLUSTER=ap1

# 7. Install PHP & Node Dependencies & Build Frontend
RUN composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-* \
    && npm install \
    && npm run build

# 8. Set Permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod +x /var/www/html/docker/entrypoint.sh

EXPOSE 80

ENTRYPOINT [/var/www/html/docker/entrypoint.sh]
