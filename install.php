<?php
/**
 * ==============================================================================
 * ไฟล์: install.php
 * คำอธิบาย: ตัวติดตั้งฐานข้อมูลอัตโนมัติผ่านหน้าเว็บ พร้อมช่องกรอกข้อมูลตั้งค่า DB
 * รันไฟล์นี้ผ่านเบราว์เซอร์: http://your-domain.com/install.php
 * ==============================================================================
 */

// โหลดค่าตั้งต้นปัจจุบันจาก config/database.php (ถ้ามี)
$currentHost = '127.0.0.1';
$currentPort = '3306';
$currentName = 'swang_sung_krasang_sports';
$currentUser = 'root';
$currentPass = '';
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
$configSaved = false;

// ค่าจากฟอร์ม POST
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
            $dbConnected = false;

            // 1. ลองเชื่อมต่อเข้า Database ที่ระบุโดยตรงก่อน (กรณีสร้าง Database ไว้แล้วใน cPanel/DirectAdmin)
            try {
                $dsn = "mysql:host={$formHost};port={$formPort};dbname={$formName};charset={$formCharset}";
                $pdo = new PDO($dsn, $formUser, $formPass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$formCharset} COLLATE utf8mb4_unicode_ci"
                ]);
                $dbConnected = true;
                $details[] = "✅ เชื่อมต่อฐานข้อมูล `{$formName}` บน Host `{$formHost}` สำเร็จ";
            } catch (PDOException $e) {
                // 2. หากยังไม่มี Database และผู้ใช้มีสิทธิ์ระดับ Root/Admin ให้พยายามสร้าง Database
                try {
                    $rootDsn = "mysql:host={$formHost};port={$formPort};charset={$formCharset}";
                    $rootPdo = new PDO($rootDsn, $formUser, $formPass, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                    ]);
                    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$formName}` DEFAULT CHARACTER SET {$formCharset} COLLATE utf8mb4_unicode_ci;");
                    $rootPdo->exec("USE `{$formName}`;");
                    $pdo = $rootPdo;
                    $dbConnected = true;
                    $details[] = "✅ ตรวจสอบ/สร้างฐานข้อมูล `{$formName}` สำเร็จ";
                } catch (PDOException $createErr) {
                    throw new Exception("ไม่สามารถเชื่อมต่อหรือสร้างฐานข้อมูล `{$formName}` ได้: " . $createErr->getMessage() . " (กรุณาตรวจสอบว่าสร้างฐานข้อมูลและผูก User ในโฮสติ้งเรียบร้อยแล้วหรือไม่)");
                }
            }

            // 3. รันคำสั่ง SQL จาก database.sql
            $sqlPath = __DIR__ . '/database.sql';
            if (!file_exists($sqlPath)) {
                throw new Exception("ไม่พบไฟล์ database.sql ในไดเรกทอรี " . __DIR__);
            }

            $sqlContent = file_get_contents($sqlPath);
            $pdo->exec($sqlContent);
            $details[] = "✅ นำเข้าโครงสร้างตาราง 13 ตาราง และข้อมูลโรงเรียน 12 แห่งสำเร็จ";

            // 4. เขียนทับไฟล์ config/database.php ด้วยค่าที่กรอกใหม่
            $configDir = __DIR__ . '/config';
            if (!is_dir($configDir)) {
                @mkdir($configDir, 0755, true);
            }

            $escapedPass = addcslashes($formPass, "'\\");
            $configPhpContent = "<?php
/**
 * ==============================================================================
 * ไฟล์: config/database.php
 * คำอธิบาย: ตั้งค่าการเชื่อมต่อฐานข้อมูล MySQL/MariaDB ผ่าน PDO
 * สร้างโดยตัวติดตั้ง Web Installer เมื่อ: " . date('Y-m-d H:i:s') . "
 * ==============================================================================
 */

define('DB_HOST', '" . addcslashes($formHost, "'\\") . "');
define('DB_PORT', '" . addcslashes($formPort, "'\\") . "');
define('DB_NAME', '" . addcslashes($formName, "'\\") . "');
define('DB_USER', '" . addcslashes($formUser, "'\\") . "');
define('DB_PASS', '" . $escapedPass . "');
define('DB_CHARSET', '" . addcslashes($formCharset, "'\\") . "');

class Database {
    private static ?PDO \$instance = null;

    public static function getConnection(): PDO {
        if (self::\$instance === null) {
            \$dsn = \"mysql:host=\" . DB_HOST . \";port=\" . DB_PORT . \";dbname=\" . DB_NAME . \";charset=\" . DB_CHARSET;
            \$options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => \"SET NAMES \" . DB_CHARSET . \" COLLATE utf8mb4_unicode_ci\"
            ];

            try {
                self::\$instance = new PDO(\$dsn, DB_USER, DB_PASS, \$options);
            } catch (PDOException \$e) {
                http_response_code(500);
                die(\"❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้: \" . htmlspecialchars(\$e->getMessage()) . \"<br><a href='/install.php'>คลิกที่นี่เพื่อตั้งค่าใหม่ผ่าน install.php</a>\");
            }
        }
        return self::\$instance;
    }
}
?>";

            $configFile = $configDir . '/database.php';
            if (@file_put_contents($configFile, $configPhpContent)) {
                $configSaved = true;
                $details[] = "✅ บันทึกการตั้งค่าลงไฟล์ `config/database.php` สำเร็จเรียบร้อย";
            } else {
                $details[] = "⚠️ ไม่สามารถเขียนทับไฟล์ `config/database.php` ได้โดยอัตโนมัติเนื่องจาก Permission (แต่ฐานข้อมูลถูกติดตั้งแล้ว)";
            }

            $status = 'SUCCESS';
            $message = "ติดตั้งฐานข้อมูล `{$formName}` และอัปเดตการตั้งค่าระบบเรียบร้อยแล้ว!";
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
        
        <!-- Top Header -->
        <div class="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 sm:p-8 text-center relative">
            <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-inner">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit">ตั้งค่าและติดตั้งฐานข้อมูล MySQL</h1>
            <p class="text-xs sm:text-sm text-blue-100 mt-1">ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง (PHP 8.x + MySQL)</p>
        </div>

        <!-- Content Body -->
        <div class="p-6 sm:p-8 space-y-6">

            <?php if ($status === 'SUCCESS'): ?>
                <!-- SUCCESS CARD -->
                <div class="bg-emerald-50 border border-emerald-300 text-emerald-900 p-6 rounded-2xl space-y-4">
                    <div class="flex items-center gap-3 font-bold text-base text-emerald-800">
                        <span class="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center shrink-0">✓</span>
                        <span><?= htmlspecialchars($message) ?></span>
                    </div>
                    <div class="text-xs space-y-1.5 pl-11 text-emerald-700">
                        <?php foreach ($details as $d): ?>
                            <div><?= $d ?></div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <div class="bg-slate-50 p-4 rounded-2xl border text-xs text-slate-600 space-y-2">
                    <div class="font-bold text-slate-800">ข้อมูลบัญชีผู้ใช้งานเริ่มต้น:</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div class="p-2.5 bg-white rounded-xl border">
                            <span class="text-blue-600 font-bold block">ผู้ดูแลระบบ (Admin)</span>
                            Username: <b>admin</b> | Password: <b>admin1234</b>
                        </div>
                        <div class="p-2.5 bg-white rounded-xl border">
                            <span class="text-amber-600 font-bold block">12 โรงเรียน (School Portal)</span>
                            Username: <b>รหัส SMIS 8 หลัก</b> | Password: <b>123456</b>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <a href="index.php" class="py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-lg transition flex items-center justify-center gap-2">
                        <span>🏆</span> ดูหน้าหลักสรุปผล & ตารางเหรียญ
                    </a>
                    <a href="login.php" class="py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl text-center shadow-lg transition flex items-center justify-center gap-2">
                        <span>🔐</span> เข้าสู่ระบบ (Login) &rarr;
                    </a>
                </div>

            <?php else: ?>

                <?php if ($status === 'ERROR'): ?>
                    <div class="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl space-y-2 text-xs">
                        <div class="flex items-center gap-2 font-bold text-sm text-rose-700">
                            <span>⚠️ พบข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล</span>
                        </div>
                        <p class="leading-relaxed"><?= htmlspecialchars($message) ?></p>
                        <div class="text-[11px] text-rose-600 pl-4 border-l-2 border-rose-300 space-y-0.5">
                            <div>• ตรวจสอบว่าได้สร้าง Database บน Control Panel (DirectAdmin / cPanel / Plesk) แล้วหรือยัง</div>
                            <div>• ตรวจสอบว่าได้ผูกสิทธิ์ Database User เข้ากับ Database นั้นแล้วหรือไม่</div>
                            <div>• ตรวจสอบ Username และ Password ของ MySQL อีกครั้ง</div>
                        </div>
                    </div>
                <?php endif; ?>

                <!-- Form Instructions -->
                <div class="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                    <p class="font-bold flex items-center gap-1.5 text-amber-800">
                        <span>💡</span> กรอกข้อมูลฐานข้อมูล MySQL ของคุณ:
                    </p>
                    <p class="text-amber-800/80 leading-relaxed">
                        ระบบจะทำการเชื่อมต่อไปยังฐานข้อมูลที่คุณกำหนด รันสคริปต์สร้างตาราง 13 ตาราง นำเข้าข้อมูลโรงเรียน 12 แห่ง และบันทึกค่าลงในไฟล์ <code class="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-mono font-bold">config/database.php</code> ให้อัตโนมัติ
                    </p>
                </div>

                <!-- Database Configuration Form -->
                <form method="POST" class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="sm:col-span-2">
                            <label class="block font-bold text-slate-700 mb-1">
                                Database Host <span class="text-rose-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                name="db_host" 
                                value="<?= htmlspecialchars($formHost) ?>" 
                                required 
                                placeholder="เช่น localhost หรือ 127.0.0.1" 
                                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm font-mono"
                            >
                            <span class="text-[10px] text-slate-400">ส่วนใหญ่บน DirectAdmin/cPanel ใช้ <code>localhost</code></span>
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">Port</label>
                            <input 
                                type="text" 
                                name="db_port" 
                                value="<?= htmlspecialchars($formPort) ?>" 
                                required 
                                placeholder="3306" 
                                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm font-mono"
                            >
                        </div>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">
                            ชื่อฐานข้อมูล (Database Name) <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            name="db_name" 
                            value="<?= htmlspecialchars($formName) ?>" 
                            required 
                            placeholder="เช่น schoolos12_sports หรือ swang_sung_krasang_sports" 
                            class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm font-mono"
                        >
                        <span class="text-[10px] text-slate-400">ชื่อฐานข้อมูลที่คุณสร้างไว้ใน Control Panel ของโฮสติ้ง</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">
                                Database Username <span class="text-rose-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                name="db_user" 
                                value="<?= htmlspecialchars($formUser) ?>" 
                                required 
                                placeholder="เช่น schoolos12_sawang หรือ root" 
                                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm font-mono"
                            >
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">
                                Database Password
                            </label>
                            <input 
                                type="password" 
                                name="db_pass" 
                                value="<?= htmlspecialchars($formPass) ?>" 
                                placeholder="รหัสผ่านฐานข้อมูล (ถ้ามี)" 
                                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm font-mono"
                            >
                        </div>
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Charset / Collation</label>
                        <input 
                            type="text" 
                            name="db_charset" 
                            value="<?= htmlspecialchars($formCharset) ?>" 
                            required 
                            class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm font-mono"
                        >
                    </div>

                    <div class="pt-3">
                        <button 
                            type="submit" 
                            class="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>🚀</span> บันทึกการตั้งค่า & เริ่มการติดตั้งฐานข้อมูลทันที
                        </button>
                    </div>
                </form>

            <?php endif; ?>

        </div>

        <!-- Footer -->
        <div class="bg-slate-50 p-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง &bull; รองรับ PHP 8.x + MySQL / MariaDB
        </div>
    </div>
</body>
</html>
