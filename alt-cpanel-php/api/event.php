<?php
require __DIR__ . '/lib.php';

define('MAX_IMAGE_BYTES', 3000000); // posters are resized to ~1600px in the browser first

function clean($v, $max) {
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', (string) $v);
    $v = trim($v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
}
function valid_date($s) {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $s, $m)) { return false; }
    return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
}
// Only real JPEG/PNG/WebP files, checked by file signature rather than what the browser claims
function sniff_image($bin) {
    if (substr($bin, 0, 3) === "\xFF\xD8\xFF") { return 'image/jpeg'; }
    if (substr($bin, 0, 8) === "\x89PNG\r\n\x1A\n") { return 'image/png'; }
    if (substr($bin, 0, 4) === 'RIFF' && substr($bin, 8, 4) === 'WEBP') { return 'image/webp'; }
    return null;
}

$method = $_SERVER['REQUEST_METHOD'];
$dir = data_dir();
$eventFile = $dir . '/event.json';
$imgFile = $dir . '/poster.bin';
$metaFile = $dir . '/poster.json';

// ---- public: read ----
if ($method === 'GET') {
    if (!empty($_GET['image'])) {
        $meta = read_json($metaFile);
        if (!is_file($imgFile) || !$meta) { http_response_code(404); echo 'Not found'; exit; }
        header('Content-Type: ' . $meta['type']);
        header('Content-Length: ' . filesize($imgFile));
        header('Cache-Control: public, max-age=31536000, immutable'); // URL carries ?v=<version>
        header('X-Content-Type-Options: nosniff');
        readfile($imgFile);
        exit;
    }
    json_out(array('event' => read_json($eventFile)), 200, 'public, max-age=0, must-revalidate');
}

// ---- staff only: write ----
if (!verify_request()) { json_out(array('error' => 'Please log in again.'), 401); }

if ($method === 'DELETE') {
    @unlink($eventFile); @unlink($imgFile); @unlink($metaFile);
    json_out(array('ok' => true, 'event' => null));
}
if ($method !== 'POST') { json_out(array('error' => 'Method not allowed'), 405); }

$b = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($b)) { json_out(array('error' => 'Bad request'), 400); }

$title = clean(isset($b['title']) ? $b['title'] : '', 80);
$date = clean(isset($b['date']) ? $b['date'] : '', 10);   // optional: the poster hides itself after this date
$time = clean(isset($b['time']) ? $b['time'] : '', 40);
$desc = clean(isset($b['description']) ? $b['description'] : '', 300);
if ($date !== '' && !valid_date($date)) { json_out(array('error' => 'That date is not valid.'), 400); }

$prev = read_json($eventFile);
$version = ($prev && !empty($prev['imageVersion']) && is_file($imgFile)) ? (int) $prev['imageVersion'] : null;

if (!empty($b['removeImage'])) {
    @unlink($imgFile); @unlink($metaFile); $version = null;
}
if (isset($b['image']) && is_string($b['image']) && $b['image'] !== '') {
    $img = $b['image'];
    $type = null;
    foreach (array('jpeg', 'png', 'webp') as $t) {
        $prefix = 'data:image/' . $t . ';base64,';
        if (strncmp($img, $prefix, strlen($prefix)) === 0) { $type = $t; $payload = substr($img, strlen($prefix)); break; }
    }
    if ($type === null) { json_out(array('error' => 'Image must be a JPEG, PNG or WebP.'), 400); }
    $bin = base64_decode($payload, true);
    if ($bin === false) { json_out(array('error' => 'That file is not a valid image.'), 400); }
    if (strlen($bin) > MAX_IMAGE_BYTES) { json_out(array('error' => 'Image is too large. Try a smaller photo.'), 413); }
    $real = sniff_image($bin);
    if ($real === null) { json_out(array('error' => 'That file is not a valid image.'), 400); }
    if (!write_file($imgFile, $bin) || !write_file($metaFile, json_encode(array('type' => $real)))) {
        json_out(array('error' => 'Could not save the image on the server.'), 500);
    }
    $version = (int) round(microtime(true) * 1000);
}
if (!$version) { json_out(array('error' => 'Please upload the event poster.'), 400); }

$event = array(
    'title' => $title, 'date' => $date, 'time' => $time, 'description' => $desc,
    'imageVersion' => $version, 'updatedAt' => gmdate('c'),
);
if (!write_file($eventFile, json_encode($event, JSON_UNESCAPED_UNICODE))) {
    json_out(array('error' => 'Could not save the event on the server.'), 500);
}
json_out(array('ok' => true, 'event' => $event));
