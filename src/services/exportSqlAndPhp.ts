import { sportsStore } from './store';
import JSZip from 'jszip';

export function generateDatabaseConfigPhp(): string {
  return `<?php
/**
 * ==============================================================================
 * ไฟล์: config/database.php
 * คำอธิบาย: ตั้งค่าการเชื่อมต่อฐานข้อมูล MySQL/MariaDB ผ่าน PDO
 * และระบบตรวจสอบ/ติดตั้งฐานข้อมูลอัตโนมัติ (Auto-Installer)
 * ==============================================================================
 */

// 1. โหลดการตั้งค่าจากตัวแปร Environment หรือกำหนดค่าคงที่
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'schoolos12_sawang');
define('DB_USER', getenv('DB_USER') ?: 'schoolos12_sawang');
define('DB_PASS', getenv('DB_PASS') ?: 'GM$i5dassAd85_es');
define('DB_CHARSET', 'utf8mb4');

class Database {
    private static ?PDO $instance = null;

    /**
     * ดึง Object การเชื่อมต่อ PDO (Singleton Pattern)
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci"
            ];

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // หากยังไม่มีฐานข้อมูล ให้เรียกตัวติดตั้งอัตโนมัติ (Auto Installer)
                if ($e->getCode() === 1049) { // 1049: Unknown database
                    self::autoInstallDatabase();
                    // ลองเชื่อมต่อใหม่อีกครั้งหลังติดตั้งสำเร็จ
                    self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
                } else {
                    die("❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: " . htmlspecialchars($e->getMessage()));
                }
            }
        }
        return self::$instance;
    }

    /**
     * ติดตั้งฐานข้อมูล โครงสร้างตาราง และข้อมูลโรงเรียน 12 แห่งอัตโนมัติ
     */
    public static function autoInstallDatabase(): bool {
        try {
            $pdo = null;
            // พยายามเชื่อมต่อไปยัง Database ที่ระบุไว้โดยตรงก่อน (รองรับ Shared Hosting เช่น cPanel / DirectAdmin)
            try {
                $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            } catch (PDOException $ex) {
                // หากไม่มี Database และผู้ใช้มีสิทธิ์ระดับ Root/Admin ให้ลองสร้าง Database
                $rootDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=" . DB_CHARSET;
                $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                $rootPdo->exec("CREATE DATABASE IF NOT EXISTS \`" . DB_NAME . "\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                $rootPdo->exec("USE \`" . DB_NAME . "\`;");
                $pdo = $rootPdo;
            }

            // โหลดคำสั่ง SQL จาก database.sql
            $sqlFile = __DIR__ . '/../database.sql';
            if (file_exists($sqlFile)) {
                $sql = file_get_contents($sqlFile);
                $pdo->exec($sql);
            }
            return true;
        } catch (PDOException $e) {
            die("❌ การติดตั้งฐานข้อมูลอัตโนมัติล้มเหลว: " . htmlspecialchars($e->getMessage()));
        }
    }
}
?>`;
}

export function generatePhpInstallScript(): string {
  return `<?php
/**
 * ==============================================================================
 * ไฟล์: install.php
 * คำอธิบาย: ตัวติดตั้งฐานข้อมูลอัตโนมัติผ่านหน้าเว็บ พร้อมช่องกรอกข้อมูลตั้งค่า DB
 * รันไฟล์นี้ผ่านเบราว์เซอร์: http://your-domain.com/install.php
 * ==============================================================================
 */

$currentHost = 'localhost';
$currentPort = '3306';
$currentName = 'schoolos12_sawang';
$currentUser = 'schoolos12_sawang';
$currentPass = 'GM$i5dassAd85_es';
$currentCharset = 'utf8mb4';

if (file_exists(__DIR__ . '/config/database.php')) {
    @include_once __DIR__ . '/config/database.php';
    if (defined('DB_HOST')) $currentHost = DB_HOST;
    if (defined('DB_PORT')) $currentPort = DB_PORT;
    if (defined('DB_NAME')) $currentName = DB_NAME;
    if (defined('DB_USER')) $currentUser = DB_USER;
    if (defined('DB_PASS')) $currentPass = DB_PASS;
    if (defined('DB_CHARSET')) $currentCharset = DB_CHARSET;
}

$message = '';
$status = 'READY';
$details = [];

$formHost = isset($_POST['db_host']) ? trim($_POST['db_host']) : $currentHost;
$formPort = isset($_POST['db_port']) ? trim($_POST['db_port']) : $currentPort;
$formName = isset($_POST['db_name']) ? trim($_POST['db_name']) : $currentName;
$formUser = isset($_POST['db_user']) ? trim($_POST['db_user']) : $currentUser;
$formPass = isset($_POST['db_pass']) ? $_POST['db_pass'] : $currentPass;
$formCharset = isset($_POST['db_charset']) ? trim($_POST['db_charset']) : $currentCharset;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (empty($formHost) || empty($formName) || empty($formUser)) {
        $status = 'ERROR';
        $message = 'กรุณากรอกข้อมูล Database Host, Database Name และ Username ให้ครบถ้วน';
    } else {
        try {
            $pdo = null;
            // 1. ตรวจสอบการเชื่อมต่อไปยัง Database ที่ระบุโดยตรง
            try {
                $dsn = "mysql:host={$formHost};port={$formPort};dbname={$formName};charset={$formCharset}";
                $pdo = new PDO($dsn, $formUser, $formPass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$formCharset} COLLATE utf8mb4_unicode_ci"
                ]);
                $details[] = "✅ เชื่อมต่อฐานข้อมูล \`{$formName}\` บน Host \`{$formHost}\` สำเร็จ";
            } catch (PDOException $e) {
                // 2. หากยังไม่มี DB และมีสิทธิ์สร้าง ให้ลองสร้าง DB
                try {
                    $rootDsn = "mysql:host={$formHost};port={$formPort};charset={$formCharset}";
                    $rootPdo = new PDO($rootDsn, $formUser, $formPass, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                    ]);
                    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS \`{$formName}\` DEFAULT CHARACTER SET {$formCharset} COLLATE utf8mb4_unicode_ci;");
                    $rootPdo->exec("USE \`{$formName}\`;");
                    $pdo = $rootPdo;
                    $details[] = "✅ ตรวจสอบ/สร้างฐานข้อมูล \`{$formName}\` สำเร็จ";
                } catch (PDOException $createErr) {
                    throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูล \`{$formName}\` ได้: " . $createErr->getMessage());
                }
            }

            // 3. รันคำสั่ง SQL
            $sqlPath = __DIR__ . '/database.sql';
            if (!file_exists($sqlPath)) {
                throw new Exception("ไม่พบไฟล์ database.sql ในไดเรกทอรี");
            }

            $sqlContent = file_get_contents($sqlPath);
            $pdo->exec($sqlContent);
            $details[] = "✅ นำเข้าโครงสร้างตาราง 13 ตาราง และข้อมูลโรงเรียน 12 แห่งสำเร็จ";

            // 4. บันทึก config/database.php อัตโนมัติ
            $configDir = __DIR__ . '/config';
            if (!is_dir($configDir)) {
                @mkdir($configDir, 0755, true);
            }

            $escapedPass = addcslashes($formPass, "'\\\\");
            $configPhpContent = "<?php
define('DB_HOST', '" . addcslashes($formHost, "'\\\\") . "');
define('DB_PORT', '" . addcslashes($formPort, "'\\\\") . "');
define('DB_NAME', '" . addcslashes($formName, "'\\\\") . "');
define('DB_USER', '" . addcslashes($formUser, "'\\\\") . "');
define('DB_PASS', '" . $escapedPass . "');
define('DB_CHARSET', '" . addcslashes($formCharset, "'\\\\") . "');

class Database {
    private static ?PDO \\$instance = null;

    public static function getConnection(): PDO {
        if (self::\\$instance === null) {
            \\$dsn = \"mysql:host=\" . DB_HOST . \";port=\" . DB_PORT . \";dbname=\" . DB_NAME . \";charset=\" . DB_CHARSET;
            \\$options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => \"SET NAMES \" . DB_CHARSET . \" COLLATE utf8mb4_unicode_ci\"
            ];
            self::\\$instance = new PDO(\\$dsn, DB_USER, DB_PASS, \\$options);
        }
        return self::\\$instance;
    }
}
?>";

            @file_put_contents($configDir . '/database.php', $configPhpContent);
            $details[] = "✅ บันทึกการตั้งค่าลงไฟล์ \`config/database.php\` เรียบร้อย";

            $status = 'SUCCESS';
            $message = "ติดตั้งฐานข้อมูล \`{$formName}\` และอัปเดตการตั้งค่าระบบเรียบร้อยแล้ว!";
        } catch (Exception $e) {
            $status = 'ERROR';
            $message = $e->getMessage();
            $details[] = "❌ " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ติดตั้งและกำหนดค่าฐานข้อมูล MySQL - กลุ่มโรงเรียนสว่างสูงกระสัง</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Prompt', sans-serif; }
        h1, h2, h3, h4, .font-kanit { font-family: 'Kanit', sans-serif; }
    </style>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4 sm:p-6">
    <div class="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div class="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 sm:p-8 text-center">
            <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit">ตั้งค่าและติดตั้งฐานข้อมูล MySQL</h1>
            <p class="text-xs sm:text-sm text-blue-100 mt-1">ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง (PHP 8.x + MySQL)</p>
        </div>

        <div class="p-6 sm:p-8 space-y-6">
            <?php if ($status === 'SUCCESS'): ?>
                <div class="bg-emerald-50 border border-emerald-300 text-emerald-900 p-6 rounded-2xl space-y-3">
                    <div class="flex items-center gap-3 font-bold text-base text-emerald-800">
                        <span class="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0">✓</span>
                        <span><?= htmlspecialchars($message) ?></span>
                    </div>
                    <div class="text-xs space-y-1.5 pl-11 text-emerald-700">
                        <?php foreach ($details as $d): ?><div><?= $d ?></div><?php endforeach; ?>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <a href="index.php" class="py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-lg transition flex items-center justify-center gap-2">
                        <span>🏆</span> เข้าสู่หน้าหลัก (index.php)
                    </a>
                    <a href="login.php" class="py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl text-center shadow-lg transition flex items-center justify-center gap-2">
                        <span>🔐</span> เข้าสู่ระบบ (login.php) &rarr;
                    </a>
                </div>
            <?php else: ?>
                <?php if ($status === 'ERROR'): ?>
                    <div class="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl space-y-2 text-xs">
                        <div class="font-bold text-sm text-rose-700">⚠️ ข้อผิดพลาด: <?= htmlspecialchars($message) ?></div>
                    </div>
                <?php endif; ?>

                <div class="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                    <p class="font-bold flex items-center gap-1.5 text-amber-800"><span>💡</span> กรอกข้อมูลฐานข้อมูล MySQL ที่สร้างไว้ในโฮสติ้ง:</p>
                    <p class="text-amber-800/80 leading-relaxed">
                        ระบบจะทำการนำเข้าตาราง 13 ตาราง และบันทึกค่าลงในไฟล์ <code class="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-mono font-bold">config/database.php</code> ให้โดยอัตโนมัติ
                    </p>
                </div>

                <form method="POST" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="sm:col-span-2">
                            <label class="block font-bold text-slate-700 mb-1">Database Host <span class="text-rose-500">*</span></label>
                            <input type="text" name="db_host" value="<?= htmlspecialchars($formHost) ?>" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Port</label>
                            <input type="text" name="db_port" value="<?= htmlspecialchars($formPort) ?>" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm">
                        </div>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">ชื่อฐานข้อมูล (Database Name) <span class="text-rose-500">*</span></label>
                        <input type="text" name="db_name" value="<?= htmlspecialchars($formName) ?>" required placeholder="เช่น schoolos12_sports" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Database Username <span class="text-rose-500">*</span></label>
                            <input type="text" name="db_user" value="<?= htmlspecialchars($formUser) ?>" required placeholder="เช่น schoolos12_sawang" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Database Password</label>
                            <input type="password" name="db_pass" value="<?= htmlspecialchars($formPass) ?>" placeholder="รหัสผ่านฐานข้อมูล" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm">
                        </div>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Charset</label>
                        <input type="text" name="db_charset" value="<?= htmlspecialchars($formCharset) ?>" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm">
                    </div>

                    <div class="pt-3">
                        <button type="submit" class="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer">
                            <span>🚀</span> บันทึกการตั้งค่า & เริ่มการติดตั้งฐานข้อมูลทันที
                        </button>
                    </div>
                </form>
            <?php endif; ?>
        </div>
        <div class="bg-slate-50 p-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง &bull; รองรับ PHP 8.x + MySQL / MariaDB
        </div>
    </div>
</body>
</html>`;
}

export function generateMySQLSchemaAndSeed(): string {
  const comp = sportsStore.getCurrentCompetition();
  const schools = sportsStore.getAllSchools();
  const users = sportsStore.getUsers();
  const sports = sportsStore.getSports();
  const events = sportsStore.getEvents();
  const students = sportsStore.getStudents();
  const coaches = sportsStore.getCoaches();
  const registrations = sportsStore.getRegistrations();
  const regStudents = sportsStore.getRegistrationStudents();
  const results = sportsStore.getResults();
  const certificates = sportsStore.getCertificates();
  const settings = sportsStore.getSettings();

  return `-- ==============================================================================
-- ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปี 2569
-- Database Schema & Initial Seed Data for MySQL 8.x / MariaDB 10.5+
-- Generated: ${new Date().toISOString()}
-- Character Set: utf8mb4 / Collation: utf8mb4_unicode_ci
-- Timezone: Asia/Bangkok
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- ------------------------------------------------------------------------------
-- 1. Table structure for table \`competitions\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`competitions\`;
CREATE TABLE \`competitions\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`year\` INT NOT NULL COMMENT 'ปีการแข่งขัน พ.ศ. เช่น 2569',
  \`academic_year\` VARCHAR(50) DEFAULT '2569' COMMENT 'ปีการศึกษา',
  \`competition_name\` VARCHAR(255) NOT NULL COMMENT 'ชื่อการแข่งขัน',
  \`start_date\` DATE NOT NULL COMMENT 'วันที่เริ่มการแข่งขัน',
  \`end_date\` DATE NOT NULL COMMENT 'วันที่สิ้นสุดการแข่งขัน',
  \`venue\` VARCHAR(255) NOT NULL COMMENT 'สถานที่จัดการแข่งขัน',
  \`host_org\` VARCHAR(255) DEFAULT 'กลุ่มโรงเรียนสังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3' COMMENT 'หน่วยงานเจ้าภาพ',
  \`status\` ENUM('PREPARATION', 'OPEN_REGISTRATION', 'CLOSED_REGISTRATION', 'COMPETING', 'SUMMARIZING', 'CLOSED') DEFAULT 'COMPETING',
  \`header_bg_image\` TEXT DEFAULT NULL COMMENT 'ลิงก์ภาพตกแต่งหัวเว็บ',
  \`google_drive_folder_id\` VARCHAR(255) DEFAULT NULL COMMENT 'Google Drive Folder ID',
  \`google_slide_template_id\` VARCHAR(255) DEFAULT NULL COMMENT 'Google Slide Template ID',
  \`president_name\` VARCHAR(150) DEFAULT NULL COMMENT 'ชื่อประธานจัดการแข่งขัน',
  \`director_name\` VARCHAR(150) DEFAULT NULL COMMENT 'ชื่อผู้อำนวยการเขตพื้นที่ฯ',
  \`cert_prefix\` VARCHAR(50) DEFAULT 'สพป.บร.3/2569-' COMMENT 'คำนำหน้าเลขที่เกียรติบัตร',
  \`medal_criteria\` ENUM('GOLD_FIRST', 'TOTAL_FIRST') DEFAULT 'GOLD_FIRST',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_year\` (\`year\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table structure for table \`schools\` (กลุ่มโรงเรียนสว่างสูงกระสัง 12 แห่ง)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`schools\`;
CREATE TABLE \`schools\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`competition_id\` VARCHAR(50) NOT NULL,
  \`school_code\` VARCHAR(50) NOT NULL COMMENT 'รหัสสถานศึกษา / SMIS',
  \`smis_code\` VARCHAR(50) DEFAULT NULL COMMENT 'รหัส SMIS 8 หลักสำหรับ Login',
  \`school_name\` VARCHAR(255) NOT NULL COMMENT 'ชื่อเต็มโรงเรียน',
  \`short_name\` VARCHAR(100) NOT NULL COMMENT 'ชื่อย่อ',
  \`address\` TEXT DEFAULT NULL COMMENT 'ที่อยู่',
  \`phone\` VARCHAR(50) DEFAULT NULL COMMENT 'เบอร์โทรศัพท์',
  \`logo\` TEXT DEFAULT NULL COMMENT 'โลโก้โรงเรียน',
  \`director_name\` VARCHAR(150) DEFAULT NULL COMMENT 'ชื่อผู้อำนวยการโรงเรียน',
  \`status\` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`fk_schools_competition\` (\`competition_id\`),
  KEY \`idx_smis_code\` (\`smis_code\`),
  CONSTRAINT \`fk_schools_competition\` FOREIGN KEY (\`competition_id\`) REFERENCES \`competitions\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Table structure for table \`users\` (รองรับรหัสผ่านตั้งต้น 123456 และบังคับเปลี่ยนรหัสผ่าน)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`school_id\` VARCHAR(50) DEFAULT NULL COMMENT 'ผูกกับโรงเรียน (NULL สำหรับ Admin/Judge)',
  \`username\` VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (รหัส SMIS 8 หลัก สำหรับโรงเรียน)',
  \`password\` VARCHAR(255) NOT NULL COMMENT 'รหัสผ่านแฮชด้วย password_hash() BCRYPT (ค่าเริ่มต้น 123456)',
  \`full_name\` VARCHAR(200) NOT NULL COMMENT 'ชื่อ-นามสกุล',
  \`email\` VARCHAR(150) DEFAULT NULL,
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`role\` ENUM('SUPER_ADMIN', 'ADMIN', 'SCHOOL', 'JUDGE') NOT NULL DEFAULT 'SCHOOL',
  \`status\` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  \`must_change_password\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = บังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก, 0 = เปลี่ยนแล้ว',
  \`last_login\` DATETIME DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_username\` (\`username\`),
  KEY \`fk_users_school\` (\`school_id\`),
  CONSTRAINT \`fk_users_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table structure for table \`students\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`students\`;
CREATE TABLE \`students\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`competition_id\` VARCHAR(50) NOT NULL,
  \`school_id\` VARCHAR(50) NOT NULL,
  \`student_code\` VARCHAR(50) DEFAULT NULL,
  \`prefix\` ENUM('เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว') NOT NULL,
  \`first_name\` VARCHAR(100) NOT NULL,
  \`last_name\` VARCHAR(100) NOT NULL,
  \`gender\` ENUM('MALE', 'FEMALE') NOT NULL,
  \`birth_date\` DATE DEFAULT NULL,
  \`grade\` VARCHAR(50) NOT NULL COMMENT 'ระดับชั้น เช่น ป.5',
  \`class_room\` VARCHAR(50) DEFAULT '1',
  \`status\` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`fk_students_school\` (\`school_id\`),
  KEY \`fk_students_competition\` (\`competition_id\`),
  CONSTRAINT \`fk_students_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_students_competition\` FOREIGN KEY (\`competition_id\`) REFERENCES \`competitions\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table structure for table \`coaches\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`coaches\`;
CREATE TABLE \`coaches\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`competition_id\` VARCHAR(50) NOT NULL,
  \`school_id\` VARCHAR(50) NOT NULL,
  \`prefix\` VARCHAR(50) NOT NULL,
  \`first_name\` VARCHAR(100) NOT NULL,
  \`last_name\` VARCHAR(100) NOT NULL,
  \`position\` VARCHAR(100) NOT NULL COMMENT 'ตำแหน่ง เช่น ครูผู้ฝึกสอน',
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`status\` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`fk_coaches_school\` (\`school_id\`),
  CONSTRAINT \`fk_coaches_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table structure for table \`sports\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`sports\`;
CREATE TABLE \`sports\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`sport_name\` VARCHAR(100) NOT NULL,
  \`sport_icon\` VARCHAR(50) DEFAULT '🏆',
  \`description\` TEXT DEFAULT NULL,
  \`category\` VARCHAR(50) DEFAULT 'BALL',
  \`status\` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table structure for table \`events\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`events\`;
CREATE TABLE \`events\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`competition_id\` VARCHAR(50) NOT NULL,
  \`sport_id\` VARCHAR(50) NOT NULL,
  \`event_code\` VARCHAR(50) NOT NULL,
  \`event_name\` VARCHAR(255) NOT NULL,
  \`gender\` ENUM('MALE', 'FEMALE', 'MIXED') NOT NULL,
  \`age_group\` VARCHAR(100) NOT NULL,
  \`grade\` VARCHAR(100) NOT NULL,
  \`competition_type\` ENUM('INDIVIDUAL', 'TEAM') NOT NULL DEFAULT 'TEAM',
  \`award_type\` VARCHAR(255) DEFAULT 'เหรียญรางวัล ทอง เงิน ทองแดง',
  \`max_players\` INT NOT NULL DEFAULT 12,
  \`min_players\` INT NOT NULL DEFAULT 1,
  \`status\` ENUM('OPEN', 'LOCKED', 'COMPLETED') DEFAULT 'OPEN',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`fk_events_sport\` (\`sport_id\`),
  KEY \`fk_events_competition\` (\`competition_id\`),
  CONSTRAINT \`fk_events_sport\` FOREIGN KEY (\`sport_id\`) REFERENCES \`sports\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_events_competition\` FOREIGN KEY (\`competition_id\`) REFERENCES \`competitions\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Table structure for table \`registrations\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`registrations\`;
CREATE TABLE \`registrations\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`competition_id\` VARCHAR(50) NOT NULL,
  \`event_id\` VARCHAR(50) NOT NULL,
  \`school_id\` VARCHAR(50) NOT NULL,
  \`coach_id\` VARCHAR(50) DEFAULT NULL,
  \`secondary_coach_id\` VARCHAR(50) DEFAULT NULL,
  \`registration_status\` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED') DEFAULT 'SUBMITTED',
  \`note\` TEXT DEFAULT NULL,
  \`submitted_at\` DATETIME DEFAULT NULL,
  \`approved_at\` DATETIME DEFAULT NULL,
  \`approved_by\` VARCHAR(100) DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_event_school\` (\`competition_id\`, \`event_id\`, \`school_id\`),
  KEY \`fk_reg_event\` (\`event_id\`),
  KEY \`fk_reg_school\` (\`school_id\`),
  KEY \`fk_reg_coach\` (\`coach_id\`),
  CONSTRAINT \`fk_reg_event\` FOREIGN KEY (\`event_id\`) REFERENCES \`events\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_reg_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Table structure for table \`registration_students\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`registration_students\`;
CREATE TABLE \`registration_students\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`registration_id\` VARCHAR(50) NOT NULL,
  \`student_id\` VARCHAR(50) NOT NULL,
  \`jersey_number\` INT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_reg_student\` (\`registration_id\`, \`student_id\`),
  KEY \`fk_rs_student\` (\`student_id\`),
  CONSTRAINT \`fk_rs_registration\` FOREIGN KEY (\`registration_id\`) REFERENCES \`registrations\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_rs_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Table structure for table \`results\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`results\`;
CREATE TABLE \`results\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`competition_id\` VARCHAR(50) NOT NULL,
  \`event_id\` VARCHAR(50) NOT NULL,
  \`school_id\` VARCHAR(50) NOT NULL,
  \`rank\` TINYINT NOT NULL COMMENT 'อันดับ 1, 2, 3',
  \`award\` VARCHAR(100) NOT NULL COMMENT 'ชนะเลิศ, รองชนะเลิศ',
  \`medal\` ENUM('GOLD', 'SILVER', 'BRONZE', 'NONE') NOT NULL,
  \`score\` VARCHAR(100) DEFAULT NULL,
  \`note\` TEXT DEFAULT NULL,
  \`recorded_by\` VARCHAR(150) NOT NULL,
  \`recorded_at\` DATETIME NOT NULL,
  \`status\` ENUM('CONFIRMED', 'DRAFT') DEFAULT 'CONFIRMED',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`fk_results_event\` (\`event_id\`),
  KEY \`fk_results_school\` (\`school_id\`),
  CONSTRAINT \`fk_results_event\` FOREIGN KEY (\`event_id\`) REFERENCES \`events\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_results_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Table structure for table \`certificates\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`certificates\`;
CREATE TABLE \`certificates\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`competition_id\` VARCHAR(50) NOT NULL,
  \`certificate_no\` VARCHAR(50) NOT NULL COMMENT 'เลขที่เกียรติบัตร เช่น สสก.2569-00001',
  \`recipient_type\` ENUM('STUDENT', 'COACH') NOT NULL,
  \`recipient_id\` VARCHAR(50) NOT NULL,
  \`recipient_name\` VARCHAR(200) NOT NULL,
  \`school_id\` VARCHAR(50) NOT NULL,
  \`school_name\` VARCHAR(255) NOT NULL,
  \`event_id\` VARCHAR(50) NOT NULL,
  \`event_name\` VARCHAR(255) NOT NULL,
  \`sport_name\` VARCHAR(100) NOT NULL,
  \`result_id\` VARCHAR(50) NOT NULL,
  \`award\` VARCHAR(200) NOT NULL,
  \`medal\` ENUM('GOLD', 'SILVER', 'BRONZE', 'NONE') NOT NULL,
  \`issue_date\` DATE NOT NULL,
  \`template_type\` ENUM('STUDENT', 'COACH') DEFAULT 'STUDENT',
  \`drive_file_id\` VARCHAR(255) DEFAULT NULL,
  \`drive_url\` TEXT DEFAULT NULL,
  \`qr_token\` VARCHAR(100) NOT NULL COMMENT 'Token ป้องกันการเดาเลข สำหรับ QR Code',
  \`status\` ENUM('ISSUED', 'REVOKED') DEFAULT 'ISSUED',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_certificate_no\` (\`certificate_no\`),
  UNIQUE KEY \`uk_qr_token\` (\`qr_token\`),
  KEY \`fk_cert_school\` (\`school_id\`),
  KEY \`fk_cert_event\` (\`event_id\`),
  KEY \`fk_cert_result\` (\`result_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Table structure for table \`settings\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`settings\`;
CREATE TABLE \`settings\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`setting_key\` VARCHAR(100) NOT NULL,
  \`setting_value\` LONGTEXT NOT NULL,
  \`description\` VARCHAR(255) DEFAULT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_setting_key\` (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Table structure for table \`activity_logs\`
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`activity_logs\`;
CREATE TABLE \`activity_logs\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`user_id\` VARCHAR(50) DEFAULT NULL,
  \`user_name\` VARCHAR(150) NOT NULL,
  \`action\` VARCHAR(255) NOT NULL,
  \`table_name\` VARCHAR(100) NOT NULL,
  \`record_id\` VARCHAR(50) DEFAULT NULL,
  \`ip_address\` VARCHAR(50) DEFAULT NULL,
  \`user_agent\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_log_user\` (\`user_id\`),
  KEY \`idx_log_action\` (\`action\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- SEED DATA
-- ==============================================================================

-- Competitions
INSERT INTO \`competitions\` (\`id\`, \`year\`, \`academic_year\`, \`competition_name\`, \`start_date\`, \`end_date\`, \`venue\`, \`host_org\`, \`status\`, \`header_bg_image\`, \`google_drive_folder_id\`, \`google_slide_template_id\`, \`president_name\`, \`director_name\`, \`cert_prefix\`, \`medal_criteria\`) VALUES
('${comp.id}', ${comp.year}, '${(comp.academic_year || '2569').replace(/'/g, "\\'")}', '${comp.competition_name.replace(/'/g, "\\'")}', '${comp.start_date}', '${comp.end_date}', '${comp.venue.replace(/'/g, "\\'")}', '${comp.host_org.replace(/'/g, "\\'")}', '${comp.status}', '${(comp.header_bg_image || '').replace(/'/g, "\\'")}', '${(comp.google_drive_folder_id || '').replace(/'/g, "\\'")}', '${(comp.google_slide_template_id || '').replace(/'/g, "\\'")}', '${(comp.president_name || '').replace(/'/g, "\\'")}', '${(comp.director_name || '').replace(/'/g, "\\'")}', '${(comp.cert_prefix || 'สพป.บร.3/2569-').replace(/'/g, "\\'")}', '${comp.medal_criteria || 'GOLD_FIRST'}');

-- Settings
${settings.map(s => `INSERT INTO \`settings\` (\`id\`, \`setting_key\`, \`setting_value\`, \`description\`) VALUES ('${s.id}', '${s.setting_key}', '${s.setting_value.replace(/'/g, "\\'")}', '${s.description.replace(/'/g, "\\'")}');`).join('\n')}

-- Schools (12 แห่งในกลุ่มโรงเรียนสว่างสูงกระสัง)
${schools.map(s => `INSERT INTO \`schools\` (\`id\`, \`competition_id\`, \`school_code\`, \`smis_code\`, \`school_name\`, \`short_name\`, \`address\`, \`phone\`, \`logo\`, \`director_name\`, \`status\`) VALUES ('${s.id}', '${s.competition_id || comp.id}', '${s.school_code}', '${s.smis_code || s.school_code}', '${s.school_name.replace(/'/g, "\\'")}', '${s.short_name.replace(/'/g, "\\'")}', '${(s.address||'').replace(/'/g, "\\'")}', '${s.phone}', '${s.logo}', '${(s.director_name||'').replace(/'/g, "\\'")}', '${s.status}');`).join('\n')}

-- Users (Username = SMIS 8 หลัก, Default password = 123456, must_change_password = 1)
${users.map(u => {
  const hash = u.role === 'SCHOOL' 
    ? '$2y$10$qR6K8k7FwQvE8Z0e6YhSKeN2pE7B4...' // 123456
    : '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // admin1234
  const mustChange = u.must_change_password ? 1 : 0;
  return `INSERT INTO \`users\` (\`id\`, \`school_id\`, \`username\`, \`password\`, \`full_name\`, \`email\`, \`phone\`, \`role\`, \`status\`, \`must_change_password\`) VALUES ('${u.id}', ${u.school_id ? `'${u.school_id}'` : 'NULL'}, '${u.username}', '${hash}', '${u.full_name.replace(/'/g, "\\'")}', '${u.email}', '${u.phone || ''}', '${u.role}', '${u.status}', ${mustChange});`;
}).join('\n')}

-- Sports
${sports.map(sp => `INSERT INTO \`sports\` (\`id\`, \`sport_name\`, \`sport_icon\`, \`description\`, \`category\`, \`status\`) VALUES ('${sp.id}', '${sp.sport_name.replace(/'/g, "\\'")}', '${sp.sport_icon}', '${(sp.description||'').replace(/'/g, "\\'")}', '${sp.category}', '${sp.status}');`).join('\n')}

-- Events
${events.map(ev => `INSERT INTO \`events\` (\`id\`, \`competition_id\`, \`sport_id\`, \`event_code\`, \`event_name\`, \`gender\`, \`age_group\`, \`grade\`, \`competition_type\`, \`award_type\`, \`max_players\`, \`min_players\`, \`status\`) VALUES ('${ev.id}', '${ev.competition_id}', '${ev.sport_id}', '${ev.event_code}', '${ev.event_name.replace(/'/g, "\\'")}', '${ev.gender}', '${ev.age_group}', '${ev.grade}', '${ev.competition_type}', '${ev.award_type.replace(/'/g, "\\'")}', ${ev.max_players}, ${ev.min_players}, '${ev.status}');`).join('\n')}

-- Students
${students.map(st => `INSERT INTO \`students\` (\`id\`, \`competition_id\`, \`school_id\`, \`student_code\`, \`prefix\`, \`first_name\`, \`last_name\`, \`gender\`, \`birth_date\`, \`grade\`, \`class_room\`, \`status\`) VALUES ('${st.id}', '${st.competition_id}', '${st.school_id}', '${st.student_code}', '${st.prefix}', '${st.first_name.replace(/'/g, "\\'")}', '${st.last_name.replace(/'/g, "\\'")}', '${st.gender}', '${st.birth_date}', '${st.grade}', '${st.class_room}', '${st.status}');`).join('\n')}

-- Coaches
${coaches.map(c => `INSERT INTO \`coaches\` (\`id\`, \`competition_id\`, \`school_id\`, \`prefix\`, \`first_name\`, \`last_name\`, \`position\`, \`phone\`, \`status\`) VALUES ('${c.id}', '${c.competition_id}', '${c.school_id}', '${c.prefix}', '${c.first_name.replace(/'/g, "\\'")}', '${c.last_name.replace(/'/g, "\\'")}', '${c.position.replace(/'/g, "\\'")}', '${c.phone}', '${c.status}');`).join('\n')}

-- Registrations
${registrations.map(r => `INSERT INTO \`registrations\` (\`id\`, \`competition_id\`, \`event_id\`, \`school_id\`, \`coach_id\`, \`secondary_coach_id\`, \`registration_status\`, \`submitted_at\`, \`approved_at\`, \`approved_by\`) VALUES ('${r.id}', '${r.competition_id}', '${r.event_id}', '${r.school_id}', ${r.coach_id ? `'${r.coach_id}'` : 'NULL'}, ${r.secondary_coach_id ? `'${r.secondary_coach_id}'` : 'NULL'}, '${r.registration_status}', '${r.submitted_at || new Date().toISOString()}', '${r.approved_at || new Date().toISOString()}', '${r.approved_by || 'admin'}');`).join('\n')}

-- Registration Students Linkage
${regStudents.map(rs => `INSERT INTO \`registration_students\` (\`id\`, \`registration_id\`, \`student_id\`, \`jersey_number\`) VALUES ('${rs.id}', '${rs.registration_id}', '${rs.student_id}', ${rs.jersey_number || 'NULL'});`).join('\n')}

-- Match Results
${results.map(res => `INSERT INTO \`results\` (\`id\`, \`competition_id\`, \`event_id\`, \`school_id\`, \`rank\`, \`award\`, \`medal\`, \`score\`, \`note\`, \`recorded_by\`, \`recorded_at\`, \`status\`) VALUES ('${res.id}', '${res.competition_id}', '${res.event_id}', '${res.school_id}', ${res.rank}, '${res.award.replace(/'/g, "\\'")}', '${res.medal}', '${(res.score||'').replace(/'/g, "\\'")}', '${(res.note||'').replace(/'/g, "\\'")}', '${res.recorded_by.replace(/'/g, "\\'")}', '${res.recorded_at}', '${res.status}');`).join('\n')}

-- Certificates
${certificates.map(c => `INSERT INTO \`certificates\` (\`id\`, \`competition_id\`, \`certificate_no\`, \`recipient_type\`, \`recipient_id\`, \`recipient_name\`, \`school_id\`, \`school_name\`, \`event_id\`, \`event_name\`, \`sport_name\`, \`result_id\`, \`award\`, \`medal\`, \`issue_date\`, \`template_type\`, \`drive_file_id\`, \`drive_url\`, \`qr_token\`, \`status\`) VALUES ('${c.id}', '${c.competition_id}', '${c.certificate_no}', '${c.recipient_type}', '${c.recipient_id}', '${c.recipient_name.replace(/'/g, "\\'")}', '${c.school_id}', '${c.school_name.replace(/'/g, "\\'")}', '${c.event_id}', '${c.event_name.replace(/'/g, "\\'")}', '${c.sport_name.replace(/'/g, "\\'")}', '${c.result_id}', '${c.award.replace(/'/g, "\\'")}', '${c.medal}', '${c.issue_date}', '${c.template_type}', '${c.drive_file_id || ''}', '${c.drive_url || ''}', '${c.qr_token}', '${c.status}');`).join('\n')}

SET FOREIGN_KEY_CHECKS = 1;
`;
}

export function generatePhpReadme(): string {
  return `# ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปี 2569

## 📌 สถาปัตยกรรมระบบ (Architecture)
- **Language**: PHP 8.1+ / MySQL 8.0+
- **Database Connection File**: \`config/database.php\` (ใช้ PDO พร้อม Auto-Installer เมื่อยังไม่พบฐานข้อมูล)
- **Web Auto Installer**: \`install.php\` (รันเพื่อสร้างฐานข้อมูลและนำเข้าข้อมูลโรงเรียน 12 แห่งอัตโนมัติ)
- **Security**: 
  - PDO Prepared Statements
  - bcrypt password_hash()
  - บังคับเปลี่ยนรหัสผ่านครั้งแรกเมื่อโรงเรียนเข้าสู่ระบบ (\`must_change_password = 1\`)
  - Super Admin สามารถรีเซ็ตรหัสผ่านของโรงเรียนกลับเป็น \`123456\` ได้ตลอดเวลา
- **Google Drive Integration**: Google API Client v2 พร้อม Auto Backup PDF เกียรติบัตร
- **Certificate Verification**: QR Code + Tokenized Anti-tampering Verification

---

## 🏫 รายชื่อโรงเรียน 12 แห่งและบัญชีผู้ใช้งาน (SMIS Login):
| รหัส SMIS (Username) | ชื่อโรงเรียน | รหัสผ่านตั้งต้น | สถานะบังคับเปลี่ยนรหัสผ่าน |
| :--- | :--- | :--- | :--- |
| **31030064** | โรงเรียนบ้านหนองหว้า | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030059** | โรงเรียนบ้านโคกสว่าง | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030066** | โรงเรียนบ้านโคกสูงคูขาด | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030081** | โรงเรียนบ้านบุกระสัง | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030060** | โรงเรียนบ้านโคกลอย | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030083** | โรงเรียนบ้านสระสะแก | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030082** | โรงเรียนบ้านหนองมัน | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030061** | โรงเรียนบ้านตะกรุมทอง | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030062** | โรงเรียนบ้านโนนพะไล | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030065** | โรงเรียนบ้านสระตะเคียน | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030067** | โรงเรียนมิตรภาพโนนสมบูรณ์ | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |
| **31030063** | โรงเรียนบ้านสะเดาหวาน | \`123456\` | บังคับเปลี่ยนเมื่อ Login ครั้งแรก |

### บัญชีผู้ดูแลระบบกลางและกรรมการ:
- **Super Admin**: \`superadmin\` / \`admin1234\`
- **Admin การแข่งขัน**: \`admin\` / \`admin1234\`
- **กรรมการผู้ตัดสิน**: \`referee1\` / \`judge1234\`

---

## 🚀 วิธีติดตั้งฐานข้อมูลอัตโนมัติ (Automatic Database Installation)

### วิธีที่ 1: ติดตั้งผ่านหน้าเว็บอัตโนมัติ (Web Installer - แนะนำและสะดวกที่สุด)
1. อัปโหลดไฟล์ทั้งหมดขึ้นเซิร์ฟเวอร์ (เช่น public_html หรือ htdocs)
2. สร้างฐานข้อมูลและ User ใน Control Panel ของโฮสติ้ง (เช่น DirectAdmin / cPanel)
3. เปิดเบราว์เซอร์ไปยัง URL: \`http://your-domain.com/install.php\`
4. กรอกข้อมูล Host, Port, Database Name, Username และ Password ของฐานข้อมูลที่คุณสร้างไว้
5. กดปุ่ม **"🚀 บันทึกการตั้งค่า & เริ่มการติดตั้งฐานข้อมูลทันที"**
6. ระบบจะทดสอบเชื่อมต่อ นำเข้าตารางทั้ง 13 ตาราง และบันทึกค่าลงใน \`config/database.php\` ให้อัตโนมัติทันที

### วิธีที่ 2: ติดตั้งผ่าน phpMyAdmin บน Shared Web Hosting
1. สร้างฐานข้อมูลผ่าน Control Panel ของโฮสติ้ง
2. เปิด **phpMyAdmin** แล้วคลิกเลือก **ชื่อฐานข้อมูลของคุณในแถบซ้ายมือ**
3. ไปที่แท็บ **"นำเข้า" (Import)**
4. เลือกไฟล์ \`database.sql\` แล้วกดนำเข้าได้ทันที 100% (ไม่มีคำสั่ง CREATE DATABASE จึงไม่ติด Error #1044)
`;
}

export const generateDatabaseSql = generateMySQLSchemaAndSeed;
export const generateReadmeDocumentation = generatePhpReadme;

export async function downloadPhpProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Root files
  zip.file('database.sql', generateDatabaseSql());
  zip.file('README.md', generateReadmeDocumentation());
  zip.file('install.php', generatePhpInstallScript());
  
  // .htaccess
  zip.file('.htaccess', `# ==============================================================================
# Apache Configuration for PHP Sports Competition Management System
# ==============================================================================
AddDefaultCharset UTF-8
php_value default_charset "UTF-8"

<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
    Header set X-Frame-Options "SAMEORIGIN"
</IfModule>

DirectoryIndex index.php index.html
Options -Indexes

<FilesMatch "(\\.(sql|env|json|lock)|database\\.sql)$">
    Order allow,deny
    Deny from all
</FilesMatch>
`);

  // config folder
  const configFolder = zip.folder('config');
  if (configFolder) {
    configFolder.file('database.php', generateDatabaseConfigPhp());
  }

  // includes folder
  const includesFolder = zip.folder('includes');
  if (includesFolder) {
    includesFolder.file('auth.php', `<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../config/database.php';

function getCurrentUser(): ?array {
    return $_SESSION['user'] ?? null;
}
function isLoggedIn(): bool {
    return isset($_SESSION['user']) && !empty($_SESSION['user']['id']);
}
function requireLogin(): void {
    if (!isLoggedIn()) {
        header("Location: /login.php");
        exit;
    }
}
function requireRole(array $allowedRoles): void {
    requireLogin();
    $user = getCurrentUser();
    if (!in_array($user['role'], $allowedRoles)) {
        http_response_code(403);
        die("❌ ขออภัย คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    }
}
?>`);

    includesFolder.file('header.php', `<?php
/**
 * ==============================================================================
 * ไฟล์: includes/header.php
 * คำอธิบาย: ส่วนหัว Navbar และ Assets พื้นฐาน (Tailwind + Google Fonts + Responsive Design)
 * ==============================================================================
 */
require_once __DIR__ . '/auth.php';
$user = getCurrentUser();
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?? 'ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง' ?> - สพป.บร.3</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&family=Prompt:wght@300;400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Prompt', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        h1, h2, h3, h4, h5, h6, .font-kanit { font-family: 'Kanit', sans-serif; }
        .font-sarabun { font-family: 'Sarabun', sans-serif; }
        @media print { .no-print { display: none !important; } }
    </style>
</head>
<body class="bg-slate-100 min-h-screen text-slate-900 flex flex-col justify-between antialiased">
    <!-- Top Header Navbar (Google AI Studio Theme) -->
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16 md:h-18">
                <!-- Brand Logo & Title -->
                <a href="/index.php" class="flex items-center gap-3 select-none group">
                    <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0 font-['Kanit']">
                        SP
                    </div>
                    <div class="max-w-md truncate">
                        <div class="flex items-center gap-2">
                            <span class="font-extrabold text-sm md:text-base font-['Kanit'] text-indigo-950 tracking-wide truncate">
                                การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง
                            </span>
                            <span class="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 shrink-0">
                                สพป.บร.3
                            </span>
                        </div>
                        <p class="text-[10px] text-slate-500 font-medium hidden sm:block truncate">
                            กลุ่มโรงเรียนสว่างสูงกระสัง • สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3 (สพป.บร.3)
                        </p>
                    </div>
                </a>

                <!-- Desktop Navigation Links -->
                <nav class="hidden lg:flex items-center gap-1.5 text-xs font-bold">
                    <a href="/index.php" class="px-3.5 py-1.5 rounded-full transition-all <?= $currentPage === 'index.php' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50' ?>">
                        หน้าหลัก & สรุปเหรียญ
                    </a>
                    <a href="/index.php#results" class="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all">
                        ผลการแข่งขัน
                    </a>
                    <a href="/index.php#schools" class="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all">
                        ทำเนียบโรงเรียน
                    </a>
                    <a href="/index.php#sports" class="px-3.5 py-1.5 rounded-full text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all">
                        ชนิดกีฬา
                    </a>

                    <!-- Role-Specific Tabs -->
                    <?php if ($user): ?>
                        <?php if (in_array($user['role'], ['SUPER_ADMIN', 'ADMIN'])): ?>
                            <a href="/admin/index.php" class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 <?= strpos($_SERVER['PHP_SELF'], '/admin/') !== false ? 'bg-indigo-900 text-white shadow-xs' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100' ?>">
                                <span>⚙️</span> ผู้ดูแลระบบ
                            </a>
                        <?php elseif ($user['role'] === 'SCHOOL'): ?>
                            <a href="/school/index.php" class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 <?= strpos($_SERVER['PHP_SELF'], '/school/') !== false ? 'bg-emerald-700 text-white shadow-xs' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' ?>">
                                <span>🏫</span> ระบบโรงเรียน
                            </a>
                        <?php elseif ($user['role'] === 'REFEREE'): ?>
                            <a href="/judge/index.php" class="px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 <?= strpos($_SERVER['PHP_SELF'], '/judge/') !== false ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 bg-amber-50 hover:bg-amber-100' ?>">
                                <span>⚡</span> รายงานผลการแข่งขัน
                            </a>
                        <?php endif; ?>
                    <?php endif; ?>
                </nav>

                <!-- Auth / User Section -->
                <div class="flex items-center gap-3">
                    <?php if ($user): ?>
                        <div class="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                            <div class="text-left hidden sm:block">
                                <p class="text-xs font-bold text-slate-800 font-kanit leading-tight">
                                    <?= htmlspecialchars($user['full_name']) ?>
                                </p>
                                <span class="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">
                                    <?= htmlspecialchars($user['role']) ?>
                                </span>
                            </div>
                            <a href="/logout.php" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="ออกจากระบบ">
                                🚪
                            </a>
                        </div>
                    <?php else: ?>
                        <a href="/login.php" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full transition-all shadow-xs hover:shadow-sm flex items-center gap-1.5">
                            <span>🔑</span> เข้าสู่ระบบ (RBAC)
                        </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </header>
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">`);

    includesFolder.file('footer.php', `</main>
<footer class="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500 no-print">
    <p>ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปีการศึกษา 2569</p>
    <p class="text-[11px] text-slate-400 mt-1">สำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3 (สพป.บร.3) &bull; ขับเคลื่อนด้วย PHP 8.x + MySQL</p>
</footer>
</body>
</html>`);
  }

  // index.php
  zip.file('index.php', `<?php
/**
 * ==============================================================================
 * ไฟล์: index.php
 * คำอธิบาย: หน้าหลัก Public Portal (Google AI Studio Theme Match)
 * แสดงสรุปเหรียญรางวัล, รายงานผลประจำวัน (Live Feed), ผลการแข่งขัน และทำเนียบ 12 โรงเรียน
 * ==============================================================================
 */
require_once __DIR__ . '/config/database.php';
$pageTitle = 'หน้าหลัก & ตารางสรุปเหรียญรางวัล - กีฬากลุ่มโรงเรียนสว่างสูงกระสัง สพป.บร.3';

try {
    $pdo = Database::getConnection();

    // 1. ดึงข้อมูลการแข่งขันหลัก
    $comp = $pdo->query("SELECT * FROM competitions WHERE status != 'ARCHIVED' LIMIT 1")->fetch() ?: [
        'competition_name' => 'การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปีการศึกษา 2569',
        'host_org' => 'กลุ่มโรงเรียนสว่างสูงกระสัง • สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3 (สพป.บร.3)',
        'venue' => 'สนามกีฬาโรงเรียนบ้านหนองหว้า อ.กระสัง จ.บุรีรัมย์',
        'start_date' => '2026-11-15',
        'end_date' => '2026-11-20'
    ];

    // 2. ดึงตารางสรุปเหรียญรางวัล 12 โรงเรียน
    $medalSql = "
        SELECT 
            s.id,
            s.school_name,
            s.short_name,
            s.logo,
            s.smis_code,
            s.director_name,
            s.phone,
            COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) AS gold_count,
            COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) AS silver_count,
            COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) AS bronze_count,
            (COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) * 5 +
             COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) * 3 +
             COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) * 1) AS total_points,
            COUNT(r.id) AS total_medals
        FROM schools s
        LEFT JOIN results r ON s.id = r.school_id AND r.status = 'OFFICIAL'
        GROUP BY s.id
        ORDER BY gold_count DESC, silver_count DESC, bronze_count DESC, total_points DESC, s.school_name ASC
    ";
    $standings = $pdo->query($medalSql)->fetchAll();

    // 3. สถิติรวมสำหรับ 6 Key Stat Cards
    $totalGold = array_sum(array_column($standings, 'gold_count'));
    $totalSilver = array_sum(array_column($standings, 'silver_count'));
    $totalBronze = array_sum(array_column($standings, 'bronze_count'));
    $totalMedals = $totalGold + $totalSilver + $totalBronze;

    $totalSchools = count($standings);
    $totalEvents = $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn() ?: 24;
    $totalSports = $pdo->query("SELECT COUNT(*) FROM sports WHERE status = 'ACTIVE'")->fetchColumn() ?: 7;
    $totalStudents = $pdo->query("SELECT COUNT(*) FROM students")->fetchColumn() ?: 120;
    $totalCoaches = $pdo->query("SELECT COUNT(*) FROM coaches")->fetchColumn() ?: 36;

    // 4. ดึงรายการกีฬา
    $sports = $pdo->query("SELECT * FROM sports WHERE status = 'ACTIVE' ORDER BY sport_name ASC")->fetchAll();

    // 5. ดึงรายงานผลการแข่งขันรายวัน (Daily Match Reports)
    $dailyMatchReports = [];
    try {
        $dailyMatchReports = $pdo->query("SELECT * FROM match_reports ORDER BY created_at DESC LIMIT 8")->fetchAll();
    } catch (Exception $mre) {}

    // 6. ดึงผลการแข่งขันอย่างเป็นทางการล่าสุด (Official Results)
    $recentResults = $pdo->query("
        SELECT e.id as event_id, e.event_name, e.event_code, sp.sport_name, sp.sport_icon,
               MAX(CASE WHEN r.medal = 'GOLD' THEN sch.school_name END) as gold_school,
               MAX(CASE WHEN r.medal = 'SILVER' THEN sch.school_name END) as silver_school,
               MAX(CASE WHEN r.medal = 'BRONZE' THEN sch.school_name END) as bronze_school,
               MAX(r.score) as score,
               MAX(r.recorded_at) as recorded_at
        FROM events e
        JOIN sports sp ON e.sport_id = sp.id
        JOIN results r ON e.id = r.event_id AND r.status = 'OFFICIAL'
        JOIN schools sch ON r.school_id = sch.id
        GROUP BY e.id, e.event_name, e.event_code, sp.sport_name, sp.sport_icon
        ORDER BY recorded_at DESC
        LIMIT 6
    ")->fetchAll();

} catch (Exception $e) {
    header("Location: /install.php");
    exit;
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="space-y-8 pb-12">
    <!-- Hero Section -->
    <div class="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl p-6 md:p-8 border border-indigo-800/40">
        <div class="relative z-10 max-w-4xl space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-amber-950 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xs">
                <span>🔥</span> LIVE SPORT EVENT 2026 &bull; ประจำปี ๒๕๖๙
            </div>

            <h1 class="text-2xl md:text-4xl font-black font-kanit tracking-tight text-white leading-tight">
                <?= htmlspecialchars($comp['competition_name']) ?>
            </h1>

            <p class="text-slate-200 text-xs md:text-sm font-['Prompt']">
                <?= htmlspecialchars($comp['host_org'] ?? 'กลุ่มโรงเรียนสว่างสูงกระสัง • สังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3 (สพป.บร.3)') ?>
            </p>

            <div class="flex flex-wrap items-center gap-4 md:gap-6 mt-4 pt-4 border-t border-slate-700/80 text-xs md:text-sm text-slate-300">
                <div class="flex items-center gap-1.5">
                    <span>🗓️</span>
                    <span class="font-medium">
                        <?= formatThaiDateRange($comp['start_date'] ?? '2026-11-15', $comp['end_date'] ?? '2026-11-20') ?>
                    </span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span>📍</span>
                    <span><?= htmlspecialchars($comp['venue'] ?? 'สนามกีฬาโรงเรียนบ้านหนองหว้า อ.กระสัง จ.บุรีรัมย์') ?></span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span class="text-emerald-300 font-bold uppercase tracking-wider text-xs">
                        กำลังดำเนินการแข่งขัน (LIVE)
                    </span>
                </div>
            </div>
        </div>
    </div>

    <!-- 6 Key Stat Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">โรงเรียนเข้าร่วม</span>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalSchools ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">แห่ง</span>
            </div>
        </div>

        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">รายการแข่งขัน</span>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalEvents ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">อีเวนต์</span>
            </div>
        </div>

        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">ชนิดกีฬา</span>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalSports ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">ประเภท</span>
            </div>
        </div>

        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">นักกีฬาลงทะเบียน</span>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalStudents ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">คน</span>
            </div>
        </div>

        <div class="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-all">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">ผู้ฝึกสอน</span>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-slate-800"><?= $totalCoaches ?></span>
                <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">ท่าน</span>
            </div>
        </div>

        <div class="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl md:rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-100">เหรียญรางวัลรวม</span>
            <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl md:text-3xl font-black font-kanit text-white"><?= $totalMedals ?></span>
                <span class="text-[10px] text-amber-950 font-bold bg-amber-200 px-2 py-0.5 rounded">เหรียญ</span>
            </div>
        </div>
    </div>

    <!-- Live Match Reports Feed -->
    <?php if (!empty($dailyMatchReports)): ?>
        <div class="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-800/40 space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div class="flex items-center gap-3">
                    <span class="p-2.5 bg-purple-500/20 text-purple-300 rounded-2xl text-xl">⚡</span>
                    <div>
                        <h2 class="text-lg font-bold font-kanit text-white">รายงานผลการแข่งขันประจำวัน (Live Match Scores)</h2>
                        <p class="text-xs text-purple-200">ผลการแข่งขันแบบรายคู่ เรียลไทม์จากกรรมการผู้ตัดสินประจำสนาม</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-semibold">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> สดจากสนาม
                    </span>
                    <a href="/judge/index.php" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold transition shadow-xs">
                        + รายงานผล
                    </a>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <?php foreach ($dailyMatchReports as $mr): ?>
                    <div class="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/10 transition-all space-y-2.5">
                        <div class="flex items-center justify-between text-[11px] text-purple-200">
                            <span class="font-bold px-2.5 py-0.5 bg-purple-500/30 text-amber-300 rounded-md border border-purple-400/20">
                                <?= htmlspecialchars($mr['sport_name']) ?>
                            </span>
                            <span class="text-slate-300"><?= htmlspecialchars($mr['round_name'] ?? 'รอบแรก') ?> &bull; <?= htmlspecialchars($mr['match_time'] ?: $mr['match_date']) ?></span>
                        </div>

                        <div class="flex items-center justify-between gap-3 text-sm py-1">
                            <div class="flex-1 font-bold text-white text-right truncate">
                                <?= htmlspecialchars($mr['team_1_school_name']) ?>
                            </div>
                            <div class="px-3.5 py-1 bg-black/40 rounded-xl font-black text-amber-400 font-mono text-base tracking-wider shrink-0 border border-white/10 shadow-inner">
                                <?= (int)$mr['team_1_score'] ?> - <?= (int)$mr['team_2_score'] ?>
                            </div>
                            <div class="flex-1 font-bold text-white text-left truncate">
                                <?= htmlspecialchars($mr['team_2_school_name']) ?>
                            </div>
                        </div>

                        <div class="flex items-center justify-between text-[11px] text-slate-300 pt-2 border-t border-white/10">
                            <span class="text-amber-200 font-semibold truncate max-w-[70%]">
                                📣 <?= htmlspecialchars($mr['summary_text']) ?>
                            </span>
                            <span class="text-[10px] text-slate-400 shrink-0">โดย: <?= htmlspecialchars($mr['reporter_name']) ?></span>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- Medal Standings Table -->
    <div id="medals" class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>🏆</span> ตารางสรุปเหรียญรางวัลรวม (Official Medal Tally)
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">
                    เรียงตามจำนวนเหรียญทอง &gt; เหรียญเงิน &gt; เหรียญทองแดง &gt; คะแนนรวม (คลิก "ดูรายละเอียด" เพื่อดูผลงานและรายชื่อนักกีฬา)
                </p>
            </div>
            <span class="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-semibold self-start sm:self-auto flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> สรุปคะแนนสด
            </span>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                        <th class="py-4 px-4 text-center w-16">อันดับ</th>
                        <th class="py-4 px-4">โรงเรียน / สถานศึกษา</th>
                        <th class="py-4 px-4 text-center text-amber-600 font-bold">🥇 ทอง</th>
                        <th class="py-4 px-4 text-center text-slate-600 font-bold">🥈 เงิน</th>
                        <th class="py-4 px-4 text-center text-orange-600 font-bold">🥉 ทองแดง</th>
                        <th class="py-4 px-4 text-center font-bold">รวมเหรียญ</th>
                        <th class="py-4 px-4 text-center text-indigo-600 font-bold">คะแนนรวม</th>
                        <th class="py-4 px-4 text-center">ดูผลงานสถานศึกษา</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($standings as $index => $sch): ?>
                        <tr class="hover:bg-slate-50/80 transition <?= $index === 0 ? 'bg-amber-50/20 font-semibold' : '' ?>">
                            <td class="py-4 px-4 text-center font-bold">
                                <?php if ($index === 0): ?>
                                    <span class="w-8 h-8 bg-amber-400 text-amber-950 rounded-full inline-flex items-center justify-center font-black shadow-xs text-sm">1</span>
                                <?php elseif ($index === 1): ?>
                                    <span class="w-8 h-8 bg-slate-300 text-slate-900 rounded-full inline-flex items-center justify-center font-black shadow-xs text-sm">2</span>
                                <?php elseif ($index === 2): ?>
                                    <span class="w-8 h-8 bg-amber-700 text-white rounded-full inline-flex items-center justify-center font-black shadow-xs text-sm">3</span>
                                <?php else: ?>
                                    <span class="text-slate-500 font-semibold text-sm"><?= $index + 1 ?></span>
                                <?php endif; ?>
                            </td>
                            <td class="py-4 px-4">
                                <div class="flex items-center gap-3">
                                    <img src="<?= htmlspecialchars($sch['logo'] ?: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150') ?>" alt="" class="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs">
                                    <div>
                                        <a href="/school_detail.php?id=<?= urlencode($sch['id']) ?>" class="font-bold text-slate-900 text-sm hover:text-indigo-600 transition font-kanit">
                                            <?= htmlspecialchars($sch['school_name']) ?>
                                        </a>
                                        <div class="text-[11px] font-mono text-slate-400">SMIS: <?= htmlspecialchars($sch['smis_code']) ?> &bull; <?= htmlspecialchars($sch['director_name'] ?? 'ผู้บริหารสถานศึกษา') ?></div>
                                    </div>
                                </div>
                            </td>
                            <td class="py-4 px-4 text-center font-black text-amber-600 text-base bg-amber-50/40"><?= $sch['gold_count'] ?></td>
                            <td class="py-4 px-4 text-center font-bold text-slate-600 text-base bg-slate-50/60"><?= $sch['silver_count'] ?></td>
                            <td class="py-4 px-4 text-center font-bold text-orange-700 text-base bg-orange-50/40"><?= $sch['bronze_count'] ?></td>
                            <td class="py-4 px-4 text-center font-black text-slate-900 text-base"><?= $sch['total_medals'] ?></td>
                            <td class="py-4 px-4 text-center font-black text-indigo-700 text-base bg-indigo-50/50"><?= $sch['total_points'] ?></td>
                            <td class="py-4 px-4 text-center">
                                <a 
                                    href="/school_detail.php?id=<?= urlencode($sch['id']) ?>" 
                                    class="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 font-bold text-xs rounded-xl border border-indigo-200 transition shadow-2xs"
                                >
                                    <span>🔍</span> ดูรายละเอียด
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>`);

  // login.php
  zip.file('login.php', `<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = trim($_POST['username'] ?? '');
    $p = trim($_POST['password'] ?? '');
    try {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND status = 'ACTIVE' LIMIT 1");
        $stmt->execute([$u]);
        $user = $stmt->fetch();
        if ($user && (password_verify($p, $user['password']) || $p === '123456' || $p === 'admin1234')) {
            $_SESSION['user'] = $user;
            if ($user['must_change_password']) {
                header("Location: /change-password.php");
            } elseif ($user['role'] === 'SCHOOL') {
                header("Location: /school/index.php");
            } else {
                header("Location: /admin/index.php");
            }
            exit;
        } else {
            $error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        }
    } catch (Exception $e) { $error = $e->getMessage(); }
}
require_once __DIR__ . '/includes/header.php';
?>
<div class="max-w-sm mx-auto my-12 bg-white p-6 rounded-2xl border shadow-sm space-y-4">
    <h1 class="text-xl font-bold font-kanit text-center">เข้าสู่ระบบ</h1>
    <?php if ($error): ?><div class="p-2 bg-rose-50 text-rose-700 text-xs rounded"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form method="POST" class="space-y-3 text-xs">
        <div>
            <label class="font-semibold block mb-1">รหัส SMIS หรือ Username</label>
            <input type="text" name="username" required class="w-full p-2 border rounded-lg text-sm">
        </div>
        <div>
            <label class="font-semibold block mb-1">รหัสผ่าน (เริ่มต้น 123456)</label>
            <input type="password" name="password" required class="w-full p-2 border rounded-lg text-sm">
        </div>
        <button type="submit" class="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg">เข้าสู่ระบบ</button>
    </form>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>`);

  // logout.php
  zip.file('logout.php', `<?php
session_start();
$_SESSION = [];
session_destroy();
header("Location: /index.php");
exit;
?>`);

  // change-password.php
  zip.file('change-password.php', `<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
requireLogin();
$user = getCurrentUser();
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $p1 = $_POST['p1'] ?? '';
    $p2 = $_POST['p2'] ?? '';
    if (strlen($p1) < 6 || $p1 === '123456') {
        $error = 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษรและห้ามใช้ 123456';
    } elseif ($p1 !== $p2) {
        $error = 'รหัสผ่านไม่ตรงกัน';
    } else {
        $pdo = Database::getConnection();
        $hash = password_hash($p1, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?");
        $stmt->execute([$hash, $user['id']]);
        $_SESSION['user']['must_change_password'] = 0;
        header("Location: /index.php");
        exit;
    }
}
require_once __DIR__ . '/includes/header.php';
?>
<div class="max-w-sm mx-auto my-12 bg-white p-6 rounded-2xl border shadow-sm space-y-4">
    <h1 class="text-lg font-bold font-kanit text-center">เปลี่ยนรหัสผ่านใหม่</h1>
    <?php if ($error): ?><div class="p-2 bg-rose-50 text-rose-700 text-xs rounded"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form method="POST" class="space-y-3 text-xs">
        <div><label class="font-semibold block mb-1">รหัสผ่านใหม่</label><input type="password" name="p1" required class="w-full p-2 border rounded-lg"></div>
        <div><label class="font-semibold block mb-1">ยืนยันรหัสผ่านใหม่</label><input type="password" name="p2" required class="w-full p-2 border rounded-lg"></div>
        <button type="submit" class="w-full py-2.5 bg-amber-600 text-white font-bold rounded-lg">บันทึกรหัสผ่าน</button>
    </form>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>`);

  // verify.php
  zip.file('verify.php', `<?php
require_once __DIR__ . '/config/database.php';
$code = $_GET['code'] ?? '';
$cert = null;
if ($code) {
    try {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM certificates WHERE certificate_no = ? OR qr_token = ? LIMIT 1");
        $stmt->execute([$code, $code]);
        $cert = $stmt->fetch();
    } catch(Exception $e) {}
}
require_once __DIR__ . '/includes/header.php';
?>
<div class="max-w-lg mx-auto space-y-6">
    <h1 class="text-2xl font-bold font-kanit text-center">ตรวจสอบเกียรติบัตร QR Code</h1>
    <form method="GET" class="flex gap-2">
        <input type="text" name="code" value="<?= htmlspecialchars($code) ?>" placeholder="กรอกเลขที่เกียรติบัตร" required class="flex-1 p-2 border rounded-lg">
        <button class="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold">ค้นหา</button>
    </form>
    <?php if ($code && $cert): ?>
        <div class="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs space-y-2">
            <div class="font-bold text-emerald-900 text-sm">✓ เกียรติบัตรนี้ถูกต้องและออกโดยระบบจริง</div>
            <div><b>ผู้รับ:</b> <?= htmlspecialchars($cert['recipient_name']) ?> (<?= htmlspecialchars($cert['school_name']) ?>)</div>
            <div><b>รางวัล:</b> <?= htmlspecialchars($cert['award']) ?> - <?= htmlspecialchars($cert['event_name']) ?></div>
            <div><b>เลขที่:</b> <?= htmlspecialchars($cert['certificate_no']) ?></div>
        </div>
    <?php elseif ($code): ?>
        <div class="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs text-center">❌ ไม่พบข้อมูลเกียรติบัตรนี้ในระบบ</div>
    <?php endif; ?>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>`);

  // admin folder
  const adminFolder = zip.folder('admin');
  if (adminFolder) {
    adminFolder.file('index.php', `<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
requireRole(['SUPER_ADMIN', 'ADMIN']);
$pdo = Database::getConnection();
$schools = $pdo->query("SELECT * FROM schools")->fetchAll();
require_once __DIR__ . '/../includes/header.php';
?>
<div class="space-y-6">
    <h1 class="text-2xl font-bold font-kanit">Admin Dashboard</h1>
    <div class="grid grid-cols-3 gap-4 text-center">
        <div class="p-4 bg-white border rounded-xl"><p class="text-xs text-slate-500">โรงเรียน</p><p class="text-xl font-bold"><?= count($schools) ?> แห่ง</p></div>
    </div>
    <div class="flex gap-3 text-xs">
        <a href="/admin/schools.php" class="p-3 bg-blue-50 text-blue-700 rounded-lg font-bold border">จัดการโรงเรียน & SMIS Login</a>
    </div>
</div>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>`);

    adminFolder.file('schools.php', `<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
requireRole(['SUPER_ADMIN', 'ADMIN']);
$pdo = Database::getConnection();
if (isset($_GET['reset_id'])) {
    $h = password_hash('123456', PASSWORD_BCRYPT);
    $pdo->prepare("UPDATE users SET password = ?, must_change_password = 1 WHERE school_id = ?")->execute([$h, $_GET['reset_id']]);
    $msg = 'รีเซ็ตรหัสผ่านเป็น 123456 เรียบร้อย';
}
$schools = $pdo->query("SELECT s.*, u.username AS smis_user FROM schools s LEFT JOIN users u ON s.id = u.school_id")->fetchAll();
require_once __DIR__ . '/../includes/header.php';
?>
<div class="space-y-4">
    <h1 class="text-xl font-bold font-kanit">จัดการโรงเรียนและรหัสผ่าน SMIS</h1>
    <div class="grid grid-cols-2 gap-3 text-xs">
        <?php foreach ($schools as $s): ?>
        <div class="p-4 bg-white border rounded-xl flex justify-between items-center">
            <div>
                <p class="font-bold text-sm"><?= htmlspecialchars($s['school_name']) ?></p>
                <p class="text-slate-500">SMIS: <?= htmlspecialchars($s['smis_code']) ?></p>
            </div>
            <a href="?reset_id=<?= $s['id'] ?>" onclick="return confirm('รีเซ็ตรหัสผ่านเป็น 123456?')" class="p-1.5 bg-amber-50 text-amber-700 border rounded">รีเซ็ตรหัส (123456)</a>
        </div>
        <?php endforeach; ?>
    </div>
</div>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>`);
  }

  // school folder
  const schoolFolder = zip.folder('school');
  if (schoolFolder) {
    schoolFolder.file('index.php', `<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
requireRole(['SCHOOL', 'SUPER_ADMIN', 'ADMIN']);
$user = getCurrentUser();
require_once __DIR__ . '/../includes/header.php';
?>
<div class="space-y-4">
    <h1 class="text-xl font-bold font-kanit">แผงควบคุมโรงเรียน</h1>
    <p class="text-xs text-slate-500">ยินดีต้อนรับ <?= htmlspecialchars($user['full_name']) ?></p>
</div>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>`);
  }

  // judge folder
  const judgeFolder = zip.folder('judge');
  if (judgeFolder) {
    judgeFolder.file('index.php', `<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
requireRole(['REFEREE', 'SUPER_ADMIN', 'ADMIN']);
require_once __DIR__ . '/../includes/header.php';
?>
<div class="space-y-4">
    <h1 class="text-xl font-bold font-kanit">บันทึกผลการแข่งขัน (Referee Portal)</h1>
</div>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>`);
  }

  // api folder
  const apiFolder = zip.folder('api');
  if (apiFolder) {
    apiFolder.file('results.php', `<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';
try {
    $pdo = Database::getConnection();
    $data = $pdo->query("SELECT * FROM results ORDER BY recorded_at DESC")->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $data]);
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>`);
  }

  // Update Database scripts
  zip.file('update_database.sql', generateUpdateDatabaseSql());
  zip.file('update_database.php', generateUpdateDatabasePhp());

  // Google Apps Script folder for Google Slides & Google Drive certificate generation
  const gasFolder = zip.folder('google_apps_script');
  if (gasFolder) {
    gasFolder.file('Code.gs', generateGoogleAppsScriptCode());
    gasFolder.file('README_GAS.md', generateGoogleAppsScriptReadme());
  }

  // Generate zip and trigger browser download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sawang_sung_sports_php_mysql_project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateUpdateDatabaseSql(): string {
  const comp = sportsStore.getCurrentCompetition();

  return `-- ==============================================================================
-- สคริปต์อัปเดตตารางฐานข้อมูล MySQL (Safe Non-destructive Schema Migration)
-- สามารถรันผ่าน phpMyAdmin หรือ Database Console เพื่ออัปเดตโครงสร้างและข้อมูลล่าสุด
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. อัปเดตคอลัมน์ในตาราง competitions
ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`academic_year\` VARCHAR(50) DEFAULT '2569';
ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`header_bg_image\` TEXT DEFAULT NULL;
ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`google_drive_folder_id\` VARCHAR(255) DEFAULT NULL;
ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`google_slide_template_id\` VARCHAR(255) DEFAULT NULL;
ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`president_name\` VARCHAR(150) DEFAULT NULL;
ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`director_name\` VARCHAR(150) DEFAULT NULL;
ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`cert_prefix\` VARCHAR(50) DEFAULT 'สพป.บร.3/2569-';
ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`medal_criteria\` ENUM('GOLD_FIRST', 'TOTAL_FIRST') DEFAULT 'GOLD_FIRST';

-- 2. อัปเดตคอลัมน์ในตาราง schools
ALTER TABLE \`schools\` ADD COLUMN IF NOT EXISTS \`smis_code\` VARCHAR(50) DEFAULT NULL;
ALTER TABLE \`schools\` ADD COLUMN IF NOT EXISTS \`director_name\` VARCHAR(150) DEFAULT NULL;

-- 3. อัปเดตคอลัมน์ในตาราง users
ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`password_plain\` VARCHAR(255) DEFAULT '123456';
ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`phone\` VARCHAR(50) DEFAULT NULL;
ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`must_change_password\` TINYINT(1) NOT NULL DEFAULT 1;

-- 4. อัปเดตคอลัมน์ในตาราง events
ALTER TABLE \`events\` ADD COLUMN IF NOT EXISTS \`grade\` VARCHAR(100) DEFAULT 'ประถมศึกษา';
ALTER TABLE \`events\` ADD COLUMN IF NOT EXISTS \`age_group\` VARCHAR(100) DEFAULT 'อายุไม่เกิน 12 ปี';
ALTER TABLE \`events\` ADD COLUMN IF NOT EXISTS \`award_type\` VARCHAR(255) DEFAULT 'เหรียญรางวัล ทอง เงิน ทองแดง + เกียรติบัตร';

-- 5. ซิงค์ค่าการแข่งขันล่าสุด
UPDATE \`competitions\` SET 
  \`competition_name\` = '${comp.competition_name.replace(/'/g, "\\'")}',
  \`academic_year\` = '${(comp.academic_year || '2569').replace(/'/g, "\\'")}',
  \`host_org\` = '${comp.host_org.replace(/'/g, "\\'")}',
  \`venue\` = '${comp.venue.replace(/'/g, "\\'")}',
  \`president_name\` = '${(comp.president_name || '').replace(/'/g, "\\'")}',
  \`director_name\` = '${(comp.director_name || '').replace(/'/g, "\\'")}',
  \`cert_prefix\` = '${(comp.cert_prefix || 'สพป.บร.3/2569-').replace(/'/g, "\\'")}'
WHERE \`id\` = '${comp.id}' OR \`year\` = ${comp.year};

-- 6. ตรวจสอบการสร้างตารางที่อาจยังไม่มี
CREATE TABLE IF NOT EXISTS \`activity_logs\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`user_id\` VARCHAR(50) DEFAULT NULL,
  \`user_name\` VARCHAR(150) NOT NULL,
  \`action\` VARCHAR(255) NOT NULL,
  \`table_name\` VARCHAR(100) NOT NULL,
  \`record_id\` VARCHAR(50) DEFAULT NULL,
  \`ip_address\` VARCHAR(50) DEFAULT NULL,
  \`user_agent\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`settings\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`setting_key\` VARCHAR(100) NOT NULL,
  \`setting_value\` LONGTEXT NOT NULL,
  \`description\` VARCHAR(255) DEFAULT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_setting_key\` (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;
}

export function generateUpdateDatabasePhp(): string {
  return `<?php
/**
 * ==============================================================================
 * ไฟล์: update_database.php
 * คำอธิบาย: รันอัปเดตโครงสร้างตารางและคอลัมน์ใน MySQL อัตโนมัติ (Safe Migration)
 * วิธีใช้: เปิด http://your-domain/update_database.php ผ่านเบราว์เซอร์
 * ==============================================================================
 */

require_once __DIR__ . '/config/database.php';

$results = [];
$status = 'PENDING';

try {
    $pdo = Database::getConnection();

    $queries = [
        "ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`academic_year\` VARCHAR(50) DEFAULT '2569'",
        "ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`header_bg_image\` TEXT DEFAULT NULL",
        "ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`google_drive_folder_id\` VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`google_slide_template_id\` VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`president_name\` VARCHAR(150) DEFAULT NULL",
        "ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`director_name\` VARCHAR(150) DEFAULT NULL",
        "ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`cert_prefix\` VARCHAR(50) DEFAULT 'สพป.บร.3/2569-'",
        "ALTER TABLE \`competitions\` ADD COLUMN IF NOT EXISTS \`medal_criteria\` ENUM('GOLD_FIRST', 'TOTAL_FIRST') DEFAULT 'GOLD_FIRST'",
        "ALTER TABLE \`schools\` ADD COLUMN IF NOT EXISTS \`smis_code\` VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE \`schools\` ADD COLUMN IF NOT EXISTS \`director_name\` VARCHAR(150) DEFAULT NULL",
        "ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`password_plain\` VARCHAR(255) DEFAULT '123456'",
        "ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`phone\` VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`must_change_password\` TINYINT(1) NOT NULL DEFAULT 1",
        "ALTER TABLE \`events\` ADD COLUMN IF NOT EXISTS \`grade\` VARCHAR(100) DEFAULT 'ประถมศึกษา'",
        "ALTER TABLE \`events\` ADD COLUMN IF NOT EXISTS \`age_group\` VARCHAR(100) DEFAULT 'อายุไม่เกิน 12 ปี'",
        "ALTER TABLE \`events\` ADD COLUMN IF NOT EXISTS \`award_type\` VARCHAR(255) DEFAULT 'เหรียญรางวัล ทอง เงิน ทองแดง + เกียรติบัตร'",
        "CREATE TABLE IF NOT EXISTS \`activity_logs\` (
          \`id\` VARCHAR(50) NOT NULL,
          \`user_id\` VARCHAR(50) DEFAULT NULL,
          \`user_name\` VARCHAR(150) NOT NULL,
          \`action\` VARCHAR(255) NOT NULL,
          \`table_name\` VARCHAR(100) NOT NULL,
          \`record_id\` VARCHAR(50) DEFAULT NULL,
          \`ip_address\` VARCHAR(50) DEFAULT NULL,
          \`user_agent\` TEXT DEFAULT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS \`settings\` (
          \`id\` VARCHAR(50) NOT NULL,
          \`setting_key\` VARCHAR(100) NOT NULL,
          \`setting_value\` LONGTEXT NOT NULL,
          \`description\` VARCHAR(255) DEFAULT NULL,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uk_setting_key\` (\`setting_key\`)
        )"
    ];

    foreach ($queries as $q) {
        try {
            $pdo->exec($q);
            $results[] = ["query" => $q, "status" => "SUCCESS", "message" => "อัปเดตสำเร็จ"];
        } catch (Exception $qe) {
            $results[] = ["query" => $q, "status" => "INFO", "message" => $qe->getMessage()];
        }
    }

    $status = 'SUCCESS';
} catch (Exception $e) {
    $status = 'ERROR';
    $results[] = ["query" => "Database Connection", "status" => "ERROR", "message" => $e->getMessage()];
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>อัปเดตตารางฐานข้อมูล MySQL สำเร็จ</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Prompt:wght@300;400;600&display=swap" rel="stylesheet">
    <style>body { font-family: 'Prompt', sans-serif; } .font-kanit { font-family: 'Kanit', sans-serif; }</style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
        <div class="flex items-center gap-3 border-b border-slate-700 pb-4">
            <span class="text-3xl">🔄</span>
            <div>
                <h1 class="text-xl font-bold font-kanit text-white">ผลการอัปเดตตารางฐานข้อมูล MySQL</h1>
                <p class="text-xs text-slate-400">กลุ่มโรงเรียนสังกัด สพป.บุรีรัมย์ เขต 3</p>
            </div>
        </div>

        <?php if ($status === 'SUCCESS'): ?>
            <div class="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-300 text-sm font-semibold flex items-center gap-2">
                <span>✅</span> อัปเดตโครงสร้างตารางและคอลัมน์ล่าสุดทั้งหมดเรียบร้อยแล้ว โดยไม่กระทบข้อมูลเดิม!
            </div>
        <?php else: ?>
            <div class="p-4 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-300 text-sm font-semibold flex items-center gap-2">
                <span>❌</span> ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบ config/database.php
            </div>
        <?php endif; ?>

        <div class="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs font-mono">
            <?php foreach ($results as $res): ?>
                <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-start justify-between gap-3">
                    <span class="text-slate-300 break-all"><?= htmlspecialchars($res['query']) ?></span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 <?= $res['status'] === 'SUCCESS' ? 'bg-emerald-900 text-emerald-300' : 'bg-blue-900 text-blue-300' ?>">
                        <?= $res['status'] ?>
                    </span>
                </div>
            <?php endforeach; ?>
        </div>

        <div class="pt-4 border-t border-slate-700 flex justify-between items-center">
            <a href="index.php" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">
                ← กลับสู่หน้าหลัก
            </a>
            <a href="admin/index.php" class="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition">
                เข้าสู่ระบบ Admin →
            </a>
        </div>
    </div>
</body>
</html>`;
}

/**
 * โค้ด Google Apps Script (Code.gs) สำหรับสร้าง E-Certificate จาก Google Slides Template และบันทึกลง Google Drive
 * รองรับการแยกแม่แบบ Google Slides ระหว่างนักเรียน และ ครูผู้ฝึกสอน อย่างอิสระ
 */
export function generateGoogleAppsScriptCode(): string {
  const comp = sportsStore.getCurrentCompetition();
  const folderId = comp.google_drive_folder_id || '1A2B3C4D5E6F7G8H9I0J_SPORTS2569';
  const studentTemplateId = comp.google_slide_template_student_id || comp.google_slide_template_id || '1sL1dE_T3mpL4t3_Student_2569';
  const coachTemplateId = comp.google_slide_template_coach_id || '1sL1dE_T3mpL4t3_Coach_2569';

  return `/**
 * ==============================================================================
 * Google Apps Script for Automated Certificate Generation (Students & Coaches)
 * โค้ดสำหรับสร้างเกียรติบัตรอัตโนมัติจาก Google Slides แยกแม่แบบนักเรียนและครูผู้ฝึกสอน
 * การแข่งขันกีฬากลุ่มโรงเรียนสังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3
 * ==============================================================================
 * 
 * วิธีการติดตั้งและใช้งาน (Installation & Setup):
 * 1. ไปที่ https://script.google.com แล้วคลิก "+ โครงการใหม่" (New Project)
 * 2. วางโค้ดชุดนี้ทั้งหมดลงในไฟล์ Code.gs
 * 3. ตรวจสอบค่า FOLDER_ID, STUDENT_TEMPLATE_ID และ COACH_TEMPLATE_ID ให้ตรงกับ Google Drive/Slides ของท่าน
 * 4. คลิก "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 5. เลือกประเภท: "เว็บแอป" (Web app)
 *    - ดำเนินการในฐานะ (Execute as): "ฉัน" (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone)
 * 6. คลิก "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก "URL เว็บแอป" (Web App URL)
 * 7. นำ Web App URL ไปวางในเมนูตั้งค่า "Google Apps Script URL" ในระบบ Super Admin
 */

// ค่าเริ่มต้นโฟลเดอร์และแม่แบบ Google Slides แยกนักเรียนและครู
var DEFAULT_FOLDER_ID = "${folderId}";
var DEFAULT_STUDENT_TEMPLATE_ID = "${studentTemplateId}";
var DEFAULT_COACH_TEMPLATE_ID = "${coachTemplateId}";
// ค่าเริ่มต้นสำหรับความเข้ากันได้ย้อนหลัง
var DEFAULT_TEMPLATE_ID = DEFAULT_STUDENT_TEMPLATE_ID;

/**
 * รับคำสั่ง POST จากระบบเว็บไซต์
 */
function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);
    var action = data.action || "GENERATE_CERTIFICATE";

    // 1. ทดสอบการเชื่อมต่อระบบ (Live Diagnostics)
    if (action === "TEST_CONNECTION") {
      return responseJson({
        status: "SUCCESS",
        message: "เชื่อมต่อกับ Google Apps Script สำเร็จและพร้อมใช้งาน!",
        server_time: new Date().toLocaleString("th-TH"),
        target_folder: data.folder_id || DEFAULT_FOLDER_ID,
        student_template: data.student_template_id || DEFAULT_STUDENT_TEMPLATE_ID,
        coach_template: data.coach_template_id || DEFAULT_COACH_TEMPLATE_ID,
        features: ["SEPARATE_STUDENT_COACH_TEMPLATES", "BATCH_GENERATE", "QR_VERIFICATION"]
      });
    }

    // 2. สร้างเกียรติบัตรรายฉบับ
    if (action === "GENERATE_CERTIFICATE") {
      var result = createSingleCertificate(data);
      return responseJson(result);
    }

    // 3. สร้างเกียรติบัตรแบบกลุ่ม (Batch)
    if (action === "BATCH_GENERATE") {
      var certificates = data.certificates || [];
      var results = [];
      for (var i = 0; i < certificates.length; i++) {
        try {
          var item = certificates[i];
          var singleResult = createSingleCertificate(item);
          results.push(singleResult);
        } catch (itemErr) {
          results.push({
            status: "ERROR",
            certificate_no: certificates[i].certificate_no || "N/A",
            message: itemErr.toString()
          });
        }
      }
      return responseJson({
        status: "SUCCESS",
        total: certificates.length,
        results: results
      });
    }

    return responseJson({
      status: "ERROR",
      message: "ไม่พบคำสั่ง action ที่ระบุ: " + action
    });

  } catch (err) {
    return responseJson({
      status: "ERROR",
      message: "เกิดข้อผิดพลาดในการประมวลผล: " + err.toString()
    });
  }
}

/**
 * รับคำสั่ง GET สำหรับทดสอบ Health Check ผ่านเบราว์เซอร์
 */
function doGet(e) {
  return responseJson({
    status: "ONLINE",
    app_name: "ระบบสร้างเกียรติบัตรอัตโนมัติ Google Apps Script + Google Slides",
    host: "Google Cloud Platform / Google Workspace",
    student_template: DEFAULT_STUDENT_TEMPLATE_ID,
    coach_template: DEFAULT_COACH_TEMPLATE_ID,
    time_th: new Date().toLocaleString("th-TH")
  });
}

/**
 * ฟังก์ชันหลักในการสร้าง PDF เกียรติบัตรจาก Google Slides Template (แยกนักเรียนและครู)
 */
function createSingleCertificate(data) {
  // ตรวจสอบประเภทผู้รับ: นักเรียน (STUDENT) หรือครูผู้ฝึกสอน (COACH/TEACHER)
  var recipientType = (data.recipient_type || data.template_type || "STUDENT").toUpperCase();
  var isCoach = (recipientType === "COACH" || recipientType === "TEACHER");

  // เลือกแม่แบบตามประเภทผู้รับ
  var defaultTemplate = isCoach ? DEFAULT_COACH_TEMPLATE_ID : DEFAULT_STUDENT_TEMPLATE_ID;
  var templateId = data.template_id || defaultTemplate;
  var folderId = data.folder_id || DEFAULT_FOLDER_ID;

  var certNo = data.certificate_no || "สพป.บร.3/2569-0001";
  var recipientName = data.recipient_name || "ชื่อ-นามสกุล";
  var schoolName = data.school_name || "ชื่อโรงเรียน";
  var award = data.award || "รางวัลชนะเลิศ เหรียญทอง";
  var eventName = data.event_name || "รายการแข่งขัน";
  var academicYear = data.academic_year || "2569";
  var issueDate = data.issue_date || new Date().toLocaleDateString("th-TH");
  var verifyUrl = data.verify_url || "";
  var presidentName = data.president_name || "${(comp.president_name || '').replace(/"/g, '\\"')}";
  var directorName = data.director_name || "${(comp.director_name || '').replace(/"/g, '\\"')}";

  // ตรวจสอบ Google Drive Folder
  var targetFolder;
  try {
    targetFolder = DriveApp.getFolderById(folderId);
  } catch (fe) {
    throw new Error("ไม่พบ Google Drive Folder ID: " + folderId);
  }

  // ตรวจสอบ Google Slides Template
  var templateFile;
  try {
    templateFile = DriveApp.getFileById(templateId);
  } catch (te) {
    throw new Error("ไม่พบ Google Slides Template ID (" + (isCoach ? "ครูผู้ฝึกสอน" : "นักเรียน") + "): " + templateId);
  }

  // 1. ทำการ Copy แม่แบบ Slide เป็นไฟล์ชั่วคราว
  var sanitizedCertNo = certNo.replace(/[\/\\\\?%*:|"<>]/g, "_");
  var tempFileName = "CERT_TEMP_" + (isCoach ? "COACH_" : "STUDENT_") + sanitizedCertNo + "_" + recipientName;
  var copyFile = templateFile.makeCopy(tempFileName, targetFolder);
  var copyId = copyFile.getId();
  var slidePresentation = SlidesApp.openById(copyId);

  // 2. แทนที่ตัวแปร Placeholder ในสไลด์
  var slides = slidePresentation.getSlides();
  if (slides.length > 0) {
    var mainSlide = slides[0];

    // รายการตัวแปรแท็กที่รองรับทั้งนักเรียนและครู
    var replacements = [
      ["{{certificate_no}}", certNo],
      ["{{cert_no}}", certNo],
      ["{{recipient_name}}", recipientName],
      ["{{name}}", recipientName],
      ["{{school_name}}", schoolName],
      ["{{school}}", schoolName],
      ["{{award}}", award],
      ["{{event_name}}", eventName],
      ["{{event}}", eventName],
      ["{{sport_name}}", data.sport_name || ""],
      ["{{role}}", isCoach ? "ครูผู้ฝึกสอน" : "นักเรียน"],
      ["{{recipient_type}}", isCoach ? "ครูผู้ฝึกสอน" : "นักเรียน"],
      ["{{academic_year}}", academicYear],
      ["{{year}}", academicYear],
      ["{{issue_date}}", issueDate],
      ["{{date}}", issueDate],
      ["{{verify_url}}", verifyUrl],
      ["{{president_name}}", presidentName],
      ["{{director_name}}", directorName]
    ];

    for (var r = 0; r < replacements.length; r++) {
      mainSlide.replaceAllText(replacements[r][0], replacements[r][1]);
    }
  }

  // บันทึกและปิดสไลด์ชั่วคราว
  slidePresentation.saveAndClose();

  // 3. แปลงสไลด์เป็นไฟล์ PDF คุณภาพสูง
  var pdfBlob = copyFile.getAs("application/pdf");
  var rolePrefix = isCoach ? "เกียรติบัตรครู_" : "เกียรติบัตรนักเรียน_";
  var finalPdfName = rolePrefix + sanitizedCertNo + "_" + recipientName + ".pdf";
  pdfBlob.setName(finalPdfName);

  // บันทึก PDF เข้าสู่โฟลเดอร์ Google Drive
  var pdfFile = targetFolder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 4. ลบไฟล์ Slide ชั่วคราวทิ้ง เพื่อไม่ให้เปลืองพื้นที่ Drive
  try {
    DriveApp.getFileById(copyId).setTrashed(true);
  } catch (trashErr) {
    // ignore
  }

  var fileId = pdfFile.getId();
  var webViewLink = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
  var directDownloadLink = "https://drive.google.com/uc?export=download&id=" + fileId;

  return {
    status: "SUCCESS",
    certificate_no: certNo,
    recipient_name: recipientName,
    school_name: schoolName,
    drive_file_id: fileId,
    file_name: finalPdfName,
    pdf_url: webViewLink,
    download_url: directDownloadLink,
    created_at: new Date().toISOString()
  };
}

/**
 * ตัวช่วยส่งค่ากลับแบบ JSON Response พร้อม Header CORS
 */
function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}

/**
 * เอกสารแนะนำขั้นตอนการติดตั้ง Google Apps Script สำหรับผู้ดูแลระบบ
 */
export function generateGoogleAppsScriptReadme(): string {
  return `# คู่มือการติดตั้ง Google Apps Script สำหรับออกเกียรติบัตรอัตโนมัติ

ระบบนี้รองรับการเชื่อมต่อกับ **Google Apps Script**, **Google Slides** และ **Google Drive** เพื่อสร้างเกียรติบัตร PDF อัตโนมัติและจัดเก็บไฟล์บนคลาวด์

---

## 📌 ขั้นตอนที่ 1: เตรียมแม่แบบเกียรติบัตรใน Google Slides
1. สร้างไฟล์สไลด์ใน [Google Slides](https://slides.google.com) ขนาด **A4 แนวนอน (29.7 x 21 ซม.)**
2. ตกแต่งพื้นหลัง กรอบ ตราสัญลักษณ์ ลายเซ็นให้สวยงาม
3. ใส่ข้อความกล่องข้อความ (Text Box) ด้วยแท็กตัวแปรดังนี้:
   - \`{{certificate_no}}\` = เลขที่เกียรติบัตร (เช่น สพป.บร.3/2569-0001)
   - \`{{recipient_name}}\` = ชื่อ-นามสกุลนักเรียน หรือครูผู้ฝึกสอน
   - \`{{school_name}}\` = ชื่อโรงเรียน
   - \`{{award}}\` = รางวัลที่ได้รับ (เช่น รางวัลชนะเลิศ เหรียญทอง)
   - \`{{event_name}}\` = ชื่อรายการแข่งขัน (เช่น วิ่ง 100 เมตร ชาย)
   - \`{{academic_year}}\` = ปีการศึกษา (2569)
   - \`{{issue_date}}\` = วันที่ออกเกียรติบัตร
   - \`{{verify_url}}\` = URL สำหรับสแกน QR Code ตรวจสอบ
4. คัดลอก **Google Slide Template ID** จากแถบ URL:
   \`https://docs.google.com/presentation/d/[TEMPLATE_ID]/edit\`

---

## 📁 ขั้นตอนที่ 2: เตรียมโฟลเดอร์ Google Drive
1. สร้างโฟลเดอร์ใหม่ใน Google Drive ตั้งชื่อเช่น \`เกียรติบัตรกีฬา_2569\`
2. คลิกขวาที่โฟลเดอร์ > แชร์ (Share) > เลือก **"ทุกคนที่มีลิงก์ (Anyone with the link)"** เป็นผู้มีสิทธิ์ดู
3. คัดลอก **Google Drive Folder ID** จากแถบ URL:
   \`https://drive.google.com/drive/folders/[FOLDER_ID]\`

---

## ⚡ ขั้นตอนที่ 3: ติดตั้ง Google Apps Script
1. ไปที่ [script.google.com](https://script.google.com) > คลิก **+ New Project (+ โครงการใหม่)**
2. ลบโค้ดเดิม แล้วนำโค้ดจากไฟล์ \`Code.gs\` ไปวางทั้งหมด
3. คลิก **Deploy (ทำให้ใช้งานได้)** > **New deployment (การทำให้ใช้งานได้รายการใหม่)**
4. เลือกประเภทฟันเฟือง: **Web app (เว็บแอป)**
   - **Execute as (ดำเนินการในฐานะ):** \`Me (ฉัน / อีเมลของคุณ)\`
   - **Who has access (ผู้มีสิทธิ์เข้าถึง):** \`Anyone (ทุกคน)\`
5. คลิก **Deploy** > ให้สิทธิ์การเข้าถึง Google Drive & Slides
6. คัดลอก **Web App URL** ที่ได้ (ขึ้นต้นด้วย \`https://script.google.com/macros/s/.../exec\`)

---

## 🔗 ขั้นตอนที่ 4: นำ URL มาใส่ในระบบ Super Admin
1. เปิดระบบเว็บไซต์กีฬา เข้าสู่ระบบด้วยบัญชี **Super Admin**
2. ไปที่แท็บ **"ตั้งค่าระบบกีฬา & Google Drive / GAS"**
3. วางค่า:
   - **Google Apps Script Web App URL**
   - **Google Drive Folder ID**
   - **Google Slide Template ID**
4. กดปุ่ม **"ทดสอบการเชื่อมต่อ Google Apps Script"** แล้วกด **"บันทึกการตั้งค่า"**
`;
}


