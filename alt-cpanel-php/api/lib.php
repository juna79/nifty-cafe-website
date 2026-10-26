<?php
// Shared helpers for the staff event API. Written for PHP 7.2+ (works on typical cPanel hosts).
// This file must never print anything except through json_out() or the poster image.

$__cfg = __DIR__ . '/config.php';
if (is_file($__cfg)) { require $__cfg; }

function cfg($k, $d = null) {
    if (defined($k)) { return constant($k); }
    $e = getenv($k);
    return $e !== false ? $e : $d;
}

function admin_configured() {
    return (bool) cfg('ADMIN_PASSWORD_HASH') || strlen((string) cfg('ADMIN_PASSWORD', '')) >= 8;
}

// Constant-time password check. Use ADMIN_PASSWORD_HASH (password_hash output) if set, else ADMIN_PASSWORD.
function check_password($candidate) {
    if (!is_string($candidate) || $candidate === '' || !admin_configured()) { return false; }
    $h = cfg('ADMIN_PASSWORD_HASH');
    if ($h) { return password_verify($candidate, $h); }
    return hash_equals(hash('sha256', (string) cfg('ADMIN_PASSWORD')), hash('sha256', $candidate));
}

function signing_key() {
    $secret = (string) cfg('SESSION_SECRET', '');
    $pw = (string) (cfg('ADMIN_PASSWORD_HASH') ?: cfg('ADMIN_PASSWORD'));
    return hash('sha256', 'nifty-admin|' . $secret . '|' . $pw, true);
}

// Token = "<expiry unix seconds>.<hmac>", valid 12 hours. Changing the password invalidates every token.
function make_token() {
    $exp = (string) (time() + 12 * 3600);
    return $exp . '.' . hash_hmac('sha256', $exp, signing_key());
}

function request_token() {
    // X-Nifty-Token is the reliable one: some shared hosts strip the Authorization header.
    if (!empty($_SERVER['HTTP_X_NIFTY_TOKEN'])) { return trim($_SERVER['HTTP_X_NIFTY_TOKEN']); }
    $h = '';
    foreach (array('HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION') as $k) {
        if (!empty($_SERVER[$k])) { $h = $_SERVER[$k]; break; }
    }
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $val) {
            if (strtolower($name) === 'authorization') { $h = $val; break; }
        }
    }
    return (stripos($h, 'Bearer ') === 0) ? trim(substr($h, 7)) : '';
}

function verify_request() {
    if (!admin_configured()) { return false; }
    $parts = explode('.', request_token());
    if (count($parts) !== 2 || !ctype_digit($parts[0]) || (int) $parts[0] < time()) { return false; }
    return hash_equals(hash_hmac('sha256', $parts[0], signing_key()), $parts[1]);
}

function json_out($data, $status = 200, $cache = 'no-store') {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: ' . $cache);
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Where the poster and event text are stored. Prefer a folder OUTSIDE the web root (one level above it),
// else api/data (protected by .htaccess). Override with define('DATA_DIR', '...') in config.php.
function data_dir() {
    static $dir = null;
    if ($dir !== null) { return $dir; }
    $c = cfg('DATA_DIR');
    if (!$c) {
        $home = dirname(rtrim((string) (isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : ''), '/'));
        $c = ($home !== '' && $home !== '.' && is_dir($home) && is_writable($home)) ? $home . '/nifty-data' : __DIR__ . '/data';
    }
    if (!is_dir($c)) { @mkdir($c, 0750, true); }
    $ht = $c . '/.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
    }
    if (!is_dir($c) || !is_writable($c)) {
        json_out(array('error' => 'The server cannot save files. Ask your host to make the data folder writable.'), 500);
    }
    return $dir = $c;
}

function read_json($file) {
    if (!is_file($file)) { return null; }
    $d = json_decode((string) @file_get_contents($file), true);
    return is_array($d) ? $d : null;
}

// Atomic write: write a temp file then rename it over the target.
function write_file($file, $contents) {
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, $contents, LOCK_EX) === false) { return false; }
    return @rename($tmp, $file);
}
