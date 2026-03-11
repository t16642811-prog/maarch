<?php
// Minimal router for PHP built-in server, mirroring .htaccess rules.
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$root = __DIR__;
$filePath = realpath($root . $uri);

/**
 * Serve static files with cache headers + 304 + gzip (text assets).
 * This makes repeated page loads much faster on php -S.
 */
if ($filePath !== false && str_starts_with($filePath, $root) && is_file($filePath)) {
    $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimeMap = [
        'js'   => 'application/javascript; charset=UTF-8',
        'css'  => 'text/css; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'map'  => 'application/json; charset=UTF-8',
        'html' => 'text/html; charset=UTF-8',
        'svg'  => 'image/svg+xml',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
        'ico'  => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        'ttf'  => 'font/ttf'
    ];
    $contentType = $mimeMap[$extension] ?? (mime_content_type($filePath) ?: 'application/octet-stream');

    $mtime = filemtime($filePath) ?: time();
    $lastModified = gmdate('D, d M Y H:i:s', $mtime) . ' GMT';
    $etag = '"' . md5($filePath . '|' . filesize($filePath) . '|' . $mtime) . '"';

    header('Content-Type: ' . $contentType);
    header('ETag: ' . $etag);
    header('Last-Modified: ' . $lastModified);
    header('X-Content-Type-Options: nosniff');

    $isIndex = str_ends_with($uri, '/index.html') || $uri === '/dist/index.html';
    if ($isIndex) {
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    } else {
        $immutableExt = ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'woff', 'woff2', 'ttf', 'ico', 'map'];
        $maxAge = in_array($extension, $immutableExt, true) ? 31536000 : 3600;
        $cacheControl = "public, max-age={$maxAge}";
        if ($maxAge >= 31536000) {
            $cacheControl .= ', immutable';
        }
        header('Cache-Control: ' . $cacheControl);
    }

    $ifNoneMatch = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
    $ifModifiedSince = $_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? '';
    if ($ifNoneMatch === $etag || (!empty($ifModifiedSince) && strtotime($ifModifiedSince) >= $mtime)) {
        http_response_code(304);
        return true;
    }

    $acceptEncoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
    $isTextAsset = str_starts_with($contentType, 'text/')
        || str_contains($contentType, 'javascript')
        || str_contains($contentType, 'json')
        || str_contains($contentType, 'svg+xml');
    $canGzip = extension_loaded('zlib')
        && str_contains($acceptEncoding, 'gzip')
        && $isTextAsset;

    if ($canGzip) {
        $contents = file_get_contents($filePath);
        if ($contents !== false) {
            $encoded = gzencode($contents, 6);
            if ($encoded !== false) {
                header('Content-Encoding: gzip');
                header('Vary: Accept-Encoding');
                header('Content-Length: ' . strlen($encoded));
                echo $encoded;
                return true;
            }
        }
    }

    readfile($filePath);
    return true;
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
