<?php
/**
 * ==============================================================================
 * ไฟล์: admin/results.php
 * คำอธิบาย: ระบบบันทึกและประกาศผลการแข่งขันอย่างเป็นทางการ (Official Results Management)
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/thai_formatter.php';

requireRole(['SUPER_ADMIN', 'ADMIN']);
$pdo = Database::getConnection();
$user = getCurrentUser();
$message = '';
$error = '';

$comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch();
$compId = $comp['id'] ?? 'comp-2026';

// -------------------------------------------------------------
// 1. บันทึก / ประกาศผลการแข่งขัน (Save & Announce Results)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_result'])) {
    $eventId = trim($_POST['event_id'] ?? '');
    $goldSchoolId = trim($_POST['gold_school_id'] ?? '');
    $silverSchoolId = trim($_POST['silver_school_id'] ?? '');
    $bronzeSchoolId = trim($_POST['bronze_school_id'] ?? '');
    $honorableSchoolId = trim($_POST['honorable_school_id'] ?? '');
    $scoreNote = trim($_POST['score_note'] ?? '');
    $autoGenerateCert = isset($_POST['auto_cert']);

    if ($eventId && ($goldSchoolId || $silverSchoolId || $bronzeSchoolId)) {
        try {
            $pdo->beginTransaction();

            // ดึงข้อมูลรายการแข่งขัน
            $evStmt = $pdo->prepare("SELECT e.*, s.sport_name FROM events e JOIN sports s ON e.sport_id = s.id WHERE e.id = ?");
            $evStmt->execute([$eventId]);
            $eventInfo = $evStmt->fetch();

            // ลบผลเดิมของรายการนี้ออกก่อนเพื่อป้องกันข้อมูลซ้ำซ้อน
            $pdo->prepare("DELETE FROM results WHERE event_id = ?")->execute([$eventId]);

            $awards = [
                ['school_id' => $goldSchoolId, 'rank' => 1, 'award' => 'ชนะเลิศ (เหรียญทอง)', 'medal' => 'GOLD'],
                ['school_id' => $silverSchoolId, 'rank' => 2, 'award' => 'รองชนะเลิศอันดับ 1 (เหรียญเงิน)', 'medal' => 'SILVER'],
                ['school_id' => $bronzeSchoolId, 'rank' => 3, 'award' => 'รองชนะเลิศอันดับ 2 (เหรียญทองแดง)', 'medal' => 'BRONZE'],
                ['school_id' => $honorableSchoolId, 'rank' => 4, 'award' => 'รางวัลชมเชย', 'medal' => 'NONE'],
            ];

            $certPrefix = $comp['cert_prefix'] ?? 'สพป.บร.3/2569-';
            $certCount = $pdo->query("SELECT COUNT(*) FROM certificates")->fetchColumn();

            foreach ($awards as $aw) {
                if (empty($aw['school_id'])) continue;

                $resId = 'res-' . uniqid();
                $rStmt = $pdo->prepare("
                    INSERT INTO results (id, competition_id, event_id, school_id, `rank`, award, medal, score, note, recorded_by, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OFFICIAL')
                ");
                $rStmt->execute([
                    $resId, $compId, $eventId, $aw['school_id'], $aw['rank'], $aw['award'], $aw['medal'],
                    $scoreNote, $scoreNote, $user['full_name']
                ]);

                // ออกเกียรติบัตรอัตโนมัติหากเลือกไว้ (แยกประเภทนักเรียนและครูผู้ฝึกสอนชัดเจน)
                if ($autoGenerateCert) {
                    $regStmt = $pdo->prepare("SELECT id, coach_id, secondary_coach_id, coach_ids FROM registrations WHERE event_id = ? AND school_id = ?");
                    $regStmt->execute([$eventId, $aw['school_id']]);
                    $reg = $regStmt->fetch();

                    // ดึงชื่อโรงเรียน
                    $sName = $pdo->prepare("SELECT school_name FROM schools WHERE id = ?");
                    $sName->execute([$aw['school_id']]);
                    $schoolName = $sName->fetchColumn() ?: '';

                    if ($reg) {
                        // 1. เกียรติบัตรนักเรียนทุกคนในทีม (Template: STUDENT)
                        $stList = $pdo->prepare("
                            SELECT s.* FROM students s
                            JOIN registration_students rs ON s.id = rs.student_id
                            WHERE rs.registration_id = ?
                        ");
                        $stList->execute([$reg['id']]);
                        $students = $stList->fetchAll();

                        foreach ($students as $st) {
                            $certCount++;
                            $certNo = $certPrefix . str_pad($certCount, 5, '0', STR_PAD_LEFT);
                            $qrToken = bin2hex(random_bytes(16));
                            $certId = 'cert-' . uniqid();
                            $fullName = $st['prefix'] . $st['first_name'] . ' ' . $st['last_name'];

                            $cStmt = $pdo->prepare("
                                INSERT INTO certificates (
                                    id, competition_id, certificate_no, recipient_type, recipient_id, recipient_name,
                                    school_id, school_name, event_id, event_name, sport_name, result_id,
                                    award, medal, issue_date, template_type, qr_token, status
                                ) VALUES (?, ?, ?, 'STUDENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'STUDENT', ?, 'GENERATED')
                            ");
                            $cStmt->execute([
                                $certId, $compId, $certNo, $st['id'], $fullName,
                                $aw['school_id'], $schoolName, $eventId, $eventInfo['event_name'], $eventInfo['sport_name'],
                                $resId, $aw['award'], $aw['medal'], $qrToken
                            ]);
                        }

                        // 2. เกียรติบัตรครูผู้ฝึกสอนทุกคน (Template: COACH)
                        $targetCoachIds = [];
                        try {
                            $rcStmt = $pdo->prepare("SELECT coach_id FROM registration_coaches WHERE registration_id = ?");
                            $rcStmt->execute([$reg['id']]);
                            $targetCoachIds = $rcStmt->fetchAll(PDO::FETCH_COLUMN);
                        } catch (Exception $e) {
                            $targetCoachIds = [];
                        }
                        if (!empty($reg['coach_ids'])) {
                            $cDecoded = json_decode($reg['coach_ids'], true);
                            if (is_array($cDecoded)) {
                                $targetCoachIds = array_merge($targetCoachIds, $cDecoded);
                            }
                        }
                        if (!empty($reg['coach_id'])) $targetCoachIds[] = $reg['coach_id'];
                        if (!empty($reg['secondary_coach_id'])) $targetCoachIds[] = $reg['secondary_coach_id'];
                        $targetCoachIds = array_unique(array_filter($targetCoachIds));

                        foreach ($targetCoachIds as $cId) {
                            $cFetch = $pdo->prepare("SELECT * FROM coaches WHERE id = ?");
                            $cFetch->execute([$cId]);
                            $coach = $cFetch->fetch();
                            if ($coach) {
                                $certCount++;
                                $certNo = $certPrefix . str_pad($certCount, 5, '0', STR_PAD_LEFT);
                                $qrToken = bin2hex(random_bytes(16));
                                $certId = 'cert-' . uniqid();
                                $coachFullName = $coach['prefix'] . $coach['first_name'] . ' ' . $coach['last_name'];

                                $cStmt = $pdo->prepare("
                                    INSERT INTO certificates (
                                        id, competition_id, certificate_no, recipient_type, recipient_id, recipient_name,
                                        school_id, school_name, event_id, event_name, sport_name, result_id,
                                        award, medal, issue_date, template_type, qr_token, status
                                    ) VALUES (?, ?, ?, 'COACH', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'COACH', ?, 'GENERATED')
                                ");
                                $cStmt->execute([
                                    $certId, $compId, $certNo, $coach['id'], $coachFullName,
                                    $aw['school_id'], $schoolName, $eventId, $eventInfo['event_name'], $eventInfo['sport_name'],
                                    $resId, 'ครูผู้ฝึกสอน - ' . $aw['award'], $aw['medal'], $qrToken
                                ]);
                            }
                        }
                    }
                }
            }

            // อัปเดตสถานะของรายการเป็น COMPLETED
            $pdo->prepare("UPDATE events SET status = 'COMPLETED' WHERE id = ?")->execute([$eventId]);

            $pdo->commit();
            logActivity('ANNOUNCE_RESULT', 'RESULTS', "ประกาศผลการแข่งขัน: " . $eventInfo['event_name']);
            $message = "ประกาศผลการแข่งขันรายการ \"" . $eventInfo['event_name'] . "\" สำเร็จเรียบร้อย! ตารางสรุปเหรียญในหน้าแรกได้รับการอัปเดตแล้ว";
        } catch (Exception $e) {
            $pdo->rollBack();
            $error = "เกิดข้อผิดพลาดในการบันทึกผล: " . $e->getMessage();
        }
    } else {
        $error = "กรุณาเลือกรายการแข่งขันและระบุโรงเรียนที่ได้รับรางวัลอย่างน้อย 1 อันดับ";
    }
}

// -------------------------------------------------------------
// 2. ยกเลิกผลการแข่งขัน (Cancel / Reset Result)
// -------------------------------------------------------------
if (isset($_GET['cancel_event_id'])) {
    $cancelEventId = $_GET['cancel_event_id'];
    try {
        $pdo->prepare("DELETE FROM results WHERE event_id = ?")->execute([$cancelEventId]);
        $pdo->prepare("UPDATE events SET status = 'OPEN' WHERE id = ?")->execute([$cancelEventId]);
        logActivity('CANCEL_RESULT', 'RESULTS', "ยกเลิกผลการแข่งขัน Event ID: $cancelEventId");
        $message = "ยกเลิกผลการแข่งขันและคืนสถานะรายการแข่งขันเรียบร้อยแล้ว";
    } catch (Exception $e) {
        $error = "ไม่สามารถยกเลิกผลได้: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// ดึงข้อมูลสำหรับหน้าจอ
// -------------------------------------------------------------
$selectedEventId = $_GET['event_id'] ?? '';

// ดึงรายการแข่งขันทั้งหมด
$rawAllEvents = $pdo->query("
    SELECT e.*, s.sport_name, s.sport_icon,
           (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as reg_count,
           (SELECT COUNT(*) FROM results res WHERE res.event_id = e.id AND res.status = 'OFFICIAL') as result_count
    FROM events e
    JOIN sports s ON e.sport_id = s.id
")->fetchAll();
$allEvents = sortEventsList($rawAllEvents);

// ดึงรายชื่อโรงเรียนที่สมัครในรายการที่เลือก
$registeredSchools = [];
$currentResults = [];
if ($selectedEventId) {
    $regStmt = $pdo->prepare("
        SELECT r.*, s.school_name, s.smis_code, s.logo,
               c.first_name AS coach_first, c.last_name AS coach_last, c.prefix AS coach_prefix
        FROM registrations r
        JOIN schools s ON r.school_id = s.id
        LEFT JOIN coaches c ON r.coach_id = c.id
        WHERE r.event_id = ?
        ORDER BY s.school_name ASC
    ");
    $regStmt->execute([$selectedEventId]);
    $registeredSchools = $regStmt->fetchAll();

    // ดึงผลที่เคยบันทึกไว้
    $resStmt = $pdo->prepare("SELECT * FROM results WHERE event_id = ? ORDER BY `rank` ASC");
    $resStmt->execute([$selectedEventId]);
    $currentResults = $resStmt->fetchAll();
}

// ดึงรายการผลการแข่งขันอย่างเป็นทางการทั้งหมดที่ประกาศแล้ว
$officialResults = $pdo->query("
    SELECT e.id as event_id, e.event_name, e.event_code, s.sport_name, s.sport_icon,
           MAX(CASE WHEN r.medal = 'GOLD' THEN sch.school_name END) as gold_school,
           MAX(CASE WHEN r.medal = 'SILVER' THEN sch.school_name END) as silver_school,
           MAX(CASE WHEN r.medal = 'BRONZE' THEN sch.school_name END) as bronze_school,
           MAX(CASE WHEN r.rank = 4 THEN sch.school_name END) as honorable_school,
           MAX(r.score) as score,
           MAX(r.recorded_at) as announced_at
    FROM events e
    JOIN sports s ON e.sport_id = s.id
    JOIN results r ON e.id = r.event_id AND r.status = 'OFFICIAL'
    JOIN schools sch ON r.school_id = sch.id
    GROUP BY e.id, e.event_name, e.event_code, s.sport_name, s.sport_icon
    ORDER BY announced_at DESC
")->fetchAll();

$pageTitle = 'ระบบประกาศผลการแข่งขันและเหรียญรางวัล - Admin Console';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- Header Bar -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                    🏆 OFFICIAL RESULTS ANNOUNCEMENT
                </span>
                <span class="text-xs text-slate-400">ประกาศแล้ว <?= count($officialResults) ?> รายการ</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit text-slate-900">
                ระบบบันทึกและประกาศผลการแข่งขันอย่างเป็นทางการ
            </h1>
            <p class="text-xs text-slate-500 mt-1">
                เลือกรายการแข่งขัน กำหนดโรงเรียนที่ได้รับเหรียญทอง เหรียญเงิน เหรียญทองแดง พร้อมคำนวณคะแนนตารางสรุปเหรียญและออกเกียรติบัตรทันที
            </p>
        </div>
        <a href="/admin/index.php" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition self-start md:self-auto">
            &larr; กลับหน้าควบคุม
        </a>
    </div>

    <?php if ($message): ?>
        <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 shadow-sm">
            <span class="text-base">✅</span> <?= htmlspecialchars($message) ?>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2 shadow-sm">
            <span class="text-base">✕</span> <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <!-- Result Entry Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Step 1: Select Event -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 class="text-base font-bold font-kanit text-slate-900 flex items-center gap-2">
                <span>1️⃣</span> เลือกรายการแข่งขันที่ต้องการบันทึกผล
            </h2>
            <div class="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                <?php foreach ($allEvents as $ev): ?>
                    <?php 
                    $isSelected = ($selectedEventId === $ev['id']); 
                    $isCompleted = ($ev['result_count'] > 0 || $ev['status'] === 'COMPLETED');
                    ?>
                    <a 
                        href="?event_id=<?= urlencode($ev['id']) ?>" 
                        class="p-3.5 rounded-2xl border transition block <?= $isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm' : ($isCompleted ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400' : 'bg-slate-50 border-slate-200 hover:border-indigo-300') ?>"
                    >
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                                    <span><?= $ev['sport_icon'] ?></span>
                                    <span class="font-semibold text-slate-700 truncate"><?= htmlspecialchars($ev['sport_name']) ?></span>
                                    <span class="text-[10px] font-mono text-slate-400 font-bold bg-white px-1.5 py-0.2 rounded border"><?= htmlspecialchars($ev['event_code']) ?></span>
                                </div>
                                <div class="font-bold font-kanit text-slate-900 text-sm leading-snug"><?= htmlspecialchars($ev['event_name']) ?></div>
                                <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                    <span><?= htmlspecialchars($ev['age_group']) ?></span>
                                    <span>&bull;</span>
                                    <span>สมัคร <?= $ev['reg_count'] ?> โรงเรียน</span>
                                </div>
                            </div>
                            <?php if ($isCompleted): ?>
                                <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                                    ✓ ประกาศแล้ว
                                </span>
                            <?php else: ?>
                                <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                                    รอประกาศผล
                                </span>
                            <?php endif; ?>
                        </div>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Step 2: Record Form -->
        <div class="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <?php if (!$selectedEventId): ?>
                <div class="p-12 text-center text-slate-400 space-y-3">
                    <div class="text-4xl">👈</div>
                    <div class="font-bold font-kanit text-slate-700 text-base">กรุณาเลือกรายการแข่งขันจากเมนูด้านซ้าย</div>
                    <p class="text-xs">เลือกว่าต้องการประกาศผลการแข่งขันรายการใด จากนั้นระบุโรงเรียนที่ได้รับเหรียญรางวัล</p>
                </div>
            <?php else: ?>
                <?php
                $currEv = array_values(array_filter($allEvents, fn($e) => $e['id'] === $selectedEventId))[0] ?? null;
                
                // Helper to find selected school in existing results
                $goldVal = '';
                $silverVal = '';
                $bronzeVal = '';
                $honorableVal = '';
                $scoreVal = '';
                foreach ($currentResults as $cr) {
                    if ($cr['medal'] === 'GOLD') $goldVal = $cr['school_id'];
                    elseif ($cr['medal'] === 'SILVER') $silverVal = $cr['school_id'];
                    elseif ($cr['medal'] === 'BRONZE') $bronzeVal = $cr['school_id'];
                    elseif ($cr['rank'] === 4) $honorableVal = $cr['school_id'];
                    if (!empty($cr['score'])) $scoreVal = $cr['score'];
                }
                ?>
                <div class="border-b border-slate-100 pb-4 flex items-start justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <span><?= $currEv['sport_icon'] ?> <?= htmlspecialchars($currEv['sport_name']) ?></span>
                            <span>&bull;</span>
                            <span class="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700"><?= htmlspecialchars($currEv['event_code']) ?></span>
                        </div>
                        <h2 class="text-lg font-bold font-kanit text-slate-900"><?= htmlspecialchars($currEv['event_name']) ?></h2>
                        <p class="text-xs text-slate-400 mt-0.5">
                            ระดับชั้น: <?= htmlspecialchars($currEv['grade']) ?> | รุ่น: <?= htmlspecialchars($currEv['age_group']) ?> | สมัครเข้าร่วม <?= count($registeredSchools) ?> โรงเรียน
                        </p>
                    </div>

                    <?php if (!empty($currentResults)): ?>
                        <a 
                            href="?cancel_event_id=<?= urlencode($selectedEventId) ?>" 
                            onclick="return confirm('⚠️ คุณต้องการยกเลิกผลการแข่งขันของรายการนี้ใช่หรือไม่? การยกเลิกจะลบข้อมูลผลคะแนนออก')"
                            class="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold rounded-xl transition"
                        >
                            🔄 ยกเลิกผลการแข่งขัน
                        </a>
                    <?php endif; ?>
                </div>

                <form method="POST" class="space-y-4 text-xs">
                    <input type="hidden" name="action_result" value="save">
                    <input type="hidden" name="event_id" value="<?= htmlspecialchars($selectedEventId) ?>">

                    <!-- 🥇 ชนะเลิศ (เหรียญทอง) -->
                    <div class="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                        <label class="block font-bold font-kanit text-amber-950 text-sm flex items-center gap-2">
                            <span>🥇</span> ชนะเลิศ (เหรียญทอง - 5 คะแนน) <span class="text-rose-500">*</span>
                        </label>
                        <select name="gold_school_id" class="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500">
                            <option value="">-- เลือกโรงเรียนที่ได้รางวัลชนะเลิศ --</option>
                            <?php foreach ($registeredSchools as $rs): ?>
                                <option value="<?= htmlspecialchars($rs['school_id']) ?>" <?= $goldVal === $rs['school_id'] ? 'selected' : '' ?>>
                                    🏫 <?= htmlspecialchars($rs['school_name']) ?> (SMIS: <?= $rs['smis_code'] ?>) <?= $rs['coach_first'] ? ' - ผู้ฝึกสอน: ' . $rs['coach_prefix'] . $rs['coach_first'] . ' ' . $rs['coach_last'] : '' ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <!-- 🥈 รองชนะเลิศอันดับ 1 (เหรียญเงิน) -->
                    <div class="p-4 bg-slate-50 border border-slate-300 rounded-2xl space-y-2">
                        <label class="block font-bold font-kanit text-slate-900 text-sm flex items-center gap-2">
                            <span>🥈</span> รองชนะเลิศอันดับ 1 (เหรียญเงิน - 3 คะแนน)
                        </label>
                        <select name="silver_school_id" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-slate-500">
                            <option value="">-- เลือกโรงเรียนที่ได้รางวัลรองชนะเลิศอันดับ 1 --</option>
                            <?php foreach ($registeredSchools as $rs): ?>
                                <option value="<?= htmlspecialchars($rs['school_id']) ?>" <?= $silverVal === $rs['school_id'] ? 'selected' : '' ?>>
                                    🏫 <?= htmlspecialchars($rs['school_name']) ?> (SMIS: <?= $rs['smis_code'] ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <!-- 🥉 รองชนะเลิศอันดับ 2 (เหรียญทองแดง) -->
                    <div class="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
                        <label class="block font-bold font-kanit text-orange-950 text-sm flex items-center gap-2">
                            <span>🥉</span> รองชนะเลิศอันดับ 2 (เหรียญทองแดง - 1 คะแนน)
                        </label>
                        <select name="bronze_school_id" class="w-full p-2.5 bg-white border border-orange-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500">
                            <option value="">-- เลือกโรงเรียนที่ได้รางวัลรองชนะเลิศอันดับ 2 --</option>
                            <?php foreach ($registeredSchools as $rs): ?>
                                <option value="<?= htmlspecialchars($rs['school_id']) ?>" <?= $bronzeVal === $rs['school_id'] ? 'selected' : '' ?>>
                                    🏫 <?= htmlspecialchars($rs['school_name']) ?> (SMIS: <?= $rs['smis_code'] ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <!-- 🎖️ รางวัลชมเชย -->
                    <div class="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-2">
                        <label class="block font-bold font-kanit text-slate-700 text-sm flex items-center gap-2">
                            <span>🎖️</span> รางวัลชมเชย / อันดับ 4
                        </label>
                        <select name="honorable_school_id" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800">
                            <option value="">-- เลือกโรงเรียนที่ได้รางวัลชมเชย (ถ้ามี) --</option>
                            <?php foreach ($registeredSchools as $rs): ?>
                                <option value="<?= htmlspecialchars($rs['school_id']) ?>" <?= $honorableVal === $rs['school_id'] ? 'selected' : '' ?>>
                                    🏫 <?= htmlspecialchars($rs['school_name']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <!-- รายละเอียดผลคะแนน / สกอร์ -->
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">สกอร์ / เวลา / บันทึกผลการแข่งขัน</label>
                        <input 
                            type="text" 
                            name="score_note" 
                            value="<?= htmlspecialchars($scoreVal) ?>" 
                            placeholder="เช่น 2 - 1, เวลา 11.45 วินาที, ชนะ 21-18 เซตตัดสิน" 
                            class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
                        >
                    </div>

                    <!-- ตัวเลือกออกเกียรติบัตรอัตโนมัติ -->
                    <div class="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3">
                        <input type="checkbox" name="auto_cert" id="auto_cert" checked class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500">
                        <label for="auto_cert" class="text-xs text-blue-900 font-semibold cursor-pointer select-none">
                            📜 <b>ออกเกียรติบัตร E-Certificate อัตโนมัติ</b> ให้นักเรียนและครูผู้ฝึกสอนของโรงเรียนที่ได้รับรางวัลทุกคนทันที พร้อมสร้างรหัส QR Code
                        </label>
                    </div>

                    <!-- ปุ่มบันทึก -->
                    <div class="pt-3">
                        <button type="submit" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-kanit text-base rounded-2xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer">
                            <span>🏆</span> ยืนยันและประกาศผลการแข่งขันเป็นทางการ
                        </button>
                    </div>
                </form>
            <?php endif; ?>
        </div>
    </div>

    <!-- Official Results Table (All Announced) -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
                <h2 class="text-base font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>📋</span> ผลการแข่งขันอย่างเป็นทางการที่ประกาศแล้วทั้งหมด (<?= count($officialResults) ?> รายการ)
                </h2>
                <p class="text-xs text-slate-500">คะแนนเหรียญรางวัลเหล่านี้ถูกนำไปคำนวณในตารางสรุปเหรียญหน้าหลักแบบ Real-time</p>
            </div>
            <a href="/index.php" target="_blank" class="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold border border-blue-200 transition flex items-center gap-1 self-start sm:self-auto">
                <span>🌐</span> ดูตารางเหรียญหน้าหลัก
            </a>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                        <th class="p-3.5 pl-6">รายการแข่งขัน</th>
                        <th class="p-3.5 text-amber-700">🥇 ชนะเลิศ (ทอง)</th>
                        <th class="p-3.5 text-slate-700">🥈 รอง 1 (เงิน)</th>
                        <th class="p-3.5 text-orange-700">🥉 รอง 2 (ทองแดง)</th>
                        <th class="p-3.5 text-slate-500">สกอร์/เวลา</th>
                        <th class="p-3.5 pr-6 text-right">จัดการ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($officialResults)): ?>
                        <tr>
                            <td colspan="6" class="p-8 text-center text-slate-400">
                                📭 ยังไม่มีการประกาศผลการแข่งขัน กรุณาเลือกรายการแข่งขันด้านบนเพื่อบันทึกผล
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($officialResults as $row): ?>
                            <tr class="hover:bg-slate-50/80 transition">
                                <td class="p-3.5 pl-6">
                                    <div class="font-bold font-kanit text-slate-900 text-sm flex items-center gap-1.5">
                                        <span><?= $row['sport_icon'] ?></span>
                                        <span><?= htmlspecialchars($row['event_name']) ?></span>
                                    </div>
                                    <span class="text-[10px] font-mono text-slate-400 font-bold"><?= htmlspecialchars($row['event_code']) ?> &bull; <?= htmlspecialchars($row['sport_name']) ?></span>
                                </td>
                                <td class="p-3.5 font-bold font-kanit text-amber-900 bg-amber-50/30">
                                    <?= htmlspecialchars($row['gold_school'] ?: '-') ?>
                                </td>
                                <td class="p-3.5 font-semibold text-slate-800 bg-slate-50/50">
                                    <?= htmlspecialchars($row['silver_school'] ?: '-') ?>
                                </td>
                                <td class="p-3.5 font-semibold text-orange-900 bg-orange-50/30">
                                    <?= htmlspecialchars($row['bronze_school'] ?: '-') ?>
                                </td>
                                <td class="p-3.5 font-mono text-slate-600">
                                    <?= htmlspecialchars($row['score'] ?: '-') ?>
                                </td>
                                <td class="p-3.5 pr-6 text-right space-x-2">
                                    <a href="?event_id=<?= urlencode($row['event_id']) ?>" class="text-indigo-600 hover:text-indigo-900 font-semibold">
                                        ✏️ แก้ไขผล
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
