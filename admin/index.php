<?php
/**
 * ==============================================================================
 * ไฟล์: admin/index.php
 * คำอธิบาย: แผงควบคุมหลักสำหรับ Super Admin / ผู้จัดการแข่งขัน (Full Admin Console)
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

requireRole(['SUPER_ADMIN', 'ADMIN']);
$user = getCurrentUser();
$pdo = Database::getConnection();

// ดึงสถิติต่างๆ
$schoolCount = $pdo->query("SELECT COUNT(*) FROM schools")->fetchColumn();
$sportCount = $pdo->query("SELECT COUNT(*) FROM sports")->fetchColumn();
$eventCount = $pdo->query("SELECT COUNT(*) FROM events")->fetchColumn();
$studentCount = $pdo->query("SELECT COUNT(*) FROM students")->fetchColumn();
$coachCount = $pdo->query("SELECT COUNT(*) FROM coaches")->fetchColumn();
$regCount = $pdo->query("SELECT COUNT(*) FROM registrations")->fetchColumn();
$resultCount = $pdo->query("SELECT COUNT(DISTINCT event_id) FROM results WHERE status = 'OFFICIAL'")->fetchColumn();
$certCount = $pdo->query("SELECT COUNT(*) FROM certificates")->fetchColumn();

// ประวัติกิจกรรม
$recentLogs = $pdo->query("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 8")->fetchAll();

$pageTitle = 'Admin Dashboard - กลุ่มโรงเรียนสว่างสูงกระสัง';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- Top Welcome Header -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
            <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                    <?= $user['role'] === 'SUPER_ADMIN' ? '👑 SUPER ADMIN CONSOLE' : '🛡️ ADMIN CONSOLE' ?>
                </span>
                <span class="text-xs text-slate-400 font-mono">ระบบ PHP 8.x + MySQL</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit text-slate-900">
                ศูนย์บริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง
            </h1>
            <p class="text-xs text-slate-500">
                ผู้ดูแลระบบ: <b class="text-slate-800"><?= htmlspecialchars($user['full_name']) ?></b> (<?= htmlspecialchars($user['username']) ?>)
            </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <a href="/admin/results.php" class="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5">
                <span>🏆</span> ประกาศผลการแข่งขัน
            </a>
            <a href="/admin/settings.php" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5">
                <span>⚙️</span> ตั้งค่า GAS
            </a>
            <a href="/index.php" target="_blank" class="px-3.5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5">
                <span>🌐</span> ดูหน้าเว็บจริง
            </a>
        </div>
    </div>

    <!-- Quick Management Modules Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <!-- 0. รายงานผลการแข่งขันประจำวัน (Daily Match Report) -->
        <a href="/judge/index.php" class="bg-white p-6 rounded-3xl border border-rose-200 shadow-sm hover:border-rose-500 hover:shadow-md transition group flex flex-col justify-between space-y-4">
            <div class="flex items-start justify-between">
                <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                    📢
                </div>
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    รายงานผลสด
                </span>
            </div>
            <div>
                <h3 class="font-bold font-kanit text-slate-900 text-base group-hover:text-rose-600 transition">รายงานผลการแข่งขันประจำวัน (สด)</h3>
                <p class="text-xs text-slate-500 mt-1">บันทึกผลการแข่งขันสดแบบแมตช์ต่อแมตช์ คะแนน ผลชนะ/แพ้/เสมอ และแสดงผลหน้าแรกทันที</p>
            </div>
            <div class="text-xs font-bold text-rose-600 flex items-center gap-1 pt-3 border-t border-rose-100">
                เข้าสู่หน้าบันทึกผลประจำวัน &rarr;
            </div>
        </a>

        <!-- 1. จัดการโรงเรียน & SMIS -->
        <a href="/admin/schools.php" class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition group flex flex-col justify-between space-y-4">
            <div class="flex items-start justify-between">
                <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                    🏫
                </div>
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                    <?= $schoolCount ?> โรงเรียน
                </span>
            </div>
            <div>
                <h3 class="font-bold font-kanit text-slate-900 text-base group-hover:text-blue-600 transition">จัดการข้อมูลโรงเรียน & รหัสสถานศึกษา</h3>
                <p class="text-xs text-slate-500 mt-1">เพิ่ม/แก้ไข ชื่อโรงเรียน ผู้อำนวยการ รหัสสถานศึกษา 8 หลัก ที่อยู่ เบอร์โทร และรีเซ็ตรหัสผ่าน (123456)</p>
            </div>
            <div class="text-xs font-bold text-blue-600 flex items-center gap-1 pt-3 border-t border-slate-100">
                เข้าสู่หน้าจัดการโรงเรียน &rarr;
            </div>
        </a>

        <!-- 2. ประกาศผลการแข่งขัน & สรุปเหรียญ -->
        <a href="/admin/results.php" class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-amber-500 hover:shadow-md transition group flex flex-col justify-between space-y-4">
            <div class="flex items-start justify-between">
                <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                    🏆
                </div>
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    ประกาศแล้ว <?= $resultCount ?> รายการ
                </span>
            </div>
            <div>
                <h3 class="font-bold font-kanit text-slate-900 text-base group-hover:text-amber-600 transition">ประกาศผลการแข่งขัน & เหรียญรางวัล</h3>
                <p class="text-xs text-slate-500 mt-1">บันทึกผลชนะเลิศ (ทอง), รอง 1 (เงิน), รอง 2 (ทองแดง) คำนวณตารางคะแนนและออกเกียรติบัตรอัตโนมัติ</p>
            </div>
            <div class="text-xs font-bold text-amber-600 flex items-center gap-1 pt-3 border-t border-slate-100">
                เข้าสู่ระบบประกาศผล &rarr;
            </div>
        </a>

        <!-- 3. จัดการกีฬาและรายการแข่งขัน -->
        <a href="/admin/events.php" class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition group flex flex-col justify-between space-y-4">
            <div class="flex items-start justify-between">
                <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                    🏅
                </div>
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    <?= $sportCount ?> ชนิด / <?= $eventCount ?> รายการ
                </span>
            </div>
            <div>
                <h3 class="font-bold font-kanit text-slate-900 text-base group-hover:text-indigo-600 transition">จัดการกีฬา & รายการแข่งขัน</h3>
                <p class="text-xs text-slate-500 mt-1">เพิ่ม/แก้ไข ชนิดกีฬา รายการแข่งขัน รุ่นอายุ ระดับชั้น และกติกาการแข่งขัน</p>
            </div>
            <div class="text-xs font-bold text-indigo-600 flex items-center gap-1 pt-3 border-t border-slate-100">
                เข้าสู่หน้าจัดการกีฬา &rarr;
            </div>
        </a>

        <!-- 4. จัดการและออกเกียรติบัตร -->
        <a href="/admin/certificates.php" class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition group flex flex-col justify-between space-y-4">
            <div class="flex items-start justify-between">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                    📜
                </div>
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <?= $certCount ?> ฉบับ
                </span>
            </div>
            <div>
                <h3 class="font-bold font-kanit text-slate-900 text-base group-hover:text-emerald-600 transition">ออกเกียรติบัตร E-Certificate</h3>
                <p class="text-xs text-slate-500 mt-1">สร้างเกียรติบัตรพร้อมรหัส QR Code สำหรับสแกนตรวจสอบ และพิมพ์เกียรติบัตรนักกีฬา/ครูผู้ฝึกสอน</p>
            </div>
            <div class="text-xs font-bold text-emerald-600 flex items-center gap-1 pt-3 border-t border-slate-100">
                จัดการเกียรติบัตร &rarr;
            </div>
        </a>

        <!-- 5. จัดการผู้ใช้งาน -->
        <a href="/admin/users.php" class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-purple-500 hover:shadow-md transition group flex flex-col justify-between space-y-4">
            <div class="flex items-start justify-between">
                <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                    👥
                </div>
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    ผู้ใช้งาน
                </span>
            </div>
            <div>
                <h3 class="font-bold font-kanit text-slate-900 text-base group-hover:text-purple-600 transition">จัดการบัญชีผู้ใช้งานระบบ</h3>
                <p class="text-xs text-slate-500 mt-1">จัดการผู้ดูแลระบบ แอดมินโรงเรียน และผู้รายงานผลการแข่งขัน</p>
            </div>
            <div class="text-xs font-bold text-purple-600 flex items-center gap-1 pt-3 border-t border-slate-100">
                จัดการผู้ใช้งาน &rarr;
            </div>
        </a>

        <?php if ($user['role'] === 'SUPER_ADMIN'): ?>
        <!-- 6. ตั้งค่าระบบ & Google GAS (สำหรับ Super Admin เท่านั้น) -->
        <a href="/admin/settings.php" class="bg-white p-6 rounded-3xl border border-indigo-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition group flex flex-col justify-between space-y-4">
            <div class="flex items-start justify-between">
                <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                    ⚙️
                </div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Super Admin
                </span>
            </div>
            <div>
                <h3 class="font-bold font-kanit text-slate-900 text-base group-hover:text-indigo-600 transition">ตั้งค่าระบบ & Google Cloud / GAS</h3>
                <p class="text-xs text-slate-500 mt-1">ทดสอบเชื่อมต่อ Live Diagnostics, คัดลอก Code.gs และตั้งค่า Google Slides / Drive</p>
            </div>
            <div class="text-xs font-bold text-indigo-600 flex items-center gap-1 pt-3 border-t border-indigo-100">
                เปิดหน้าตั้งค่าระบบ &rarr;
            </div>
        </a>
        <?php endif; ?>
    </div>

    <!-- Stats Summary Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-xs text-slate-500 font-medium">โรงเรียนในกลุ่ม</p>
            <p class="text-2xl font-bold font-kanit text-slate-900 mt-1"><?= $schoolCount ?> <span class="text-xs font-normal text-slate-400">แห่ง</span></p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-xs text-slate-500 font-medium">รายการแข่งขัน</p>
            <p class="text-2xl font-bold font-kanit text-blue-600 mt-1"><?= $eventCount ?> <span class="text-xs font-normal text-slate-400">รายการ</span></p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-xs text-slate-500 font-medium">นักเรียน/นักกีฬา</p>
            <p class="text-2xl font-bold font-kanit text-emerald-600 mt-1"><?= $studentCount ?> <span class="text-xs font-normal text-slate-400">คน</span></p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-xs text-slate-500 font-medium">เกียรติบัตรที่ออกแล้ว</p>
            <p class="text-2xl font-bold font-kanit text-amber-600 mt-1"><?= $certCount ?> <span class="text-xs font-normal text-slate-400">ใบ</span></p>
        </div>
    </div>

    <!-- Audit Logs -->
    <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 class="text-sm font-bold font-kanit text-slate-900 flex items-center gap-2">
                <span>📋</span> บันทึกกิจกรรมของระบบ (Audit Activity Logs)
            </h2>
            <span class="text-[11px] text-slate-400">8 รายการล่าสุด</span>
        </div>
        <div class="divide-y divide-slate-100 text-xs">
            <?php if (empty($recentLogs)): ?>
                <p class="py-4 text-center text-slate-400">ยังไม่มีประวัติกิจกรรมในระบบ</p>
            <?php else: ?>
                <?php foreach ($recentLogs as $log): ?>
                    <div class="py-2.5 flex items-center justify-between">
                        <div>
                            <span class="font-bold text-slate-800 font-mono">[<?= htmlspecialchars($log['action']) ?>]</span>
                            <span class="text-slate-600 ml-1"><?= htmlspecialchars($log['details'] ?? '') ?></span>
                            <span class="text-slate-400 ml-2">โดย <?= htmlspecialchars($log['username']) ?></span>
                        </div>
                        <span class="text-slate-400 font-mono text-[11px]"><?= htmlspecialchars($log['created_at']) ?></span>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
