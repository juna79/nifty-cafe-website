<?php
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_out(array('error' => 'Method not allowed'), 405); }
if (!admin_configured()) {
    json_out(array('error' => 'Admin is not set up yet. Create api/config.php with a staff password (see README).'), 503);
}

// Simple brute-force protection: 8 wrong attempts per 15 minutes per visitor (by IP)
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$file = data_dir() . '/fails-' . substr(hash('sha256', $ip), 0, 24) . '.json';
$rec = read_json($file);
$now = time();
if (!$rec || $now - (int) $rec['t'] > 900) { $rec = array('n' => 0, 't' => $now); }
if ((int) $rec['n'] >= 8) { json_out(array('error' => 'Too many attempts. Try again in 15 minutes.'), 429); }

$body = json_decode((string) file_get_contents('php://input'), true);
$pw = is_array($body) && isset($body['password']) ? $body['password'] : null;

if (!check_password($pw)) {
    $rec['n'] = (int) $rec['n'] + 1;
    write_file($file, json_encode($rec));
    usleep(700000); // slow down guessing
    json_out(array('error' => 'Wrong password.'), 401);
}
@unlink($file);
json_out(array('token' => make_token()));
