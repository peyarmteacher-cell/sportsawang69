<?php
/**
 * ==============================================================================
 * ไฟล์: school_detail.php
 * คำอธิบาย: หน้ารายละเอียดผลงานและเหรียญรางวัลของโรงเรียน (School Awards & Medals Detail)
 * ==============================================================================
 */
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
$pdo = Database::getConnection();

$schoolId = $_GET['id'] ?? '';
if (!$schoolId) {
    redirect_to('index.php');
}

// 1. ดึงข้อมูลโรงเรียน
$schStmt = $pdo->prepare("SELECT * FROM schools WHERE id = ?");
$schStmt->execute([$schoolId]);
$school = $schStmt->fetch();

if (!$school) {
    die("❌ ไม่พบข้อมูลโรงเรียนที่ระบุ");
}

// 2. ดึงสถิติเหรียญรางวัลของโรงเรียนนี้
$statStmt = $pdo->prepare("
    SELECT 
        COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) AS gold_count,
        COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) AS silver_count,
        COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) AS bronze_count,
        (COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) * 5 +
         COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) * 3 +
         COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) * 1) AS total_points,
        COUNT(r.id) AS total_awards
    FROM results r
    WHERE r.school_id = ? AND r.status = 'OFFICIAL' AND r.status = 'OFFICIAL'
");
$statStmt->execute([$schoolId]);
$stats = $statStmt->fetch();

// 3. ดึงอันดับเหรียญรวมทั้งหมดเพื่อหาอันดับของโรงเรียนนี้
$rankSql = "
    SELECT 
        s.id,
        COALESCE(SUM(CASE WHEN r.medal = 'GOLD' THEN 1 ELSE 0 END), 0) AS gold_count,
        COALESCE(SUM(CASE WHEN r.medal = 'SILVER' THEN 1 ELSE 0 END), 0) AS silver_count,
        COALESCE(SUM(CASE WHEN r.medal = 'BRONZE' THEN 1 ELSE 0 END), 0) AS bronze_count
    FROM schools s
    LEFT JOIN results r ON s.id = r.school_id AND r.status = 'OFFICIAL'
    GROUP BY s.id
    ORDER BY gold_count DESC, silver_count DESC, bronze_count DESC
";
$allRanks = $pdo->query($rankSql)->fetchAll();
$rankPosition = 1;
foreach ($allRanks as $idx => $r) {
    if ($r['id'] === $schoolId) {
        $rankPosition = $idx + 1;
        break;
    }
}

// 4. ดึงรายการรางวัลทั้งหมดที่ได้รับ
$awardsStmt = $pdo->prepare("
    SELECT 
        r.*, 
        e.event_name, e.event_code, e.age_group, e.grade,
        sp.sport_name, sp.sport_icon
    FROM results r
    JOIN events e ON r.event_id = e.id
    JOIN sports sp ON e.sport_id = sp.id
    WHERE r.school_id = ? AND r.status = 'OFFICIAL'
    ORDER BY 
        CASE r.medal 
            WHEN 'GOLD' THEN 1 
            WHEN 'SILVER' THEN 2 
            WHEN 'BRONZE' THEN 3 
            ELSE 4 
        END ASC,
        r.recorded_at DESC
");
$awardsStmt->execute([$schoolId]);
$awardsList = $awardsStmt->fetchAll();

// 5. ดึงรายชื่อนักเรียนและเกียรติบัตรที่ได้รับ
$certsStmt = $pdo->prepare("
    SELECT * FROM certificates 
    WHERE school_id = ? 
    ORDER BY medal ASC, recipient_name ASC
");
$certsStmt->execute([$schoolId]);
$certsList = $certsStmt->fetchAll();

$pageTitle = 'สรุปผลงานและเหรียญรางวัล ' . htmlspecialchars($school['school_name']);
require_once __DIR__ . '/includes/header.php';
?>

<div class="space-y-6">
    <!-- Back Button -->
    <div>
        <a href="<?= app_url('index.php') ?>" class="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-2xs transition">
            &larr; กลับสู่หน้าตารางเหรียญรวม
        </a>
    </div>

    <!-- School Profile Card -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-center gap-5">
            <img 
                src="<?= htmlspecialchars($school['logo'] ?: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150') ?>" 
                alt="<?= htmlspecialchars($school['school_name']) ?>" 
                class="w-20 h-20 rounded-3xl object-cover border border-slate-200 shadow-md shrink-0"
            >
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        SMIS: <?= htmlspecialchars($school['smis_code']) ?>
                    </span>
                    <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                        🏆 อันดับที่ <?= $rankPosition ?> ของกลุ่ม
                    </span>
                </div>
                <h1 class="text-2xl sm:text-3xl font-bold font-kanit text-slate-900 leading-tight">
                    <?= htmlspecialchars($school['school_name']) ?>
                </h1>
                <p class="text-xs text-slate-500 mt-1">
                    ผู้อำนวยการ: <b class="text-slate-800"><?= htmlspecialchars($school['director_name'] ?: 'ยังไม่ระบุ') ?></b> 
                    | โทร: <?= htmlspecialchars($school['phone'] ?: '-') ?> 
                    | สถานที่ตั้ง: <?= htmlspecialchars($school['address'] ?: 'อ.กระสัง จ.บุรีรัมย์') ?>
                </p>
            </div>
        </div>

        <!-- Medals Count Card -->
        <div class="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 self-start md:self-auto">
            <div class="text-center px-3 border-r border-slate-200">
                <div class="text-2xl mb-0.5">🥇</div>
                <div class="text-lg font-bold font-kanit text-amber-600"><?= $stats['gold_count'] ?></div>
                <div class="text-[10px] text-slate-400">ทอง</div>
            </div>
            <div class="text-center px-3 border-r border-slate-200">
                <div class="text-2xl mb-0.5">🥈</div>
                <div class="text-lg font-bold font-kanit text-slate-700"><?= $stats['silver_count'] ?></div>
                <div class="text-[10px] text-slate-400">เงิน</div>
            </div>
            <div class="text-center px-3 border-r border-slate-200">
                <div class="text-2xl mb-0.5">🥉</div>
                <div class="text-lg font-bold font-kanit text-orange-700"><?= $stats['bronze_count'] ?></div>
                <div class="text-[10px] text-slate-400">ทองแดง</div>
            </div>
            <div class="text-center pl-2">
                <div class="text-[11px] text-slate-500 font-medium">คะแนนรวม</div>
                <div class="text-xl font-bold font-kanit text-blue-700"><?= $stats['total_points'] ?></div>
                <div class="text-[10px] text-slate-400">คะแนน</div>
            </div>
        </div>
    </div>

    <!-- Awards List Section -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
                <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>🎖️</span> รายการรางวัลและเหรียญรางวัลที่ได้รับ (<?= count($awardsList) ?> รางวัล)
                </h2>
                <p class="text-xs text-slate-500">ผลการแข่งขันอย่างเป็นทางการที่ผ่านการรับรองแล้ว</p>
            </div>
        </div>

        <?php if (empty($awardsList)): ?>
            <div class="p-12 text-center text-slate-400 space-y-2">
                <div class="text-4xl">🏅</div>
                <div class="font-bold font-kanit text-slate-600 text-sm">ยังไม่มีข้อมูลรางวัลที่บันทึกไว้</div>
                <p class="text-xs">เมื่อคณะกรรมการประกาศผลการแข่งขัน ข้อมูลรางวัลและเกียรติบัตรจะปรากฏที่นี่ทันที</p>
            </div>
        <?php else: ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <?php foreach ($awardsList as $aw): ?>
                    <div class="p-5 rounded-2xl border transition <?= $aw['medal'] === 'GOLD' ? 'bg-amber-50/40 border-amber-300' : ($aw['medal'] === 'SILVER' ? 'bg-slate-50 border-slate-300' : ($aw['medal'] === 'BRONZE' ? 'bg-orange-50/40 border-orange-300' : 'bg-slate-50 border-slate-200')) ?>">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-base"><?= $aw['sport_icon'] ?></span>
                                    <span class="text-xs font-bold text-slate-700"><?= htmlspecialchars($aw['sport_name']) ?></span>
                                    <span class="text-[10px] font-mono text-slate-400 font-semibold bg-white px-1.5 py-0.2 rounded border"><?= htmlspecialchars($aw['event_code']) ?></span>
                                </div>
                                <h3 class="font-bold font-kanit text-slate-900 text-base leading-tight">
                                    <?= htmlspecialchars($aw['event_name']) ?>
                                </h3>
                                <p class="text-xs text-slate-500 mt-1">
                                    รุ่น: <?= htmlspecialchars($aw['age_group']) ?> | ระดับชั้น: <?= htmlspecialchars($aw['grade']) ?>
                                    <?php if (!empty($aw['score'])): ?>
                                        | สกอร์: <b class="text-slate-800"><?= htmlspecialchars($aw['score']) ?></b>
                                    <?php endif; ?>
                                </p>
                            </div>

                            <!-- Medal Badge -->
                            <div class="shrink-0 text-right">
                                <?php if ($aw['medal'] === 'GOLD'): ?>
                                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-amber-400 text-amber-950 rounded-full font-bold text-xs shadow-xs font-kanit">
                                        🥇 ชนะเลิศ (ทอง)
                                    </span>
                                <?php elseif ($aw['medal'] === 'SILVER'): ?>
                                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-900 rounded-full font-bold text-xs shadow-xs font-kanit">
                                        🥈 รองชนะเลิศ 1 (เงิน)
                                    </span>
                                <?php elseif ($aw['medal'] === 'BRONZE'): ?>
                                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-amber-700 text-white rounded-full font-bold text-xs shadow-xs font-kanit">
                                        🥉 รองชนะเลิศ 2 (ทองแดง)
                                    </span>
                                <?php else: ?>
                                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-xs font-kanit">
                                        🎖️ ชมเชย
                                    </span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

    <!-- Certificates Section -->
    <?php if (!empty($certsList)): ?>
        <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                    <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                        <span>📜</span> เกียรติบัตรที่ได้รับของนักเรียนและครูผู้ฝึกสอน (<?= count($certsList) ?> ฉบับ)
                    </h2>
                    <p class="text-xs text-slate-500">สามารถคลิก "สแกน/ตรวจสอบ QR" เพื่อดูและพิมพ์เกียรติบัตรฉบับจริงได้ทันที</p>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <?php foreach ($certsList as $c): ?>
                    <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition flex flex-col justify-between space-y-3">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-1">
                                <span class="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                    <?= htmlspecialchars($c['certificate_no']) ?>
                                </span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold <?= $c['medal'] === 'GOLD' ? 'bg-amber-100 text-amber-900' : ($c['medal'] === 'SILVER' ? 'bg-slate-200 text-slate-800' : 'bg-orange-100 text-orange-900') ?>">
                                    <?= htmlspecialchars($c['award']) ?>
                                </span>
                            </div>
                            <h4 class="font-bold font-kanit text-slate-900 text-sm"><?= htmlspecialchars($c['recipient_name']) ?></h4>
                            <p class="text-[11px] text-slate-400"><?= $c['recipient_type'] === 'STUDENT' ? '🎒 นักเรียน' : '👨‍🏫 ครูผู้ฝึกสอน' ?> &bull; <?= htmlspecialchars($c['event_name']) ?></p>
                        </div>

                        <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span class="text-[10px] text-slate-400">ออกเมื่อ: <?= formatThaiDate($c['issue_date']) ?></span>
                            <a 
                                href="/verify.php?token=<?= urlencode($c['qr_token'] ?? $c['certificate_no']) ?>" 
                                target="_blank" 
                                class="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                🔍 ดูเกียรติบัตร QR &rarr;
                            </a>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
