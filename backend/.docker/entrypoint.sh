#!/bin/sh

# Environment variables check
if [ -z "$APP_KEY" ]; then
  echo "APP_KEY is not set. Generating one..."
  php artisan key:generate --show
fi

# Optimization
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations (Optional: decide if you want this every time)
# For Render, it's often better to run this manually or in a build step,
# but having it here with --force is common for single-instance setups.
php artisan migrate --force

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
nginx -g "daemon off;"
