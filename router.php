<?php
// Minimal router for PHP built-in server, mirroring .htaccess rules.
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = __DIR__;
$filePath = realpath($root . $uri);

// Let the built-in server handle existing files (assets, dist, plugins, etc.).
if ($filePath !== false && str_starts_with($filePath, $root) && is_file($filePath)) {
    return false;
}

// If requesting /dist or a subpath without a real file, serve the built SPA entry.
if (str_starts_with($uri, '/dist')) {
    $_SERVER['SCRIPT_NAME'] = '/dist/index.html';
    $_SERVER['SCRIPT_FILENAME'] = $root . '/dist/index.html';
    include $root . '/dist/index.html';
    return true;
}

// Route API calls to Slim entrypoint.
if (str_starts_with($uri, '/rest')) {
    $_SERVER['SCRIPT_NAME'] = '/rest/index.php';
    $_SERVER['SCRIPT_FILENAME'] = $root . '/rest/index.php';
    include $root . '/rest/index.php';
    return true;
}

// Fallback: SPA front controller.
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $root . '/index.php';
include $root . '/index.php';
