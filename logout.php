<?php
/**
 * ==============================================================================
 * ไฟล์: logout.php
 * คำอธิบาย: ออกจากระบบและลบ Session
 * ==============================================================================
 */
session_start();
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();
require_once __DIR__ . '/includes/auth.php';
redirect_to('index.php');
?>
