<?php
/**
 * ==============================================================================
 * ไฟล์: change-password.php
 * คำอธิบาย: บังคับเปลี่ยนรหัสผ่านครั้งแรกเมื่อเข้าสู่ระบบด้วยรหัสเริ่มต้น
 * ==============================================================================
 */
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';

requireLogin();
$user = getCurrentUser();
$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    if (strlen($newPassword) < 6) {
        $error = 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    } elseif ($newPassword === '123456') {
        $error = 'กรุณาอย่าใช้รหัสผ่านเริ่มต้น (123456) เพื่อความปลอดภัย';
    } elseif ($newPassword !== $confirmPassword) {
        $error = 'รหัสผ่านยืนยันไม่ตรงกัน';
    } else {
        try {
            $pdo = Database::getConnection();
            $hash = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?");
            $stmt->execute([$hash, $user['id']]);

            $_SESSION['user']['must_change_password'] = 0;
            logActivity('CHANGE_PASSWORD', 'AUTH', 'เปลี่ยนรหัสผ่านครั้งแรกสำเร็จ');

            // ไปยังหน้าหลักตามสิทธิ์
            if ($user['role'] === 'SCHOOL') {
                header("Location: /school/index.php");
            } elseif ($user['role'] === 'REFEREE' || $user['role'] === 'JUDGE') {
                header("Location: /judge/index.php");
            } else {
                header("Location: /admin/index.php");
            }
            exit;
        } catch (Exception $e) {
            $error = 'เกิดข้อผิดพลาด: ' . $e->getMessage();
        }
    }
}

$pageTitle = 'เปลี่ยนรหัสผ่านใหม่ - กลุ่มโรงเรียนสว่างสูงกระสัง';
require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
    <div class="text-center mb-6">
        <div class="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            🔒
        </div>
        <h1 class="text-xl font-bold font-kanit text-slate-900">กรุณาตั้งรหัสผ่านใหม่</h1>
        <p class="text-xs text-slate-500 mt-1">
            บัญชี <b><?= htmlspecialchars($user['full_name']) ?></b> เข้าสู่ระบบด้วยรหัสเริ่มต้น กรุณากำหนดรหัสผ่านใหม่เพื่อความปลอดภัย
        </p>
    </div>

    <?php if ($error): ?>
        <div class="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span> <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" class="space-y-4 text-xs">
        <div>
            <label class="block font-semibold text-slate-700 mb-1">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
            <input type="password" name="new_password" required placeholder="กำหนดรหัสผ่านใหม่" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden">
        </div>

        <div>
            <label class="block font-semibold text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
            <input type="password" name="confirm_password" required placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden">
        </div>

        <button type="submit" class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2">
            บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ
        </button>
    </form>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
