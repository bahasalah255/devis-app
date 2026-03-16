<?php
class database {
    private static $instance = null;
    private $pdo;
    private function __construct(){
        $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'localhost';
        $dbname = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'devis_db';
        $user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'root';
        $pass = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?: '';
        $this->pdo = new PDO("mysql:host=$host;dbname=$dbname",$user,$pass
        ,[PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);

    }
     public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    // Get the PDO connection
    public function getConnection(): PDO {
        return $this->pdo;
    }
}
