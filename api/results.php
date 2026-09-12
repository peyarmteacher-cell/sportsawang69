<?php
/**
 * ==============================================================================
 * ไฟล์: api/results.php
 * คำอธิบาย: RESTful API Endpoint คืนค่าตารางเหรียญรางวัลและผลการแข่งขันแบบ JSON
 * ==============================================================================
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = Database::getConnection();

    $medalSql = "
        SELECT 
            s.id,
            s.school_name,
            s.short_name,
            s.smis_code,
            s.logo,
            COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) AS gold,
            COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) AS silver,
            COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) AS bronze,
            (COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) * 5 +
             COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) * 3 +
             COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) * 1) AS points
        FROM schools s
        LEFT JOIN results r ON s.id = r.school_id AND r.status = 'OFFICIAL'
        GROUP BY s.id
        ORDER BY gold DESC, silver DESC, bronze DESC, points DESC
    ";

    $standings = $pdo->query($medalSql)->fetchAll();

    echo json_encode([
        'status' => 'success',
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => $standings
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
