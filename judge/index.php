<?php
/**
 * ==============================================================================
 * ไฟล์: judge/index.php
 * คำอธิบาย: ระบบรายงานผลการแข่งขันและกรรมการตัดสิน (Referee & Live Score Console)
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/thai_formatter.php';

requireRole(['REFEREE', 'SUPER_ADMIN', 'ADMIN']);
$user = getCurrentUser();
$pdo = Database::getConnection();

// Ensure match_reports table exists
$pdo->exec("CREATE TABLE IF NOT EXISTS `match_reports` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$message = '';
$error = '';
$activeTab = $_GET['tab'] ?? 'MATCH_REPORT';

$sports = $pdo->query("SELECT * FROM sports WHERE status = 'ACTIVE' ORDER BY sport_name ASC")->fetchAll();
$rawEvents = $pdo->query("SELECT e.*, s.sport_name FROM events e JOIN sports s ON e.sport_id = s.id")->fetchAll();
$events = sortEventsList($rawEvents);
$schools = $pdo->query("SELECT * FROM schools ORDER BY school_name ASC")->fetchAll();

// Handle Delete Match Report
if (isset($_GET['delete_report'])) {
    $delId = $_GET['delete_report'];
    $stmt = $pdo->prepare("DELETE FROM match_reports WHERE id = ?");
    $stmt->execute([$delId]);
    header("Location: /judge/index.php?tab=MATCH_REPORT&msg=" . urlencode("ลบรายงานผลการแข่งขันเรียบร้อยแล้ว"));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'RECORD_MEDAL';

    if ($action === 'MATCH_REPORT') {
        $sportId = $_POST['sport_id'] ?? '';
        $eventName = trim($_POST['event_name'] ?? '');
        $winnerSchoolId = $_POST['winner_school_id'] ?? '';
        $loserSchoolId = $_POST['loser_school_id'] ?? '';
        $winnerScore = (int)($_POST['winner_score'] ?? 0);
        $loserScore = (int)($_POST['loser_score'] ?? 0);
        $roundName = $_POST['round_name'] ?? 'รอบแรก';
        $matchStatus = $_POST['match_status'] ?? 'COMPLETED';
        $reporterName = trim($_POST['reporter_name'] ?? ($user['full_name'] ?? 'เจ้าหน้าที่รายงานผล'));

        if (empty($winnerSchoolId) || empty($loserSchoolId)) {
            $error = 'กรุณาเลือกโรงเรียนทั้งสองฝ่าย';
        } elseif ($winnerSchoolId === $loserSchoolId) {
            $error = 'ฝ่ายชนะและฝ่ายแพ้ต้องไม่ใช่โรงเรียนเดียวกัน';
        } else {
            $sport = null;
            foreach ($sports as $s) {
                if ($s['id'] === $sportId) { $sport = $s; break; }
            }
            $sportName = $sport ? $sport['sport_name'] : 'กีฬา';

            $winnerSch = null;
            $loserSch = null;
            foreach ($schools as $sch) {
                if ($sch['id'] === $winnerSchoolId) $winnerSch = $sch;
                if ($sch['id'] === $loserSchoolId) $loserSch = $sch;
            }

            $wName = $winnerSch ? $winnerSch['school_name'] : 'โรงเรียนที่ 1';
            $lName = $loserSch ? $loserSch['school_name'] : 'โรงเรียนที่ 2';

            $isDraw = ($winnerScore === $loserScore);
            $summary = $isDraw
                ? "{$wName} เสมอ {$lName} {$winnerScore} ต่อ {$loserScore}"
                : "{$wName} ชนะ {$lName} {$winnerScore} ต่อ {$loserScore}";

            try {
                $mrId = 'mr_' . time() . '_' . rand(100, 999);
                $ins = $pdo->prepare("INSERT INTO match_reports 
                    (id, competition_id, sport_id, sport_name, event_name, team_1_school_id, team_1_school_name, team_1_score, team_2_school_id, team_2_school_name, team_2_score, winner_school_id, match_date, match_time, round_name, summary_text, reporter_name, status)
                    VALUES (?, 'comp-2026', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_FORMAT(NOW(), '%H:%i'), ?, ?, ?, ?)");
                $ins->execute([
                    $mrId,
                    $sportId,
                    $sportName,
                    $eventName ?: $sportName,
                    $winnerSchoolId,
                    $wName,
                    $winnerScore,
                    $loserSchoolId,
                    $lName,
                    $loserScore,
                    $isDraw ? null : $winnerSchoolId,
                    $roundName,
                    $summary,
                    $reporterName,
                    $matchStatus
                ]);

                logActivity('RECORD_MATCH_REPORT', 'JUDGE', "รายงานผล: $summary");
                $message = "✅ บันทึกและเผยแพร่รายงานผลการแข่งขันเรียบร้อยแล้ว!";
            } catch (Exception $e) {
                $error = "เกิดข้อผิดพลาด: " . $e->getMessage();
            }
        }
    } elseif ($action === 'RECORD_MEDAL') {
        $eventId = $_POST['event_id'] ?? '';
        $schoolId = $_POST['school_id'] ?? '';
        $rank = (int)($_POST['rank'] ?? 1);
        $medal = $_POST['medal'] ?? 'GOLD';
        $score = $_POST['score'] ?? '';
        $award = $_POST['award'] ?? 'ชนะเลิศเหรียญทอง';

        try {
            $stmt = $pdo->prepare("
                INSERT INTO results (id, competition_id, event_id, school_id, rank, award, medal, score, recorded_by, status)
                VALUES (?, 'comp-2026', ?, ?, ?, ?, ?, ?, ?, 'OFFICIAL')
            ");
            $stmt->execute([
                'res-' . uniqid(),
                $eventId,
                $schoolId,
                $rank,
                $award,
                $medal,
                $score,
                $user['full_name']
            ]);
            logActivity('RECORD_RESULT', 'JUDGE', "บันทึกผลการแข่งขัน Event $eventId อันดับ $rank");
            $message = "✅ บันทึกผลการแข่งขันสำเร็จและอัปเดตตารางเหรียญรางวัลแล้ว!";
        } catch (Exception $e) {
            $error = "เกิดข้อผิดพลาด: " . $e->getMessage();
        }
    }
}

// Fetch all match reports
$matchReports = $pdo->query("SELECT * FROM match_reports ORDER BY created_at DESC LIMIT 30")->fetchAll();

$pageTitle = 'รายงานผลการแข่งขัน - กรรมการผู้ตัดสิน';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="max-w-4xl mx-auto space-y-6 pb-12">
    <!-- Banner -->
    <div class="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div class="flex items-center gap-3">
            <div class="p-3 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-400/30 text-2xl">
                📱
            </div>
            <div>
                <h1 class="text-xl sm:text-2xl font-bold font-kanit">
                    ระบบรายงานผลการแข่งขันและกรรมการตัดสิน (Referee & Live Score Console)
                </h1>
                <p class="text-xs sm:text-sm text-purple-200 mt-0.5">
                    รายงานผลการแข่งขันรายวันแบบ Real-time ให้ประชาชนทั่วไปทราบ และบันทึกสรุปเหรียญรางวัลทางการ
                </p>
            </div>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center gap-2">
        <a href="?tab=MATCH_REPORT" class="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all <?= $activeTab === 'MATCH_REPORT' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100' ?>">
            <span>⚡ รายงานผลการแข่งขันประจำวัน (Live Match Scores)</span>
        </a>
        <a href="?tab=OFFICIAL_MEDAL" class="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all <?= $activeTab === 'OFFICIAL_MEDAL' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100' ?>">
            <span>🏆 บันทึกสรุปเหรียญรางวัลทางการ (Medals & Certs)</span>
        </a>
    </div>

    <?php if ($message || isset($_GET['msg'])): ?>
        <div class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-2xl font-semibold flex items-center gap-3">
            <span class="text-xl">✅</span> <?= htmlspecialchars($message ?: $_GET['msg']) ?>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="p-4 bg-rose-50 border border-rose-300 text-rose-800 text-sm rounded-2xl font-semibold flex items-center gap-3">
            <span class="text-xl">⚠️</span> <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <!-- TAB 1: DAILY MATCH REPORT -->
    <?php if ($activeTab === 'MATCH_REPORT'): ?>
        <div class="space-y-6">
            <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
                <div class="border-b border-slate-100 pb-4">
                    <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                        <span>🔥</span> ป้อนข้อมูลรายงานผลการแข่งขัน (ใช้งานง่าย เลือกโรงเรียนและใส่คะแนน)
                    </h2>
                    <p class="text-xs text-slate-500 mt-1">
                        เช่น วันนี้ ฟุตบอล: โรงเรียนบ้านสว่าง ชนะ โรงเรียนบ้านหนองหว้า 3 ต่อ 0 (จะแสดงบนหน้าแรกของเว็บไซต์ทันที)
                    </p>
                </div>

                <form method="POST" class="space-y-5 text-xs">
                    <input type="hidden" name="action" value="MATCH_REPORT">
                    
                    <!-- Sport & Event -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">
                                ชนิดกีฬา <span class="text-rose-500">*</span>
                            </label>
                            <select name="sport_id" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                                <?php foreach ($sports as $sp): ?>
                                    <option value="<?= htmlspecialchars($sp['id']) ?>">
                                        <?= htmlspecialchars($sp['sport_name']) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 mb-1">
                                รายการแข่งขัน / รุ่นอายุ / รอบ
                            </label>
                            <input type="text" name="event_name" placeholder="เช่น ฟุตบอล 7 คน ชาย (ป.1-6) รอบแรก" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                        </div>
                    </div>

                    <!-- Scores & Teams -->
                    <div class="p-5 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-4">
                        <div class="flex items-center justify-between text-xs text-purple-900 font-bold">
                            <span>⚽ คู่การแข่งขันและสกอร์คะแนน</span>
                            <span class="text-[11px] font-normal text-purple-700">ฝ่ายที่ 1 (ชนะ/ได้) VS ฝ่ายที่ 2 (แพ้/เสีย)</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <!-- Team 1 -->
                            <div class="md:col-span-5 space-y-1">
                                <label class="block font-bold text-slate-800 text-[11px]">
                                    🏆 ฝ่ายที่ 1 (ฝ่ายชนะ / ฝ่ายที่ได้) <span class="text-rose-500">*</span>
                                </label>
                                <select name="winner_school_id" required class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="">-- เลือกโรงเรียนฝ่ายที่ 1 --</option>
                                    <?php foreach ($schools as $sch): ?>
                                        <option value="<?= htmlspecialchars($sch['id']) ?>">
                                            <?= htmlspecialchars($sch['school_name']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>

                            <!-- Score 1 -->
                            <div class="md:col-span-2 space-y-1 text-center">
                                <label class="block font-bold text-slate-800 text-[11px]">สกอร์ฝ่ายที่ 1</label>
                                <input type="number" name="winner_score" min="0" value="3" required class="w-full p-2.5 bg-white border-2 border-purple-400 rounded-xl text-center text-base font-black text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none">
                            </div>

                            <!-- Score 2 -->
                            <div class="md:col-span-2 space-y-1 text-center">
                                <label class="block font-bold text-slate-800 text-[11px]">สกอร์ฝ่ายที่ 2</label>
                                <input type="number" name="loser_score" min="0" value="0" required class="w-full p-2.5 bg-white border-2 border-slate-300 rounded-xl text-center text-base font-black text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none">
                            </div>

                            <!-- Team 2 -->
                            <div class="md:col-span-3 space-y-1">
                                <label class="block font-bold text-slate-800 text-[11px]">
                                    ฝ่ายที่ 2 (ฝ่ายแพ้ / คู่แข่ง) <span class="text-rose-500">*</span>
                                </label>
                                <select name="loser_school_id" required class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="">-- เลือกโรงเรียนฝ่ายที่ 2 --</option>
                                    <?php foreach ($schools as $sch): ?>
                                        <option value="<?= htmlspecialchars($sch['id']) ?>">
                                            <?= htmlspecialchars($sch['school_name']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Round, Status, Reporter -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">รอบการแข่งขัน</label>
                            <select name="round_name" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                                <option value="รอบแรก">รอบแรก</option>
                                <option value="รอบแบ่งกลุ่ม">รอบแบ่งกลุ่ม</option>
                                <option value="รอบ 8 ทีม">รอบ 8 ทีม</option>
                                <option value="รอบรองชนะเลิศ">รอบรองชนะเลิศ</option>
                                <option value="ชิงชนะเลิศ">รอบชิงชนะเลิศ (Final)</option>
                                <option value="ชิงอันดับ 3">รอบชิงอันดับ 3</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 mb-1">สถานะการแข่งขัน</label>
                            <select name="match_status" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
                                <option value="COMPLETED">🏁 จบการแข่งขัน (Full Time)</option>
                                <option value="LIVE">🔴 กำลังแข่งขัน (Live Match)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 mb-1">เจ้าหน้าที่ผู้รายงานผล</label>
                            <input type="text" name="reporter_name" value="<?= htmlspecialchars($user['full_name'] ?? 'กรรมการตัดสิน') ?>" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                        </div>
                    </div>

                    <div class="flex items-center justify-end pt-3 border-t border-slate-100">
                        <button type="submit" class="px-8 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer">
                            <span>🚀</span> บันทึกและเผยแพร่รายงานผลการแข่งขัน
                        </button>
                    </div>
                </form>
            </div>

            <!-- Feed of Recent Reports -->
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <h3 class="font-bold font-kanit text-slate-900 text-base flex items-center gap-2">
                    <span>📋</span> รายการรายงานผลการแข่งขันล่าสุด (<?= count($matchReports) ?> รายการ)
                </h3>

                <div class="divide-y divide-slate-100">
                    <?php foreach ($matchReports as $mr): ?>
                        <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <div class="flex items-center gap-2 text-[11px] mb-1">
                                    <span class="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                                        <?= htmlspecialchars($mr['sport_name']) ?>
                                    </span>
                                    <span class="text-slate-500 font-medium"><?= htmlspecialchars($mr['event_name']) ?></span>
                                    <span class="text-slate-400">•</span>
                                    <span class="text-slate-500"><?= htmlspecialchars($mr['round_name']) ?></span>
                                    <span class="text-slate-400">•</span>
                                    <span class="text-slate-400"><?= htmlspecialchars($mr['match_time'] ?: $mr['match_date']) ?></span>
                                </div>
                                <div class="text-sm font-bold text-slate-900">
                                    <?= htmlspecialchars($mr['summary_text']) ?>
                                </div>
                                <div class="text-[11px] text-slate-400 mt-0.5">
                                    ผู้รายงาน: <?= htmlspecialchars($mr['reporter_name']) ?>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 self-end sm:self-center">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold <?= $mr['status'] === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse' ?>">
                                    <?= $mr['status'] === 'COMPLETED' ? '🏁 จบการแข่งขัน' : '🔴 กำลังแข่งขัน' ?>
                                </span>
                                <a href="?delete_report=<?= urlencode($mr['id']) ?>" onclick="return confirm('ยืนยันลบรายงานผลการแข่งขันนี้?')" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition" title="ลบรายการนี้">
                                    🗑️
                                </a>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <?php if (empty($matchReports)): ?>
                        <div class="py-8 text-center text-slate-400 text-xs">
                            ยังไม่มีการรายงานผลการแข่งขันในวันนี้
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <!-- TAB 2: OFFICIAL MEDAL PLACEMENT -->
    <?php if ($activeTab === 'OFFICIAL_MEDAL'): ?>
        <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
            <div class="border-b border-slate-100 pb-4">
                <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>🏆</span> บันทึกสรุปเหรียญรางวัลทางการ (Official Medal Recording)
                </h2>
                <p class="text-xs text-slate-500 mt-1">
                    บันทึกผลการแข่งขันและเหรียญรางวัล เพื่อคำนวณเหรียญรวมและออกเกียรติบัตร
                </p>
            </div>

            <form method="POST" class="space-y-4 text-xs">
                <input type="hidden" name="action" value="RECORD_MEDAL">

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">รายการแข่งขัน (Event) <span class="text-rose-500">*</span></label>
                    <select name="event_id" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                        <?php foreach ($events as $ev): ?>
                            <option value="<?= htmlspecialchars($ev['id']) ?>">
                                [<?= htmlspecialchars($ev['sport_name']) ?>] <?= htmlspecialchars($ev['event_name']) ?> (<?= htmlspecialchars($ev['grade'] ?? '') ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">โรงเรียนผู้ได้รับรางวัล <span class="text-rose-500">*</span></label>
                    <select name="school_id" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                        <option value="">-- เลือกโรงเรียน --</option>
                        <?php foreach ($schools as $sch): ?>
                            <option value="<?= htmlspecialchars($sch['id']) ?>">
                                <?= htmlspecialchars($sch['school_name']) ?> (SMIS: <?= htmlspecialchars($sch['smis_code']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">อันดับ (Rank)</label>
                        <select name="rank" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold">
                            <option value="1">อันดับ 1 (ชนะเลิศ)</option>
                            <option value="2">อันดับ 2 (รองชนะเลิศอันดับ 1)</option>
                            <option value="3">อันดับ 3 (รองชนะเลิศอันดับ 2)</option>
                            <option value="4">อันดับ 4 (ชมเชย)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">เหรียญรางวัล</label>
                        <select name="medal" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold">
                            <option value="GOLD">🥇 เหรียญทอง (GOLD)</option>
                            <option value="SILVER">🥈 เหรียญเงิน (SILVER)</option>
                            <option value="BRONZE">🥉 เหรียญทองแดง (BRONZE)</option>
                            <option value="NONE">ไม่มีเหรียญ (เกียรติบัตรเข้าร่วม)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">ชื่อรางวัล / ข้อความบนเกียรติบัตร</label>
                    <input type="text" name="award" value="ชนะเลิศ" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                </div>

                <div>
                    <label class="block font-semibold text-slate-700 mb-1">ผลคะแนน / เวลา / เซต (ถ้ามี)</label>
                    <input type="text" name="score" placeholder="เช่น 3 - 1 หรือ 11.24 วินาที" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                </div>

                <div class="pt-2">
                    <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                        <span>💾</span> บันทึกผลการแข่งขันและส่งมอบคะแนน
                    </button>
                </div>
            </form>
        </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
