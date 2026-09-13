<?php
/**
 * ==============================================================================
 * ไฟล์: admin/events.php
 * คำอธิบาย: จัดการชนิดกีฬาและรายการแข่งขัน (Sports & Events Management)
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/thai_formatter.php';

requireRole(['SUPER_ADMIN', 'ADMIN']);
$pdo = Database::getConnection();
$message = '';
$error = '';

// ตรวจสอบค่า competition_id
$comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch();
$compId = $comp['id'] ?? 'comp-2026';

// -------------------------------------------------------------
// 1. จัดการชนิดกีฬา (Add / Edit / Delete Sport)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_sport'])) {
    $action = $_POST['action_sport'];
    $sportName = trim($_POST['sport_name'] ?? '');
    $sportIcon = trim($_POST['sport_icon'] ?? '🏆');
    $category = trim($_POST['category'] ?? 'BALL_SPORTS');
    $description = trim($_POST['description'] ?? '');
    $sportId = trim($_POST['sport_id'] ?? '');

    if ($action === 'add' && $sportName) {
        $newId = 'sp-' . uniqid();
        $stmt = $pdo->prepare("INSERT INTO sports (id, sport_name, sport_icon, description, category, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')");
        $stmt->execute([$newId, $sportName, $sportIcon, $description, $category]);
        logActivity('ADD_SPORT', 'SPORTS', "เพิ่มชนิดกีฬา: $sportName");
        $message = "เพิ่มชนิดกีฬา \"$sportName\" เรียบร้อยแล้ว";
    } elseif ($action === 'edit' && $sportId && $sportName) {
        $stmt = $pdo->prepare("UPDATE sports SET sport_name = ?, sport_icon = ?, description = ?, category = ? WHERE id = ?");
        $stmt->execute([$sportName, $sportIcon, $description, $category, $sportId]);
        logActivity('EDIT_SPORT', 'SPORTS', "แก้ไขชนิดกีฬา: $sportName");
        $message = "บันทึกการแก้ไขชนิดกีฬา \"$sportName\" เรียบร้อยแล้ว";
    }
}

if (isset($_GET['delete_sport_id'])) {
    $delSportId = $_GET['delete_sport_id'];
    $stmt = $pdo->prepare("DELETE FROM sports WHERE id = ?");
    $stmt->execute([$delSportId]);
    logActivity('DELETE_SPORT', 'SPORTS', "ลบชนิดกีฬา ID: $delSportId");
    $message = "ลบชนิดกีฬาเรียบร้อยแล้ว";
}

// -------------------------------------------------------------
// 2. จัดการรายการแข่งขัน (Add / Edit / Delete Event)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_event'])) {
    $action = $_POST['action_event'];
    $sportId = trim($_POST['sport_id'] ?? '');
    $eventCode = trim($_POST['event_code'] ?? '');
    $athleticsItem = trim($_POST['athletics_item'] ?? '');
    $gender = trim($_POST['gender'] ?? 'MALE');
    $rawGrade = trim($_POST['grade'] ?? STANDARD_LEVEL_PRIMARY);
    $grade = normalizeEducationLevel($rawGrade);
    $ageGroup = $grade; // ใช้ระดับชั้นมาตรฐานเดียวกัน
    $competitionType = trim($_POST['competition_type'] ?? 'TEAM');
    $awardType = trim($_POST['award_type'] ?? 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร');
    $maxPlayers = intval($_POST['max_players'] ?? 12);
    $minPlayers = intval($_POST['min_players'] ?? 1);
    $eventId = trim($_POST['event_id'] ?? '');

    // ดึงชนิดกีฬาและหมวดหมู่จากฐานข้อมูลเสมอ เพื่อป้องกันชื่อรายการไม่ตรงกับกีฬาที่เลือก
    $spStmt = $pdo->prepare("SELECT sport_name, category FROM sports WHERE id = ?");
    $spStmt->execute([$sportId]);
    $spRow = $spStmt->fetch();
    $sportName = $spRow['sport_name'] ?? 'กีฬา';
    $sportCategory = $spRow['category'] ?? '';
    $isAthletics = $sportCategory === 'ATHLETICS' || isAthleticsSport($sportName);

    // รายการย่อย เช่น วิ่ง 60 เมตร ใช้ได้เฉพาะกรีฑาเท่านั้น
    // กีฬาประเภทอื่นต้องใช้ชื่อชนิดกีฬาที่เลือกเสมอ
    if (!$isAthletics) {
        $athleticsItem = '';
    }

    // สร้างชื่อรายการแบบมาตรฐานอัตโนมัติ ไม่ต้องพิมพ์เอง
    $eventName = formatEventDisplay($sportName, $grade, $athleticsItem, $gender);

    if ($action === 'add' && $sportId) {
        $newId = 'ev-' . uniqid();
        if (!$eventCode) {
            $prefix = isAthleticsSport($sportName) ? 'ATH' : 'SP';
            $eventCode = $prefix . '-' . rand(100, 999);
        }
        $stmt = $pdo->prepare("INSERT INTO events (id, competition_id, sport_id, event_code, event_name, gender, age_group, grade, competition_type, award_type, max_players, min_players, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')");
        $stmt->execute([$newId, $compId, $sportId, $eventCode, $eventName, $gender, $ageGroup, $grade, $competitionType, $awardType, $maxPlayers, $minPlayers]);
        logActivity('ADD_EVENT', 'EVENTS', "เพิ่มรายการแข่งขัน: $eventName ($eventCode)");
        $message = "เพิ่มรายการแข่งขัน \"$eventName\" เรียบร้อยแล้ว";
    } elseif ($action === 'edit' && $eventId) {
        if (!$eventCode) {
            $eventCode = 'EV-' . rand(100, 999);
        }
        $stmt = $pdo->prepare("UPDATE events SET sport_id = ?, event_code = ?, event_name = ?, gender = ?, age_group = ?, grade = ?, competition_type = ?, award_type = ?, max_players = ?, min_players = ? WHERE id = ?");
        $stmt->execute([$sportId, $eventCode, $eventName, $gender, $ageGroup, $grade, $competitionType, $awardType, $maxPlayers, $minPlayers, $eventId]);
        logActivity('EDIT_EVENT', 'EVENTS', "แก้ไขรายการแข่งขัน: $eventName ($eventCode)");
        $message = "บันทึกการแก้ไขรายการแข่งขัน \"$eventName\" เรียบร้อยแล้ว";
    }
}

if (isset($_GET['delete_event_id'])) {
    $delEventId = $_GET['delete_event_id'];
    $stmt = $pdo->prepare("DELETE FROM events WHERE id = ?");
    $stmt->execute([$delEventId]);
    logActivity('DELETE_EVENT', 'EVENTS', "ลบรายการแข่งขัน ID: $delEventId");
    $message = "ลบรายการแข่งขันเรียบร้อยแล้ว";
}

// -------------------------------------------------------------
// แก้ไขข้อมูลเดิมที่เกิดจากการใช้ชื่อรายการกรีฑากับกีฬาชนิดอื่น
// -------------------------------------------------------------
function repairMismatchedEventNames(PDO $pdo): int {
    $rows = $pdo->query("SELECT e.id, e.event_name, e.grade, e.gender, s.sport_name, s.category FROM events e JOIN sports s ON e.sport_id = s.id")->fetchAll();
    $sportNames = $pdo->query("SELECT sport_name FROM sports")->fetchAll(PDO::FETCH_COLUMN);
    $update = $pdo->prepare("UPDATE events SET event_name = ? WHERE id = ?");
    $fixed = 0;

    foreach ($rows as $row) {
        $sportName = trim($row['sport_name'] ?? '');
        $eventName = trim($row['event_name'] ?? '');
        $isAthletics = ($row['category'] ?? '') === 'ATHLETICS' || isAthleticsSport($sportName);
        if ($isAthletics || $sportName === '' || $eventName === '') {
            continue;
        }

        preg_match('/^([^[]+)(.*)$/u', $eventName, $parts);
        $baseName = trim($parts[1] ?? '');
        $looksLikeAthletics = preg_match('/^(วิ่ง|กระโดด|ทุ่ม|ขว้าง|พุ่ง)/u', $baseName) === 1;
        $isAnotherSport = $baseName !== $sportName && in_array($baseName, $sportNames, true);
        if (!$looksLikeAthletics && !$isAnotherSport) {
            continue;
        }

        $correctName = formatEventDisplay($sportName, normalizeEducationLevel($row['grade'] ?? ''), '', $row['gender'] ?? 'MALE');
        if ($correctName !== $eventName) {
            $update->execute([$correctName, $row['id']]);
            $fixed++;
        }
    }
    return $fixed;
}

$repairedEventCount = repairMismatchedEventNames($pdo);
if ($repairedEventCount > 0 && !$message) {
    $message = "ปรับชื่อรายการแข่งขันเดิมให้ตรงกับชนิดกีฬาแล้ว {$repairedEventCount} รายการ";
}

// -------------------------------------------------------------
// ดึงข้อมูลสำหรับแสดงผล
// -------------------------------------------------------------
$sports = $pdo->query("SELECT * FROM sports ORDER BY sport_name ASC")->fetchAll();
$selectedSport = $_GET['filter_sport'] ?? 'ALL';
$selectedSportRow = null;
foreach ($sports as $sport) {
    if ($sport['id'] === $selectedSport) {
        $selectedSportRow = $sport;
        break;
    }
}
$showAthleticsQuickAdd = $selectedSport === 'ALL' || ($selectedSportRow && (($selectedSportRow['category'] ?? '') === 'ATHLETICS' || isAthleticsSport($selectedSportRow['sport_name'] ?? '')));

$sqlEvents = "
    SELECT e.*, s.sport_name, s.sport_icon,
           (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as reg_count
    FROM events e
    JOIN sports s ON e.sport_id = s.id
";
if ($selectedSport !== 'ALL') {
    $sqlEvents .= " WHERE e.sport_id = " . $pdo->quote($selectedSport);
}
$rawEvents = $pdo->query($sqlEvents)->fetchAll();
$events = sortEventsList($rawEvents);

$athleticsPresets = getAthleticsPresets();

$pageTitle = 'จัดการชนิดกีฬาและรายการแข่งขัน - Admin Console';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- Header Bar -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-xl font-bold font-kanit text-slate-900 flex items-center gap-2">
                <span>🏆</span> จัดการชนิดกีฬาและรายการแข่งขัน (Sports & Events)
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">
                เลือกชนิดกีฬา เลือกระดับชั้น (3 ระดับชั้นมาตรฐาน) และเลือกรายการกรีฑา โดยระบบจะจัดรูปแบบชื่อรายการแข่งขันให้อัตโนมัติ
            </p>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="document.getElementById('modalSport').classList.remove('hidden')" class="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold border border-blue-200 transition flex items-center gap-1.5 cursor-pointer">
                <span>➕</span> เพิ่มชนิดกีฬา
            </button>
            <button onclick="openAddEventModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                <span>➕</span> เพิ่มรายการแข่งขัน
            </button>
        </div>
    </div>

    <?php if ($message): ?>
        <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 shadow-sm">
            <span class="text-base">✅</span> <?= htmlspecialchars($message) ?>
        </div>
    <?php endif; ?>

    <!-- Sports Quick Grid -->
    <div class="space-y-3">
        <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold font-kanit text-slate-800 flex items-center gap-2">
                <span>🏅</span> ชนิดกีฬาทั้งหมด (<?= count($sports) ?> ชนิด)
            </h2>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <a href="?filter_sport=ALL" class="p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center <?= $selectedSport === 'ALL' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300' ?>">
                <span class="text-xl mb-1">🌐</span>
                <span class="text-xs font-bold font-kanit">ทั้งหมด</span>
                <span class="text-[10px] opacity-80"><?= count($events) ?> รายการ</span>
            </a>
            <?php foreach ($sports as $sp): 
                $countInSport = count(array_filter($events, fn($e) => $e['sport_id'] === $sp['id']));
                $isActive = $selectedSport === $sp['id'];
            ?>
                <div class="relative group rounded-2xl border p-3 text-center transition <?= $isActive ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300' ?>">
                    <a href="?filter_sport=<?= urlencode($sp['id']) ?>" class="block">
                        <span class="text-2xl mb-1 block"><?= htmlspecialchars($sp['sport_icon'] ?: '🏆') ?></span>
                        <span class="text-xs font-bold font-kanit text-slate-900 block truncate"><?= htmlspecialchars($sp['sport_name']) ?></span>
                        <span class="text-[10px] text-slate-400 block"><?= htmlspecialchars($sp['category']) ?></span>
                    </a>
                    <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px]">
                        <button onclick='editSport(<?= json_encode($sp) ?>)' class="text-blue-600 hover:text-blue-800 font-medium">แก้ไข</button>
                        <span class="text-slate-300">|</span>
                        <a href="?delete_sport_id=<?= urlencode($sp['id']) ?>" onclick="return confirm('ยืนยันลบชนิดกีฬา <?= addslashes($sp['sport_name']) ?> หรือไม่?')" class="text-rose-600 hover:text-rose-800 font-medium">ลบ</a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Events Table -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
                <h2 class="text-sm font-bold font-kanit text-slate-800 flex items-center gap-2">
                    <span>📋</span> รายการแข่งขันทั้งหมด (<?= count($events) ?> รายการ)
                </h2>
                <div class="text-xs text-slate-500 mt-0.5">
                    รองรับ 3 ระดับชั้นมาตรฐาน (อนุบาล / ประถม / ม.ต้น) และมีตัวเลือกรายการกรีฑามาตรฐาน
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
                <?php if ($showAthleticsQuickAdd): ?>
                <span class="text-[11px] font-bold text-slate-600 mr-1">เพิ่มรายการกรีฑาด่วน:</span>
                <button type="button" onclick="quickAddAthletics('วิ่ง 60 เมตร', '<?= STANDARD_LEVEL_KINDERGARTEN ?>', 'MALE', 'ATH-M-60M-K')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer">
                    + วิ่ง 60ม. ชาย (อนุบาล)
                </button>
                <button type="button" onclick="quickAddAthletics('วิ่ง 60 เมตร', '<?= STANDARD_LEVEL_KINDERGARTEN ?>', 'FEMALE', 'ATH-F-60M-K')" class="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer">
                    + วิ่ง 60ม. หญิง (อนุบาล)
                </button>
                <button type="button" onclick="quickAddAthletics('วิ่ง 80 เมตร', '<?= STANDARD_LEVEL_PRIMARY ?>', 'MALE', 'ATH-M-80M-P')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer">
                    + วิ่ง 80ม. ชาย (ประถม)
                </button>
                <button type="button" onclick="quickAddAthletics('วิ่ง 80 เมตร', '<?= STANDARD_LEVEL_PRIMARY ?>', 'FEMALE', 'ATH-F-80M-P')" class="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-300 rounded-lg text-xs font-semibold shadow-xs cursor-pointer">
                    + วิ่ง 80ม. หญิง (ประถม)
                </button>
                <?php else: ?>
                <span class="text-[11px] text-slate-500">เลือก "เพิ่มรายการแข่งขัน" เพื่อสร้างรายการของ <?= htmlspecialchars($selectedSportRow['sport_name'] ?? 'กีฬานี้') ?> โดยตรง</span>
                <?php endif; ?>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                        <th class="p-3.5 pl-6">รหัส / ชนิดกีฬา</th>
                        <th class="p-3.5">ชื่อรายการแข่งขัน</th>
                        <th class="p-3.5">เพศ</th>
                        <th class="p-3.5">ระดับชั้นการศึกษา</th>
                        <th class="p-3.5 text-center">ประเภท / จำนวนคน</th>
                        <th class="p-3.5 text-center">ทีมสมัคร</th>
                        <th class="p-3.5 pr-6 text-right">จัดการ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($events)): ?>
                        <tr>
                            <td colspan="7" class="p-8 text-center text-slate-400">
                                📭 ยังไม่มีรายการแข่งขันในหมวดหมู่นี้ กรุณากดปุ่ม "+ เพิ่มรายการแข่งขัน"
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($events as $ev): 
                            $normG = normalizeEducationLevel($ev['grade']);
                            $dispName = formatEventRegistrationDisplay($ev['event_name'], $ev['grade'], $ev['sport_name']);
                        ?>
                            <tr class="hover:bg-slate-50/80 transition">
                                <td class="p-3.5 pl-6 font-mono">
                                    <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                                        <?= htmlspecialchars($ev['event_code']) ?>
                                    </span>
                                    <div class="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                                        <span><?= $ev['sport_icon'] ?></span>
                                        <span><?= htmlspecialchars($ev['sport_name']) ?></span>
                                    </div>
                                </td>
                                <td class="p-3.5 font-bold font-kanit text-slate-900 text-sm">
                                    <?= htmlspecialchars($dispName) ?>
                                    <div class="text-[10px] font-normal text-slate-400 mt-0.5">
                                        <?= htmlspecialchars($ev['award_type']) ?>
                                    </div>
                                </td>
                                <td class="p-3.5">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold <?= $ev['gender'] === 'MALE' ? 'bg-blue-50 text-blue-700' : ($ev['gender'] === 'FEMALE' ? 'bg-rose-50 text-rose-700' : 'bg-purple-50 text-purple-700') ?>">
                                        <?= $ev['gender'] === 'MALE' ? 'ชาย' : ($ev['gender'] === 'FEMALE' ? 'หญิง' : 'ผสม') ?>
                                    </span>
                                </td>
                                <td class="p-3.5">
                                    <span class="px-2.5 py-1 rounded-lg text-xs font-semibold <?= $normG === STANDARD_LEVEL_KINDERGARTEN ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ($normG === STANDARD_LEVEL_PRIMARY ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200') ?>">
                                        <?= htmlspecialchars($normG) ?>
                                    </span>
                                </td>
                                <td class="p-3.5 text-center">
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-medium <?= $ev['competition_type'] === 'TEAM' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700' ?>">
                                        <?= $ev['competition_type'] === 'TEAM' ? 'ประเภททีม' : 'ประเภทเดี่ยว' ?>
                                    </span>
                                    <div class="text-[10px] text-slate-400 mt-1">
                                        <?= $ev['min_players'] ?> - <?= $ev['max_players'] ?> คน
                                    </div>
                                </td>
                                <td class="p-3.5 text-center">
                                    <span class="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700 text-[11px]">
                                        <?= $ev['reg_count'] ?> โรงเรียน
                                    </span>
                                </td>
                                <td class="p-3.5 pr-6 text-right space-x-2">
                                    <button onclick='editEvent(<?= json_encode($ev) ?>)' class="text-blue-600 hover:text-blue-900 font-semibold cursor-pointer">แก้ไข</button>
                                    <a href="?delete_event_id=<?= urlencode($ev['id']) ?>" onclick="return confirm('ยืนยันลบรายการ <?= addslashes($ev['event_name']) ?> หรือไม่?')" class="text-rose-600 hover:text-rose-900 font-semibold">ลบ</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ========================================================================= -->
<!-- Modal: เพิ่ม / แก้ไข ชนิดกีฬา -->
<!-- ========================================================================= -->
<div id="modalSport" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 id="modalSportTitle" class="font-bold font-kanit text-slate-900 text-base flex items-center gap-2">
                <span>🏅</span> เพิ่มชนิดกีฬาใหม่
            </h3>
            <button onclick="document.getElementById('modalSport').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
        </div>
        <form method="POST" class="space-y-3 text-xs">
            <input type="hidden" name="action_sport" id="sportFormAction" value="add">
            <input type="hidden" name="sport_id" id="sportFormId" value="">

            <div>
                <label class="block font-bold text-slate-700 mb-1">ชื่อชนิดกีฬา <span class="text-rose-500">*</span></label>
                <input type="text" name="sport_name" id="sportFormName" required placeholder="เช่น ฟุตบอล, วอลเลย์บอล, กรีฑา" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">อิโมจิไอคอน</label>
                    <input type="text" name="sport_icon" id="sportFormIcon" value="🏆" placeholder="⚽, 🏐, 🏃, 🏓" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-base">
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">หมวดหมู่</label>
                    <select name="category" id="sportFormCategory" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        <option value="BALL_SPORTS">กีฬาประเภทลูกบอล</option>
                        <option value="ATHLETICS">กรีฑา (ลู่/ลาน)</option>
                        <option value="RACKET_SPORTS">กีฬาประเภทแร็กเกต</option>
                        <option value="TRADITIONAL">กีฬาพื้นบ้าน/ไทย</option>
                        <option value="ESPORTS">อีสปอร์ต/หมากกระดาน</option>
                        <option value="OTHER">อื่นๆ</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">คำอธิบายเพิ่มเติม</label>
                <textarea name="description" id="sportFormDesc" rows="2" placeholder="ระเบียบกติกาหรือรายละเอียดสังเขป" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"></textarea>
            </div>

            <div class="pt-3 flex gap-2">
                <button type="button" onclick="document.getElementById('modalSport').classList.add('hidden')" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer">ยกเลิก</button>
                <button type="submit" class="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md cursor-pointer">บันทึกข้อมูล</button>
            </div>
        </form>
    </div>
</div>

<!-- ========================================================================= -->
<!-- Modal: เพิ่ม / แก้ไข รายการแข่งขัน (แบบเลือก 3 ระดับชั้น + กรีฑาอัตโนมัติ) -->
<!-- ========================================================================= -->
<div id="modalEvent" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
                <span class="text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full">
                    🏆 จัดการรายการแข่งขันกีฬาและกรีฑา
                </span>
                <h3 id="modalEventTitle" class="font-bold font-kanit text-slate-900 text-lg mt-1 flex items-center gap-2">
                    <span>➕</span> เพิ่มรายการแข่งขันใหม่
                </h3>
            </div>
            <button onclick="document.getElementById('modalEvent').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">&times;</button>
        </div>

        <form method="POST" id="eventForm" class="space-y-4 text-xs">
            <input type="hidden" name="action_event" id="eventFormAction" value="add">
            <input type="hidden" name="event_id" id="eventFormId" value="">
            <input type="hidden" name="grade" id="eventFormGrade" value="<?= STANDARD_LEVEL_PRIMARY ?>">

            <!-- Step 1: สังกัดชนิดกีฬา -->
            <div>
                <label class="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>1. เลือกชนิดกีฬา / กรีฑา <span class="text-rose-500">*</span></span>
                    <span id="athleticsBadge" class="hidden text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
                        🏃‍♂️ กรีฑา (มีรายการย่อยให้เลือก)
                    </span>
                </label>
                <select name="sport_id" id="eventFormSportId" required onchange="onSportChange()" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold">
                    <?php foreach ($sports as $s): ?>
                        <option value="<?= htmlspecialchars($s['id']) ?>" data-sport-name="<?= htmlspecialchars($s['sport_name']) ?>" data-icon="<?= htmlspecialchars($s['sport_icon']) ?>">
                            <?= $s['sport_icon'] ?> <?= htmlspecialchars($s['sport_name']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <!-- Step 2: 3 ระดับชั้นการศึกษามาตรฐาน (Strictly 3 choices) -->
            <div>
                <label class="block font-bold text-slate-700 mb-1.5">
                    2. เลือกระดับชั้นการแข่งขัน (3 ระดับชั้นมาตรฐาน) <span class="text-rose-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button type="button" onclick="selectGrade('<?= STANDARD_LEVEL_KINDERGARTEN ?>')" id="btnGrade_kindergarten" class="grade-btn p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between bg-white text-slate-700 border-slate-200 hover:bg-emerald-50">
                        <div class="font-bold text-xs">1. ระดับชั้นอนุบาล</div>
                        <div class="text-[10px] text-slate-400 mt-1">ปฐมวัย / อ.1 - อ.3</div>
                    </button>
                    <button type="button" onclick="selectGrade('<?= STANDARD_LEVEL_PRIMARY ?>')" id="btnGrade_primary" class="grade-btn p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between bg-blue-600 text-white border-blue-600 shadow-sm">
                        <div class="font-bold text-xs">2. ระดับชั้นประถมศึกษา</div>
                        <div class="text-[10px] text-white/80 mt-1">ป.1 - ป.6</div>
                    </button>
                    <button type="button" onclick="selectGrade('<?= STANDARD_LEVEL_SECONDARY ?>')" id="btnGrade_secondary" class="grade-btn p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between bg-white text-slate-700 border-slate-200 hover:bg-purple-50">
                        <div class="font-bold text-xs">3. ระดับชั้นมัธยมศึกษาตอนต้น</div>
                        <div class="text-[10px] text-slate-400 mt-1">ม.1 - ม.3</div>
                    </button>
                </div>
            </div>

            <!-- Step 3: รายการแข่งขันกรีฑา (แสดงเมื่อเลือก กรีฑา) -->
            <div id="athleticsContainer" class="hidden p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <label class="font-bold text-amber-950 block text-xs flex items-center justify-between">
                    <span class="flex items-center gap-1.5">
                        <span>🏃‍♂️</span> 3. เลือกรายการแข่งขันกรีฑา <span class="text-rose-500">*</span>
                    </span>
                    <span class="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                        เลือกจากรายการมาตรฐาน
                    </span>
                </label>
                <select name="athletics_item" id="eventFormAthleticsItem" onchange="onAthleticsItemChange()" class="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-bold text-amber-950">
                    <optgroup label="🏃 ประเภทวิ่งเดี่ยว (Individual Running)">
                        <?php foreach (array_filter($athleticsPresets, fn($a) => $a['category'] === 'RUN') as $ap): ?>
                            <option value="<?= htmlspecialchars($ap['name']) ?>" data-type="<?= $ap['type'] ?>" data-min="<?= $ap['min_players'] ?>" data-max="<?= $ap['max_players'] ?>">
                                <?= htmlspecialchars($ap['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </optgroup>
                    <optgroup label="🤝 ประเภทวิ่งผลัด (Relay Races)">
                        <?php foreach (array_filter($athleticsPresets, fn($a) => $a['category'] === 'RELAY') as $ap): ?>
                            <option value="<?= htmlspecialchars($ap['name']) ?>" data-type="<?= $ap['type'] ?>" data-min="<?= $ap['min_players'] ?>" data-max="<?= $ap['max_players'] ?>">
                                <?= htmlspecialchars($ap['name']) ?> (ทีม <?= $ap['min_players'] ?>-<?= $ap['max_players'] ?> คน)
                            </option>
                        <?php endforeach; ?>
                    </optgroup>
                    <optgroup label="🎯 ประเภทลาน (Field Events)">
                        <?php foreach (array_filter($athleticsPresets, fn($a) => $a['category'] === 'FIELD') as $ap): ?>
                            <option value="<?= htmlspecialchars($ap['name']) ?>" data-type="<?= $ap['type'] ?>" data-min="<?= $ap['min_players'] ?>" data-max="<?= $ap['max_players'] ?>">
                                <?= htmlspecialchars($ap['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </optgroup>
                </select>
            </div>

            <!-- Auto Generated Preview Box (No free typing required) -->
            <div class="p-4 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-50 border border-blue-200/80 rounded-2xl space-y-2">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                        <span>✨</span> ชื่อรายการแข่งขันที่จะสร้าง (จัดรูปแบบมาตรฐานอัตโนมัติ)
                    </span>
                    <span class="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                        ไม่ต้องพิมพ์เอง
                    </span>
                </div>

                <div class="p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
                    <div class="text-base font-bold text-blue-950 font-kanit flex items-center gap-2" id="previewEventName">
                        ⚽ ฟุตบอล[ระดับชั้นประถมศึกษา]
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-600">
                    <span class="bg-white px-2.5 py-1 rounded-lg border border-blue-100 font-medium">
                        ชนิดกีฬา: <strong id="previewSportText" class="text-slate-800">ฟุตบอล</strong>
                    </span>
                    <span class="bg-white px-2.5 py-1 rounded-lg border border-blue-100 font-medium">
                        ระดับชั้น: <strong id="previewGradeText" class="text-slate-800">ระดับชั้นประถมศึกษา</strong>
                    </span>
                </div>
            </div>

            <!-- Step 4: เพศ / รูปแบบ / จำนวนคน -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">เพศ</label>
                    <select name="gender" id="eventFormGender" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        <option value="MALE">👦 ชาย (Male)</option>
                        <option value="FEMALE">👧 หญิง (Female)</option>
                        <option value="MIXED">👥 ชาย/หญิง ผสม (Mixed)</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">ประเภทการแข่งขัน</label>
                    <select name="competition_type" id="eventFormType" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        <option value="TEAM">👥 ประเภททีม</option>
                        <option value="INDIVIDUAL">👤 ประเภทเดี่ยว</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">รหัสรายการ (ถ้ามี)</label>
                    <input type="text" name="event_code" id="eventFormCode" placeholder="เว้นว่างได้" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">ผู้เล่นขั้นต่ำ (คน)</label>
                    <input type="number" name="min_players" id="eventFormMin" value="1" min="1" max="50" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">ผู้เล่นสูงสุด (คน)</label>
                    <input type="number" name="max_players" id="eventFormMax" value="12" min="1" max="50" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">รางวัลที่จะได้รับ</label>
                <input type="text" name="award_type" id="eventFormAward" value="เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
            </div>

            <div class="pt-3 flex gap-2">
                <button type="button" onclick="document.getElementById('modalEvent').classList.add('hidden')" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer">ยกเลิก</button>
                <button type="submit" class="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md cursor-pointer">บันทึกรายการแข่งขัน</button>
            </div>
        </form>
    </div>
</div>

<script>
let currentGrade = '<?= STANDARD_LEVEL_PRIMARY ?>';

const ATHLETICS_DATA = <?= json_encode($athleticsPresets) ?>;

function getSelectedSportInfo() {
    const sel = document.getElementById('eventFormSportId');
    if (!sel || !sel.options[sel.selectedIndex]) return { name: 'กีฬา', icon: '🏆', isAthletics: false };
    const opt = sel.options[sel.selectedIndex];
    const name = opt.getAttribute('data-sport-name') || opt.innerText;
    const icon = opt.getAttribute('data-icon') || '🏆';
    const isAthletics = /(กรีฑา|athletics|track|วิ่ง|ลาน|ลู่)/i.test(name);
    return { name, icon, isAthletics };
}

function cleanSportName(raw) {
    if (!raw) return 'กีฬา';
    let s = raw.replace(/^(ประเภทกีฬา|ชนิดกีฬา|กีฬา)\s*/i, '').replace(/\[.*?\]|\(.*?\)/g, '').trim();
    return s || 'กีฬา';
}

function selectGrade(grade) {
    currentGrade = grade;
    document.getElementById('eventFormGrade').value = grade;

    const btns = {
        '<?= STANDARD_LEVEL_KINDERGARTEN ?>': { id: 'btnGrade_kindergarten', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm', normalClass: 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50' },
        '<?= STANDARD_LEVEL_PRIMARY ?>': { id: 'btnGrade_primary', activeClass: 'bg-blue-600 text-white border-blue-600 shadow-sm', normalClass: 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50' },
        '<?= STANDARD_LEVEL_SECONDARY ?>': { id: 'btnGrade_secondary', activeClass: 'bg-purple-600 text-white border-purple-600 shadow-sm', normalClass: 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50' }
    };

    for (const [k, v] of Object.entries(btns)) {
        const el = document.getElementById(v.id);
        if (el) {
            if (k === grade) {
                el.className = 'grade-btn p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ' + v.activeClass;
                const sub = el.querySelector('.text-\\[10px\\]');
                if (sub) sub.className = 'text-[10px] text-white/80 mt-1';
            } else {
                el.className = 'grade-btn p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ' + v.normalClass;
                const sub = el.querySelector('.text-\\[10px\\]');
                if (sub) sub.className = 'text-[10px] text-slate-400 mt-1';
            }
        }
    }

    updatePreview();
}

function onSportChange() {
    const sp = getSelectedSportInfo();
    const athBox = document.getElementById('athleticsContainer');
    const athBadge = document.getElementById('athleticsBadge');

    if (sp.isAthletics) {
        athBox.classList.remove('hidden');
        athBadge.classList.remove('hidden');
        onAthleticsItemChange();
    } else {
        athBox.classList.add('hidden');
        athBadge.classList.add('hidden');
        
        // Auto default players for ball sports
        if (/ฟุตบอล/i.test(sp.name)) {
            document.getElementById('eventFormType').value = 'TEAM';
            document.getElementById('eventFormMin').value = 7;
            document.getElementById('eventFormMax').value = 12;
        } else if (/วอลเลย์บอล/i.test(sp.name)) {
            document.getElementById('eventFormType').value = 'TEAM';
            document.getElementById('eventFormMin').value = 6;
            document.getElementById('eventFormMax').value = 12;
        } else if (/เซปักตะกร้อ/i.test(sp.name)) {
            document.getElementById('eventFormType').value = 'TEAM';
            document.getElementById('eventFormMin').value = 3;
            document.getElementById('eventFormMax').value = 5;
        } else if (/เปตอง/i.test(sp.name)) {
            document.getElementById('eventFormType').value = 'TEAM';
            document.getElementById('eventFormMin').value = 3;
            document.getElementById('eventFormMax').value = 3;
        }
    }
    updatePreview();
}

function onAthleticsItemChange() {
    const sel = document.getElementById('eventFormAthleticsItem');
    if (!sel || !sel.options[sel.selectedIndex]) return;
    const opt = sel.options[sel.selectedIndex];
    const type = opt.getAttribute('data-type') || 'INDIVIDUAL';
    const minP = opt.getAttribute('data-min') || '1';
    const maxP = opt.getAttribute('data-max') || '1';

    document.getElementById('eventFormType').value = type;
    document.getElementById('eventFormMin').value = minP;
    document.getElementById('eventFormMax').value = maxP;

    updatePreview();
}

function updatePreview() {
    const sp = getSelectedSportInfo();
    const cleanSp = cleanSportName(sp.name);
    let finalTitle = '';

    if (sp.isAthletics) {
        const athSel = document.getElementById('eventFormAthleticsItem');
        const athName = athSel ? athSel.value : 'วิ่ง 100 เมตร';
        finalTitle = athName + '[' + currentGrade + ']';
    } else {
        finalTitle = cleanSp + '[' + currentGrade + ']';
    }

    const previewEl = document.getElementById('previewEventName');
    if (previewEl) {
        previewEl.innerHTML = sp.icon + ' ' + finalTitle;
    }
    const sportTxt = document.getElementById('previewSportText');
    if (sportTxt) sportTxt.innerText = cleanSp;
    const gradeTxt = document.getElementById('previewGradeText');
    if (gradeTxt) gradeTxt.innerText = currentGrade;
}

function openAddEventModal() {
    document.getElementById('modalEventTitle').innerHTML = '<span>➕</span> เพิ่มรายการแข่งขันใหม่';
    document.getElementById('eventFormAction').value = 'add';
    document.getElementById('eventFormId').value = '';
    document.getElementById('eventFormCode').value = '';
    selectGrade('<?= STANDARD_LEVEL_PRIMARY ?>');
    onSportChange();
    document.getElementById('modalEvent').classList.remove('hidden');
}

function quickAddAthletics(athItemName, grade, gender, defaultCode) {
    // Find athletics sport option in select
    const sel = document.getElementById('eventFormSportId');
    if (!sel) return;
    for (let i = 0; i < sel.options.length; i++) {
        const txt = sel.options[i].text || '';
        if (/(กรีฑา|วิ่ง)/i.test(txt)) {
            sel.selectedIndex = i;
            break;
        }
    }
    
    document.getElementById('modalEventTitle').innerHTML = '<span>➕</span> เพิ่มรายการแข่งขันกรีฑา: ' + athItemName;
    document.getElementById('eventFormAction').value = 'add';
    document.getElementById('eventFormId').value = '';
    document.getElementById('eventFormCode').value = defaultCode || '';
    document.getElementById('eventFormGender').value = gender || 'MALE';
    
    selectGrade(grade);
    onSportChange();

    const athSel = document.getElementById('eventFormAthleticsItem');
    if (athSel) {
        for (let i = 0; i < athSel.options.length; i++) {
            if (athSel.options[i].value === athItemName) {
                athSel.selectedIndex = i;
                break;
            }
        }
        onAthleticsItemChange();
    }

    updatePreview();
    document.getElementById('modalEvent').classList.remove('hidden');
}

function editSport(sp) {
    document.getElementById('modalSportTitle').innerText = '✏️ แก้ไขชนิดกีฬา: ' + sp.sport_name;
    document.getElementById('sportFormAction').value = 'edit';
    document.getElementById('sportFormId').value = sp.id;
    document.getElementById('sportFormName').value = sp.sport_name;
    document.getElementById('sportFormIcon').value = sp.sport_icon || '🏆';
    document.getElementById('sportFormCategory').value = sp.category || 'BALL_SPORTS';
    document.getElementById('sportFormDesc').value = sp.description || '';
    document.getElementById('modalSport').classList.remove('hidden');
}

function editEvent(ev) {
    document.getElementById('modalEventTitle').innerHTML = '<span>✏️</span> แก้ไขรายการแข่งขัน: ' + (ev.event_name || '');
    document.getElementById('eventFormAction').value = 'edit';
    document.getElementById('eventFormId').value = ev.id;
    document.getElementById('eventFormSportId').value = ev.sport_id;
    document.getElementById('eventFormCode').value = ev.event_code || '';
    document.getElementById('eventFormGender').value = ev.gender || 'MALE';
    document.getElementById('eventFormType').value = ev.competition_type || 'TEAM';
    document.getElementById('eventFormMin').value = ev.min_players || 1;
    document.getElementById('eventFormMax').value = ev.max_players || 12;
    document.getElementById('eventFormAward').value = ev.award_type || 'เหรียญทอง/เงิน/ทองแดง + เกียรติบัตร';
    
    // Normalize grade
    let g = ev.grade || '<?= STANDARD_LEVEL_PRIMARY ?>';
    if (/(อนุบาล|ปฐมวัย)/i.test(g)) g = '<?= STANDARD_LEVEL_KINDERGARTEN ?>';
    else if (/(มัธยม|ม\.ต้น)/i.test(g)) g = '<?= STANDARD_LEVEL_SECONDARY ?>';
    else g = '<?= STANDARD_LEVEL_PRIMARY ?>';

    selectGrade(g);
    onSportChange();

    // Check if athletics
    if (/(กรีฑา|วิ่ง|ลาน|ลู่)/i.test(ev.sport_name || '') || /(วิ่ง|กระโดด|ทุ่ม|ขว้าง|พุ่ง)/i.test(ev.event_name || '')) {
        const athSel = document.getElementById('eventFormAthleticsItem');
        if (athSel) {
            for (let i = 0; i < athSel.options.length; i++) {
                if (ev.event_name && ev.event_name.includes(athSel.options[i].value)) {
                    athSel.selectedIndex = i;
                    break;
                }
            }
        }
    }

    updatePreview();
    document.getElementById('modalEvent').classList.remove('hidden');
}

// Initial binding
document.addEventListener('DOMContentLoaded', function() {
    onSportChange();
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
