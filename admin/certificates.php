<?php
/**
 * ==============================================================================
 * ไฟล์: admin/certificates.php
 * คำอธิบาย: ระบบจัดการและออกเกียรติบัตร (Certificates Management & E-Certificate)
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

requireRole(['SUPER_ADMIN', 'ADMIN']);
$pdo = Database::getConnection();
$message = '';
$error = '';

$comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch();

// -------------------------------------------------------------
// สั่งออกเกียรติบัตรจากผลการแข่งขันที่ยืนยันแล้ว
// -------------------------------------------------------------
if (isset($_POST['generate_from_results'])) {
    try {
        $results = $pdo->query("
            SELECT r.*, e.event_name, sp.sport_name, sch.school_name, sch.school_code
            FROM results r
            JOIN events e ON r.event_id = e.id
            JOIN sports sp ON e.sport_id = sp.id
            JOIN schools sch ON r.school_id = sch.id
            WHERE r.status = 'CONFIRMED'
        ")->fetchAll();

        $certPrefix = $comp['cert_prefix'] ?? 'สพป.บร.3/2569-';
        $currentCount = $pdo->query("SELECT COUNT(*) FROM certificates")->fetchColumn();
        $newCount = 0;

        foreach ($results as $res) {
            // ค้นหานักเรียนในทีมที่ลงทะเบียน
            $reg = $pdo->prepare("SELECT id, coach_id, secondary_coach_id FROM registrations WHERE event_id = ? AND school_id = ?");
            $reg->execute([$res['event_id'], $res['school_id']]);
            $registration = $reg->fetch();

            if ($registration) {
                // 1. ออกเกียรติบัตรให้นักเรียนทุกคนในทีม
                $students = $pdo->prepare("
                    SELECT s.* FROM students s
                    JOIN registration_students rs ON s.id = rs.student_id
                    WHERE rs.registration_id = ?
                ");
                $students->execute([$registration['id']]);
                $studentList = $students->fetchAll();

                foreach ($studentList as $st) {
                    $fullName = $st['prefix'] . $st['first_name'] . ' ' . $st['last_name'];
                    
                    // เช็คว่าเคยออกหรือยัง
                    $chk = $pdo->prepare("SELECT id FROM certificates WHERE result_id = ? AND recipient_id = ?");
                    $chk->execute([$res['id'], $st['id']]);
                    if (!$chk->fetch()) {
                        $currentCount++;
                        $certNo = $certPrefix . str_pad($currentCount, 5, '0', STR_PAD_LEFT);
                        $qrToken = bin2hex(random_bytes(16));
                        $newId = 'cert-' . uniqid();

                        $stmt = $pdo->prepare("
                            INSERT INTO certificates (
                                id, competition_id, certificate_no, recipient_type, recipient_id, recipient_name,
                                school_id, school_name, event_id, event_name, sport_name, result_id,
                                award, medal, issue_date, template_type, qr_token, status
                            ) VALUES (?, ?, ?, 'STUDENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'STUDENT', ?, 'ISSUED')
                        ");
                        $stmt->execute([
                            $newId, $comp['id'] ?? 'comp-2026', $certNo, $st['id'], $fullName,
                            $res['school_id'], $res['school_name'], $res['event_id'], $res['event_name'], $res['sport_name'],
                            $res['id'], $res['award'], $res['medal'], $qrToken
                        ]);
                        $newCount++;
                    }
                }

                // 2. ออกเกียรติบัตรให้ครูผู้ฝึกสอน (ทุกท่านที่ลงทะเบียนในรายการนี้)
                $targetCoachIds = [];
                // จาก registration_coaches
                try {
                    $rcStmt = $pdo->prepare("SELECT coach_id FROM registration_coaches WHERE registration_id = ?");
                    $rcStmt->execute([$registration['id']]);
                    $targetCoachIds = $rcStmt->fetchAll(PDO::FETCH_COLUMN);
                } catch (Exception $e) {
                    $targetCoachIds = [];
                }
                // จาก coach_ids JSON, coach_id, secondary_coach_id
                if (!empty($registration['coach_ids'])) {
                    $cDecoded = json_decode($registration['coach_ids'], true);
                    if (is_array($cDecoded)) {
                        $targetCoachIds = array_merge($targetCoachIds, $cDecoded);
                    }
                }
                if (!empty($registration['coach_id'])) $targetCoachIds[] = $registration['coach_id'];
                if (!empty($registration['secondary_coach_id'])) $targetCoachIds[] = $registration['secondary_coach_id'];
                $targetCoachIds = array_unique(array_filter($targetCoachIds));

                foreach ($targetCoachIds as $cId) {
                    $cStmt = $pdo->prepare("SELECT * FROM coaches WHERE id = ?");
                    $cStmt->execute([$cId]);
                    $coach = $cStmt->fetch();
                    if ($coach) {
                        $coachName = $coach['prefix'] . $coach['first_name'] . ' ' . $coach['last_name'];
                        $chk = $pdo->prepare("SELECT id FROM certificates WHERE result_id = ? AND recipient_id = ?");
                        $chk->execute([$res['id'], $coach['id']]);
                        if (!$chk->fetch()) {
                            $currentCount++;
                            $certNo = $certPrefix . str_pad($currentCount, 5, '0', STR_PAD_LEFT);
                            $qrToken = bin2hex(random_bytes(16));
                            $newId = 'cert-' . uniqid();

                            $stmt = $pdo->prepare("
                                INSERT INTO certificates (
                                    id, competition_id, certificate_no, recipient_type, recipient_id, recipient_name,
                                    school_id, school_name, event_id, event_name, sport_name, result_id,
                                    award, medal, issue_date, template_type, qr_token, status
                                ) VALUES (?, ?, ?, 'COACH', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'COACH', ?, 'ISSUED')
                            ");
                            $stmt->execute([
                                $newId, $comp['id'] ?? 'comp-2026', $certNo, $coach['id'], $coachName,
                                $res['school_id'], $res['school_name'], $res['event_id'], $res['event_name'], $res['sport_name'],
                                $res['id'], 'ครูผู้ฝึกสอน - ' . $res['award'], $res['medal'], $qrToken
                            ]);
                            $newCount++;
                        }
                    }
                }
            }
        }

        logActivity('GENERATE_CERTS', 'CERTIFICATE', "ประมวลผลออกเกียรติบัตรอัตโนมัติ $newCount ฉบับ");
        $message = "ประมวลผลและสร้างเลขที่เกียรติบัตรใหม่สำเร็จ $newCount ฉบับ!";
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาด: " . $e->getMessage();
    }
}

// ค้นหาเกียรติบัตร
$search = trim($_GET['search'] ?? '');
$filterSchool = trim($_GET['school_id'] ?? '');

$sql = "SELECT * FROM certificates WHERE 1=1";
$params = [];
if ($search) {
    $sql .= " AND (recipient_name LIKE ? OR certificate_no LIKE ? OR event_name LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
}
if ($filterSchool) {
    $sql .= " AND school_id = ?";
    $params[] = $filterSchool;
}
$sql .= " ORDER BY created_at DESC LIMIT 100";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$certs = $stmt->fetchAll();

$schools = $pdo->query("SELECT id, school_name FROM schools ORDER BY school_name ASC")->fetchAll();
$totalCerts = $pdo->query("SELECT COUNT(*) FROM certificates")->fetchColumn();

$pageTitle = 'จัดการและออกเกียรติบัตร - Admin Console';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-xl font-bold font-kanit text-slate-900 flex items-center gap-2">
                <span>📜</span> ระบบจัดการและออกเกียรติบัตร (E-Certificate)
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">
                ออกเกียรติบัตรพร้อม QR Code ตรวจสอบความถูกต้อง รองรับการพิมพ์และซิงค์ไปยัง Google Drive (ทั้งหมด <?= number_format($totalCerts) ?> ฉบับ)
            </p>
        </div>
        <div class="flex items-center gap-2">
            <form method="POST" onsubmit="return confirm('ระบบจะทำการตรวจสอบผลการแข่งขันที่ยืนยันแล้ว และออกเกียรติบัตรให้นักเรียนและครูผู้ฝึกสอนทุกคน ต้องการดำเนินการต่อหรือไม่?')">
                <button type="submit" name="generate_from_results" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                    <span>⚡</span> ออกเกียรติบัตรจากผลการแข่งขันทั้งหมด
                </button>
            </form>
            <a href="/admin/settings.php" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition">
                ⚙️ ตั้งค่า GAS
            </a>
        </div>
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

    <!-- Filter Bar -->
    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <form method="GET" class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input 
                type="text" 
                name="search" 
                value="<?= htmlspecialchars($search) ?>" 
                placeholder="ค้นหาชื่อผู้รับ, เลขที่, รายการแข่งขัน..." 
                class="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs w-64"
            >
            <select name="school_id" class="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                <option value="">-- โรงเรียนทั้งหมด --</option>
                <?php foreach ($schools as $s): ?>
                    <option value="<?= $s['id'] ?>" <?= $filterSchool === $s['id'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($s['school_name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <button type="submit" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition">
                ค้นหา
            </button>
            <?php if ($search || $filterSchool): ?>
                <a href="/admin/certificates.php" class="text-slate-500 hover:text-slate-700 ml-2">ล้างตัวกรอง</a>
            <?php endif; ?>
        </form>
    </div>

    <!-- Certificates Table -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                        <th class="p-3.5 pl-6">เลขที่เกียรติบัตร</th>
                        <th class="p-3.5">ผู้ได้รับเกียรติบัตร</th>
                        <th class="p-3.5">โรงเรียน</th>
                        <th class="p-3.5">รายการแข่งขัน</th>
                        <th class="p-3.5">รางวัล</th>
                        <th class="p-3.5 text-center">วันที่ออก</th>
                        <th class="p-3.5 pr-6 text-right">ลิงก์ / ตรวจสอบ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($certs)): ?>
                        <tr>
                            <td colspan="7" class="p-8 text-center text-slate-400">
                                📭 ไม่พบรายการเกียรติบัตร กรุณากดปุ่ม "ออกเกียรติบัตรจากผลการแข่งขันทั้งหมด"
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($certs as $c): ?>
                            <tr class="hover:bg-slate-50/80 transition">
                                <td class="p-3.5 pl-6 font-mono font-bold text-slate-900">
                                    <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                                        <?= htmlspecialchars($c['certificate_no']) ?>
                                    </span>
                                </td>
                                <td class="p-3.5">
                                    <span class="font-bold font-kanit text-slate-900 text-sm block">
                                        <?= htmlspecialchars($c['recipient_name']) ?>
                                    </span>
                                    <span class="text-[10px] text-slate-400">
                                        <?= $c['recipient_type'] === 'STUDENT' ? '🎒 นักเรียน' : '👨‍🏫 ครูผู้ฝึกสอน' ?>
                                    </span>
                                </td>
                                <td class="p-3.5 text-slate-600 font-medium">
                                    <?= htmlspecialchars($c['school_name']) ?>
                                </td>
                                <td class="p-3.5 text-slate-700 font-medium">
                                    <?= htmlspecialchars($c['event_name']) ?>
                                    <span class="text-[10px] text-slate-400 block"><?= htmlspecialchars($c['sport_name']) ?></span>
                                </td>
                                <td class="p-3.5">
                                    <span class="px-2 py-0.5 rounded text-[11px] font-bold <?= $c['medal'] === 'GOLD' ? 'bg-amber-100 text-amber-900' : ($c['medal'] === 'SILVER' ? 'bg-slate-200 text-slate-800' : 'bg-orange-100 text-orange-900') ?>">
                                        <?= htmlspecialchars($c['award']) ?>
                                    </span>
                                </td>
                                <td class="p-3.5 text-center text-slate-500 font-mono text-[11px]">
                                    <?= htmlspecialchars($c['issue_date']) ?>
                                </td>
                                <td class="p-3.5 pr-6 text-right space-x-2">
                                    <a href="/verify.php?token=<?= urlencode($c['qr_token'] ?? $c['certificate_no']) ?>" target="_blank" class="text-blue-600 hover:text-blue-800 font-semibold">
                                        🔍 ตรวจสอบ QR
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
