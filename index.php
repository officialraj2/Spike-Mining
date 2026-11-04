<?php
/**
 * SPIKE Nodes (spikenodes.com) — Hostinger Fallback Loader
 * If LiteSpeed or Apache executes index.php before mod_rewrite,
 * this automatically delivers the compiled production application.
 */

$distHtml = __DIR__ . '/dist/index.html';

if (file_exists($distHtml)) {
    header('Content-Type: text/html; charset=UTF-8');
    header('X-Powered-By: SPIKE-Nodes-AutoDeploy');
    readfile($distHtml);
    exit;
}

// Fallback to local index.html if dist is being updated
if (file_exists(__DIR__ . '/index.html')) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile(__DIR__ . '/index.html');
    exit;
}

echo "SPIKE Nodes production build initializing...";
