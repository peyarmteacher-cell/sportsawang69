<?php
/**
 * ==============================================================================
 * ไฟล์: admin/schools.php
 * คำอธิบาย: จัดการรายชื่อโรงเรียน เพิ่ม แก้ไข ลบ และรีเซ็ตรหัสผ่าน SMIS ของ 12 โรงเรียน
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

requireRole(['SUPER_ADMIN', 'ADMIN']);
$pdo = Database::getConnection();
$message = '';
$error = '';

// ตรวจสอบข้อมูลการแข่งขัน
$comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch();
$compId = $comp['id'] ?? 'comp-2026';

// -------------------------------------------------------------
// 1. เพิ่ม / แก้ไข ข้อมูลโรงเรียน
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_school'])) {
    $action = $_POST['action_school'];
    $schoolName = trim($_POST['school_name'] ?? '');
    $shortName = trim($_POST['short_name'] ?? '');
    $smisCode = trim($_POST['smis_code'] ?? '');
    $directorName = trim($_POST['director_name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $logo = trim($_POST['logo'] ?? '');
    $schoolId = trim($_POST['school_id'] ?? '');

    if (empty($logo)) {
        $logo = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150';
    }
    if (empty($shortName) && $schoolName) {
        $shortName = 'รร.' . str_replace('โรงเรียน', '', $schoolName);
    }

    if ($action === 'add' && $schoolName && $smisCode) {
        try {
            $newId = 'sch-' . uniqid();
            $stmt = $pdo->prepare("
                INSERT INTO schools (id, competition_id, school_code, smis_code, school_name, short_name, address, phone, logo, director_name, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            ");
            $stmt->execute([$newId, $compId, $smisCode, $smisCode, $schoolName, $shortName, $address, $phone, $logo, $directorName]);

            // สร้างบัญชีผู้ใช้งาน SMIS สำหรับโรงเรียนนี้อัตโนมัติ
            $chkUser = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $chkUser->execute([$smisCode]);
            if (!$chkUser->fetch()) {
                $usrId = 'usr-' . uniqid();
                $defaultHash = password_hash('123456', PASSWORD_BCRYPT);
                $uStmt = $pdo->prepare("
                    INSERT INTO users (id, school_id, username, password, full_name, email, phone, role, status, must_change_password)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHOOL', 'ACTIVE', 1)
                ");
                $uStmt->execute([
                    $usrId, $newId, $smisCode, $defaultHash, 
                    'ผู้ประสานงาน ' . $schoolName, 
                    $smisCode . '@sawangsung.ac.th', 
                    $phone
                ]);
            }

            logActivity('ADD_SCHOOL', 'SCHOOL', "เพิ่มโรงเรียน: $schoolName ($smisCode)");
            $message = "เพิ่มโรงเรียน \"$schoolName\" และสร้างบัญชี SMIS ($smisCode) สำเร็จแล้ว! รหัสผ่านเริ่มต้นคือ 123456";
        } catch (Exception $e) {
            $error = "เกิดข้อผิดพลาดในการเพิ่มโรงเรียน: " . $e->getMessage();
        }
    } elseif ($action === 'edit' && $schoolId && $schoolName && $smisCode) {
        try {
            // ดึงข้อมูลเดิมเพื่อเช็ค SMIS
            $old = $pdo->prepare("SELECT smis_code FROM schools WHERE id = ?");
            $old->execute([$schoolId]);
            $oldData = $old->fetch();

            $stmt = $pdo->prepare("
                UPDATE schools 
                SET school_code = ?, smis_code = ?, school_name = ?, short_name = ?, address = ?, phone = ?, logo = ?, director_name = ?
                WHERE id = ?
            ");
            $stmt->execute([$smisCode, $smisCode, $schoolName, $shortName, $address, $phone, $logo, $directorName, $schoolId]);

            // อัปเดต username ใน users หาก SMIS เปลี่ยน
            if ($oldData && $oldData['smis_code'] !== $smisCode) {
                $uUpdate = $pdo->prepare("UPDATE users SET username = ? WHERE school_id = ?");
                $uUpdate->execute([$smisCode, $schoolId]);
            }

            logActivity('EDIT_SCHOOL', 'SCHOOL', "แก้ไขข้อมูลโรงเรียน: $schoolName ($smisCode)");
            $message = "บันทึกการแก้ไขข้อมูลโรงเรียน \"$schoolName\" เรียบร้อยแล้ว";
        } catch (Exception $e) {
            $error = "เกิดข้อผิดพลาดในการแก้ไข: " . $e->getMessage();
        }
    }
}

// -------------------------------------------------------------
// 2. ลบโรงเรียน (Delete School)
// -------------------------------------------------------------
if (isset($_GET['delete_school_id'])) {
    $delId = $_GET['delete_school_id'];
    try {
        $schName = $pdo->prepare("SELECT school_name FROM schools WHERE id = ?");
        $schName->execute([$delId]);
        $name = $schName->fetchColumn() ?: $delId;

        // ลบ User ที่เกี่ยวข้อง
        $pdo->prepare("DELETE FROM users WHERE school_id = ?")->execute([$delId]);
        // ลบโรงเรียน
        $pdo->prepare("DELETE FROM schools WHERE id = ?")->execute([$delId]);

        logActivity('DELETE_SCHOOL', 'SCHOOL', "ลบโรงเรียน: $name");
        $message = "ลบโรงเรียน \"$name\" และบัญชีผู้ใช้งานที่เกี่ยวข้องเรียบร้อยแล้ว";
    } catch (Exception $e) {
        $error = "ไม่สามารถลบโรงเรียนได้: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// 3. รีเซ็ตรหัสผ่าน (Reset Password to 123456)
// -------------------------------------------------------------
if (isset($_GET['reset_password_id'])) {
    $schId = $_GET['reset_password_id'];
    $defaultHash = password_hash('123456', PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE users SET password = ?, must_change_password = 1 WHERE school_id = ?");
    $stmt->execute([$defaultHash, $schId]);
    logActivity('RESET_PASSWORD', 'SCHOOL', "รีเซ็ตรหัสผ่านโรงเรียน $schId เป็น 123456");
    $message = "รีเซ็ตรหัสผ่านของโรงเรียนเป็น 123456 เรียบร้อยแล้ว (ผู้ใช้งานต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบ)";
}

// -------------------------------------------------------------
// ดึงรายชื่อโรงเรียนและข้อมูลสถิติ
// -------------------------------------------------------------
$schools = $pdo->query("
    SELECT s.*, u.username AS smis_user, u.must_change_password,
           (SELECT COUNT(*) FROM students st WHERE st.school_id = s.id) as student_count,
           (SELECT COUNT(*) FROM coaches co WHERE co.school_id = s.id) as coach_count,
           (SELECT COUNT(*) FROM registrations rg WHERE rg.school_id = s.id) as reg_count,
           (SELECT COUNT(*) FROM results rs WHERE rs.school_id = s.id AND rs.status = 'OFFICIAL') as award_count
    FROM schools s
    LEFT JOIN users u ON s.id = u.school_id
    ORDER BY s.school_name ASC
")->fetchAll();

$pageTitle = 'จัดการข้อมูลโรงเรียนและบัญชี SMIS - Admin Console';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- Header Bar -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                    🏫 SCHOOL MANAGEMENT
                </span>
                <span class="text-xs text-slate-400">ทั้งหมด <?= count($schools) ?> โรงเรียน</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit text-slate-900">
                จัดการข้อมูลสถานศึกษาและบัญชีผู้ใช้งาน SMIS
            </h1>
            <p class="text-xs text-slate-500 mt-1">
                กลุ่มโรงเรียนสว่างสูงกระสัง &bull; เพิ่ม แก้ไข ข้อมูลโรงเรียน ผู้อำนวยการ รหัส SMIS และรีเซ็ตรหัสผ่านเริ่มต้น (123456)
            </p>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="openAddSchoolModal()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer">
                <span>➕</span> เพิ่มโรงเรียนใหม่
            </button>
            <a href="/admin/index.php" class="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition">
                &larr; กลับหน้าควบคุม
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

    <!-- Schools Grid Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <?php foreach ($schools as $sch): ?>
            <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                <div>
                    <!-- School Top Info -->
                    <div class="flex items-start gap-4">
                        <img 
                            src="<?= htmlspecialchars($sch['logo'] ?: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150') ?>" 
                            alt="<?= htmlspecialchars($sch['school_name']) ?>" 
                            class="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        >
                        <div class="min-w-0 flex-1">
                            <h3 class="font-bold font-kanit text-slate-900 text-base leading-tight"><?= htmlspecialchars($sch['school_name']) ?></h3>
                            <p class="text-[11px] text-slate-400 mt-0.5"><?= htmlspecialchars($sch['short_name'] ?: '-') ?></p>
                            <div class="flex items-center gap-2 mt-2 flex-wrap">
                                <span class="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg border border-blue-200">
                                    SMIS: <?= htmlspecialchars($sch['smis_code']) ?>
                                </span>
                                <?php if ($sch['must_change_password']): ?>
                                    <span class="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200 font-semibold">
                                        🔒 รหัสเริ่มต้น
                                    </span>
                                <?php else: ?>
                                    <span class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-200 font-semibold">
                                        ✓ เปลี่ยนรหัสแล้ว
                                    </span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <!-- Details Box -->
                    <div class="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div class="flex items-center gap-2">
                            <span class="text-slate-400 font-medium w-16 shrink-0">ผู้อำนวยการ:</span>
                            <span class="font-semibold text-slate-800 truncate"><?= htmlspecialchars($sch['director_name'] ?: 'ยังไม่ระบุ') ?></span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-slate-400 font-medium w-16 shrink-0">เบอร์โทร:</span>
                            <span class="text-slate-700"><?= htmlspecialchars($sch['phone'] ?: '-') ?></span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-slate-400 font-medium w-16 shrink-0">ที่อยู่:</span>
                            <span class="text-slate-600 line-clamp-1"><?= htmlspecialchars($sch['address'] ?: 'ต.สว่าง อ.กระสัง จ.บุรีรัมย์') ?></span>
                        </div>
                    </div>

                    <!-- Statistics Pills -->
                    <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                        <div class="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div class="text-[10px] text-slate-400">นักกีฬา</div>
                            <div class="text-sm font-bold font-kanit text-slate-800"><?= $sch['student_count'] ?> คน</div>
                        </div>
                        <div class="p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div class="text-[10px] text-slate-400">ผู้ฝึกสอน</div>
                            <div class="text-sm font-bold font-kanit text-slate-800"><?= $sch['coach_count'] ?> คน</div>
                        </div>
                        <div class="p-2 rounded-xl bg-blue-50 border border-blue-100">
                            <div class="text-[10px] text-blue-600">รายการที่ส่ง</div>
                            <div class="text-sm font-bold font-kanit text-blue-700"><?= $sch['reg_count'] ?> รายการ</div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <button 
                        type="button"
                        onclick='editSchool(<?= json_encode($sch) ?>)' 
                        class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                        ✏️ แก้ไขข้อมูล
                    </button>
                    
                    <div class="flex items-center gap-1.5">
                        <a 
                            href="?reset_password_id=<?= urlencode($sch['id']) ?>" 
                            onclick="return confirm('คุณต้องการรีเซ็ตรหัสผ่านของโรงเรียน <?= addslashes($sch['school_name']) ?> กลับเป็น 123456 ใช่หรือไม่?')"
                            class="text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-200 font-medium transition"
                            title="รีเซ็ตรหัสผ่านเป็น 123456"
                        >
                            🔄 รีเซ็ตรหัส
                        </a>
                        <a 
                            href="?delete_school_id=<?= urlencode($sch['id']) ?>" 
                            onclick="return confirm('⚠️ ยืนยันการลบโรงเรียน <?= addslashes($sch['school_name']) ?> หรือไม่? การลบจะทำให้บัญชีผู้ใช้และข้อมูลที่เกี่ยวข้องถูกลบด้วย')"
                            class="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl border border-rose-200 font-medium transition"
                            title="ลบโรงเรียน"
                        >
                            🗑️
                        </a>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- ========================================================================= -->
<!-- Modal: เพิ่ม / แก้ไข ข้อมูลโรงเรียน -->
<!-- ========================================================================= -->
<div id="modalSchool" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 id="modalSchoolTitle" class="font-bold font-kanit text-slate-900 text-lg flex items-center gap-2">
                <span>🏫</span> เพิ่มโรงเรียนใหม่
            </h3>
            <button onclick="document.getElementById('modalSchool').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">&times;</button>
        </div>
        
        <form method="POST" class="space-y-3.5 text-xs">
            <input type="hidden" name="action_school" id="schoolFormAction" value="add">
            <input type="hidden" name="school_id" id="schoolFormId" value="">

            <div>
                <label class="block font-bold text-slate-700 mb-1">ชื่อโรงเรียน (เต็ม) <span class="text-rose-500">*</span></label>
                <input 
                    type="text" 
                    name="school_name" 
                    id="schoolFormName" 
                    required 
                    placeholder="เช่น โรงเรียนบ้านหนองหว้า" 
                    class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                >
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">ชื่อย่อ</label>
                    <input 
                        type="text" 
                        name="short_name" 
                        id="schoolFormShortName" 
                        placeholder="เช่น รร.บ้านหนองหว้า" 
                        class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                    >
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">รหัส SMIS 8 หลัก (Username) <span class="text-rose-500">*</span></label>
                    <input 
                        type="text" 
                        name="smis_code" 
                        id="schoolFormSmis" 
                        required 
                        placeholder="เช่น 31030064" 
                        class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                    >
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">ชื่อผู้อำนวยการโรงเรียน / ผู้บริหาร</label>
                <input 
                    type="text" 
                    name="director_name" 
                    id="schoolFormDirector" 
                    placeholder="เช่น นายวิชัย สุขเกษม" 
                    class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                >
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                    <input 
                        type="text" 
                        name="phone" 
                        id="schoolFormPhone" 
                        placeholder="044-689101 หรือ 081-xxxxxxx" 
                        class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                    >
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">ลิงก์รูปตราสัญลักษณ์ (Logo URL)</label>
                    <input 
                        type="text" 
                        name="logo" 
                        id="schoolFormLogo" 
                        placeholder="https://..." 
                        class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
                    >
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">ที่อยู่ / สถานที่ตั้ง</label>
                <textarea 
                    name="address" 
                    id="schoolFormAddress" 
                    rows="2" 
                    placeholder="เช่น ต.หนองเต็ง อ.กระสัง จ.บุรีรัมย์" 
                    class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                ></textarea>
            </div>

            <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-800">
                💡 <b>หมายเหตุ:</b> เมื่อเพิ่มโรงเรียนใหม่ ระบบจะสร้างบัญชีสำหรับเข้าสู่ระบบให้อัตโนมัติ โดยใช้ <b>รหัส SMIS</b> เป็น Username และมีรหัสผ่านเริ่มต้นคือ <b class="font-mono">123456</b>
            </div>

            <div class="pt-3 flex gap-3">
                <button 
                    type="button" 
                    onclick="document.getElementById('modalSchool').classList.add('hidden')" 
                    class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer transition"
                >
                    ยกเลิก
                </button>
                <button 
                    type="submit" 
                    class="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md cursor-pointer transition"
                >
                    บันทึกข้อมูลโรงเรียน
                </button>
            </div>
        </form>
    </div>
</div>

<script>
function openAddSchoolModal() {
    document.getElementById('modalSchoolTitle').innerHTML = '<span>🏫</span> เพิ่มโรงเรียนใหม่';
    document.getElementById('schoolFormAction').value = 'add';
    document.getElementById('schoolFormId').value = '';
    document.getElementById('schoolFormName').value = '';
    document.getElementById('schoolFormShortName').value = '';
    document.getElementById('schoolFormSmis').value = '';
    document.getElementById('schoolFormDirector').value = '';
    document.getElementById('schoolFormPhone').value = '';
    document.getElementById('schoolFormAddress').value = 'อ.กระสัง จ.บุรีรัมย์';
    document.getElementById('schoolFormLogo').value = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150';
    document.getElementById('modalSchool').classList.remove('hidden');
}

function editSchool(sch) {
    document.getElementById('modalSchoolTitle').innerHTML = '<span>✏️</span> แก้ไขข้อมูลโรงเรียน: ' + sch.school_name;
    document.getElementById('schoolFormAction').value = 'edit';
    document.getElementById('schoolFormId').value = sch.id;
    document.getElementById('schoolFormName').value = sch.school_name;
    document.getElementById('schoolFormShortName').value = sch.short_name || '';
    document.getElementById('schoolFormSmis').value = sch.smis_code;
    document.getElementById('schoolFormDirector').value = sch.director_name || '';
    document.getElementById('schoolFormPhone').value = sch.phone || '';
    document.getElementById('schoolFormAddress').value = sch.address || '';
    document.getElementById('schoolFormLogo').value = sch.logo || '';
    document.getElementById('modalSchool').classList.remove('hidden');
}
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
