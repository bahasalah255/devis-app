<?php 
require_once 'config.php';
require_once __DIR__ . '/database.php';
try {
    $db = database::getInstance()->getConnection();
    echo 'connected';
} catch(PDOException $e){
    echo 'connection failed' . $e->getMessage();
}