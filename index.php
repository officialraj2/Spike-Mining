<?php
/**
 * SPIKE Nodes (spikenodes.com) — Hostinger Production Auto-Loader
 * Seamlessly delivers compiled production React application.
 */

$prodHtml = __DIR__ . '/prod/index.html';
$distHtml = __DIR__ . '/dist/index.html';

if (file_exists($prodHtml)) {
    header('Content-Type: text/html; charset=UTF-8');
    header('X-Powered-By: SPIKE-Nodes-AutoDeploy');
    readfile($prodHtml);
    exit;
}

if (file_exists($distHtml)) {
    header('Content-Type: text/html; charset=UTF-8');
    header('X-Powered-By: SPIKE-Nodes-AutoDeploy');
    readfile($distHtml);
    exit;
}

// Fallback message if files are still syncing
header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html>
<head><title>SPIKE Nodes — Updating</title></head>
<body style="background:#051424;color:#00F0FF;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <h2>SPIKE Nodes Production System Syncing...</h2>
    <p style="color:#8ba3c7;">The application is synchronizing latest updates from GitHub. Please refresh in a moment.</p>
  </div>
</body>
</html>
