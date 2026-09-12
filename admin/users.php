<?php
/**
 * ==============================================================================
 * ไฟล์: admin/users.php
 * คำอธิบาย: จัดการบัญชีผู้ใช้งานระบบ (User Accounts Management)
 * รองรับการ เพิ่ม / แก้ไข / ลบ / รีเซ็ตรหัสผ่าน และกรองบัญชีผู้ใช้
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

requireRole(['SUPER_ADMIN', 'ADMIN']);
$currentUser = getCurrentUser();
$pdo = Database::getConnection();
$message = '';
$error = '';

// 1. Handle Password Reset to 123456
if (isset($_GET['reset_id'])) {
    $userId = $_GET['reset_id'];
    $stmtUser = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmtUser->execute([$userId]);
    $targetUser = $stmtUser->fetch();

    if ($targetUser) {
        $defaultHash = password_hash('123456', PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE users SET password = ?, password_plain = '123456', must_change_password = 1 WHERE id = ?");
        $stmt->execute([$defaultHash, $userId]);
        logActivity('RESET_USER_PASS', 'USERS', "รีเซ็ตรหัสผ่านของ " . $targetUser['username'] . " เป็น 123456");
        $message = "รีเซ็ตรหัสผ่านของ \"{$targetUser['username']}\" เป็น 123456 เรียบร้อยแล้ว (ระบบจะเปิดแจ้งเตือนให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบ)";
    }
}

// 2. Handle Delete User
if (isset($_GET['delete_id'])) {
    $deleteId = $_GET['delete_id'];
    
    // Protection: Cannot delete self
    if ($currentUser && $currentUser['id'] === $deleteId) {
        $error = "ไม่สามารถลบบัญชีผู้ใช้งานที่กำลังเข้าสู่ระบบอยู่ในขณะนี้ได้";
    } else {
        $stmtUser = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmtUser->execute([$deleteId]);
        $targetUser = $stmtUser->fetch();

        if ($targetUser) {
            if ($targetUser['username'] === 'superadmin' || $targetUser['username'] === 'admin') {
                $error = "ไม่สามารถลบบัญชีผู้ดูแลระบบหลัก (Main Administrator) ได้เพื่อความปลอดภัย";
            } else {
                $stmtDel = $pdo->prepare("DELETE FROM users WHERE id = ?");
                $stmtDel->execute([$deleteId]);
                logActivity('DELETE_USER', 'USERS', "ลบผู้ใช้งาน: " . $targetUser['username'] . " (" . $targetUser['full_name'] . ")");
                $message = "ลบบัญชีผู้ใช้งาน \"{$targetUser['username']}\" เรียบร้อยแล้ว";
            }
        }
    }
}

// 3. Handle Add / Edit User (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_user'])) {
    $action = $_POST['action_user'];
    $username = trim($_POST['username'] ?? '');
    $fullName = trim($_POST['full_name'] ?? '');
    $role = trim($_POST['role'] ?? 'SCHOOL');
    $schoolId = trim($_POST['school_id'] ?? '') ?: null;
    $email = trim($_POST['email'] ?? '') ?: ($username . '@sawangsung.ac.th');
    $phone = trim($_POST['phone'] ?? '');
    $status = trim($_POST['status'] ?? 'ACTIVE');
    $mustChange = isset($_POST['must_change_password']) ? 1 : 0;
    $customPassword = trim($_POST['password'] ?? '');

    if ($action === 'add') {
        if ($username && $fullName) {
            // Check username duplicate
            $chk = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $chk->execute([$username]);
            if ($chk->fetchColumn() > 0) {
                $error = "ชื่อผู้ใช้งาน (Username) \"$username\" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น";
            } else {
                $passToUse = $customPassword ?: '123456';
                $hash = password_hash($passToUse, PASSWORD_BCRYPT);
                $newId = 'user-' . uniqid();
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO users (id, school_id, username, password, password_plain, full_name, email, phone, role, status, must_change_password) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([$newId, $schoolId, $username, $hash, $passToUse, $fullName, $email, $phone, $role, $status, $mustChange]);
                    logActivity('ADD_USER', 'USERS', "เพิ่มผู้ใช้งาน: $username ($fullName)");
                    $message = "เพิ่มผู้ใช้งาน \"$username\" เรียบร้อยแล้ว (รหัสผ่าน: $passToUse)";
                } catch (Exception $e) {
                    $error = "ไม่สามารถเพิ่มผู้ใช้งานได้: " . $e->getMessage();
                }
            }
        } else {
            $error = "กรุณากรอกข้อมูล Username และ ชื่อ-นามสกุล ให้ครบถ้วน";
        }
    } elseif ($action === 'edit') {
        $editId = trim($_POST['user_id'] ?? '');
        if ($editId && $username && $fullName) {
            // Check username duplicate
            $chk = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ? AND id != ?");
            $chk->execute([$username, $editId]);
            if ($chk->fetchColumn() > 0) {
                $error = "ชื่อผู้ใช้งาน (Username) \"$username\" ซ้ำกับผู้ใช้อื่นในระบบ";
            } else {
                try {
                    if (!empty($customPassword)) {
                        $hash = password_hash($customPassword, PASSWORD_BCRYPT);
                        $stmt = $pdo->prepare("
                            UPDATE users SET 
                                school_id = ?, username = ?, password = ?, password_plain = ?,
                                full_name = ?, email = ?, phone = ?, role = ?, status = ?, must_change_password = ?
                            WHERE id = ?
                        ");
                        $stmt->execute([$schoolId, $username, $hash, $customPassword, $fullName, $email, $phone, $role, $status, $mustChange, $editId]);
                    } else {
                        $stmt = $pdo->prepare("
                            UPDATE users SET 
                                school_id = ?, username = ?, 
                                full_name = ?, email = ?, phone = ?, role = ?, status = ?, must_change_password = ?
                            WHERE id = ?
                        ");
                        $stmt->execute([$schoolId, $username, $fullName, $email, $phone, $role, $status, $mustChange, $editId]);
                    }
                    logActivity('EDIT_USER', 'USERS', "แก้ไขข้อมูลผู้ใช้งาน: $username ($fullName)");
                    $message = "บันทึกการแก้ไขข้อมูลผู้ใช้งาน \"$username\" เรียบร้อยแล้ว";
                } catch (Exception $e) {
                    $error = "ไม่สามารถแก้ไขข้อมูลได้: " . $e->getMessage();
                }
            }
        }
    }
}

// Fetch all users with school info
$users = $pdo->query("
    SELECT u.*, s.school_name, s.smis_code, s.short_name
    FROM users u
    LEFT JOIN schools s ON u.school_id = s.id
    ORDER BY 
        CASE 
            WHEN u.role = 'SUPER_ADMIN' THEN 1
            WHEN u.role = 'ADMIN' THEN 2
            WHEN u.role = 'SCHOOL' THEN 3
            ELSE 4
        END,
        u.username ASC
")->fetchAll();

$schools = $pdo->query("SELECT id, school_name, smis_code, school_code FROM schools ORDER BY school_name ASC")->fetchAll();

// Calculate user counts
$totalUserCount = count($users);
$superAdminCount = count(array_filter($users, fn($u) => $u['role'] === 'SUPER_ADMIN'));
$adminCount = count(array_filter($users, fn($u) => $u['role'] === 'ADMIN'));
$schoolUserCount = count(array_filter($users, fn($u) => $u['role'] === 'SCHOOL'));
$judgeCount = count(array_filter($users, fn($u) => $u['role'] === 'JUDGE' || $u['role'] === 'REFEREE'));

$pageTitle = 'จัดการบัญชีผู้ใช้งานระบบ - Admin Console';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- Top Header Bar -->
    <div class="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
            <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                    👥 USER ACCOUNTS & SECURITY
                </span>
                <span class="text-xs text-slate-400 font-mono">12 โรงเรียน + แอดมิน</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit text-slate-900">
                จัดการบัญชีผู้ใช้งานระบบ (User Accounts)
            </h1>
            <p class="text-xs text-slate-500">
                บัญชีผู้ดูแลระบบ (Admin/Super Admin) และบัญชีตัวแทน 12 โรงเรียน (Username = SMIS Code)
            </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <button onclick="openAddUserModal()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                <span>➕</span> เพิ่มผู้ใช้งานใหม่
            </button>
            <a href="/admin/index.php" class="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5">
                &larr; กลับแดชบอร์ด
            </a>
        </div>
    </div>

    <!-- Feedback Alerts -->
    <?php if ($message): ?>
        <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2.5 shadow-sm animate-fade-in">
            <span class="text-base font-bold">✅</span> 
            <span class="font-medium"><?= htmlspecialchars($message) ?></span>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2.5 shadow-sm animate-fade-in">
            <span class="text-base font-bold">✕</span> 
            <span class="font-medium"><?= htmlspecialchars($error) ?></span>
        </div>
    <?php endif; ?>

    <!-- User Stats Badges -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div class="text-xs text-slate-500 font-medium">ผู้ใช้ทั้งหมด</div>
            <div class="text-xl font-bold font-kanit text-slate-900 mt-1"><?= $totalUserCount ?></div>
            <div class="text-[10px] text-slate-400">บัญชีในระบบ</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-sm text-center">
            <div class="text-xs text-purple-700 font-medium">Super Admin</div>
            <div class="text-xl font-bold font-kanit text-purple-900 mt-1"><?= $superAdminCount ?></div>
            <div class="text-[10px] text-purple-600">ผู้ดูแลสูงสุด</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-sm text-center">
            <div class="text-xs text-blue-700 font-medium">Admin ส่วนกลาง</div>
            <div class="text-xl font-bold font-kanit text-blue-900 mt-1"><?= $adminCount ?></div>
            <div class="text-[10px] text-blue-600">กรรมการกลาง</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm text-center">
            <div class="text-xs text-emerald-700 font-medium">ตัวแทนโรงเรียน (SMIS)</div>
            <div class="text-xl font-bold font-kanit text-emerald-900 mt-1"><?= $schoolUserCount ?></div>
            <div class="text-[10px] text-emerald-600">12 โรงเรียน</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm text-center">
            <div class="text-xs text-amber-700 font-medium">กรรมการ / ผู้ตัดสิน</div>
            <div class="text-xl font-bold font-kanit text-amber-900 mt-1"><?= $judgeCount ?></div>
            <div class="text-[10px] text-amber-600">บันทึกผล</div>
        </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <button onclick="filterUsers('ALL')" id="tab_ALL" class="user-tab-btn px-3 py-1.5 rounded-xl font-semibold bg-slate-900 text-white transition">
                ทั้งหมด (<?= $totalUserCount ?>)
            </button>
            <button onclick="filterUsers('SCHOOL')" id="tab_SCHOOL" class="user-tab-btn px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                🏫 โรงเรียน (<?= $schoolUserCount ?>)
            </button>
            <button onclick="filterUsers('ADMIN')" id="tab_ADMIN" class="user-tab-btn px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                🛡️ ผู้ดูแลระบบ (<?= $adminCount + $superAdminCount ?>)
            </button>
            <button onclick="filterUsers('JUDGE')" id="tab_JUDGE" class="user-tab-btn px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                ⚖️ กรรมการ (<?= $judgeCount ?>)
            </button>
        </div>
        <div class="relative w-full sm:w-72">
            <input 
                type="text" 
                id="userSearchInput" 
                onkeyup="searchUsers()" 
                placeholder="ค้นหาชื่อ, Username, SMIS, โรงเรียน..." 
                class="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <span class="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>
    </div>

    <!-- User Accounts Table -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs" id="userTable">
                <thead class="bg-slate-50/90 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                        <th class="p-3.5 pl-6">Username (SMIS)</th>
                        <th class="p-3.5">ชื่อ-นามสกุล / ผู้ติดต่อ</th>
                        <th class="p-3.5">สิทธิ์ผู้ใช้งาน (Role)</th>
                        <th class="p-3.5">สังกัดโรงเรียน</th>
                        <th class="p-3.5 text-center">สถานะรหัสผ่าน</th>
                        <th class="p-3.5 text-center">สถานะใช้งาน</th>
                        <th class="p-3.5 pr-6 text-right">การจัดการ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100" id="userTableBody">
                    <?php foreach ($users as $u): 
                        $roleBadge = 'bg-slate-100 text-slate-700';
                        $roleLabel = $u['role'];
                        if ($u['role'] === 'SUPER_ADMIN') {
                            $roleBadge = 'bg-purple-100 text-purple-800 border border-purple-200';
                            $roleLabel = '👑 SUPER ADMIN';
                        } elseif ($u['role'] === 'ADMIN') {
                            $roleBadge = 'bg-blue-100 text-blue-800 border border-blue-200';
                            $roleLabel = '🛡️ ADMIN';
                        } elseif ($u['role'] === 'SCHOOL') {
                            $roleBadge = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                            $roleLabel = '🏫 ตัวแทนโรงเรียน';
                        } elseif ($u['role'] === 'JUDGE' || $u['role'] === 'REFEREE') {
                            $roleBadge = 'bg-amber-100 text-amber-800 border border-amber-200';
                            $roleLabel = '⚖️ กรรมการผู้ตัดสิน';
                        }
                    ?>
                        <tr class="hover:bg-slate-50/80 transition user-row" data-role="<?= htmlspecialchars($u['role']) ?>" data-search="<?= htmlspecialchars(strtolower($u['username'] . ' ' . $u['full_name'] . ' ' . ($u['school_name'] ?? '') . ' ' . ($u['email'] ?? '') . ' ' . ($u['phone'] ?? ''))) ?>">
                            <td class="p-3.5 pl-6 font-mono font-bold text-slate-900">
                                <div class="flex items-center gap-1.5">
                                    <span class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-900">
                                        <?= htmlspecialchars($u['username']) ?>
                                    </span>
                                </div>
                            </td>
                            <td class="p-3.5 font-medium text-slate-800">
                                <div class="font-bold font-kanit text-slate-900 text-sm"><?= htmlspecialchars($u['full_name']) ?></div>
                                <div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <?php if (!empty($u['phone'])): ?>
                                        <span>📞 <?= htmlspecialchars($u['phone']) ?></span>
                                    <?php endif; ?>
                                    <?php if (!empty($u['email'])): ?>
                                        <span>✉️ <?= htmlspecialchars($u['email']) ?></span>
                                    <?php endif; ?>
                                </div>
                            </td>
                            <td class="p-3.5">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold <?= $roleBadge ?>">
                                    <?= $roleLabel ?>
                                </span>
                            </td>
                            <td class="p-3.5 text-slate-700">
                                <?php if (!empty($u['school_name'])): ?>
                                    <span class="font-medium text-slate-900"><?= htmlspecialchars($u['school_name']) ?></span>
                                    <?php if (!empty($u['smis_code'])): ?>
                                        <span class="text-[10px] text-slate-400 block font-mono">SMIS: <?= htmlspecialchars($u['smis_code']) ?></span>
                                    <?php endif; ?>
                                <?php else: ?>
                                    <span class="text-slate-400 italic">ส่วนกลาง / คณะกรรมการ</span>
                                <?php endif; ?>
                            </td>
                            <td class="p-3.5 text-center">
                                <?php if ($u['must_change_password']): ?>
                                    <span class="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 font-medium inline-flex items-center gap-1">
                                        <span>🔒</span> รหัสตั้งต้น (123456)
                                    </span>
                                <?php else: ?>
                                    <span class="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium inline-flex items-center gap-1">
                                        <span>✓</span> เปลี่ยนรหัสผ่านแล้ว
                                    </span>
                                <?php endif; ?>
                            </td>
                            <td class="p-3.5 text-center">
                                <?php if (($u['status'] ?? 'ACTIVE') === 'ACTIVE'): ?>
                                    <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ใช้งานปกติ
                                    </span>
                                <?php else: ?>
                                    <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold">
                                        <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> ระงับใช้งาน
                                    </span>
                                <?php endif; ?>
                            </td>
                            <td class="p-3.5 pr-6 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <!-- ปุ่มแก้ไข -->
                                    <button 
                                        type="button"
                                        onclick="openEditUserModal(<?= htmlspecialchars(json_encode($u), ENT_QUOTES, 'UTF-8') ?>)"
                                        class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                                        title="แก้ไขข้อมูลผู้ใช้"
                                    >
                                        <span>✏️</span> แก้ไข
                                    </button>

                                    <!-- ปุ่มรีเซ็ตรหัสผ่าน -->
                                    <a 
                                        href="?reset_id=<?= urlencode($u['id']) ?>" 
                                        onclick="return confirm('ต้องการรีเซ็ตรหัสผ่านของ &quot;<?= addslashes($u['username']) ?>&quot; กลับเป็น 123456 ใช่หรือไม่?')"
                                        class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
                                        title="รีเซ็ตรหัสผ่านเป็น 123456"
                                    >
                                        <span>🔄</span> รีเซ็ต 123456
                                    </a>

                                    <!-- ปุ่มลบผู้ใช้ -->
                                    <?php if ($currentUser['id'] !== $u['id'] && $u['username'] !== 'superadmin'): ?>
                                        <a 
                                            href="?delete_id=<?= urlencode($u['id']) ?>" 
                                            onclick="return confirm('⚠️ ยืนยันการลบบัญชีผู้ใช้งาน &quot;<?= addslashes($u['username']) ?> (<?= addslashes($u['full_name']) ?>)&quot; ออกจากระบบถาวรหรือไม่?')"
                                            class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                                            title="ลบบัญชีผู้ใช้"
                                        >
                                            <span>🗑️</span> ลบ
                                        </a>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- ========================================== -->
<!-- MODAL: ADD USER (เพิ่มผู้ใช้งานใหม่) -->
<!-- ========================================== -->
<div id="modalAddUser" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="font-bold font-kanit text-slate-900 text-lg flex items-center gap-2">
                <span>👤</span> เพิ่มบัญชีผู้ใช้งานใหม่
            </h3>
            <button onclick="closeModal('modalAddUser')" class="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">&times;</button>
        </div>
        <form method="POST" class="space-y-3.5 text-xs">
            <input type="hidden" name="action_user" value="add">

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username / SMIS) <span class="text-rose-500">*</span></label>
                    <input type="text" name="username" required placeholder="เช่น 31030064 หรือ admin2" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <p class="text-[10px] text-slate-400 mt-0.5">สำหรับโรงเรียน ให้ใช้รหัส SMIS 8 หลัก</p>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">รหัสผ่านเริ่มต้น</label>
                    <input type="text" name="password" value="123456" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <p class="text-[10px] text-slate-400 mt-0.5">ค่าเริ่มต้นคือ 123456</p>
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล / ชื่อผู้รับผิดชอบ <span class="text-rose-500">*</span></label>
                <input type="text" name="full_name" required placeholder="เช่น นายประวิทย์ รักกีฬา (ครูผู้รับผิดชอบ)" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">สิทธิ์การใช้งาน (Role)</label>
                    <select name="role" id="add_user_role" onchange="toggleAddSchoolSelect()" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="SCHOOL">SCHOOL (ตัวแทน 12 โรงเรียน)</option>
                        <option value="ADMIN">ADMIN (ผู้ดูแลระบบกลาง)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (ผู้ดูแลระบบสูงสุด)</option>
                        <option value="JUDGE">JUDGE / REFEREE (กรรมการผู้ตัดสิน)</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">สถานะบัญชี</label>
                    <select name="status" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="ACTIVE">ใช้งานปกติ (ACTIVE)</option>
                        <option value="INACTIVE">ระงับชั่วคราว (INACTIVE)</option>
                    </select>
                </div>
            </div>

            <div id="add_school_group">
                <label class="block font-bold text-slate-700 mb-1">สังกัดโรงเรียน (สำหรับบัญชี SCHOOL)</label>
                <select name="school_id" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- เลือกโรงเรียนในกลุ่ม --</option>
                    <?php foreach ($schools as $s): ?>
                        <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['school_name']) ?> (SMIS: <?= htmlspecialchars($s['smis_code'] ?: $s['school_code']) ?>)</option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">อีเมลติดต่อ</label>
                    <input type="email" name="email" placeholder="user@sawangsung.ac.th" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                    <input type="text" name="phone" placeholder="08x-xxxxxxx" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
            </div>

            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label class="flex items-center gap-2 cursor-pointer text-amber-900 font-semibold">
                    <input type="checkbox" name="must_change_password" value="1" checked class="w-4 h-4 text-blue-600 rounded">
                    <span>บังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก (Must Change Password)</span>
                </label>
            </div>

            <div class="pt-3 flex gap-2">
                <button type="button" onclick="closeModal('modalAddUser')" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer">ยกเลิก</button>
                <button type="submit" class="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md cursor-pointer">บันทึกผู้ใช้</button>
            </div>
        </form>
    </div>
</div>

<!-- ========================================== -->
<!-- MODAL: EDIT USER (แก้ไขผู้ใช้งาน) -->
<!-- ========================================== -->
<div id="modalEditUser" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="font-bold font-kanit text-slate-900 text-lg flex items-center gap-2">
                <span>✏️</span> แก้ไขข้อมูลบัญชีผู้ใช้งาน
            </h3>
            <button onclick="closeModal('modalEditUser')" class="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">&times;</button>
        </div>
        <form method="POST" class="space-y-3.5 text-xs">
            <input type="hidden" name="action_user" value="edit">
            <input type="hidden" name="user_id" id="edit_user_id">

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username / SMIS) <span class="text-rose-500">*</span></label>
                    <input type="text" name="username" id="edit_username" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">รหัสผ่านใหม่ (หากไม่เปลี่ยนให้เว้นว่างไว้)</label>
                    <input type="text" name="password" id="edit_password" placeholder="เว้นว่างไว้หากใช้รหัสเดิม" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล / ชื่อผู้รับผิดชอบ <span class="text-rose-500">*</span></label>
                <input type="text" name="full_name" id="edit_full_name" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">สิทธิ์การใช้งาน (Role)</label>
                    <select name="role" id="edit_role" onchange="toggleEditSchoolSelect()" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="SCHOOL">SCHOOL (ตัวแทน 12 โรงเรียน)</option>
                        <option value="ADMIN">ADMIN (ผู้ดูแลระบบกลาง)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (ผู้ดูแลระบบสูงสุด)</option>
                        <option value="JUDGE">JUDGE / REFEREE (กรรมการผู้ตัดสิน)</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">สถานะบัญชี</label>
                    <select name="status" id="edit_status" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="ACTIVE">ใช้งานปกติ (ACTIVE)</option>
                        <option value="INACTIVE">ระงับชั่วคราว (INACTIVE)</option>
                    </select>
                </div>
            </div>

            <div id="edit_school_group">
                <label class="block font-bold text-slate-700 mb-1">สังกัดโรงเรียน</label>
                <select name="school_id" id="edit_school_id" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- ไม่ระบุ (ส่วนกลาง) --</option>
                    <?php foreach ($schools as $s): ?>
                        <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['school_name']) ?> (SMIS: <?= htmlspecialchars($s['smis_code'] ?: $s['school_code']) ?>)</option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">อีเมลติดต่อ</label>
                    <input type="email" name="email" id="edit_email" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                    <input type="text" name="phone" id="edit_phone" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
            </div>

            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label class="flex items-center gap-2 cursor-pointer text-amber-900 font-semibold">
                    <input type="checkbox" name="must_change_password" id="edit_must_change" value="1" class="w-4 h-4 text-blue-600 rounded">
                    <span>บังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบ (Must Change Password)</span>
                </label>
            </div>

            <div class="pt-3 flex gap-2">
                <button type="button" onclick="closeModal('modalEditUser')" class="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer">ยกเลิก</button>
                <button type="submit" class="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md cursor-pointer">บันทึกการแก้ไข</button>
            </div>
        </form>
    </div>
</div>

<script>
function openAddUserModal() {
    document.getElementById('modalAddUser').classList.remove('hidden');
    toggleAddSchoolSelect();
}

function openEditUserModal(user) {
    document.getElementById('edit_user_id').value = user.id;
    document.getElementById('edit_username').value = user.username || '';
    document.getElementById('edit_password').value = '';
    document.getElementById('edit_full_name').value = user.full_name || '';
    document.getElementById('edit_role').value = user.role || 'SCHOOL';
    document.getElementById('edit_status').value = user.status || 'ACTIVE';
    document.getElementById('edit_school_id').value = user.school_id || '';
    document.getElementById('edit_email').value = user.email || '';
    document.getElementById('edit_phone').value = user.phone || '';
    document.getElementById('edit_must_change').checked = user.must_change_password == 1;

    toggleEditSchoolSelect();
    document.getElementById('modalEditUser').classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function toggleAddSchoolSelect() {
    const role = document.getElementById('add_user_role').value;
    const group = document.getElementById('add_school_group');
    if (role === 'SCHOOL') {
        group.style.display = 'block';
    } else {
        group.style.display = 'block'; // keep accessible optionally
    }
}

function toggleEditSchoolSelect() {
    const role = document.getElementById('edit_role').value;
    const group = document.getElementById('edit_school_group');
    if (role === 'SCHOOL') {
        group.style.display = 'block';
    } else {
        group.style.display = 'block';
    }
}

function filterUsers(role) {
    const tabs = document.querySelectorAll('.user-tab-btn');
    tabs.forEach(t => {
        t.classList.remove('bg-slate-900', 'text-white');
        t.classList.add('bg-slate-100', 'text-slate-600');
    });
    const currentTab = document.getElementById('tab_' + role);
    if (currentTab) {
        currentTab.classList.remove('bg-slate-100', 'text-slate-600');
        currentTab.classList.add('bg-slate-900', 'text-white');
    }

    const rows = document.querySelectorAll('.user-row');
    rows.forEach(r => {
        const rowRole = r.getAttribute('data-role');
        if (role === 'ALL') {
            r.style.display = '';
        } else if (role === 'ADMIN' && (rowRole === 'ADMIN' || rowRole === 'SUPER_ADMIN')) {
            r.style.display = '';
        } else if (role === 'JUDGE' && (rowRole === 'JUDGE' || rowRole === 'REFEREE')) {
            r.style.display = '';
        } else if (rowRole === role) {
            r.style.display = '';
        } else {
            r.style.display = 'none';
        }
    });
}

function searchUsers() {
    const term = document.getElementById('userSearchInput').value.toLowerCase().trim();
    const rows = document.querySelectorAll('.user-row');
    rows.forEach(r => {
        const searchData = r.getAttribute('data-search') || '';
        if (term === '' || searchData.includes(term)) {
            r.style.display = '';
        } else {
            r.style.display = 'none';
        }
    });
}
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
