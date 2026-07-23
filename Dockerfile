FROM php:8.1-apache

# Install PHP extensions required by CodeIgniter + MySQL
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    curl \
    unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        gd \
        mysqli \
        pdo \
        pdo_mysql \
        mbstring \
        zip \
        xml \
        exif \
        opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# PHP config for large uploads
RUN echo "upload_max_filesize = 2G" >> /usr/local/etc/php/conf.d/droppy.ini \
 && echo "post_max_size = 2G" >> /usr/local/etc/php/conf.d/droppy.ini \
 && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/droppy.ini \
 && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/droppy.ini \
 && echo "max_input_time = 300" >> /usr/local/etc/php/conf.d/droppy.ini

# Apache VirtualHost config
RUN echo '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    ServerName sis5.xyz\n\
    <Directory /var/www/html>\n\
        Options Indexes FollowSymLinks\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

# Copy application files
COPY Files/ /var/www/html/

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 755 /var/www/html \
 && chmod -R 777 /var/www/html/uploads \
 && chmod -R 777 /var/www/html/application/logs \
 && chmod -R 777 /var/www/html/application/cache

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
