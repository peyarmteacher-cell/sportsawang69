<?php
/**
 * ==============================================================================
 * ไฟล์: config/database.php
 * คำอธิบาย: ตั้งค่าการเชื่อมต่อฐานข้อมูล MySQL/MariaDB และ SQLite สำรองผ่าน PDO
 * พร้อมระบบตรวจสอบและติดตั้งฐานข้อมูลอัตโนมัติ (Zero-Config Auto Installer)
 * ==============================================================================
 */

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
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            // 1. ลองเชื่อมต่อ MySQL ตามค่า Config
            try {
                $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                // หาก MySQL ยังไม่ถูกสร้างหรือยังไม่มีตาราง ให้ลองรัน Auto Install
                if ($e->getCode() === 1049 || $e->getCode() === 2002) {
                    try {
                        self::autoInstallDatabase();
                        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                        self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
                    } catch (Exception $installEx) {
                        // 2. ถ้า MySQL บน Server ยังไม่ได้ตั้งค่าหรือไม่มีสิทธิ์ ให้ใช้ SQLite แบบ Zero-Config สำรองทันที
                        self::$instance = self::getSqliteFallback();
                    }
                } else {
                    // หาก Access Denied ให้ใช้ SQLite สำรองเพื่อให้เว็บใช้งานได้ทันที 100%
                    self::$instance = self::getSqliteFallback();
                }
            }
        }
        return self::$instance;
    }

    /**
     * SQLite Fallback Database เพื่อให้รันบน Server PHP ได้ทันทีโดยไม่ต้องตั้งค่า MySQL
     */
    private static function getSqliteFallback(): PDO {
        $sqliteFile = __DIR__ . '/../database.sqlite';
        $isNew = !file_exists($sqliteFile);
        $pdo = new PDO("sqlite:" . $sqliteFile, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);

        if ($isNew || filesize($sqliteFile) < 1024) {
            self::initSqliteTables($pdo);
        }
        return $pdo;
    }

    /**
     * สร้างตารางและข้อมูลเริ่มต้นสำหรับ SQLite
     */
    private static function initSqliteTables(PDO $pdo): void {
        $sql = "
        CREATE TABLE IF NOT EXISTS competitions (
            id TEXT PRIMARY KEY,
            competition_name TEXT,
            academic_year TEXT,
            host_org TEXT,
            venue TEXT,
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'ACTIVE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS schools (
            id TEXT PRIMARY KEY,
            school_code TEXT,
            smis_code TEXT UNIQUE,
            school_name TEXT,
            short_name TEXT,
            director_name TEXT,
            phone TEXT,
            address TEXT,
            logo TEXT,
            status TEXT DEFAULT 'ACTIVE'
        );
        CREATE TABLE IF NOT EXISTS sports (
            id TEXT PRIMARY KEY,
            sport_code TEXT,
            sport_name TEXT,
            sport_icon TEXT,
            category TEXT,
            status TEXT DEFAULT 'ACTIVE'
        );
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            sport_id TEXT,
            event_code TEXT,
            event_name TEXT,
            gender_category TEXT,
            age_category TEXT,
            education_level TEXT,
            max_athletes_per_team INTEGER DEFAULT 1,
            status TEXT DEFAULT 'ACTIVE'
        );
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            school_id TEXT,
            prefix TEXT,
            first_name TEXT,
            last_name TEXT,
            gender TEXT,
            grade_level TEXT,
            status TEXT DEFAULT 'ACTIVE'
        );
        CREATE TABLE IF NOT EXISTS coaches (
            id TEXT PRIMARY KEY,
            competition_id TEXT,
            school_id TEXT,
            prefix TEXT,
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            position TEXT DEFAULT 'ครูผู้ฝึกสอน',
            status TEXT DEFAULT 'ACTIVE'
        );
        CREATE TABLE IF NOT EXISTS registrations (
            id TEXT PRIMARY KEY,
            competition_id TEXT,
            school_id TEXT,
            event_id TEXT,
            coach_id TEXT,
            secondary_coach_id TEXT,
            coach_ids TEXT,
            registration_status TEXT DEFAULT 'APPROVED',
            registered_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS registration_students (
            id TEXT PRIMARY KEY,
            registration_id TEXT,
            student_id TEXT
        );
        CREATE TABLE IF NOT EXISTS registration_coaches (
            id TEXT PRIMARY KEY,
            registration_id TEXT,
            coach_id TEXT
        );
        CREATE TABLE IF NOT EXISTS results (
            id TEXT PRIMARY KEY,
            competition_id TEXT,
            event_id TEXT,
            school_id TEXT,
            medal TEXT,
            score TEXT,
            rank_position INTEGER,
            status TEXT DEFAULT 'OFFICIAL',
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS match_reports (
            id TEXT PRIMARY KEY,
            competition_id TEXT DEFAULT 'comp-2026',
            sport_id TEXT,
            sport_name TEXT,
            event_name TEXT,
            team_1_school_id TEXT,
            team_1_school_name TEXT,
            team_1_score INTEGER DEFAULT 0,
            team_2_school_id TEXT,
            team_2_school_name TEXT,
            team_2_score INTEGER DEFAULT 0,
            winner_school_id TEXT,
            match_date TEXT,
            match_time TEXT,
            round_name TEXT DEFAULT 'รอบแรก',
            summary_text TEXT,
            reporter_name TEXT,
            status TEXT DEFAULT 'COMPLETED',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS certificates (
            id TEXT PRIMARY KEY,
            certificate_no TEXT UNIQUE,
            recipient_name TEXT,
            school_name TEXT,
            role TEXT,
            sport_name TEXT,
            event_name TEXT,
            award_text TEXT,
            issue_date TEXT,
            qr_code_url TEXT
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            full_name TEXT,
            role TEXT,
            school_id TEXT,
            status TEXT DEFAULT 'ACTIVE',
            must_change_password INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            username TEXT,
            action TEXT,
            module TEXT,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ";
        $pdo->exec($sql);

        // นำเข้าข้อมูลโรงเรียน 12 แห่งและผู้ใช้เริ่มต้น
        $initData = "
        INSERT OR IGNORE INTO competitions (id, competition_name, academic_year, host_org, venue, start_date, end_date)
        VALUES ('comp-2026', 'การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปีการศึกษา 2569', '2569', 'กลุ่มโรงเรียนสว่างสูงกระสัง • สพป.บุรีรัมย์ เขต 3', 'สนามกีฬาโรงเรียนบ้านหนองหว้า อ.กระสัง จ.บุรีรัมย์', '2026-11-15', '2026-11-20');

        INSERT OR IGNORE INTO schools (id, smis_code, school_name, short_name, director_name, phone, address, logo) VALUES
        ('sch-01', '31030064', 'โรงเรียนบ้านหนองหว้า', 'บ้านหนองหว้า', 'นายชวน ผาสุขดี', '081-234-5678', 'ต.หนองเต็ง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150'),
        ('sch-02', '31030065', 'โรงเรียนบ้านสว่าง', 'บ้านสว่าง', 'นายสมคิด ยอดเพชร', '081-234-5679', 'ต.บ้านสว่าง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150'),
        ('sch-03', '31030066', 'โรงเรียนบ้านโคกสูง', 'บ้านโคกสูง', 'นายประวิทย์ บัวลอย', '081-234-5680', 'ต.บ้านสว่าง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150'),
        ('sch-04', '31030067', 'โรงเรียนบ้านกระสัง', 'บ้านกระสัง', 'นางสาววิไลลักษณ์ ศรีสุข', '081-234-5681', 'ต.กระสัง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150'),
        ('sch-05', '31030068', 'โรงเรียนบ้านตาจง', 'บ้านตาจง', 'นายธนาธิป สุขเกษม', '081-234-5682', 'ต.ตาจง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150'),
        ('sch-06', '31030069', 'โรงเรียนบ้านระกา', 'บ้านระกา', 'นางศิริพร บุญเสริม', '081-234-5683', 'ต.ระกา อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=150'),
        ('sch-07', '31030070', 'โรงเรียนบ้านกะทิง', 'บ้านกะทิง', 'นายสมศักดิ์ รัตนวงศ์', '081-234-5684', 'ต.หนองเต็ง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150'),
        ('sch-08', '31030071', 'โรงเรียนบ้านตะลุง', 'บ้านตะลุง', 'นางมยุรี จันทรา', '081-234-5685', 'ต.กระสัง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150'),
        ('sch-09', '31030072', 'โรงเรียนบ้านถนน', 'บ้านถนน', 'นายอนุชา พงษ์สวัสดิ์', '081-234-5686', 'ต.บ้านสว่าง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1562774053-701939374585?w=150'),
        ('sch-10', '31030073', 'โรงเรียนบ้านลำดวน', 'บ้านลำดวน', 'นายสุรชัย คำมูล', '081-234-5687', 'ต.ตาจง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150'),
        ('sch-11', '31030074', 'โรงเรียนบ้านสูงเนิน', 'บ้านสูงเนิน', 'นางสาวปิยะดา นิลเพ็ชร', '081-234-5688', 'ต.ระกา อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=150'),
        ('sch-12', '31030075', 'โรงเรียนบ้านสองชั้น', 'บ้านสองชั้น', 'นายพิเชษฐ์ เกตุแก้ว', '081-234-5689', 'ต.หนองเต็ง อ.กระสัง จ.บุรีรัมย์', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=150');

        INSERT OR IGNORE INTO sports (id, sport_code, sport_name, sport_icon, category) VALUES
        ('sp-01', 'FOOTBALL', 'ฟุตบอล 7 คน', '⚽', 'กีฬาสากล'),
        ('sp-02', 'FUTSAL', 'ฟุตซอล', '🥅', 'กีฬาสากล'),
        ('sp-03', 'VOLLEYBALL', 'วอลเลย์บอล', '🏐', 'กีฬาสากล'),
        ('sp-04', 'SEPAK_TAKRAW', 'เซปักตะกร้อ', '🏸', 'กีฬาไทย'),
        ('sp-05', 'TABLE_TENNIS', 'เทเบิลเทนนิส (ปิงปอง)', '🏓', 'กีฬาสากล'),
        ('sp-06', 'BADMINTON', 'แบดมินตัน', '🏸', 'กีฬาสากล'),
        ('sp-07', 'PETANQUE', 'เปตอง', '⚪', 'กีฬาสากล');

        INSERT OR IGNORE INTO users (id, username, password, full_name, role, school_id) VALUES
        ('usr-01', 'superadmin', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผอ.สยาม เชียงเครือ (ผู้ดูแลระบบสูงสุด)', 'SUPER_ADMIN', NULL),
        ('usr-02', 'admin', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'คณะกรรมการจัดการแข่งขันกลาง', 'ADMIN', NULL),
        ('usr-03', 'reporter', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'เจ้าหน้าที่รายงานผลและผู้ตัดสิน', 'REFEREE', NULL),
        ('usr-04', '31030064', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านหนองหว้า', 'SCHOOL', 'sch-01'),
        ('usr-05', '31030065', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านสว่าง', 'SCHOOL', 'sch-02'),
        ('usr-06', '31030066', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านโคกสูง', 'SCHOOL', 'sch-03'),
        ('usr-07', '31030067', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านกระสัง', 'SCHOOL', 'sch-04'),
        ('usr-08', '31030068', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านตาจง', 'SCHOOL', 'sch-05'),
        ('usr-09', '31030069', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านระกา', 'SCHOOL', 'sch-06'),
        ('usr-10', '31030070', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านกะทิง', 'SCHOOL', 'sch-07'),
        ('usr-11', '31030071', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านตะลุง', 'SCHOOL', 'sch-08'),
        ('usr-12', '31030072', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านถนน', 'SCHOOL', 'sch-09'),
        ('usr-13', '31030073', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านลำดวน', 'SCHOOL', 'sch-10'),
        ('usr-14', '31030074', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านสูงเนิน', 'SCHOOL', 'sch-11'),
        ('usr-15', '31030075', '\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ รร.บ้านสองชั้น', 'SCHOOL', 'sch-12');

        INSERT OR IGNORE INTO events (id, sport_id, event_code, event_name, gender_category, education_level, max_athletes_per_team) VALUES
        ('ev-01', 'sp-01', 'FB-M-PRI', 'ฟุตบอล 7 คน[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 12),
        ('ev-02', 'sp-02', 'FS-M-PRI', 'ฟุตซอล[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 10),
        ('ev-03', 'sp-03', 'VB-F-PRI', 'วอลเลย์บอล[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 12),
        ('ev-04', 'sp-04', 'ST-M-PRI', 'เซปักตะกร้อ[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 5),
        ('ev-05', 'sp-07', 'PT-MIX-PRI', 'เปตอง[ทีมผสม][ระดับชั้นประถมศึกษา]', 'MIXED', 'ระดับชั้นประถมศึกษา', 3),
        ('ev-ath-k-01', 'sp-06', 'ATH-M-50M-K', 'วิ่ง 50 เมตร[ทีมชาย][ระดับชั้นอนุบาล]', 'MALE', 'ระดับชั้นอนุบาล', 1),
        ('ev-ath-k-02', 'sp-06', 'ATH-F-50M-K', 'วิ่ง 50 เมตร[ทีมหญิง][ระดับชั้นอนุบาล]', 'FEMALE', 'ระดับชั้นอนุบาล', 1),
        ('ev-ath-k-03', 'sp-06', 'ATH-M-60M-K', 'วิ่ง 60 เมตร[ทีมชาย][ระดับชั้นอนุบาล]', 'MALE', 'ระดับชั้นอนุบาล', 1),
        ('ev-ath-k-04', 'sp-06', 'ATH-F-60M-K', 'วิ่ง 60 เมตร[ทีมหญิง][ระดับชั้นอนุบาล]', 'FEMALE', 'ระดับชั้นอนุบาล', 1),
        ('ev-ath-k-05', 'sp-06', 'ATH-MIX-4X50M-K', 'วิ่งผลัด 4 x 50 เมตร[ทีมผสม][ระดับชั้นอนุบาล]', 'MIXED', 'ระดับชั้นอนุบาล', 6),
        ('ev-ath-p-01', 'sp-06', 'ATH-M-80M-P', 'วิ่ง 80 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 1),
        ('ev-ath-p-02', 'sp-06', 'ATH-F-80M-P', 'วิ่ง 80 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 1),
        ('ev-ath-p-03', 'sp-06', 'ATH-M-100M-P', 'วิ่ง 100 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 1),
        ('ev-ath-p-04', 'sp-06', 'ATH-F-100M-P', 'วิ่ง 100 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 1),
        ('ev-ath-p-05', 'sp-06', 'ATH-M-200M-P', 'วิ่ง 200 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 1),
        ('ev-ath-p-06', 'sp-06', 'ATH-F-200M-P', 'วิ่ง 200 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 1),
        ('ev-ath-p-07', 'sp-06', 'ATH-M-400M-P', 'วิ่ง 400 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 1),
        ('ev-ath-p-08', 'sp-06', 'ATH-F-400M-P', 'วิ่ง 400 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 1),
        ('ev-ath-p-09', 'sp-06', 'ATH-M-4X100M-P', 'วิ่งผลัด 4 x 100 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]', 'MALE', 'ระดับชั้นประถมศึกษา', 6),
        ('ev-ath-p-10', 'sp-06', 'ATH-F-4X100M-P', 'วิ่งผลัด 4 x 100 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]', 'FEMALE', 'ระดับชั้นประถมศึกษา', 6),
        ('ev-ath-s-01', 'sp-06', 'ATH-M-100M-S', 'วิ่ง 100 เมตร[ทีมชาย][ระดับชั้นมัธยมศึกษาตอนต้น]', 'MALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 1),
        ('ev-ath-s-02', 'sp-06', 'ATH-F-100M-S', 'วิ่ง 100 เมตร[ทีมหญิง][ระดับชั้นมัธยมศึกษาตอนต้น]', 'FEMALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 1),
        ('ev-ath-s-03', 'sp-06', 'ATH-M-200M-S', 'วิ่ง 200 เมตร[ทีมชาย][ระดับชั้นมัธยมศึกษาตอนต้น]', 'MALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 1),
        ('ev-ath-s-04', 'sp-06', 'ATH-F-200M-S', 'วิ่ง 200 เมตร[ทีมหญิง][ระดับชั้นมัธยมศึกษาตอนต้น]', 'FEMALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 1),
        ('ev-ath-s-05', 'sp-06', 'ATH-M-400M-S', 'วิ่ง 400 เมตร[ทีมชาย][ระดับชั้นมัธยมศึกษาตอนต้น]', 'MALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 1),
        ('ev-ath-s-06', 'sp-06', 'ATH-F-400M-S', 'วิ่ง 400 เมตร[ทีมหญิง][ระดับชั้นมัธยมศึกษาตอนต้น]', 'FEMALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 1),
        ('ev-ath-s-07', 'sp-06', 'ATH-M-4X100M-S', 'วิ่งผลัด 4 x 100 เมตร[ทีมชาย][ระดับชั้นมัธยมศึกษาตอนต้น]', 'MALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 6),
        ('ev-ath-s-08', 'sp-06', 'ATH-F-4X100M-S', 'วิ่งผลัด 4 x 100 เมตร[ทีมหญิง][ระดับชั้นมัธยมศึกษาตอนต้น]', 'FEMALE', 'ระดับชั้นมัธยมศึกษาตอนต้น', 6);
        ";
        $pdo->exec($initData);
    }

    /**
     * ติดตั้งฐานข้อมูล โครงสร้างตาราง และข้อมูลโรงเรียน 12 แห่งสำหรับ MySQL
     */
    public static function autoInstallDatabase(): bool {
        try {
            $rootDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=" . DB_CHARSET;
            $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
            $rootPdo->exec("USE `" . DB_NAME . "`;");

            $sqlFile = __DIR__ . '/../database.sql';
            if (file_exists($sqlFile)) {
                $sql = file_get_contents($sqlFile);
                $rootPdo->exec($sql);
            }
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}

/**
 * แปลงวันที่ ค.ศ. (YYYY-MM-DD) เป็นวันที่ภาษาไทย (วัน เดือน ปี พ.ศ.)
 */
function formatThaiDate(?string $dateStr): string {
    if (empty($dateStr)) return '';
    $thaiMonths = [
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
        5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
        9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
    ];

    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})/', $dateStr, $matches)) {
        $year = (int)$matches[1] + 543;
        $month = (int)$matches[2];
        $day = (int)$matches[3];
        $monthName = $thaiMonths[$month] ?? '';
        return "{$day} {$monthName} {$year}";
    }

    $timestamp = strtotime($dateStr);
    if ($timestamp === false) return $dateStr;
    $day = (int)date('j', $timestamp);
    $month = (int)date('n', $timestamp);
    $year = (int)date('Y', $timestamp) + 543;
    $monthName = $thaiMonths[$month] ?? '';
    return "{$day} {$monthName} {$year}";
}

/**
 * แปลงช่วงวันที่เป็นรูปแบบภาษาไทย
 */
function formatThaiDateRange(?string $startDate, ?string $endDate): string {
    if (empty($startDate) && empty($endDate)) return '';
    if (!empty($startDate) && empty($endDate)) return formatThaiDate($startDate);
    if (empty($startDate) && !empty($endDate)) return formatThaiDate($endDate);
    return formatThaiDate($startDate) . ' ถึง ' . formatThaiDate($endDate);
}
?>
