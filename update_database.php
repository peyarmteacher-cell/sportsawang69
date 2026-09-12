<?php
/**
 * ==============================================================================
 * ไฟล์: update_database.php
 * คำอธิบาย: ตัวอัปเดตและซ่อมแซมโครงสร้างฐานข้อมูล MySQL อัตโนมัติ (Safe Migration)
 * วิธีใช้: เปิด http://sawang.schoolos-app.com/update_database.php ผ่านเบราว์เซอร์
 * ==============================================================================
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/thai_formatter.php';

$results = [];
$status = 'PENDING';
$message = '';

try {
    $pdo = Database::getConnection();

    // Helper function สำหรับเพิ่ม Column อย่างปลอดภัยทุกเวอร์ชัน MySQL/MariaDB
    function addColumnIfNotExists(PDO $pdo, string $table, string $column, string $typeDef): string {
        try {
            $chk = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
            if ($chk && $chk->rowCount() > 0) {
                return "มีคอลัมน์ `$column` อยู่แล้ว";
            }
            $pdo->exec("ALTER TABLE `$table` ADD `$column` $typeDef");
            return "เพิ่มคอลัมน์ `$column` สำเร็จ";
        } catch (Exception $e) {
            return "ข้าม/มีข้อผิดพลาด: " . $e->getMessage();
        }
    }

    // 1. เพิ่มคอลัมน์ที่จำเป็นทั้งหมด
    $columnsToEnsure = [
        ['competitions', 'academic_year', "VARCHAR(50) DEFAULT '2569'"],
        ['competitions', 'header_bg_image', "TEXT DEFAULT NULL"],
        ['competitions', 'google_drive_folder_id', "VARCHAR(255) DEFAULT NULL"],
        ['competitions', 'google_slide_template_id', "VARCHAR(255) DEFAULT NULL"],
        ['competitions', 'google_slide_template_student_id', "VARCHAR(255) DEFAULT NULL COMMENT 'Template ID สไลด์สำหรับเกียรติบัตรนักเรียน'"],
        ['competitions', 'google_slide_template_coach_id', "VARCHAR(255) DEFAULT NULL COMMENT 'Template ID สไลด์สำหรับเกียรติบัตรครูผู้ฝึกสอน'"],
        ['competitions', 'google_apps_script_url', "TEXT DEFAULT NULL"],
        ['competitions', 'president_name', "VARCHAR(150) DEFAULT NULL"],
        ['competitions', 'director_name', "VARCHAR(150) DEFAULT NULL"],
        ['competitions', 'cert_prefix', "VARCHAR(50) DEFAULT 'สพป.บร.3/2569-'"],
        ['competitions', 'medal_criteria', "ENUM('GOLD_FIRST', 'TOTAL_FIRST') DEFAULT 'GOLD_FIRST'"],
        
        ['schools', 'smis_code', "VARCHAR(50) DEFAULT NULL"],
        ['schools', 'director_name', "VARCHAR(150) DEFAULT NULL"],
        ['schools', 'short_name', "VARCHAR(100) DEFAULT NULL"],
        ['schools', 'logo', "TEXT DEFAULT NULL"],
        
        ['users', 'phone', "VARCHAR(50) DEFAULT NULL"],
        ['users', 'must_change_password', "TINYINT(1) NOT NULL DEFAULT 1"],
        
        ['sports', 'category', "VARCHAR(50) DEFAULT 'BALL_SPORTS'"],
        ['sports', 'sport_icon', "VARCHAR(50) DEFAULT 'Trophy'"],
        
        ['events', 'grade', "VARCHAR(100) DEFAULT 'ประถมศึกษา'"],
        ['events', 'age_group', "VARCHAR(100) DEFAULT 'อายุไม่เกิน 12 ปี'"],
        ['events', 'award_type', "VARCHAR(255) DEFAULT 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร'"],
        ['events', 'competition_type', "VARCHAR(50) DEFAULT 'TEAM'"],
        ['events', 'max_players', "INT DEFAULT 12"],
        ['events', 'min_players', "INT DEFAULT 1"],
        
        ['certificates', 'drive_file_id', "VARCHAR(255) DEFAULT NULL"],
        ['certificates', 'drive_url', "TEXT DEFAULT NULL"],
        ['certificates', 'qr_token', "VARCHAR(100) DEFAULT NULL"],
        
        ['registrations', 'coach_ids', "TEXT DEFAULT NULL"],
        ['registrations', 'secondary_coach_id', "VARCHAR(50) DEFAULT NULL"],
    ];

    foreach ($columnsToEnsure as $item) {
        $res = addColumnIfNotExists($pdo, $item[0], $item[1], $item[2]);
        $results[] = ["query" => "ADD COLUMN {$item[0]}.{$item[1]}", "status" => "SUCCESS", "message" => $res];
    }

    // ซิงค์ค่าเริ่มต้นให้ google_slide_template_student_id หากยังว่าง
    try {
        $pdo->exec("UPDATE competitions SET google_slide_template_student_id = google_slide_template_id WHERE (google_slide_template_student_id IS NULL OR google_slide_template_student_id = '') AND google_slide_template_id IS NOT NULL AND google_slide_template_id != ''");
    } catch (Exception $e) {
        // Ignore if already done
    }

    // 2. สร้างตารางใหม่ทั้งหมดที่จำเป็น
    $tablesToCreate = [
        "CREATE TABLE IF NOT EXISTS `registration_coaches` (
          `id` VARCHAR(50) NOT NULL,
          `registration_id` VARCHAR(50) NOT NULL,
          `coach_id` VARCHAR(50) NOT NULL,
          PRIMARY KEY (`id`),
          KEY `idx_rc_reg` (`registration_id`),
          KEY `idx_rc_coach` (`coach_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `match_reports` (
          `id` VARCHAR(50) NOT NULL,
          `competition_id` VARCHAR(50) NOT NULL DEFAULT 'comp-2026',
          `sport_id` VARCHAR(50) NOT NULL,
          `sport_name` VARCHAR(100) NOT NULL,
          `event_name` VARCHAR(255) NOT NULL,
          `team_1_school_id` VARCHAR(50) NOT NULL,
          `team_1_school_name` VARCHAR(255) NOT NULL,
          `team_1_score` INT NOT NULL DEFAULT 0,
          `team_2_school_id` VARCHAR(50) NOT NULL,
          `team_2_school_name` VARCHAR(255) NOT NULL,
          `team_2_score` INT NOT NULL DEFAULT 0,
          `winner_school_id` VARCHAR(50) DEFAULT NULL,
          `match_date` DATE NOT NULL,
          `match_time` VARCHAR(20) DEFAULT NULL,
          `round_name` VARCHAR(100) DEFAULT 'รอบแรก',
          `summary_text` TEXT NOT NULL,
          `reporter_name` VARCHAR(150) NOT NULL,
          `status` ENUM('LIVE','COMPLETED') DEFAULT 'COMPLETED',
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        "CREATE TABLE IF NOT EXISTS `activity_logs` (
          `id` VARCHAR(50) NOT NULL,
          `competition_id` VARCHAR(50) DEFAULT NULL,
          `user_id` VARCHAR(50) DEFAULT NULL,
          `username` VARCHAR(100) NOT NULL,
          `action` VARCHAR(100) NOT NULL,
          `module` VARCHAR(50) DEFAULT 'SYSTEM',
          `details` TEXT DEFAULT NULL,
          `ip_address` VARCHAR(50) DEFAULT NULL,
          `user_agent` TEXT DEFAULT NULL,
          `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS `settings` (
          `id` VARCHAR(50) NOT NULL,
          `setting_key` VARCHAR(100) NOT NULL,
          `setting_value` LONGTEXT NOT NULL,
          `description` VARCHAR(255) DEFAULT NULL,
          `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uk_setting_key` (`setting_key`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];

    foreach ($tablesToCreate as $tblSql) {
        try {
            $pdo->exec($tblSql);
            $results[] = ["query" => "CREATE TABLE", "status" => "SUCCESS", "message" => "โครงสร้างตารางพร้อมใช้งาน"];
        } catch (Exception $qe) {
            $results[] = ["query" => "CREATE TABLE", "status" => "INFO", "message" => $qe->getMessage()];
        }
    }

    // 2. ตรวจสอบและซิงค์ข้อมูลเริ่มต้นของการแข่งขัน
    $compExists = $pdo->query("SELECT COUNT(*) FROM competitions")->fetchColumn();
    if ($compExists == 0) {
        $pdo->exec("INSERT INTO `competitions` (`id`, `year`, `academic_year`, `competition_name`, `start_date`, `end_date`, `venue`, `host_org`, `status`, `cert_prefix`) VALUES
        ('comp-2026', 2569, '2569', 'การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปี 2569', '2026-11-15', '2026-11-20', 'สนามกีฬาโรงเรียนบ้านหนองหว้า อ.กระสัง จ.บุรีรัมย์', 'กลุ่มโรงเรียนสว่างสูงกระสัง สพป.บุรีรัมย์ เขต 3 (สพป.บร.3)', 'ACTIVE', 'สพป.บร.3/2569-')");
    }

    // 3. ปรับระดับชั้นและชื่อรายการแข่งขันที่มีอยู่แล้วให้อยู่ในรูปแบบมาตรฐาน 3 ระดับชั้น
    try {
        $evRows = $pdo->query("SELECT e.id, e.event_name, e.grade, s.sport_name FROM events e LEFT JOIN sports s ON e.sport_id = s.id")->fetchAll();
        $updEvStmt = $pdo->prepare("UPDATE events SET event_name = ?, grade = ?, age_group = ? WHERE id = ?");
        foreach ($evRows as $ev) {
            $normG = normalizeEducationLevel($ev['grade']);
            $stdName = formatEventRegistrationDisplay($ev['event_name'], $normG, $ev['sport_name'] ?? '');
            $updEvStmt->execute([$stdName, $normG, $normG, $ev['id']]);
        }
        $results[] = ["query" => "STANDARDIZE EVENTS", "status" => "SUCCESS", "message" => "ปรับชื่อรายการแข่งขันเป็นมาตรฐาน 3 ระดับชั้นเรียบร้อย (" . count($evRows) . " รายการ)"];
    } catch (Exception $evEx) {
        $results[] = ["query" => "STANDARDIZE EVENTS", "status" => "INFO", "message" => $evEx->getMessage()];
    }

    $status = 'SUCCESS';
    $message = 'อัปเดตตารางฐานข้อมูล MySQL และคอลัมน์ล่าสุดทั้งหมดเรียบร้อยแล้ว!';
} catch (Exception $e) {
    $status = 'ERROR';
    $message = 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ' . $e->getMessage();
    $results[] = ["query" => "Database Connection", "status" => "ERROR", "message" => $e->getMessage()];
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>อัปเดตฐานข้อมูล MySQL - กลุ่มโรงเรียนสว่างสูงกระสัง</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Prompt', sans-serif; }
        h1, h2, h3, h4, .font-kanit { font-family: 'Kanit', sans-serif; }
    </style>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4 sm:p-6">
    <div class="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 sm:p-8 text-center">
            <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-inner text-2xl">
                🔄
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit">ระบบอัปเดตฐานข้อมูล MySQL (Safe Update)</h1>
            <p class="text-xs sm:text-sm text-blue-100 mt-1">กลุ่มโรงเรียนสว่างสูงกระสัง &bull; สพป.บุรีรัมย์ เขต 3 (สพป.บร.3)</p>
        </div>

        <div class="p-6 sm:p-8 space-y-6">
            <?php if ($status === 'SUCCESS'): ?>
                <div class="bg-emerald-50 border border-emerald-300 text-emerald-900 p-5 rounded-2xl space-y-2">
                    <div class="flex items-center gap-3 font-bold text-sm text-emerald-800">
                        <span class="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0">✓</span>
                        <span><?= htmlspecialchars($message) ?></span>
                    </div>
                    <p class="text-xs text-emerald-700 pl-10">
                        ฐานข้อมูลพร้อมรองรับระบบจัดการกีฬา, การเชื่อมต่อ Google Drive / GAS, และการออกเกียรติบัตรเรียบร้อยแล้ว
                    </p>
                </div>
            <?php else: ?>
                <div class="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl space-y-2">
                    <div class="flex items-center gap-3 font-bold text-sm text-rose-700">
                        <span class="w-7 h-7 bg-rose-600 text-white rounded-full flex items-center justify-center shrink-0">✕</span>
                        <span><?= htmlspecialchars($message) ?></span>
                    </div>
                    <p class="text-xs text-rose-600 pl-10">
                        กรุณาตรวจสอบการตั้งค่าในไฟล์ <code class="bg-white px-1.5 py-0.5 rounded font-mono font-bold">config/database.php</code> หรือรัน <a href="/install.php" class="underline font-bold">install.php</a> อีกครั้ง
                    </p>
                </div>
            <?php endif; ?>

            <!-- Query Logs -->
            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>รายการคำสั่ง SQL ที่ประมวลผล (<?= count($results) ?> รายการ):</span>
                    <span>Safe Migration</span>
                </div>
                <div class="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] max-h-60 overflow-y-auto space-y-1.5 border border-slate-800">
                    <?php foreach ($results as $r): ?>
                        <div class="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-1">
                            <span class="text-slate-300 break-all"><?= htmlspecialchars($r['query']) ?></span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 <?= $r['status'] === 'SUCCESS' ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-400' ?>">
                                <?= $r['status'] ?>
                            </span>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Quick Action Links -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a href="/admin/index.php" class="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-md transition flex items-center justify-center gap-2">
                    <span>🛡️</span> เข้าสู่ Admin Console
                </a>
                <a href="/admin/events.php" class="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl text-center shadow-md transition flex items-center justify-center gap-2">
                    <span>🏆</span> จัดการกีฬาและรายการแข่งขัน
                </a>
            </div>
        </div>

        <div class="bg-slate-50 p-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง &bull; รองรับ PHP 8.x + MySQL
        </div>
    </div>
</body>
</html>
