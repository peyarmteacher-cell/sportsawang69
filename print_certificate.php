<?php
/**
 * ==============================================================================
 * ไฟล์: print_certificate.php
 * คำอธิบาย: แสดงเกียรติบัตรฉบับเต็มเพื่อ พิมพ์ หรือ บันทึกเป็น PDF (Print to PDF)
 * ==============================================================================
 */
require_once __DIR__ . '/config/database.php';

$id = trim($_GET['id'] ?? '');
$no = trim($_GET['no'] ?? '');

if (empty($id) && empty($no)) {
    die("ไม่พบรหัสหรือเลขที่เกียรติบัตรที่ระบุ");
}

$pdo = Database::getConnection();
if (!empty($id)) {
    $stmt = $pdo->prepare("SELECT * FROM certificates WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
} else {
    $stmt = $pdo->prepare("SELECT * FROM certificates WHERE certificate_no = ? LIMIT 1");
    $stmt->execute([$no]);
}

$certificate = $stmt->fetch();
if (!$certificate) {
    die("ไม่พบข้อมูลเกียรติบัตรนี้ในระบบ");
}

$comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch() ?: [];
$compName = $comp['competition_name'] ?? 'การแข่งขันมหกรรมวิชาการและกีฬา กลุ่มโรงเรียนสว่างสูงกระสัง ประจำปีการศึกษา 2568';
$hostOrg = $comp['host_org'] ?? 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3';
$presidentName = $comp['president_name'] ?? 'นายสมเกียรติ สว่างวงศ์';
$secName = $comp['secretary_name'] ?? 'นางสาวศศิธร ชำนาญเพียร';

// Format thai date
$months = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
$issueDate = $certificate['issue_date'];
$dt = date_parse($issueDate);
$thaiDate = $issueDate;
if ($dt && $dt['year'] && $dt['month'] && $dt['day']) {
    $thaiYear = $dt['year'] > 2500 ? $dt['year'] : ($dt['year'] + 543);
    $thaiDate = "{$dt['day']} " . $months[$dt['month']] . " พ.ศ. {$thaiYear}";
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เกียรติบัตร <?= htmlspecialchars($certificate['certificate_no']) ?> - <?= htmlspecialchars($certificate['recipient_name']) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700&family=Prompt:wght@400;500;600;700&family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            body {
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .no-print {
                display: none !important;
            }
            .cert-canvas {
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                page-break-inside: avoid;
            }
            @page {
                size: A4 landscape;
                margin: 0;
            }
        }
    </style>
</head>
<body class="bg-slate-900 min-h-screen py-6 px-4 flex flex-col items-center justify-center font-['Prompt']">

    <!-- Top Action Bar (hidden on print) -->
    <div class="no-print w-full max-w-4xl bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 text-white shadow-xl">
        <div>
            <span class="text-xs text-slate-400">เกียรติบัตรเลขที่:</span>
            <span class="font-mono font-bold text-amber-400 ml-1"><?= htmlspecialchars($certificate['certificate_no']) ?></span>
            <span class="text-xs text-slate-300 ml-3 font-medium"><?= htmlspecialchars($certificate['recipient_name']) ?></span>
        </div>
        <div class="flex items-center gap-2">
            <?php if (!empty($certificate['drive_url'])): ?>
                <a href="<?= htmlspecialchars($certificate['drive_url']) ?>" target="_blank" class="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-md transition flex items-center gap-1.5" title="ดาวน์โหลดไฟล์ PDF ที่สร้างจาก Google Apps Script บน Google Drive">
                    📥 ดาวน์โหลด PDF (Google Drive)
                </a>
            <?php endif; ?>
            <button onclick="window.print()" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs md:text-sm font-bold shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95" title="พิมพ์ หรือ บันทึกเป็นไฟล์ PDF">
                📥 ดาวน์โหลด PDF / สั่งพิมพ์เกียรติบัตร
            </button>
            <button onclick="window.close()" class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs md:text-sm font-semibold transition cursor-pointer">
                ปิดหน้าต่าง
            </button>
        </div>
    </div>

    <!-- CERTIFICATE CONTAINER (A4 Landscape aspect) -->
    <div class="cert-canvas relative w-full max-w-[1050px] aspect-[1.414/1] bg-gradient-to-br from-[#fffdfa] via-[#fefbf6] to-[#faf5ed] text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm border-8 border-amber-600/30 flex flex-col justify-between overflow-hidden">
        
        <!-- Ornate Borders -->
        <div class="absolute inset-2 border-2 border-amber-700/60 pointer-events-none"></div>
        <div class="absolute inset-3.5 border border-amber-500/40 pointer-events-none"></div>

        <!-- Corner Ornaments -->
        <div class="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-700 pointer-events-none"></div>
        <div class="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-700 pointer-events-none"></div>
        <div class="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-700 pointer-events-none"></div>
        <div class="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-700 pointer-events-none"></div>

        <!-- Header -->
        <div class="text-center pt-2 relative z-10">
            <div class="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-600 flex items-center justify-center mx-auto shadow-inner mb-2">
                <span class="text-3xl">🏆</span>
            </div>
            <h2 class="text-2xl font-bold font-['Kanit'] text-slate-900 tracking-wide">
                <?= htmlspecialchars($compName) ?>
            </h2>
            <p class="text-sm font-medium text-slate-700 mt-0.5">
                <?= htmlspecialchars($hostOrg) ?>
            </p>

            <div class="mt-3 flex items-center justify-center gap-4">
                <div class="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-700 to-transparent"></div>
                <p class="text-base font-bold text-amber-900 font-['Sarabun'] tracking-wide">
                    ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า
                </p>
                <div class="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-700 to-transparent"></div>
            </div>
        </div>

        <!-- Recipient & Award -->
        <div class="text-center py-2 relative z-10 my-auto">
            <h1 class="text-3xl sm:text-4xl font-bold text-blue-950 font-['Sarabun'] mb-1">
                <?= htmlspecialchars($certificate['recipient_name']) ?>
            </h1>
            <p class="text-lg font-semibold text-slate-800">
                <?= htmlspecialchars($certificate['school_name']) ?>
            </p>

            <div class="my-3 max-w-2xl mx-auto py-2.5 px-6 bg-amber-100/50 rounded-xl border border-amber-300/60 shadow-xs">
                <p class="text-xl font-bold text-amber-950 font-['Sarabun']">
                    <?= htmlspecialchars($certificate['award']) ?>
                </p>
                <p class="text-sm font-bold text-slate-800 mt-1">
                    ประเภท : <span class="text-blue-900 font-extrabold"><?= htmlspecialchars($certificate['sport_name'] ?? '') ?></span>
                </p>
                <p class="text-xs text-slate-700 mt-0.5">
                    รายการแข่งขัน : <?= htmlspecialchars($certificate['event_name']) ?>
                </p>
            </div>

            <p class="text-xs text-slate-600 mt-2">
                ให้ไว้ ณ วันที่ <?= htmlspecialchars($thaiDate) ?>
            </p>
        </div>

        <!-- Signatures & Verification -->
        <div class="pt-2 relative z-10 flex items-end justify-between border-t border-amber-200/60 px-4">
            <!-- Left Signatory -->
            <div class="text-center flex-1 max-w-[240px]">
                <div class="h-10 flex items-end justify-center">
                    <span class="font-['Kanit'] text-lg text-blue-900 italic font-semibold border-b border-dotted border-slate-500 pb-1 px-4">
                        <?= htmlspecialchars($presidentName) ?>
                    </span>
                </div>
                <p class="text-xs font-bold text-slate-800 mt-1">(<?= htmlspecialchars($presidentName) ?>)</p>
                <p class="text-[11px] text-slate-600">ประธานคณะกรรมการจัดการแข่งขัน</p>
            </div>

            <!-- Center: Verification info -->
            <div class="flex flex-col items-center justify-center px-4">
                <span class="text-[11px] font-mono font-bold text-slate-800 tracking-tight">
                    เลขที่ <?= htmlspecialchars($certificate['certificate_no']) ?>
                </span>
                <span class="text-[10px] text-emerald-700 font-medium">
                    ✓ ตรวจสอบความถูกต้องได้ในระบบ
                </span>
            </div>

            <!-- Right Signatory -->
            <div class="text-center flex-1 max-w-[240px]">
                <div class="h-10 flex items-end justify-center">
                    <span class="font-['Kanit'] text-lg text-blue-900 italic font-semibold border-b border-dotted border-slate-500 pb-1 px-4">
                        <?= htmlspecialchars($secName) ?>
                    </span>
                </div>
                <p class="text-xs font-bold text-slate-800 mt-1">(<?= htmlspecialchars($secName) ?>)</p>
                <p class="text-[11px] text-slate-600">รองประธานคณะกรรมการจัดการแข่งขัน</p>
            </div>
        </div>
    </div>

</body>
</html>
