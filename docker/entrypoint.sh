#!/usr/bin/env bash
set -e

if [ -n "$PORT" ]; then
    sed -i "s/80/$PORT/g" /etc/apache2/ports.conf /etc/apache2/sites-available/*.conf
fi

php artisan storage:link || true
php artisan config:clear || true

exec apache2-foreground
