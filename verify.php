<?php
/**
 * ==============================================================================
 * ไฟล์: verify.php
 * คำอธิบาย: ระบบตรวจสอบความถูกต้องของเกียรติบัตรผ่าน QR Token หรือหมายเลขเกียรติบัตร
 * ==============================================================================
 */
require_once __DIR__ . '/config/database.php';

$query = trim($_GET['code'] ?? $_GET['token'] ?? '');
$certificate = null;
$searched = false;

if (!empty($query)) {
    $searched = true;
    try {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT * FROM certificates 
            WHERE (certificate_no = ? OR qr_token = ?) AND status != 'REVOKED'
            LIMIT 1
        ");
        $stmt->execute([$query, $query]);
        $certificate = $stmt->fetch();
    } catch (Exception $e) {
        $certificate = null;
    }
}

$pageTitle = 'ตรวจสอบเกียรติบัตรดิจิทัล (E-Certificate Verification) - กลุ่มโรงเรียนสว่างสูงกระสัง';
require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-2xl mx-auto space-y-6">
    <div class="text-center space-y-2">
        <div class="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            🛡️
        </div>
        <h1 class="text-2xl font-bold font-kanit text-slate-900">ตรวจสอบความถูกต้องของเกียรติบัตร</h1>
        <p class="text-xs text-slate-500">ระบบตรวจสอบเกียรติบัตรอิเล็กทรอนิกส์ กลุ่มโรงเรียนสว่างสูงกระสัง</p>
    </div>

    <!-- Search Box -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <form method="GET" class="flex gap-2">
            <input 
                type="text" 
                name="code" 
                value="<?= htmlspecialchars($query) ?>" 
                placeholder="กรอกเลขที่เกียรติบัตร (เช่น CERT-2569-...) หรือ Token" 
                class="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                required
            >
            <button type="submit" class="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition shadow-sm">
                ตรวจสอบ
            </button>
        </form>
    </div>

    <!-- Result -->
    <?php if ($searched): ?>
        <?php if ($certificate): ?>
            <div class="bg-emerald-50/80 border border-emerald-300 rounded-3xl p-6 space-y-4 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-xs">
                        ✓
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-emerald-900 font-kanit">เกียรติบัตรนี้ถูกต้องและออกโดยระบบจริง</h3>
                        <p class="text-xs text-emerald-700">ยืนยันข้อมูลจากฐานข้อมูลกลุ่มโรงเรียนสว่างสูงกระสัง</p>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-5 border border-emerald-200 text-xs space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <span class="text-slate-400 block">เลขที่เกียรติบัตร</span>
                            <span class="font-bold text-slate-800 font-mono text-sm"><?= htmlspecialchars($certificate['certificate_no']) ?></span>
                        </div>
                        <div>
                            <span class="text-slate-400 block">วันที่ออกเกียรติบัตร</span>
                            <span class="font-bold text-slate-800"><?= htmlspecialchars($certificate['issue_date']) ?></span>
                        </div>
                    </div>

                    <div class="border-t pt-3">
                        <span class="text-slate-400 block">มอบให้แก่</span>
                        <span class="text-base font-bold text-blue-900 font-kanit"><?= htmlspecialchars($certificate['recipient_name']) ?></span>
                        <span class="text-slate-500 block"><?= htmlspecialchars($certificate['school_name']) ?></span>
                    </div>

                    <div class="border-t pt-3">
                        <span class="text-slate-400 block">รางวัล / ผลการแข่งขัน</span>
                        <span class="font-bold text-amber-700 text-sm"><?= htmlspecialchars($certificate['award']) ?></span>
                        <span class="text-slate-600 block"><?= htmlspecialchars($certificate['event_name']) ?> (<?= htmlspecialchars($certificate['sport_name']) ?>)</span>
                    </div>
                </div>
            </div>
        <?php else: ?>
            <div class="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-2">
                <div class="text-2xl">❌</div>
                <h3 class="text-base font-bold text-rose-900 font-kanit">ไม่พบข้อมูลเกียรติบัตรนี้ในระบบ</h3>
                <p class="text-xs text-rose-600">กรุณาตรวจสอบความถูกต้องของรหัสหรือ QR Token อีกครั้ง</p>
            </div>
        <?php endif; ?>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
