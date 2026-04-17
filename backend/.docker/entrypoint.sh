#!/bin/sh

# Environment variables check
if [ -z "$APP_KEY" ]; then
  echo "APP_KEY is not set. Generating one..."
  php artisan key:generate --show
fi

# Optimization
export LOG_CHANNEL=stderr
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run fresh migrations and seeders
php artisan migrate:fresh --seed --force

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
nginx -g "daemon off;"
