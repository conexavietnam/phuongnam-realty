<?php
declare(strict_types=1);

// SEO shell entry point. nginx sends every HTML route, /sitemap.xml, /robots.txt and /google<token>.html here
// (see server/README.md). Layout: this file lives in <app root>/server/seo/, shared code in <app root>/server/src/.
$serverDir = dirname(__DIR__);

ini_set('display_errors', '0');
ini_set('log_errors', '1');

require $serverDir . '/src/bootstrap.php';
require $serverDir . '/src/storage.php';
require $serverDir . '/src/seo.php';

pn_seo_main();
