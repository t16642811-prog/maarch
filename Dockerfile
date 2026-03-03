# TODO switch to 8.2/8.3
ARG BASE_REGISTRY=docker.io/

FROM ${BASE_REGISTRY}php:8.1-apache-bullseye as base

# Copy dependencies lists
COPY ./container/dependences.apt ./container/dependences.php /mnt/

## Dependencies
# Binaries dependencies + configuration
RUN apt-get update \
    && apt-get install --no-install-recommends -y debsecan \
    && apt-get install --no-install-recommends -y $(debsecan --suite buster --format packages --only-fixed) \
    && apt-get purge -y debsecan \
    && apt-get install --no-install-recommends -y $(cat /mnt/dependences.apt) \
    && sed -i 's/rights="none" pattern="PDF"/rights="read" pattern="PDF"/' /etc/ImageMagick-6/policy.xml \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /mnt/dependences.apt \
# Install PHP extension installer with dependency manager
    && curl -sSLf \
               -o /usr/local/bin/install-php-extensions \
               https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions \
    && chmod +x /usr/local/bin/install-php-extensions  \
# Install PHP extensions
    && install-php-extensions $(cat /mnt/dependences.php) \
    && rm -rf /usr/local/bin/install-php-extensions \
    && rm -rf /mnt/dependences.php \
# Set locales
    && echo "fr_FR.UTF-8 UTF-8" > /etc/locale.gen \
    && locale-gen \
    && echo "LC_ALL=fr_FR.UTF-8" > /etc/environment \
# Apache mods
    && a2enmod rewrite headers \
    && sed -i 's/^ServerTokens.*/ServerTokens Prod/' /etc/apache2/conf-available/security.conf \
    && sed -i 's/^ServerSignature.*/ServerSignature Off/' /etc/apache2/conf-available/security.conf

## Application files
# Create the MaarchCourrier dirs
RUN mkdir -p --mode=700 /var/www/html/MaarchCourrier /opt/maarch/docservers \
  && chown www-data:www-data /var/www/html/MaarchCourrier /opt/maarch/docservers

WORKDIR /var/www/html/MaarchCourrier

## Openssl config
COPY --chmod=644 container/openssl.cnf /etc/ssl/openssl.cnf

# Apache vhost
COPY container/default-vhost.conf /etc/apache2/sites-available/000-default.conf

# PHP Configuration
COPY container/php.ini /usr/local/etc/php/php.ini

# Set default healthcheck
COPY --chown=root:root --chmod=500 container/healthcheck.sh /bin/healthcheck.sh

# run cron in the background
RUN sed -i 's/^exec /service cron start\n\nexec /' /usr/local/bin/apache2-foreground

#
# Base APP
#

FROM base as base_app

# Copy the app files inside the container
# ordered from least likely to change, to most likely (to optimize build cache)
COPY --chown=www-data:www-data index.php LICENSE.txt CONTRIBUTING.md CLA.md .htaccess /var/www/html/MaarchCourrier/
COPY --chown=www-data:www-data modules /var/www/html/MaarchCourrier/modules
COPY --chown=www-data:www-data install /var/www/html/MaarchCourrier/install
COPY --chown=www-data:www-data rest /var/www/html/MaarchCourrier/rest
COPY --chown=www-data:www-data bin /var/www/html/MaarchCourrier/bin
COPY --chown=www-data:www-data config /var/www/html/MaarchCourrier/config
COPY --chown=www-data:www-data referential /var/www/html/MaarchCourrier/referential
COPY --chown=www-data:www-data sql /var/www/html/MaarchCourrier/sql
COPY --chown=www-data:www-data migration /var/www/html/MaarchCourrier/migration
COPY --chown=www-data:www-data package.json package-lock.json composer.json composer.lock /var/www/html/MaarchCourrier/
COPY --chown=www-data:www-data src/app /var/www/html/MaarchCourrier/src/app
COPY --chown=www-data:www-data src/core /var/www/html/MaarchCourrier/src/core
COPY --chown=www-data:www-data src/backend /var/www/html/MaarchCourrier/src/backend
COPY --chown=www-data:www-data src/lang /var/www/html/MaarchCourrier/src/lang

# Correct permissions
RUN find /var/www/html/MaarchCourrier -type d -exec chmod 770 {} + \
    & find /var/www/html/MaarchCourrier -type f -exec chmod 660 {} + \
    & chmod 770 /opt/maarch/docservers \
    & chmod 440 /usr/local/etc/php/php.ini \
    & wait


#
# PHP build vendor
#
FROM composer:lts AS composer

# Get composer depencies list + app PHP files
COPY composer.json composer.lock /app/

COPY src/app /app/src/app
COPY src/core /app/src/core
COPY src/backend /app/src/backend

RUN composer install --ignore-platform-reqs --no-scripts --no-dev

#
# Front build
#
FROM node:20.9-alpine AS front

WORKDIR /app

COPY package.json package-lock.json angular.json tsconfig.base.json /app/

COPY src/frontend /app/src/frontend/

RUN npm -v && node -v \
    && npm ci --legacy-peer-deps \
    && npm run build-prod \
    && rm -rf node_modules


FROM base_app as app

# Copy built vendor + dist folders
COPY --chown=www-data:www-data --from=composer /app/vendor ./vendor/
COPY --chown=www-data:www-data --from=front /app/dist ./dist/

# Set default entrypoint
COPY --chown=root:www-data container/entrypoint.sh /bin/entrypoint.sh
ENTRYPOINT ["/bin/entrypoint.sh"]

# Correct permissions
RUN find /var/www/html/MaarchCourrier -type d -exec chmod 700 {} + \
    & find /var/www/html/MaarchCourrier -type f -exec chmod 600 {} + \
    & chmod 700 /opt/maarch/docservers \
    & chmod 444 /usr/local/etc/php/php.ini \
    & chmod 500 /bin/entrypoint.sh \
    & wait


CMD ["/usr/local/bin/apache2-foreground"]

FROM app as dev_api

RUN pecl install xdebug \
    && docker-php-ext-enable xdebug

COPY container/php-dev.ini "${PHP_INI_DIR}"/conf.d/
