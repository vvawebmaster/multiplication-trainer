<?php

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}

// Reset test database before each test run
$dbPath = dirname(__DIR__).'/var/data_test.db';
if (file_exists($dbPath)) {
    unlink($dbPath);
}

// Create fresh schema
passthru('php '.dirname(__DIR__).'/bin/console doctrine:schema:create --env=test --quiet 2>/dev/null');
