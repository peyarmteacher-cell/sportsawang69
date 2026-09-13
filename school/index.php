<?php
/**
 * ==============================================================================
 * ไฟล์: school/index.php
 * คำอธิบาย: ระบบจัดการข้อมูลนักเรียน ครูผู้ฝึกสอน และการลงทะเบียนเข้าแข่งขันของโรงเรียน
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/thai_formatter.php';

requireRole(['SCHOOL', 'SUPER_ADMIN', 'ADMIN']);
$user = getCurrentUser();
$pdo = Database::getConnection();
$message = '';
$error = '';

$schoolId = $user['school_id'] ?? null;
if (empty($schoolId)) {
    // ลองค้นหาจากรหัส SMIS / school_code
    $lookup = $pdo->prepare("SELECT id FROM schools WHERE smis_code = ? OR school_code = ? LIMIT 1");
    $lookup->execute([$user['username'], $user['username']]);
    $schoolId = $lookup->fetchColumn();
    
    // หากยังไม่พบ และเป็น Admin หรือผู้ใช้งาน ให้เลือกโรงเรียนแรกเป็นค่าเริ่มต้น
    if (empty($schoolId)) {
        $schoolId = $pdo->query("SELECT id FROM schools LIMIT 1")->fetchColumn();
    }
    $_SESSION['user']['school_id'] = $schoolId;
}

// -------------------------------------------------------------
// ตรวจสอบและสร้างโครงสร้างรองรับครูหลายคนอัตโนมัติ (Safe Schema Migration)
// -------------------------------------------------------------
try {
    $chkCol = $pdo->query("SHOW COLUMNS FROM registrations LIKE 'coach_ids'");
    if ($chkCol && $chkCol->rowCount() === 0) {
        $pdo->exec("ALTER TABLE registrations ADD `coach_ids` TEXT NULL AFTER secondary_coach_id");
    }
} catch (Exception $e) {}

try {
    $chkCol2 = $pdo->query("SHOW COLUMNS FROM registrations LIKE 'secondary_coach_id'");
    if ($chkCol2 && $chkCol2->rowCount() === 0) {
        $pdo->exec("ALTER TABLE registrations ADD `secondary_coach_id` VARCHAR(50) NULL AFTER coach_id");
    }
} catch (Exception $e) {}

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `registration_coaches` (
        `id` VARCHAR(50) NOT NULL,
        `registration_id` VARCHAR(50) NOT NULL,
        `coach_id` VARCHAR(50) NOT NULL,
        PRIMARY KEY (`id`),
        KEY `idx_rc_reg` (`registration_id`),
        KEY `idx_rc_coach` (`coach_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} catch (Exception $e) {}

// -------------------------------------------------------------
// 0. แก้ไขข้อมูลโรงเรียน (School Profile Update)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_update_school'])) {
    $schoolName = trim($_POST['school_name'] ?? '');
    $shortName = trim($_POST['short_name'] ?? '');
    $directorName = trim($_POST['director_name'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $logo = trim($_POST['logo'] ?? '');

    if ($schoolName) {
        $stmt = $pdo->prepare("
            UPDATE schools 
            SET school_name = ?, short_name = ?, director_name = ?, address = ?, phone = ?, logo = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $schoolName,
            $shortName ?: $schoolName,
            $directorName,
            $address,
            $phone,
            $logo ?: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150',
            $schoolId
        ]);
        logActivity('UPDATE', 'schools', "แก้ไขข้อมูลโรงเรียน: $schoolName");
        $message = "บันทึกและปรับปรุงข้อมูลสถานศึกษาเรียบร้อยแล้ว";
    } else {
        $error = "กรุณากรอกชื่อสถานศึกษา";
    }
}

$school = $pdo->prepare("SELECT * FROM schools WHERE id = ?");
$school->execute([$schoolId]);
$schoolData = $school->fetch() ?: [
    'id' => $schoolId,
    'school_name' => 'โรงเรียนของคุณ',
    'smis_code' => 'SMIS0000',
    'director_name' => '-',
    'address' => 'อ.กระสัง จ.บุรีรัมย์',
    'phone' => '-',
    'logo' => 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150'
];

$comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch();
$compId = $comp['id'] ?? 'comp-2026';

// -------------------------------------------------------------
// 1. เพิ่ม / แก้ไข / ลบ ข้อมูลนักเรียน (ไม่ต้องกรอกรหัสประจำตัวนักเรียน)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_student'])) {
    $act = $_POST['action_student'];
    $prefix = trim($_POST['prefix'] ?? 'เด็กชาย');
    $first = trim($_POST['first_name'] ?? '');
    $last = trim($_POST['last_name'] ?? '');
    $gender = trim($_POST['gender'] ?? 'MALE');
    $grade = trim($_POST['grade_level'] ?? $_POST['grade'] ?? 'ป.4');
    $stuCode = trim($_POST['student_code'] ?? '');
    $birthDate = trim($_POST['birth_date'] ?? '2014-01-01');

    if ($act === 'add') {
        if ($first && $last) {
            try {
                $stId = 'stu-' . uniqid();
                // ตรวจสอบชื่อซ้ำในโรงเรียนเดียวกัน
                $chk = $pdo->prepare("SELECT id FROM students WHERE school_id = ? AND first_name = ? AND last_name = ?");
                $chk->execute([$schoolId, $first, $last]);
                if ($chk->fetch()) {
                    $error = "พบข้อมูลนักเรียน \"$prefix$first $last\" ในระบบโรงเรียนนี้แล้ว";
                } else {
                    $generatedCode = $stuCode ?: ('STD-' . rand(1000, 9999));
                    $stmt = $pdo->prepare("
                        INSERT INTO students (id, competition_id, school_id, student_code, prefix, first_name, last_name, gender, birth_date, grade, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
                    ");
                    $stmt->execute([$stId, $compId, $schoolId, $generatedCode, $prefix, $first, $last, $gender, $birthDate, $grade]);
                    logActivity('CREATE', 'students', "เพิ่มข้อมูลนักเรียน: $prefix$first $last ($grade)");
                    $message = "เพิ่มข้อมูลนักเรียน \"$prefix$first $last\" ($grade) เรียบร้อยแล้ว (ไม่ต้องใช้รหัสประจำตัว)";
                }
            } catch (Exception $e) {
                $error = "เกิดข้อผิดพลาดในการบันทึกข้อมูลนักเรียน: " . $e->getMessage();
            }
        } else {
            $error = "กรุณากรอกชื่อและนามสกุลนักเรียนให้ครบถ้วน";
        }
    } elseif ($act === 'edit') {
        $editStId = trim($_POST['student_id'] ?? '');
        if ($editStId && $first && $last) {
            try {
                $stmt = $pdo->prepare("
                    UPDATE students 
                    SET prefix = ?, first_name = ?, last_name = ?, gender = ?, grade = ?
                    WHERE id = ? AND school_id = ?
                ");
                $stmt->execute([$prefix, $first, $last, $gender, $grade, $editStId, $schoolId]);
                logActivity('UPDATE', 'students', "แก้ไขข้อมูลนักเรียน: $prefix$first $last ($grade)");
                $message = "แก้ไขข้อมูลนักเรียน \"$prefix$first $last\" เรียบร้อยแล้ว";
            } catch (Exception $e) {
                $error = "เกิดข้อผิดพลาดในการแก้ไขข้อมูลนักเรียน: " . $e->getMessage();
            }
        } else {
            $error = "กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน";
        }
    }
}

// 1.1 นำเข้ารายชื่อนักเรียนหลายคนพร้อมกัน (Batch Add / วางรายชื่อ)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_student_batch'])) {
    $batchGrade = trim($_POST['batch_grade'] ?? 'ป.4');
    $rawText = trim($_POST['batch_names'] ?? '');
    
    if (empty($rawText)) {
        $error = "กรุณากรอกหรือวางรายชื่อนักเรียนอย่างน้อย 1 รายชื่อ";
    } else {
        $lines = preg_split('/[\r\n]+/', $rawText);
        $addedCount = 0;
        $skippedCount = 0;
        
        $insertStmt = $pdo->prepare("
            INSERT INTO students (id, competition_id, school_id, student_code, prefix, first_name, last_name, gender, birth_date, grade, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        ");
        $chkStmt = $pdo->prepare("SELECT id FROM students WHERE school_id = ? AND first_name = ? AND last_name = ?");

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            // ลำดับตัดตัวเลขนำหน้า เช่น "1.", "1)", "01."
            $line = preg_replace('/^\d+[\.\)\s\-]+/', '', $line);
            $line = trim($line);
            if (empty($line)) continue;

            // ตรวจสอบคำนำหน้าและเพศ
            $pfx = 'เด็กชาย';
            $gen = 'MALE';
            
            if (preg_match('/^(เด็กชาย|ด\.ช\.)\s*/u', $line, $m)) {
                $pfx = 'เด็กชาย';
                $gen = 'MALE';
                $line = trim(mb_substr($line, mb_strlen($m[0])));
            } elseif (preg_match('/^(เด็กหญิง|ด\.ญ\.)\s*/u', $line, $m)) {
                $pfx = 'เด็กหญิง';
                $gen = 'FEMALE';
                $line = trim(mb_substr($line, mb_strlen($m[0])));
            } elseif (preg_match('/^(นางสาว|น\.ส\.)\s*/u', $line, $m)) {
                $pfx = 'นางสาว';
                $gen = 'FEMALE';
                $line = trim(mb_substr($line, mb_strlen($m[0])));
            } elseif (preg_match('/^(นาย)\s*/u', $line, $m)) {
                $pfx = 'นาย';
                $gen = 'MALE';
                $line = trim(mb_substr($line, mb_strlen($m[0])));
            }

            // แยกชื่อ-นามสกุล
            $parts = preg_split('/\s+/', $line);
            $fName = $parts[0] ?? '';
            $lName = isset($parts[1]) ? implode(' ', array_slice($parts, 1)) : '-';

            if (!empty($fName)) {
                $chkStmt->execute([$schoolId, $fName, $lName]);
                if (!$chkStmt->fetch()) {
                    $newStId = 'stu-' . uniqid() . '-' . rand(10, 99);
                    $randCode = 'STD-' . rand(1000, 9999);
                    $insertStmt->execute([$newStId, $compId, $schoolId, $randCode, $pfx, $fName, $lName, $gen, '2014-01-01', $batchGrade]);
                    $addedCount++;
                } else {
                    $skippedCount++;
                }
            }
        }

        if ($addedCount > 0) {
            logActivity('CREATE', 'students', "นำเข้ารายชื่อนักเรียน $batchGrade จำนวน $addedCount คน (ข้ามซ้ำ $skippedCount คน)");
            $message = "นำเข้ารายชื่อนักเรียนชั้น $batchGrade สำเร็จ $addedCount คน" . ($skippedCount > 0 ? " (ข้ามรายชื่อที่ซ้ำในระบบ $skippedCount คน)" : "");
        } else {
            $error = "ไม่สามารถนำเข้ารายชื่อได้ หรือมีรายชื่อนักเรียนดังกล่าวอยู่ในระบบแล้ว";
        }
    }
}

if (isset($_GET['delete_student_id'])) {
    try {
        $delStId = $_GET['delete_student_id'];
        $pdo->prepare("DELETE FROM registration_students WHERE student_id = ?")->execute([$delStId]);
        $pdo->prepare("DELETE FROM students WHERE id = ? AND school_id = ?")->execute([$delStId, $schoolId]);
        logActivity('DELETE', 'students', "ลบนักเรียน ID: $delStId");
        $message = "ลบข้อมูลนักเรียนเรียบร้อยแล้ว";
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาดในการลบนักเรียน: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// 2. เพิ่ม / แก้ไข / ลบ ข้อมูลครูผู้ฝึกสอน
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_coach'])) {
    $act = $_POST['action_coach'];
    $cPrefix = trim($_POST['coach_prefix'] ?? 'นาย');
    $cFirst = trim($_POST['coach_first'] ?? '');
    $cLast = trim($_POST['coach_last'] ?? '');
    $cPos = trim($_POST['position'] ?? 'ครูผู้ฝึกสอน');
    $cPhone = trim($_POST['coach_phone'] ?? '');

    if ($act === 'add') {
        if ($cFirst && $cLast) {
            try {
                $cId = 'coa-' . uniqid();
                $stmt = $pdo->prepare("
                    INSERT INTO coaches (id, competition_id, school_id, prefix, first_name, last_name, phone, position, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
                ");
                $stmt->execute([$cId, $compId, $schoolId, $cPrefix, $cFirst, $cLast, $cPhone, $cPos]);
                logActivity('CREATE', 'coaches', "เพิ่มครูผู้ฝึกสอน: $cPrefix$cFirst $cLast");
                $message = "เพิ่มข้อมูลครูผู้ฝึกสอน \"$cPrefix$cFirst $cLast\" เรียบร้อยแล้ว";
            } catch (Exception $e) {
                $error = "เกิดข้อผิดพลาดในการบันทึกครูผู้ฝึกสอน: " . $e->getMessage();
            }
        } else {
            $error = "กรุณากรอกชื่อและนามสกุลครูผู้ฝึกสอนให้ครบถ้วน";
        }
    } elseif ($act === 'batch') {
        $rawText = trim($_POST['batch_coaches'] ?? '');
        $defaultPos = trim($_POST['batch_position'] ?? 'ครูผู้ฝึกสอน');
        if (empty($rawText)) {
            $error = "กรุณาวางรายชื่อครูผู้ฝึกสอนอย่างน้อย 1 คน";
        } else {
            $lines = preg_split('/[\r\n]+/', $rawText);
            $addedCount = 0;
            $skippedCount = 0;

            $insertStmt = $pdo->prepare("
                INSERT INTO coaches (id, competition_id, school_id, prefix, first_name, last_name, phone, position, status)
                VALUES (?, ?, ?, ?, ?, ?, '', ?, 'ACTIVE')
            ");
            $chkStmt = $pdo->prepare("SELECT id FROM coaches WHERE school_id = ? AND first_name = ? AND last_name = ?");

            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) continue;

                // ลำดับตัดตัวเลขนำหน้า
                $line = preg_replace('/^\d+[\.\)\s\-]+/', '', $line);
                $line = trim($line);
                if (empty($line)) continue;

                // ตรวจจับคำนำหน้า
                $pfx = 'นาย';
                if (preg_match('/^(นางสาว|น\.ส\.)\s*/u', $line, $m)) {
                    $pfx = 'นางสาว';
                    $line = trim(mb_substr($line, mb_strlen($m[0])));
                } elseif (preg_match('/^(นาง)\s*/u', $line, $m)) {
                    $pfx = 'นาง';
                    $line = trim(mb_substr($line, mb_strlen($m[0])));
                } elseif (preg_match('/^(ว่าที่ร้อยตรีหญิง|ว่าที่ ร\.ต\.หญิง)\s*/u', $line, $m)) {
                    $pfx = 'นางสาว';
                    $line = trim(mb_substr($line, mb_strlen($m[0])));
                } elseif (preg_match('/^(ว่าที่ร้อยตรี|ว่าที่ ร\.ต\.)\s*/u', $line, $m)) {
                    $pfx = 'นาย';
                    $line = trim(mb_substr($line, mb_strlen($m[0])));
                } elseif (preg_match('/^(ดร\.|อาจารย์|ครู)\s*/u', $line, $m)) {
                    $pfx = 'นาย';
                    $line = trim(mb_substr($line, mb_strlen($m[0])));
                } elseif (preg_match('/^(นาย)\s*/u', $line, $m)) {
                    $pfx = 'นาย';
                    $line = trim(mb_substr($line, mb_strlen($m[0])));
                }

                // แยกชื่อ-นามสกุล
                $parts = preg_split('/\s+/', $line);
                $fName = $parts[0] ?? '';
                $lName = isset($parts[1]) ? implode(' ', array_slice($parts, 1)) : '-';

                if (!empty($fName)) {
                    $chkStmt->execute([$schoolId, $fName, $lName]);
                    if (!$chkStmt->fetch()) {
                        $newCId = 'coa-' . uniqid() . '-' . rand(10, 99);
                        $insertStmt->execute([$newCId, $compId, $schoolId, $pfx, $fName, $lName, $defaultPos]);
                        $addedCount++;
                    } else {
                        $skippedCount++;
                    }
                }
            }

            if ($addedCount > 0) {
                logActivity('CREATE', 'coaches', "นำเข้ารายชื่อครูผู้ฝึกสอนจำนวน $addedCount คน (ข้ามซ้ำ $skippedCount คน)");
                $message = "นำเข้ารายชื่อครูผู้ฝึกสอนสำเร็จ $addedCount คน" . ($skippedCount > 0 ? " (ข้ามรายชื่อที่ซ้ำในระบบ $skippedCount คน)" : "");
            } else {
                $error = "ไม่สามารถนำเข้ารายชื่อได้ หรือมีรายชื่อครูผู้ฝึกสอนดังกล่าวอยู่ในระบบแล้ว";
            }
        }
    } elseif ($act === 'edit') {
        $editCId = trim($_POST['coach_id'] ?? '');
        if ($editCId && $cFirst && $cLast) {
            try {
                $stmt = $pdo->prepare("
                    UPDATE coaches 
                    SET prefix = ?, first_name = ?, last_name = ?, position = ?, phone = ?
                    WHERE id = ? AND school_id = ?
                ");
                $stmt->execute([$cPrefix, $cFirst, $cLast, $cPos, $cPhone, $editCId, $schoolId]);
                logActivity('UPDATE', 'coaches', "แก้ไขครูผู้ฝึกสอน: $cPrefix$cFirst $cLast");
                $message = "แก้ไขข้อมูลครูผู้ฝึกสอน \"$cPrefix$cFirst $cLast\" เรียบร้อยแล้ว";
            } catch (Exception $e) {
                $error = "เกิดข้อผิดพลาดในการแก้ไขครูผู้ฝึกสอน: " . $e->getMessage();
            }
        } else {
            $error = "กรุณากรอกข้อมูลครูผู้ฝึกสอนให้ครบถ้วน";
        }
    }
}

if (isset($_GET['delete_coach_id'])) {
    try {
        $delCId = $_GET['delete_coach_id'];
        $pdo->prepare("DELETE FROM coaches WHERE id = ? AND school_id = ?")->execute([$delCId, $schoolId]);
        logActivity('DELETE', 'coaches', "ลบครูผู้ฝึกสอน ID: $delCId");
        $message = "ลบข้อมูลครูผู้ฝึกสอนเรียบร้อยแล้ว";
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาดในการลบครูผู้ฝึกสอน: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// 3. จัดการนักกีฬาในรายการแข่งขัน (เพิ่ม/ถอดนักกีฬา และเปลี่ยนครู)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_manage_reg'])) {
    $subAction = $_POST['action_manage_reg'];
    $targetRegId = trim($_POST['reg_id'] ?? '');

    try {
        // ตรวจสอบว่าเป็นรายการของโรงเรียนนี้จริง
        $chkReg = $pdo->prepare("SELECT id FROM registrations WHERE id = ? AND school_id = ?");
        $chkReg->execute([$targetRegId, $schoolId]);
        if ($chkReg->fetch()) {
            if ($subAction === 'add_athlete') {
                $addStuId = trim($_POST['add_student_id'] ?? '');
                if ($addStuId) {
                    // ตรวจสอบว่ามีอยู่ในทีมแล้วหรือไม่
                    $chkIn = $pdo->prepare("SELECT id FROM registration_students WHERE registration_id = ? AND student_id = ?");
                    $chkIn->execute([$targetRegId, $addStuId]);
                    if (!$chkIn->fetch()) {
                        $rsId = 'rs-' . uniqid();
                        $pdo->prepare("INSERT INTO registration_students (id, registration_id, student_id) VALUES (?, ?, ?)")
                            ->execute([$rsId, $targetRegId, $addStuId]);
                        logActivity('UPDATE', 'registrations', "เพิ่มนักกีฬา $addStuId เข้า Registration $targetRegId");
                        $message = "เพิ่มนักกีฬาเข้าสู่รายการแข่งขันเรียบร้อยแล้ว";
                    } else {
                        $error = "นักเรียนคนนี้มีรายชื่อในทีมรายการนี้อยู่แล้ว";
                    }
                }
            } elseif ($subAction === 'remove_athlete') {
                $remRsId = trim($_POST['rs_id'] ?? '');
                if ($remRsId) {
                    $pdo->prepare("DELETE FROM registration_students WHERE id = ? AND registration_id = ?")->execute([$remRsId, $targetRegId]);
                    logActivity('UPDATE', 'registrations', "ถอดนักกีฬาออกจาก Registration $targetRegId");
                    $message = "ถอดรายชื่อนักกีฬาออกจากรายการเรียบร้อยแล้ว";
                }
            } elseif ($subAction === 'update_coach' || $subAction === 'update_coaches') {
                $modalCoachIds = $_POST['modal_coach_ids'] ?? [];
                if (!is_array($modalCoachIds)) {
                    $modalCoachIds = !empty($_POST['coach_id']) ? [$_POST['coach_id']] : [];
                }
                if (!empty($_POST['coach_id']) && !in_array($_POST['coach_id'], $modalCoachIds)) {
                    array_unshift($modalCoachIds, $_POST['coach_id']);
                }
                $modalCoachIds = array_values(array_unique(array_filter($modalCoachIds)));
                $primaryCId = $modalCoachIds[0] ?? null;
                $secondaryCId = $modalCoachIds[1] ?? null;
                $jsonCoachIds = !empty($modalCoachIds) ? json_encode($modalCoachIds, JSON_UNESCAPED_UNICODE) : null;

                // พยายามอัปเดตแบบมี coach_ids หากไม่มีฟิลด์จะ fallback ไปอัปเดต coach_id ปกติ
                try {
                    $stmt = $pdo->prepare("UPDATE registrations SET coach_id = ?, secondary_coach_id = ?, coach_ids = ? WHERE id = ? AND school_id = ?");
                    $stmt->execute([$primaryCId, $secondaryCId, $jsonCoachIds, $targetRegId, $schoolId]);
                } catch (Exception $colEx) {
                    try {
                        $stmt = $pdo->prepare("UPDATE registrations SET coach_id = ?, secondary_coach_id = ? WHERE id = ? AND school_id = ?");
                        $stmt->execute([$primaryCId, $secondaryCId, $targetRegId, $schoolId]);
                    } catch (Exception $colEx2) {
                        $stmt = $pdo->prepare("UPDATE registrations SET coach_id = ? WHERE id = ? AND school_id = ?");
                        $stmt->execute([$primaryCId, $targetRegId, $schoolId]);
                    }
                }

                // อัปเดตในตาราง registration_coaches
                try {
                    $pdo->prepare("DELETE FROM registration_coaches WHERE registration_id = ?")->execute([$targetRegId]);
                    if (!empty($modalCoachIds)) {
                        $insRc = $pdo->prepare("INSERT INTO registration_coaches (id, registration_id, coach_id) VALUES (?, ?, ?)");
                        foreach ($modalCoachIds as $cid) {
                            $insRc->execute(['rc-' . uniqid() . '-' . rand(10, 99), $targetRegId, $cid]);
                        }
                    }
                } catch (Exception $e) {}

                logActivity('UPDATE', 'registrations', "ปรับปรุงรายชื่อครูผู้ฝึกสอน Registration $targetRegId (" . count($modalCoachIds) . " คน)");
                $message = "ปรับปรุงรายชื่อครูผู้ฝึกสอนของรายการแข่งขันเรียบร้อยแล้ว (" . count($modalCoachIds) . " คน)";
            }
        } else {
            $error = "ไม่พบข้อมูลรายการแข่งขันที่ระบุ";
        }
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาดในการปรับปรุงข้อมูล: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// 3. ลงทะเบียนเข้าแข่งขัน (Event Registration)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_register'])) {
    $eventId = trim($_POST['event_id'] ?? '');
    $coachIds = $_POST['coach_ids'] ?? [];
    if (!is_array($coachIds)) {
        $coachIds = !empty($_POST['coach_id']) ? [$_POST['coach_id']] : [];
    }
    if (!empty($_POST['coach_id']) && !in_array($_POST['coach_id'], $coachIds)) {
        array_unshift($coachIds, $_POST['coach_id']);
    }
    $coachIds = array_values(array_unique(array_filter($coachIds)));
    $primaryCoachId = $coachIds[0] ?? null;
    $secondaryCoachId = $coachIds[1] ?? null;
    $coachIdsJson = !empty($coachIds) ? json_encode($coachIds, JSON_UNESCAPED_UNICODE) : null;
    $studentIds = $_POST['student_ids'] ?? [];

    if ($eventId && !empty($studentIds)) {
        try {
            // ตรวจสอบว่าเคยสมัครรายการนี้หรือยัง
            $chk = $pdo->prepare("SELECT id FROM registrations WHERE event_id = ? AND school_id = ?");
            $chk->execute([$eventId, $schoolId]);
            $existing = $chk->fetch();

            if ($existing) {
                $error = "โรงเรียนของท่านได้ลงทะเบียนรายการนี้ไปแล้ว หากต้องการเปลี่ยนรายชื่อ กรุณายกเลิกรายการเดิมก่อน";
            } else {
                $pdo->beginTransaction();
                $regId = 'reg-' . uniqid();

                try {
                    $rStmt = $pdo->prepare("
                        INSERT INTO registrations (id, competition_id, event_id, school_id, coach_id, secondary_coach_id, coach_ids, registration_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED')
                    ");
                    $rStmt->execute([$regId, $compId, $eventId, $schoolId, $primaryCoachId, $secondaryCoachId, $coachIdsJson]);
                } catch (Exception $insColEx) {
                    try {
                        $rStmt = $pdo->prepare("
                            INSERT INTO registrations (id, competition_id, event_id, school_id, coach_id, secondary_coach_id, registration_status)
                            VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')
                        ");
                        $rStmt->execute([$regId, $compId, $eventId, $schoolId, $primaryCoachId, $secondaryCoachId]);
                    } catch (Exception $insColEx2) {
                        $rStmt = $pdo->prepare("
                            INSERT INTO registrations (id, competition_id, event_id, school_id, coach_id, registration_status)
                            VALUES (?, ?, ?, ?, ?, 'APPROVED')
                        ");
                        $rStmt->execute([$regId, $compId, $eventId, $schoolId, $primaryCoachId]);
                    }
                }

                $rsStmt = $pdo->prepare("INSERT INTO registration_students (id, registration_id, student_id) VALUES (?, ?, ?)");
                foreach ($studentIds as $sId) {
                    $rsStmt->execute(['rs-' . uniqid(), $regId, $sId]);
                }

                // บันทึกครูผู้ฝึกสอนลงตาราง registration_coaches
                if (!empty($coachIds)) {
                    try {
                        $rcStmt = $pdo->prepare("INSERT INTO registration_coaches (id, registration_id, coach_id) VALUES (?, ?, ?)");
                        foreach ($coachIds as $cId) {
                            $rcStmt->execute(['rc-' . uniqid() . '-' . rand(10, 99), $regId, $cId]);
                        }
                    } catch (Exception $e) {}
                }

                $pdo->commit();
                logActivity('CREATE', 'registrations', "ลงทะเบียนส่งแข่งขัน Event ID: $eventId (นักกีฬา " . count($studentIds) . " คน, ครู " . count($coachIds) . " คน)");
                $message = "ลงทะเบียนส่งนักกีฬาเข้าแข่งขันเรียบร้อยแล้ว! (นักกีฬา " . count($studentIds) . " คน, ครูผู้ฝึกสอน " . count($coachIds) . " คน)";
            }
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = "เกิดข้อผิดพลาดในการลงทะเบียน: " . $e->getMessage();
        }
    } else {
        $error = "กรุณาเลือกรายการแข่งขันและเลือกนักกีฬาอย่างน้อย 1 คน";
    }
}

if (isset($_GET['cancel_reg_id'])) {
    try {
        $delRegId = $_GET['cancel_reg_id'];
        $pdo->prepare("DELETE FROM registration_students WHERE registration_id = ?")->execute([$delRegId]);
        $pdo->prepare("DELETE FROM registrations WHERE id = ? AND school_id = ?")->execute([$delRegId, $schoolId]);
        logActivity('DELETE', 'registrations', "ยกเลิกการลงทะเบียน Registration ID: $delRegId");
        $message = "ยกเลิกการส่งแข่งขันรายการดังกล่าวเรียบร้อยแล้ว";
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาดในการยกเลิกรายการ: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// ดึงข้อมูลแสดงผล
// -------------------------------------------------------------
// รายชื่อนักเรียน (รองรับทั้ง grade และ grade_level)
try {
    $students = $pdo->prepare("SELECT * FROM students WHERE school_id = ? ORDER BY first_name ASC");
    $students->execute([$schoolId]);
    $studentList = $students->fetchAll();
} catch (Exception $e) {
    $studentList = [];
}

// รายชื่อครู
try {
    $coaches = $pdo->prepare("SELECT * FROM coaches WHERE school_id = ? ORDER BY first_name ASC");
    $coaches->execute([$schoolId]);
    $coachList = $coaches->fetchAll();
} catch (Exception $e) {
    $coachList = [];
}

// รายการแข่งขันทั้งหมดที่เปิดรับ
try {
    $rawEvents = $pdo->query("
        SELECT e.*, sp.sport_name, sp.sport_icon 
        FROM events e 
        JOIN sports sp ON e.sport_id = sp.id 
    ")->fetchAll();
    $events = sortEventsList($rawEvents);
} catch (Exception $e) {
    $events = [];
}

// รายการที่โรงเรียนนี้ลงทะเบียนไว้แล้ว
try {
    $myRegistrations = $pdo->prepare("
        SELECT r.*, e.event_name, e.event_code, e.age_group, e.grade, sp.sport_name, sp.sport_icon,
               c.first_name as coach_first, c.last_name as coach_last, c.prefix as coach_prefix,
               (SELECT COUNT(*) FROM registration_students rs WHERE rs.registration_id = r.id) as student_count
        FROM registrations r
        JOIN events e ON r.event_id = e.id
        JOIN sports sp ON e.sport_id = sp.id
        LEFT JOIN coaches c ON r.coach_id = c.id
        WHERE r.school_id = ?
    ");
    $myRegistrations->execute([$schoolId]);
    $rawMyRegList = $myRegistrations->fetchAll();
    $myRegList = sortEventsList($rawMyRegList);
} catch (Exception $e) {
    $myRegList = [];
}

// รายชื่อนักกีฬาแยกตามรายการแข่งขัน (Registration Athletes)
$regAthletesMap = [];
$regCoachesMap = [];
if (!empty($myRegList)) {
    $regIds = array_column($myRegList, 'id');
    $inQuery = implode(',', array_fill(0, count($regIds), '?'));
    try {
        $raStmt = $pdo->prepare("
            SELECT rs.id as rs_id, rs.registration_id, rs.student_id, 
                   s.prefix, s.first_name, s.last_name, s.grade, s.gender, s.student_code
            FROM registration_students rs
            JOIN students s ON rs.student_id = s.id
            WHERE rs.registration_id IN ($inQuery)
            ORDER BY s.first_name ASC
        ");
        $raStmt->execute($regIds);
        $raRows = $raStmt->fetchAll();
        foreach ($raRows as $row) {
            $regAthletesMap[$row['registration_id']][] = $row;
        }
    } catch (Exception $e) {
        $regAthletesMap = [];
    }

    // ดึงรายชื่อครูผู้ฝึกสอนของแต่ละทีม (Registration Coaches)
    try {
        $rcStmt = $pdo->prepare("
            SELECT rc.registration_id, c.id, c.prefix, c.first_name, c.last_name, c.position, c.phone
            FROM registration_coaches rc
            JOIN coaches c ON rc.coach_id = c.id
            WHERE rc.registration_id IN ($inQuery)
            ORDER BY c.first_name ASC
        ");
        $rcStmt->execute($regIds);
        $rcRows = $rcStmt->fetchAll();
        foreach ($rcRows as $row) {
            $regCoachesMap[$row['registration_id']][$row['id']] = $row;
        }
    } catch (Exception $e) {}

    // ตรวจสอบ fallback จาก coach_ids JSON, coach_id, secondary_coach_id
    foreach ($myRegList as $mr) {
        $rId = $mr['id'];
        if (!isset($regCoachesMap[$rId])) {
            $regCoachesMap[$rId] = [];
        }
        $cIds = [];
        if (!empty($mr['coach_ids'])) {
            $decoded = json_decode($mr['coach_ids'], true);
            if (is_array($decoded)) {
                $cIds = array_merge($cIds, $decoded);
            }
        }
        if (!empty($mr['coach_id'])) $cIds[] = $mr['coach_id'];
        if (!empty($mr['secondary_coach_id'])) $cIds[] = $mr['secondary_coach_id'];
        $cIds = array_unique(array_filter($cIds));

        foreach ($cIds as $cid) {
            if (!isset($regCoachesMap[$rId][$cid])) {
                foreach ($coachList as $coachObj) {
                    if ($coachObj['id'] === $cid) {
                        $regCoachesMap[$rId][$cid] = $coachObj;
                        break;
                    }
                }
            }
        }
    }
}

// เกียรติบัตรของโรงเรียน
try {
    $certs = $pdo->prepare("SELECT * FROM certificates WHERE school_id = ? ORDER BY issue_date DESC, medal ASC");
    $certs->execute([$schoolId]);
    $certList = $certs->fetchAll();
} catch (Exception $e) {
    $certList = [];
}

$pageTitle = 'ระบบบริหารจัดการสำหรับโรงเรียน - ' . htmlspecialchars($schoolData['school_name']);
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- School Banner -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-center gap-5">
            <img 
                src="<?= htmlspecialchars($schoolData['logo'] ?: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150') ?>" 
                class="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
            >
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        SMIS: <?= htmlspecialchars($schoolData['smis_code']) ?>
                    </span>
                    <span class="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                        🏫 สังกัดกลุ่มโรงเรียนสว่างสูงกระสัง
                    </span>
                </div>
                <h1 class="text-xl sm:text-2xl font-bold font-kanit text-slate-900 leading-tight">
                    <?= htmlspecialchars($schoolData['school_name']) ?>
                </h1>
                <p class="text-xs text-slate-500 mt-1">
                    ผู้อำนวยการ: <b><?= htmlspecialchars($schoolData['director_name'] ?: 'ยังไม่ระบุ') ?></b> 
                    | โทร: <?= htmlspecialchars($schoolData['phone'] ?: '-') ?>
                </p>
            </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="switchSchoolTab('profile')" class="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer">
                <span>✏️</span> แก้ไขข้อมูลโรงเรียน
            </button>
            <a href="/school_detail.php?id=<?= urlencode($schoolId) ?>" class="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 transition flex items-center gap-1.5 shadow-2xs">
                <span>🏆</span> ดูสรุปผลงาน
            </a>
            <a href="/change-password.php" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition">
                🔑 เปลี่ยนรหัสผ่าน
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

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-xs text-slate-500 font-medium">นักเรียนในระบบ</p>
            <p class="text-2xl font-bold font-kanit text-slate-900 mt-1"><?= count($studentList) ?> <span class="text-xs font-normal text-slate-400">คน</span></p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-xs text-slate-500 font-medium">ครูผู้ฝึกสอน</p>
            <p class="text-2xl font-bold font-kanit text-slate-900 mt-1"><?= count($coachList) ?> <span class="text-xs font-normal text-slate-400">คน</span></p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-xs text-slate-500 font-medium">รายการที่ส่งแข่งขัน</p>
            <p class="text-2xl font-bold font-kanit text-blue-600 mt-1"><?= count($myRegList) ?> <span class="text-xs font-normal text-slate-400">รายการ</span></p>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p class="text-xs text-slate-500 font-medium">เกียรติบัตรที่ได้รับ</p>
            <p class="text-2xl font-bold font-kanit text-amber-600 mt-1"><?= count($certList) ?> <span class="text-xs font-normal text-slate-400">ใบ</span></p>
        </div>
    </div>

    <!-- Tab Navigation Bar -->
    <div class="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
        <button 
            type="button" 
            id="tabBtn_reg" 
            onclick="switchSchoolTab('reg')" 
            class="tab-nav-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-blue-600 text-white shadow-sm"
        >
            <span>📝</span> ลงทะเบียนแข่งขัน (<?= count($myRegList) ?>)
        </button>
        <button 
            type="button" 
            id="tabBtn_students" 
            onclick="switchSchoolTab('students')" 
            class="tab-nav-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
            <span>🎒</span> เพิ่ม/จัดการข้อมูลนักเรียน (<?= count($studentList) ?>)
        </button>
        <button 
            type="button" 
            id="tabBtn_coaches" 
            onclick="switchSchoolTab('coaches')" 
            class="tab-nav-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
            <span>👨‍🏫</span> เพิ่ม/จัดการข้อมูลครู (<?= count($coachList) ?>)
        </button>
        <button 
            type="button" 
            id="tabBtn_certs" 
            onclick="switchSchoolTab('certs')" 
            class="tab-nav-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
            <span>📜</span> ดูสรุปผลงานและดาวน์โหลดเกียรติบัตร (<?= count($certList) ?>)
        </button>
        <button 
            type="button" 
            id="tabBtn_profile" 
            onclick="switchSchoolTab('profile')" 
            class="tab-nav-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
            <span>🏫</span> ข้อมูลสถานศึกษา
        </button>
    </div>

    <!-- Main Content Container with Tabs -->
    <div class="space-y-6">
        <!-- 1. ลงทะเบียนส่งแข่งขัน (Registration Tab Pane) -->
        <div id="tabContent_reg" class="tab-pane space-y-6">
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                    <h2 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                        <span>📝</span> สมัครส่งนักกีฬาเข้าแข่งขัน (Event Registration)
                    </h2>
                    <p class="text-xs text-slate-500">เลือกรายการกีฬา ครูผู้ฝึกสอน และนักเรียนที่ต้องการส่งเข้าแข่งขัน</p>
                </div>
            </div>

            <form method="POST" class="space-y-4 text-xs">
                <input type="hidden" name="action_register" value="save">
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- เลือกรายการแข่งขัน -->
                    <div class="col-span-1 md:col-span-2">
                        <label class="block font-bold text-slate-700 mb-1">เลือกรายการแข่งขัน <span class="text-rose-500">*</span></label>
                        <select name="event_id" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold">
                            <option value="">-- เลือกรายการแข่งขัน --</option>
                            <?php foreach ($events as $ev): 
                                $evTitle = formatEventRegistrationDisplay($ev['event_name'], $ev['grade'], $ev['sport_name'], $ev['gender'] ?? 'MALE');
                            ?>
                                <option value="<?= htmlspecialchars($ev['id']) ?>">
                                    <?= $ev['sport_icon'] ?> <?= htmlspecialchars($evTitle) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <!-- เลือกครูผู้ฝึกสอน (เลือกได้หลายคน) -->
                    <div class="col-span-1 md:col-span-2">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <div class="flex items-center gap-2">
                                <label class="font-bold text-slate-700 text-xs">👨‍🏫 ครูผู้ฝึกสอนที่รับผิดชอบ</label>
                                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    เลือกได้หลายคน (เลือกแล้ว <span id="regCoachCount">0</span> คน)
                                </span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <button type="button" onclick="selectAllCoaches(true)" class="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer">
                                    ✓ เลือกทั้งหมด
                                </button>
                                <button type="button" onclick="selectAllCoaches(false)" class="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer">
                                    ✕ ล้างการเลือก
                                </button>
                                <button type="button" onclick="switchSchoolTab('coaches')" class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-2xs">
                                    ➕ เพิ่มครูผู้ฝึกสอนใหม่
                                </button>
                            </div>
                        </div>

                        <?php if (empty($coachList)): ?>
                            <div class="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                                <span>⚠️ ยังไม่มีรายชื่อครูผู้ฝึกสอนในระบบ</span>
                                <button type="button" onclick="switchSchoolTab('coaches')" class="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700">
                                    ไปที่หน้าเพิ่มครู
                                </button>
                            </div>
                        <?php else: ?>
                            <div class="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" id="regCoachesContainer">
                                <?php foreach ($coachList as $c): ?>
                                    <label class="reg-coach-item flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-emerald-400 cursor-pointer text-xs transition">
                                        <input type="checkbox" name="coach_ids[]" value="<?= htmlspecialchars($c['id']) ?>" onchange="updateRegCoachCount()" class="reg-coach-checkbox w-4 h-4 rounded text-emerald-600">
                                        <div class="min-w-0">
                                            <span class="font-bold text-slate-800 truncate block"><?= htmlspecialchars($c['prefix'] . $c['first_name'] . ' ' . $c['last_name']) ?></span>
                                            <span class="text-[10px] text-slate-400 block truncate"><?= htmlspecialchars($c['position']) ?><?= !empty($c['phone']) ? ' | ' . htmlspecialchars($c['phone']) : '' ?></span>
                                        </div>
                                    </label>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- เลือกนักเรียน -->
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="block font-bold text-slate-700">เลือกนักเรียน/นักกีฬาที่ส่งเข้าแข่งขัน <span class="text-rose-500">*</span></label>
                        <span class="text-[11px] text-slate-400">สามารถเลือกได้หลายคน</span>
                    </div>

                    <?php if (empty($studentList)): ?>
                        <div class="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs">
                            ⚠️ ยังไม่มีรายชื่อนักเรียนในระบบ กรุณาเพิ่มรายชื่อนักเรียนด้านล่างก่อนทำการสมัคร
                        </div>
                    <?php else: ?>
                        <!-- Quick filter for event registration student selection -->
                        <div class="flex flex-wrap items-center gap-1.5 mb-2 pb-1 border-b border-slate-100">
                            <span class="text-[11px] font-bold text-slate-500 mr-1">กรองระดับชั้น:</span>
                            <button type="button" onclick="filterRegStudents('ALL')" class="reg-filter-btn px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white">ทั้งหมด</button>
                            <button type="button" onclick="filterRegStudents('KINDERGARTEN')" class="reg-filter-btn px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">อนุบาล (อ.1-3)</button>
                            <button type="button" onclick="filterRegStudents('PRIMARY_LOWER')" class="reg-filter-btn px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">ประถมต้น (ป.1-3)</button>
                            <button type="button" onclick="filterRegStudents('PRIMARY_UPPER')" class="reg-filter-btn px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">ประถมปลาย (ป.4-6)</button>
                            <button type="button" onclick="filterRegStudents('SECONDARY')" class="reg-filter-btn px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">มัธยม (ม.1-3)</button>
                        </div>

                        <div class="max-h-52 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" id="regStudentsContainer">
                            <?php foreach ($studentList as $st): 
                                $g = $st['grade'] ?? $st['grade_level'] ?? '';
                            ?>
                                <label class="reg-student-item flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 cursor-pointer text-xs transition" data-grade="<?= htmlspecialchars($g) ?>">
                                    <input type="checkbox" name="student_ids[]" value="<?= htmlspecialchars($st['id']) ?>" class="w-4 h-4 rounded text-blue-600">
                                    <div class="min-w-0">
                                        <span class="font-bold text-slate-800"><?= htmlspecialchars($st['prefix'] . $st['first_name'] . ' ' . $st['last_name']) ?></span>
                                        <span class="text-[10px] text-slate-400 block"><?= htmlspecialchars($g) ?> (<?= ($st['gender'] ?? 'MALE') === 'MALE' ? 'ชาย' : 'หญิง' ?>)</span>
                                    </div>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>

                <button type="submit" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2">
                    <span>➕</span> บันทึกการส่งแข่งขัน
                </button>
            </form>

            <!-- Table of Registered Events -->
            <div class="pt-4 border-t border-slate-100">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold font-kanit text-slate-900 text-sm">รายการแข่งขันที่โรงเรียนส่งเข้าร่วมแล้ว (<?= count($myRegList) ?> รายการ)</h3>
                    <span class="text-xs text-slate-500">คลิกที่ปุ่มเพื่อดู/เพิ่ม/ลบรายชื่อนักกีฬาในทีม</span>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                            <tr>
                                <th class="p-3 pl-4">รายการแข่งขัน</th>
                                <th class="p-3">ชนิดกีฬา</th>
                                <th class="p-3">รุ่น/ระดับชั้น</th>
                                <th class="p-3">ครูผู้ฝึกสอน</th>
                                <th class="p-3 text-center">นักกีฬาในทีม</th>
                                <th class="p-3 text-center">จัดการนักกีฬา</th>
                                <th class="p-3 pr-4 text-right">ยกเลิกรายการ</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            <?php if (empty($myRegList)): ?>
                                <tr>
                                    <td colspan="7" class="p-6 text-center text-slate-400">ยังไม่ได้ลงทะเบียนส่งแข่งขันในรายการใด</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($myRegList as $reg): 
                                    $regId = $reg['id'];
                                    $athletes = $regAthletesMap[$regId] ?? [];
                                ?>
                                    <tr class="hover:bg-slate-50 transition">
                                        <td class="p-3 pl-4 font-bold text-slate-900 font-kanit">
                                            <?= htmlspecialchars(formatEventRegistrationDisplay($reg['event_name'], $reg['grade'], $reg['sport_name'], $reg['gender'] ?? 'MALE')) ?>
                                        </td>
                                        <td class="p-3 text-slate-600 font-medium">
                                            <?= $reg['sport_icon'] ?> <?= htmlspecialchars($reg['sport_name']) ?>
                                        </td>
                                        <td class="p-3">
                                            <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                <?= htmlspecialchars(normalizeEducationLevel($reg['grade'])) ?>
                                            </span>
                                        </td>
                                        <td class="p-3 text-slate-700">
                                            <?php 
                                            $teamCoaches = $regCoachesMap[$regId] ?? [];
                                            if (!empty($teamCoaches)):
                                            ?>
                                                <div class="flex flex-wrap gap-1">
                                                    <?php foreach ($teamCoaches as $tc): ?>
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                            <span>👨‍🏫</span> <?= htmlspecialchars($tc['prefix'] . $tc['first_name'] . ' ' . $tc['last_name']) ?>
                                                        </span>
                                                    <?php endforeach; ?>
                                                </div>
                                            <?php elseif ($reg['coach_first']): ?>
                                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    <span>👨‍🏫</span> <?= htmlspecialchars($reg['coach_prefix'] . $reg['coach_first'] . ' ' . $reg['coach_last']) ?>
                                                </span>
                                            <?php else: ?>
                                                <span class="text-slate-400 italic">ยังไม่ระบุ</span>
                                            <?php endif; ?>
                                        </td>
                                        <td class="p-3 text-center">
                                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                <?= count($athletes) ?> คน
                                            </span>
                                        </td>
                                        <td class="p-3 text-center">
                                            <button 
                                                type="button"
                                                onclick="openAthleteModal(<?= htmlspecialchars(json_encode([
                                                    'id' => $reg['id'],
                                                    'event_name' => $reg['event_name'],
                                                    'sport_name' => $reg['sport_name'],
                                                    'sport_icon' => $reg['sport_icon'],
                                                    'coach_ids' => array_keys($teamCoaches),
                                                    'coaches' => array_values($teamCoaches),
                                                    'athletes' => $athletes
                                                ]), ENT_QUOTES, 'UTF-8') ?>)"
                                                class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                            >
                                                <span>👥</span> จัดการนักกีฬา/ครู
                                            </button>
                                        </td>
                                        <td class="p-3 pr-4 text-right">
                                            <a 
                                                href="?cancel_reg_id=<?= urlencode($reg['id']) ?>" 
                                                onclick="return confirm('คุณต้องการยกเลิกการส่งแข่งขันรายการนี้ใช่หรือไม่?')"
                                                class="text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 hover:bg-rose-50 rounded-lg transition"
                                            >
                                                🗑️ ยกเลิก
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
    </div>

    <!-- TAB 2: จัดการรายชื่อนักเรียน (Student Management Tab) -->
    <div id="tabContent_students" class="tab-pane hidden space-y-6">
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h3 class="font-bold font-kanit text-slate-900 text-lg flex items-center gap-2">
                        <span>🎒</span> จัดการรายชื่อนักเรียน (<span id="totalStudentsCount"><?= count($studentList) ?></span> คน)
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">เพิ่ม แก้ไข ลบ และจัดระดับชั้นนักเรียนตั้งแต่ อนุบาล 1 ถึง มัธยมศึกษาปีที่ 3 <b>(ไม่ต้องใส่รหัสประจำตัวนักเรียน)</b></p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" onclick="setStudentAddMode('single')" id="btnStudentModeSingle" class="px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5">
                        <span>➕</span> เพิ่มทีละคน
                    </button>
                    <button type="button" onclick="setStudentAddMode('batch')" id="btnStudentModeBatch" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5">
                        <span>📋</span> วางรายชื่อหลายคน
                    </button>
                </div>
            </div>

            <!-- Notice Banner: No ID required -->
            <div class="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900 font-medium">
                <span class="text-lg">✨</span>
                <div>
                    <span class="font-bold">ระบบเพิ่มนักเรียนแบบสะดวกรวดเร็ว:</span> แอดมินโรงเรียนสามารถเพิ่มรายชื่อนักเรียนได้ทันทีโดย<b>ไม่ต้องกรอกรหัสประจำตัวนักเรียน</b> หรือสามารถใช้วิธีวางรายชื่อหลายๆ คนพร้อมกันได้เลย
                </div>
            </div>

            <!-- Form 1: เพิ่มนักเรียนทีละคน (Single Add) -->
            <form id="studentAddForm" method="POST" class="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <input type="hidden" name="action_student" value="add">
                <div class="font-bold text-slate-800 flex items-center justify-between text-sm">
                    <span class="flex items-center gap-2">
                        <span class="p-1 bg-blue-100 text-blue-700 rounded-lg">➕</span> เพิ่มข้อมูลนักเรียนใหม่ (รายบุคคล)
                    </span>
                    <span class="text-[11px] font-normal text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ✓ ไม่ต้องใส่รหัสประจำตัว
                    </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">คำนำหน้า</label>
                        <select name="prefix" class="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium">
                            <option value="เด็กชาย">เด็กชาย</option>
                            <option value="เด็กหญิง">เด็กหญิง</option>
                            <option value="นาย">นาย</option>
                            <option value="นางสาว">นางสาว</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">ชื่อ <span class="text-rose-500">*</span></label>
                        <input type="text" name="first_name" required placeholder="ชื่อ" class="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium">
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">นามสกุล <span class="text-rose-500">*</span></label>
                        <input type="text" name="last_name" required placeholder="นามสกุล" class="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">เพศ</label>
                        <select name="gender" class="w-full p-2 bg-white border border-slate-300 rounded-lg">
                            <option value="MALE">ชาย</option>
                            <option value="FEMALE">หญิง</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-slate-600 mb-0.5">ระดับชั้น <span class="text-rose-500">*</span></label>
                        <select name="grade_level" class="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold">
                            <optgroup label="ระดับชั้นอนุบาล">
                                <option value="อ.1">อ.1 (อนุบาล 1)</option>
                                <option value="อ.2">อ.2 (อนุบาล 2)</option>
                                <option value="อ.3">อ.3 (อนุบาล 3)</option>
                            </optgroup>
                            <optgroup label="ระดับชั้นประถมศึกษา">
                                <option value="ป.1">ป.1 (ประถมศึกษาปีที่ 1)</option>
                                <option value="ป.2">ป.2 (ประถมศึกษาปีที่ 2)</option>
                                <option value="ป.3">ป.3 (ประถมศึกษาปีที่ 3)</option>
                                <option value="ป.4" selected>ป.4 (ประถมศึกษาปีที่ 4)</option>
                                <option value="ป.5">ป.5 (ประถมศึกษาปีที่ 5)</option>
                                <option value="ป.6">ป.6 (ประถมศึกษาปีที่ 6)</option>
                            </optgroup>
                            <optgroup label="ระดับชั้นมัธยมศึกษา">
                                <option value="ม.1">ม.1 (มัธยมศึกษาปีที่ 1)</option>
                                <option value="ม.2">ม.2 (มัธยมศึกษาปีที่ 2)</option>
                                <option value="ม.3">ม.3 (มัธยมศึกษาปีที่ 3)</option>
                            </optgroup>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md text-xs flex items-center justify-center gap-1.5">
                        <span>➕</span> บันทึกข้อมูลนักเรียน
                    </button>
                </div>
            </form>

            <!-- Form 2: นำเข้ารายชื่อนักเรียนหลายคนพร้อมกัน (Batch Add) -->
            <form id="studentBatchAddForm" method="POST" class="p-5 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-4 text-xs hidden">
                <input type="hidden" name="action_student_batch" value="bulk_add">
                <div class="font-bold text-indigo-900 flex items-center justify-between text-sm">
                    <span class="flex items-center gap-2">
                        <span class="p-1 bg-indigo-200 text-indigo-800 rounded-lg">📋</span> นำเข้ารายชื่อนักเรียนหลายคนพร้อมกัน (วางรายชื่อ)
                    </span>
                    <span class="text-[11px] font-normal text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                        ⚡ รวดเร็ว บันทึกพร้อมกัน
                    </span>
                </div>
                <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">ระดับชั้นของนักเรียนชุดนี้ <span class="text-rose-500">*</span></label>
                    <select name="batch_grade" class="w-full sm:w-72 p-2 bg-white border border-slate-300 rounded-lg font-semibold">
                        <optgroup label="ระดับชั้นอนุบาล">
                            <option value="อ.1">อ.1 (อนุบาล 1)</option>
                            <option value="อ.2">อ.2 (อนุบาล 2)</option>
                            <option value="อ.3">อ.3 (อนุบาล 3)</option>
                        </optgroup>
                        <optgroup label="ระดับชั้นประถมศึกษา">
                            <option value="ป.1">ป.1 (ประถมศึกษาปีที่ 1)</option>
                            <option value="ป.2">ป.2 (ประถมศึกษาปีที่ 2)</option>
                            <option value="ป.3">ป.3 (ประถมศึกษาปีที่ 3)</option>
                            <option value="ป.4" selected>ป.4 (ประถมศึกษาปีที่ 4)</option>
                            <option value="ป.5">ป.5 (ประถมศึกษาปีที่ 5)</option>
                            <option value="ป.6">ป.6 (ประถมศึกษาปีที่ 6)</option>
                        </optgroup>
                        <optgroup label="ระดับชั้นมัธยมศึกษา">
                            <option value="ม.1">ม.1 (มัธยมศึกษาปีที่ 1)</option>
                            <option value="ม.2">ม.2 (มัธยมศึกษาปีที่ 2)</option>
                            <option value="ม.3">ม.3 (มัธยมศึกษาปีที่ 3)</option>
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">
                        วางรายชื่อนักเรียน (บรรทัดละ 1 คน สามารถใส่หรือไม่ใส่คำนำหน้าก็ได้ ระบบจะตรวจจับเพศให้อัตโนมัติ) <span class="text-rose-500">*</span>
                    </label>
                    <textarea 
                        name="batch_names" 
                        rows="6" 
                        required 
                        placeholder="ตัวอย่างการวางรายชื่อ:&#10;เด็กชายธนภัทร สุขใจ&#10;เด็กหญิงกมลวรรณ บุญมี&#10;เด็กชายศุภกิจ กองแก้ว&#10;เด็กหญิงพิมพ์ชนก รัตนวงศ์&#10;วิทวัส ชัยชนะ" 
                        class="w-full p-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    ></textarea>
                </div>
                <div class="flex justify-end gap-2">
                    <button type="button" onclick="setStudentAddMode('single')" class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold transition">
                        ยกเลิก
                    </button>
                    <button type="submit" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md text-xs flex items-center gap-1.5">
                        <span>⚡</span> นำเข้ารายชื่อทั้งหมดทันที
                    </button>
                </div>
            </form>

            <!-- รายชื่อนักเรียนพร้อมแถบกรองระดับชั้นและค้นหา -->
            <div class="space-y-3">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <!-- Search Input -->
                    <div class="relative flex-1">
                        <input 
                            type="text" 
                            id="studentSearchInput" 
                            onkeyup="searchStudents()" 
                            placeholder="🔍 ค้นหาชื่อนักเรียน หรือรหัส..." 
                            class="w-full p-2.5 pl-4 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        >
                    </div>
                    <!-- Grade Quick Tabs -->
                    <div class="flex flex-wrap gap-1 items-center">
                        <button type="button" onclick="selectGradeGroup('ALL')" class="grade-tab-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs" data-grade="ALL">
                            ทั้งหมด (<?= count($studentList) ?>)
                        </button>
                        <button type="button" onclick="selectGradeGroup('อ.1')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="อ.1">อ.1</button>
                        <button type="button" onclick="selectGradeGroup('อ.2')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="อ.2">อ.2</button>
                        <button type="button" onclick="selectGradeGroup('อ.3')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="อ.3">อ.3</button>
                        <button type="button" onclick="selectGradeGroup('ป.1')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ป.1">ป.1</button>
                        <button type="button" onclick="selectGradeGroup('ป.2')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ป.2">ป.2</button>
                        <button type="button" onclick="selectGradeGroup('ป.3')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ป.3">ป.3</button>
                        <button type="button" onclick="selectGradeGroup('ป.4')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ป.4">ป.4</button>
                        <button type="button" onclick="selectGradeGroup('ป.5')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ป.5">ป.5</button>
                        <button type="button" onclick="selectGradeGroup('ป.6')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ป.6">ป.6</button>
                        <button type="button" onclick="selectGradeGroup('ม.1')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ม.1">ม.1</button>
                        <button type="button" onclick="selectGradeGroup('ม.2')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ม.2">ม.2</button>
                        <button type="button" onclick="selectGradeGroup('ม.3')" class="grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200" data-grade="ม.3">ม.3</button>
                    </div>
                </div>

                <div class="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs border border-slate-200 rounded-2xl p-3 bg-slate-50/50" id="studentListContainer">
                    <?php if (empty($studentList)): ?>
                        <div class="py-12 text-center text-slate-400">ยังไม่มีรายชื่อนักเรียนในระบบ กรุณาเพิ่มข้อมูลด้านบน</div>
                    <?php else: ?>
                        <?php foreach ($studentList as $s): 
                            $gr = $s['grade'] ?? $s['grade_level'] ?? '';
                        ?>
                            <div class="student-row py-3 px-3 flex items-center justify-between hover:bg-white rounded-xl transition" data-grade="<?= htmlspecialchars($gr) ?>" data-name="<?= htmlspecialchars($s['prefix'] . $s['first_name'] . ' ' . $s['last_name'] . ' ' . ($s['student_code'] ?? '')) ?>">
                                <div class="flex items-center gap-3">
                                    <span class="w-8 h-8 rounded-full <?= ($s['gender'] ?? 'MALE') === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700' ?> flex items-center justify-center font-bold text-xs shrink-0">
                                        <?= ($s['gender'] ?? 'MALE') === 'MALE' ? '👦' : '👧' ?>
                                    </span>
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-slate-800 text-sm"><?= htmlspecialchars($s['prefix'] . $s['first_name'] . ' ' . $s['last_name']) ?></span>
                                            <span class="px-2 py-0.5 rounded text-[10px] font-bold <?= strpos($gr, 'อ.') !== false ? 'bg-amber-100 text-amber-800' : (strpos($gr, 'ม.') !== false ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800') ?>">
                                                <?= htmlspecialchars($gr) ?>
                                            </span>
                                        </div>
                                        <span class="text-xs text-slate-400 block mt-0.5">
                                            เพศ: <?= ($s['gender'] ?? 'MALE') === 'MALE' ? 'ชาย' : 'หญิง' ?>
                                            <?php if (!empty($s['student_code'])): ?> | รหัส: <?= htmlspecialchars($s['student_code']) ?><?php endif; ?>
                                        </span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <button 
                                        type="button"
                                        onclick="openEditStudentModal(<?= htmlspecialchars(json_encode([
                                            'id' => $s['id'],
                                            'prefix' => $s['prefix'],
                                            'first_name' => $s['first_name'],
                                            'last_name' => $s['last_name'],
                                            'gender' => $s['gender'] ?? 'MALE',
                                            'grade' => $gr,
                                            'student_code' => $s['student_code'] ?? ''
                                        ]), ENT_QUOTES, 'UTF-8') ?>)"
                                        class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                                    >
                                        ✏️ แก้ไข
                                    </button>
                                    <a 
                                        href="?delete_student_id=<?= urlencode($s['id']) ?>" 
                                        onclick="return confirm('ยืนยันลบนักเรียน <?= htmlspecialchars($s['first_name']) ?> คนนี้ออกจากระบบ?')" 
                                        class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition"
                                    >
                                        🗑️ ลบ
                                    </a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    <div id="noStudentMessage" class="hidden py-8 text-center text-slate-400 text-xs">
                        ไม่พบข้อมูลนักเรียนในระดับชั้นหรือคำค้นหาที่เลือก
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- TAB 3: จัดการครูผู้ฝึกสอน (Coach Management Tab) -->
    <div id="tabContent_coaches" class="tab-pane hidden space-y-6">
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                    <h3 class="font-bold font-kanit text-slate-900 text-lg flex items-center gap-2">
                        <span>👨‍🏫</span> จัดการข้อมูลครูผู้ฝึกสอนกีฬา (<?= count($coachList) ?> คน)
                    </h3>
                    <p class="text-xs text-slate-400">เพิ่ม แก้ไขข้อมูลครูผู้ฝึกสอน และผู้ควบคุมทีมกีฬาประจำสถานศึกษา (รองรับการเพิ่มทีละหลายคนพร้อมกัน)</p>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="setCoachAddMode('single')" id="btnCoachModeSingle" class="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 text-white shadow-xs transition cursor-pointer">
                        ➕ เพิ่มทีละคน
                    </button>
                    <button type="button" onclick="setCoachAddMode('batch')" id="btnCoachModeBatch" class="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer">
                        📋 วางรายชื่อหลายคน (Batch Add)
                    </button>
                </div>
            </div>

            <!-- Form 1: เพิ่มครูรายบุคคล -->
            <form id="coachSingleForm" method="POST" class="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <input type="hidden" name="action_coach" value="add">
                <div class="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span class="p-1 bg-emerald-100 text-emerald-700 rounded-lg">➕</span> แบบฟอร์มเพิ่มข้อมูลครูผู้ฝึกสอน (รายบุคคล)
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                        <select name="coach_prefix" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium">
                            <option value="นาย">นาย</option>
                            <option value="นาง">นาง</option>
                            <option value="นางสาว">นางสาว</option>
                            <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                            <option value="ว่าที่ ร.ต.หญิง">ว่าที่ ร.ต.หญิง</option>
                            <option value="ดร.">ดร.</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">ชื่อ <span class="text-rose-500">*</span></label>
                        <input type="text" name="coach_first" required placeholder="ชื่อ" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">นามสกุล <span class="text-rose-500">*</span></label>
                        <input type="text" name="coach_last" required placeholder="นามสกุล" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง</label>
                        <input type="text" name="position" value="ครูผู้ฝึกสอน" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">เบอร์โทรศัพท์</label>
                        <input type="text" name="coach_phone" placeholder="08x-xxxxxxx" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs">
                    </div>
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md text-xs">
                        ➕ บันทึกข้อมูลครูผู้ฝึกสอน
                    </button>
                </div>
            </form>

            <!-- Form 2: นำเข้ารายชื่อครูหลายคน (Batch Add) -->
            <form id="coachBatchForm" method="POST" class="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs hidden">
                <input type="hidden" name="action_coach" value="batch">
                <div class="font-bold text-slate-800 flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                        <span class="p-1 bg-emerald-100 text-emerald-700 rounded-lg">📋</span> วางรายชื่อครูผู้ฝึกสอนหลายคนพร้อมกัน (Batch Add)
                    </div>
                    <span class="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">⚡ แยกคำนำหน้า ชื่อ นามสกุลให้อัตโนมัติ</span>
                </div>
                <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-950 text-[11px] leading-relaxed">
                    💡 <b>คำแนะนำ:</b> สามารถคัดลอกรายชื่อครูจาก Excel หรือเอกสารข้อความมาวางได้เลย ระบบจะตัดลำดับเลข 1, 2, 3... ด้านหน้าออกให้อัตโนมัติ
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่งเริ่มต้นของครูชุดนี้</label>
                    <input type="text" name="batch_position" value="ครูผู้ฝึกสอน" class="w-full sm:w-80 p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">วางรายชื่อครูผู้ฝึกสอน (บรรทัดละ 1 คน) <span class="text-rose-500">*</span></label>
                    <textarea name="batch_coaches" rows="6" required placeholder="ตัวอย่าง:&#10;นายสมศักดิ์ มีสุข&#10;นางสาววิภาดา รัตนวงศ์&#10;ว่าที่ ร.ต. ชัยชนะ ก้องกังวาน&#10;ดร.ธีรพงษ์ ศรีสุข" class="w-full p-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"></textarea>
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md text-xs flex items-center justify-center gap-1.5">
                        <span>⚡</span> นำเข้ารายชื่อครูทั้งหมดทันที
                    </button>
                </div>
            </form>

            <div class="space-y-2">
                <h4 class="font-bold font-kanit text-slate-800 text-sm">รายชื่อครูผู้ฝึกสอนปัจจุบัน</h4>
                <div class="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                    <?php if (empty($coachList)): ?>
                        <div class="py-12 text-center text-slate-400">ยังไม่มีรายชื่อครูผู้ฝึกสอน กรุณาเพิ่มข้อมูลด้านบน</div>
                    <?php else: ?>
                        <?php foreach ($coachList as $c): ?>
                            <div class="py-3 px-3 flex items-center justify-between hover:bg-white rounded-xl transition">
                                <div class="flex items-center gap-3">
                                    <span class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        👨‍🏫
                                    </span>
                                    <div>
                                        <span class="font-bold text-slate-800 text-sm"><?= htmlspecialchars($c['prefix'] . $c['first_name'] . ' ' . $c['last_name']) ?></span>
                                        <span class="text-xs text-slate-400 block mt-0.5">
                                            <?= htmlspecialchars($c['position']) ?> &bull; โทร: <b><?= htmlspecialchars($c['phone'] ?: '-') ?></b>
                                        </span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <button 
                                        type="button"
                                        onclick="openEditCoachModal(<?= htmlspecialchars(json_encode([
                                            'id' => $c['id'],
                                            'prefix' => $c['prefix'],
                                            'first_name' => $c['first_name'],
                                            'last_name' => $c['last_name'],
                                            'position' => $c['position'],
                                            'phone' => $c['phone'] ?? ''
                                        ]), ENT_QUOTES, 'UTF-8') ?>)"
                                        class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                                    >
                                        ✏️ แก้ไข
                                    </button>
                                    <a 
                                        href="?delete_coach_id=<?= urlencode($c['id']) ?>" 
                                        onclick="return confirm('ยืนยันลบครูผู้ฝึกสอนท่านนี้?')" 
                                        class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition"
                                    >
                                        🗑️ ลบ
                                    </a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- TAB 4: เกียรติบัตร (Certificates Tab) -->
    <div id="tabContent_certs" class="tab-pane hidden space-y-6"><div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5"><div class="border-b border-slate-100 pb-4"><h3 class="font-bold font-kanit text-slate-900 text-lg">📜 เกียรติบัตรของโรงเรียน (<?= count($certList) ?> ฉบับ)</h3><p class="text-xs text-slate-500 mt-1">ดาวน์โหลด PDF จาก Google Drive รายบุคคล หรือดาวน์โหลดรวมตามรายการแข่งขัน</p></div><?php if (empty($certList)): ?><div class="p-12 text-center text-slate-400">ยังไม่มีเกียรติบัตร</div><?php else: ?><div id="certificateGroupDownloads" class="grid grid-cols-1 md:grid-cols-2 gap-2"></div><p class="text-[10px] text-slate-500">หากเบราว์เซอร์ถาม ให้อนุญาตการดาวน์โหลดหลายไฟล์ เพื่อรับเกียรติบัตรทั้งนักกีฬาและครูในครั้งเดียว</p><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><?php foreach ($certList as $c): ?><div class="cert-card p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3" data-event="<?= htmlspecialchars($c['event_id'] ?? '', ENT_QUOTES) ?>" data-event-name="<?= htmlspecialchars($c['event_name'] ?? 'รายการแข่งขัน', ENT_QUOTES) ?>" data-drive-url="<?= htmlspecialchars($c['drive_url'] ?? '', ENT_QUOTES) ?>"><div><b class="text-sm text-slate-900"><?= htmlspecialchars($c['recipient_name']) ?></b><span class="ml-2 text-[10px] text-slate-500"><?= ($c['recipient_type'] ?? '') === 'COACH' ? 'ครูผู้ฝึกสอน' : 'นักเรียน' ?></span><div class="text-xs text-blue-700 mt-1"><?= htmlspecialchars($c['event_name']) ?></div><div class="text-[11px] text-slate-500"><?= htmlspecialchars($c['award']) ?></div></div><div class="flex gap-2"><?php if (!empty($c['drive_url'])): ?><a href="<?= htmlspecialchars($c['drive_url']) ?>" target="_blank" rel="noopener" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">📥 ดาวน์โหลด PDF</a><?php else: ?><span class="px-3 py-1.5 bg-slate-200 text-slate-500 rounded-lg text-xs">รอ PDF</span><?php endif; ?><a href="/verify.php?token=<?= urlencode($c['qr_token'] ?? $c['certificate_no']) ?>" target="_blank" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">🔍 ตรวจสอบ</a></div></div><?php endforeach; ?></div><?php endif; ?></div></div>

    <!-- TAB 5: ข้อมูลสถานศึกษา (School Profile Tab) -->
    <div id="tabContent_profile" class="tab-pane hidden space-y-6">
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div class="border-b border-slate-100 pb-4">
                <h3 class="font-bold font-kanit text-slate-900 text-lg flex items-center gap-2">
                    <span>🏫</span> แก้ไขและปรับปรุงข้อมูลสถานศึกษา
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                    ปรับปรุงชื่อสถานศึกษา, ชื่อผู้อำนวยการโรงเรียน, ที่อยู่ และเบอร์โทรศัพท์ เพื่อความถูกต้องของเกียรติบัตรและเอกสารทางการ
                </p>
            </div>

            <form method="POST" class="space-y-4 text-xs">
                <input type="hidden" name="action_update_school" value="1">
                
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">ชื่อเต็มสถานศึกษา <span class="text-rose-500">*</span></label>
                        <input type="text" name="school_name" required value="<?= htmlspecialchars($schoolData['school_name']) ?>" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500">
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">ชื่อย่อสถานศึกษา</label>
                        <input type="text" name="short_name" value="<?= htmlspecialchars($schoolData['short_name'] ?? '') ?>" placeholder="เช่น หนองหว้า" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500">
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">ชื่อ-สกุล ผู้อำนวยการโรงเรียน <span class="text-rose-500">*</span></label>
                        <input type="text" name="director_name" required value="<?= htmlspecialchars($schoolData['director_name'] ?? '') ?>" placeholder="เช่น นายสมชาย ใจดี" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500">
                    </div>

                    <div>
                        <label class="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                        <input type="text" name="phone" value="<?= htmlspecialchars($schoolData['phone'] ?? '') ?>" placeholder="044-xxxxxx หรือ 08x-xxxxxxx" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500">
                    </div>

                    <div class="md:col-span-2">
                        <label class="block font-bold text-slate-700 mb-1">ที่อยู่สถานศึกษา</label>
                        <input type="text" name="address" value="<?= htmlspecialchars($schoolData['address'] ?? '') ?>" placeholder="หมู่ที่ ... ต.สว่าง อ.กระสัง จ.บุรีรัมย์" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500">
                    </div>

                    <div class="md:col-span-3">
                        <label class="block font-bold text-slate-700 mb-1">URL โลโก้ / ตราประจำโรงเรียน</label>
                        <input type="url" name="logo" value="<?= htmlspecialchars($schoolData['logo'] ?? '') ?>" placeholder="https://..." class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500">
                    </div>
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="submit" class="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5">
                        <span>💾</span> บันทึกและปรับปรุงข้อมูลโรงเรียน
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- ============================================================== -->
<!-- MODAL: จัดการรายชื่อนักกีฬาและครูผู้ฝึกสอน (Registration Athletes & Coaches) -->
<!-- ============================================================== -->
<div id="athleteManageModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden overflow-y-auto">
    <div class="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-fadeIn">
        <!-- Modal Header -->
        <div class="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
                <span id="modalSportIcon" class="text-2xl p-2 bg-white/15 rounded-2xl shrink-0">🏅</span>
                <div>
                    <div class="flex items-center gap-2 text-xs text-blue-100 mb-0.5">
                        <span id="modalSportName" class="font-semibold"></span>
                        <span>•</span>
                        <span id="modalEventCode" class="font-mono bg-white/20 px-2 py-0.2 rounded"></span>
                    </div>
                    <h3 id="modalEventName" class="text-base sm:text-lg font-bold font-kanit"></h3>
                </div>
            </div>
            <button type="button" onclick="closeAthleteModal()" class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center transition cursor-pointer">
                ✕
            </button>
        </div>

        <!-- Modal Body -->
        <div class="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
            <!-- 1. ครูผู้ฝึกสอนของรายการนี้ (เลือกได้หลายคน) -->
            <div class="p-4 sm:p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200/90 space-y-3">
                <form method="POST" id="modalCoachForm" class="space-y-3">
                    <input type="hidden" name="action_manage_reg" value="update_coach">
                    <input type="hidden" name="reg_id" id="modalCoachRegId">

                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                        <div>
                            <label class="font-bold text-slate-800 text-sm font-kanit flex items-center gap-2">
                                <span class="p-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs">👨‍🏫</span>
                                <span>ครูผู้ฝึกสอนที่รับผิดชอบรายการนี้</span>
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200/70 text-emerald-900">
                                    เลือกแล้ว <span id="modalSelectedCoachesCount">0</span> คน
                                </span>
                            </label>
                            <p class="text-[11px] text-slate-500 mt-0.5">ติ๊กเลือกครูผู้ฝึกสอนที่ดูแลรายการนี้ สามารถเลือกได้หลายคน</p>
                        </div>

                        <div class="flex items-center gap-1.5 flex-wrap">
                            <button type="button" onclick="selectAllModalCoaches(true)" class="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-semibold transition cursor-pointer">
                                ✓ เลือกทุกคน
                            </button>
                            <button type="button" onclick="selectAllModalCoaches(false)" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-[11px] font-semibold transition cursor-pointer">
                                ✕ ล้างการเลือก
                            </button>
                            <button type="button" onclick="openAddCoachModalInline()" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs">
                                ➕ เพิ่มครูใหม่
                            </button>
                        </div>
                    </div>

                    <!-- Checkboxes Grid for Coaches -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1" id="modalAthleteCoachesContainer">
                        <?php if (empty($coachList)): ?>
                            <div class="col-span-full py-4 text-center text-slate-400">
                                ยังไม่มีรายชื่อครูในระบบ กรุณากดปุ่ม "+ เพิ่มครูใหม่"
                            </div>
                        <?php else: ?>
                            <?php foreach ($coachList as $c): ?>
                                <label class="p-2.5 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 flex items-center justify-between gap-2 cursor-pointer transition shadow-2xs">
                                    <div class="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            name="modal_coach_ids[]" 
                                            value="<?= htmlspecialchars($c['id']) ?>" 
                                            class="modal-reg-coach-cb rounded text-emerald-600 focus:ring-emerald-500"
                                            onchange="updateModalCoachCount()"
                                        >
                                        <div>
                                            <p class="font-bold text-slate-800 text-xs"><?= htmlspecialchars($c['prefix'] . $c['first_name'] . ' ' . $c['last_name']) ?></p>
                                            <span class="text-[10px] text-slate-500 font-normal"><?= htmlspecialchars($c['position']) ?></span>
                                        </div>
                                    </div>
                                </label>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>

                    <div class="flex justify-end pt-1">
                        <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5 text-xs">
                            <span>💾</span> บันทึกครูผู้ฝึกสอนในรายการนี้
                        </button>
                    </div>
                </form>
            </div>

            <!-- 2. เพิ่มนักเรียนเข้าทีมรายการนี้ -->
            <div class="p-4 sm:p-5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3">
                <div class="flex items-center justify-between">
                    <label class="font-bold text-slate-800 text-sm font-kanit flex items-center gap-2">
                        <span class="p-1 bg-blue-100 text-blue-800 rounded-lg text-xs">➕</span>
                        <span>เพิ่มนักกีฬาเข้าสู่รายการแข่งขันนี้</span>
                    </label>
                    <button type="button" onclick="openAddStudentModalInline()" class="text-blue-700 hover:text-blue-900 font-bold text-[11px]">
                        + เพิ่มนักเรียนใหม่เข้าระบบ
                    </button>
                </div>
                <form method="POST" class="flex flex-col sm:flex-row gap-2">
                    <input type="hidden" name="action_manage_reg" value="add_athlete">
                    <input type="hidden" name="reg_id" id="modalAddAthleteRegId">
                    <select name="add_student_id" required id="modalAddStudentSelect" class="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium">
                        <option value="">-- เลือกนักเรียนที่ต้องการส่งเข้าทีมนี้ --</option>
                        <?php foreach ($studentList as $st): ?>
                            <option value="<?= htmlspecialchars($st['id']) ?>">
                                <?= htmlspecialchars($st['prefix'] . $st['first_name'] . ' ' . $st['last_name']) ?> (<?= htmlspecialchars($st['grade'] ?? $st['grade_level'] ?? '') ?> - <?= ($st['gender'] ?? 'MALE') === 'MALE' ? 'ชาย' : 'หญิง' ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer shadow-2xs shrink-0 flex items-center justify-center gap-1">
                        <span>➕</span> เพิ่มเข้าทีม
                    </button>
                </form>
            </div>

            <!-- 3. รายชื่อนักกีฬาปัจจุบันในทีม -->
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <h4 class="font-bold font-kanit text-slate-800 text-sm flex items-center gap-2">
                        <span class="p-1 bg-indigo-100 text-indigo-800 rounded-lg text-xs">🏃‍♂️</span>
                        <span>รายชื่อนักกีฬาในทีมปัจจุบัน</span>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            <span id="modalAthletesCount">0</span> คน
                        </span>
                    </h4>
                </div>
                <div id="modalAthletesList" class="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden max-h-56 overflow-y-auto">
                    <!-- Populated by JS -->
                </div>
            </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
            <button type="button" onclick="closeAthleteModal()" class="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer">
                ปิดหน้าต่าง
            </button>
        </div>
    </div>
</div>

<!-- ============================================================== -->
<!-- MODAL: แก้ไขข้อมูลนักเรียน (Edit Student Modal) -->
<!-- ============================================================== -->
<div id="editStudentModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
        <div class="p-5 bg-amber-500 text-white flex items-center justify-between">
            <h3 class="text-base font-bold font-kanit flex items-center gap-2">
                <span>✏️</span> แก้ไขข้อมูลนักเรียน
            </h3>
            <button type="button" onclick="closeEditStudentModal()" class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center transition cursor-pointer">
                ✕
            </button>
        </div>
        <form method="POST" class="p-6 space-y-4 text-xs">
            <input type="hidden" name="action_student" value="edit">
            <input type="hidden" name="student_id" id="editStuId">
            
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                    <select name="prefix" id="editStuPrefix" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium">
                        <option value="เด็กชาย">เด็กชาย</option>
                        <option value="เด็กหญิง">เด็กหญิง</option>
                        <option value="นาย">นาย</option>
                        <option value="นางสาว">นางสาว</option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">ชื่อ <span class="text-rose-500">*</span></label>
                    <input type="text" name="first_name" id="editStuFirst" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">นามสกุล <span class="text-rose-500">*</span></label>
                    <input type="text" name="last_name" id="editStuLast" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">เพศ</label>
                    <select name="gender" id="editStuGender" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                        <option value="MALE">ชาย</option>
                        <option value="FEMALE">หญิง</option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">ระดับชั้น <span class="text-rose-500">*</span></label>
                    <select name="grade_level" id="editStuGrade" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
                        <optgroup label="ระดับชั้นอนุบาล">
                            <option value="อ.1">อ.1 (อนุบาล 1)</option>
                            <option value="อ.2">อ.2 (อนุบาล 2)</option>
                            <option value="อ.3">อ.3 (อนุบาล 3)</option>
                        </optgroup>
                        <optgroup label="ระดับชั้นประถมศึกษา">
                            <option value="ป.1">ป.1 (ประถมศึกษาปีที่ 1)</option>
                            <option value="ป.2">ป.2 (ประถมศึกษาปีที่ 2)</option>
                            <option value="ป.3">ป.3 (ประถมศึกษาปีที่ 3)</option>
                            <option value="ป.4">ป.4 (ประถมศึกษาปีที่ 4)</option>
                            <option value="ป.5">ป.5 (ประถมศึกษาปีที่ 5)</option>
                            <option value="ป.6">ป.6 (ประถมศึกษาปีที่ 6)</option>
                        </optgroup>
                        <optgroup label="ระดับชั้นมัธยมศึกษา">
                            <option value="ม.1">ม.1 (มัธยมศึกษาปีที่ 1)</option>
                            <option value="ม.2">ม.2 (มัธยมศึกษาปีที่ 2)</option>
                            <option value="ม.3">ม.3 (มัธยมศึกษาปีที่ 3)</option>
                        </optgroup>
                    </select>
                </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button type="button" onclick="closeEditStudentModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer">
                    ยกเลิก
                </button>
                <button type="submit" class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition cursor-pointer shadow-md">
                    💾 บันทึกการแก้ไข
                </button>
            </div>
        </form>
    </div>
</div>

<!-- ============================================================== -->
<!-- MODAL: แก้ไขข้อมูลครูผู้ฝึกสอน (Edit Coach Modal) -->
<!-- ============================================================== -->
<div id="editCoachModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hidden">
    <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
        <div class="p-5 bg-amber-500 text-white flex items-center justify-between">
            <h3 class="text-base font-bold font-kanit flex items-center gap-2">
                <span>✏️</span> แก้ไขข้อมูลครูผู้ฝึกสอน
            </h3>
            <button type="button" onclick="closeEditCoachModal()" class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center transition cursor-pointer">
                ✕
            </button>
        </div>
        <form method="POST" class="p-6 space-y-4 text-xs">
            <input type="hidden" name="action_coach" value="edit">
            <input type="hidden" name="coach_id" id="editCoachId">
            
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                    <select name="coach_prefix" id="editCoachPrefix" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                        <option value="นาย">นาย</option>
                        <option value="นาง">นาง</option>
                        <option value="น.ส.">น.ส.</option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">ชื่อ <span class="text-rose-500">*</span></label>
                    <input type="text" name="coach_first" id="editCoachFirst" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">นามสกุล <span class="text-rose-500">*</span></label>
                    <input type="text" name="coach_last" id="editCoachLast" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">ตำแหน่ง</label>
                    <input type="text" name="position" id="editCoachPosition" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold">
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">เบอร์โทรศัพท์</label>
                    <input type="text" name="coach_phone" id="editCoachPhone" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button type="button" onclick="closeEditCoachModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer">
                    ยกเลิก
                </button>
                <button type="submit" class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition cursor-pointer shadow-md">
                    💾 บันทึกการแก้ไข
                </button>
            </div>
        </form>
    </div>
</div>

<script>
// ==========================================
// 0. Tab Switching Handler
// ==========================================
function switchSchoolTab(tabId) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.add('hidden');
    });

    // Reset all tab button styles
    document.querySelectorAll('.tab-nav-btn').forEach(btn => {
        btn.className = 'tab-nav-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200';
    });

    // Show target pane
    const targetPane = document.getElementById('tabContent_' + tabId);
    if (targetPane) {
        targetPane.classList.remove('hidden');
    }

    // Activate target tab button
    const targetBtn = document.getElementById('tabBtn_' + tabId);
    if (targetBtn) {
        targetBtn.className = 'tab-nav-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer bg-blue-600 text-white shadow-sm';
    }

    // Remember selected tab in sessionStorage
    try {
        sessionStorage.setItem('schoolActiveTab', tabId);
    } catch(e) {}
}

// Restore saved tab or default to 'reg'
document.addEventListener('DOMContentLoaded', () => {
    try {
        const savedTab = sessionStorage.getItem('schoolActiveTab');
        if (savedTab && document.getElementById('tabContent_' + savedTab)) {
            switchSchoolTab(savedTab);
        }
    } catch(e) {}
});

// ==========================================
// 1. Grade Tab Filtering & Mode Switching for Student List
// ==========================================
let currentGradeFilter = 'ALL';

function setStudentAddMode(mode) {
    const singleForm = document.getElementById('studentAddForm');
    const batchForm = document.getElementById('studentBatchAddForm');
    const btnSingle = document.getElementById('btnStudentModeSingle');
    const btnBatch = document.getElementById('btnStudentModeBatch');

    if (mode === 'batch') {
        if (singleForm) singleForm.classList.add('hidden');
        if (batchForm) {
            batchForm.classList.remove('hidden');
            batchForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const textarea = batchForm.querySelector('textarea');
            if (textarea) textarea.focus();
        }
        if (btnBatch) btnBatch.className = 'px-3.5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5';
        if (btnSingle) btnSingle.className = 'px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5';
    } else {
        if (batchForm) batchForm.classList.add('hidden');
        if (singleForm) {
            singleForm.classList.remove('hidden');
            singleForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const firstInput = singleForm.querySelector('input[name="first_name"]');
            if (firstInput) firstInput.focus();
        }
        if (btnSingle) btnSingle.className = 'px-3.5 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5';
        if (btnBatch) btnBatch.className = 'px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5';
    }
}

function toggleStudentForm() {
    setStudentAddMode('single');
}

function selectGradeGroup(grade) {
    currentGradeFilter = grade;
    
    // Update button styles
    document.querySelectorAll('.grade-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-grade') === grade) {
            btn.className = 'grade-tab-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs';
        } else {
            btn.className = 'grade-tab-btn px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200';
        }
    });

    applyStudentFilter();
}

function searchStudents() {
    applyStudentFilter();
}

function applyStudentFilter() {
    const searchVal = (document.getElementById('studentSearchInput')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.student-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const rowGrade = row.getAttribute('data-grade') || '';
        const rowName = (row.getAttribute('data-name') || '').toLowerCase();

        const matchGrade = (currentGradeFilter === 'ALL') || (rowGrade === currentGradeFilter);
        const matchSearch = !searchVal || rowName.includes(searchVal);

        if (matchGrade && matchSearch) {
            row.style.display = 'flex';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const noMsg = document.getElementById('noStudentMessage');
    if (noMsg) {
        noMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
    }
}

// ==========================================
// 2. Filter for Event Registration Student Checkboxes
// ==========================================
function filterRegStudents(group) {
    document.querySelectorAll('.reg-filter-btn').forEach(btn => {
        btn.className = 'reg-filter-btn px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200';
    });
    event.target.className = 'reg-filter-btn px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white';

    const items = document.querySelectorAll('.reg-student-item');
    items.forEach(item => {
        const g = item.getAttribute('data-grade') || '';
        let show = false;

        if (group === 'ALL') {
            show = true;
        } else if (group === 'KINDERGARTEN') {
            show = g.startsWith('อ.');
        } else if (group === 'PRIMARY_LOWER') {
            show = ['ป.1', 'ป.2', 'ป.3'].includes(g);
        } else if (group === 'PRIMARY_UPPER') {
            show = ['ป.4', 'ป.5', 'ป.6'].includes(g);
        } else if (group === 'SECONDARY') {
            show = ['ม.1', 'ม.2', 'ม.3'].includes(g);
        }

        item.style.display = show ? 'flex' : 'none';
    });
}

// ==========================================
// 3. Edit Student Modal Handlers
// ==========================================
function openEditStudentModal(data) {
    document.getElementById('editStuId').value = data.id || '';
    document.getElementById('editStuPrefix').value = data.prefix || 'เด็กชาย';
    document.getElementById('editStuFirst').value = data.first_name || '';
    document.getElementById('editStuLast').value = data.last_name || '';
    document.getElementById('editStuGender').value = data.gender || 'MALE';
    document.getElementById('editStuGrade').value = data.grade || 'ป.4';
    document.getElementById('editStuCode').value = data.student_code || '';
    
    document.getElementById('editStudentModal').classList.remove('hidden');
}

function closeEditStudentModal() {
    document.getElementById('editStudentModal').classList.add('hidden');
}

// ==========================================
// 4. Coach Management & Multi-Select Handlers
// ==========================================
function setCoachAddMode(mode) {
    const singleForm = document.getElementById('coachSingleForm');
    const batchForm = document.getElementById('coachBatchForm');
    const btnSingle = document.getElementById('btnCoachModeSingle');
    const btnBatch = document.getElementById('btnCoachModeBatch');

    if (mode === 'batch') {
        singleForm?.classList.add('hidden');
        batchForm?.classList.remove('hidden');
        if (btnBatch) btnBatch.className = 'px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 text-white shadow-xs transition cursor-pointer';
        if (btnSingle) btnSingle.className = 'px-3.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer';
    } else {
        batchForm?.classList.add('hidden');
        singleForm?.classList.remove('hidden');
        if (btnSingle) btnSingle.className = 'px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 text-white shadow-xs transition cursor-pointer';
        if (btnBatch) btnBatch.className = 'px-3.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer';
    }
}

function selectAllCoaches(checked) {
    const cbs = document.querySelectorAll('.reg-coach-checkbox');
    cbs.forEach(cb => {
        cb.checked = checked;
    });
    updateRegCoachCount();
}

function updateRegCoachCount() {
    const checkedCount = document.querySelectorAll('.reg-coach-checkbox:checked').length;
    const countEl = document.getElementById('regCoachCount');
    if (countEl) countEl.innerText = checkedCount;
}

function openEditCoachModal(data) {
    document.getElementById('editCoachId').value = data.id || '';
    document.getElementById('editCoachPrefix').value = data.prefix || 'นาย';
    document.getElementById('editCoachFirst').value = data.first_name || '';
    document.getElementById('editCoachLast').value = data.last_name || '';
    document.getElementById('editCoachPosition').value = data.position || 'ครูผู้ฝึกสอน';
    document.getElementById('editCoachPhone').value = data.phone || '';

    document.getElementById('editCoachModal').classList.remove('hidden');
}

function closeEditCoachModal() {
    document.getElementById('editCoachModal').classList.add('hidden');
}

// ==========================================
// 5. Athlete & Coach Management Modal Handlers
// ==========================================
function selectAllModalCoaches(checked) {
    const cbs = document.querySelectorAll('.modal-reg-coach-cb');
    cbs.forEach(cb => {
        cb.checked = checked;
    });
    updateModalCoachCount();
}

function updateModalCoachCount() {
    const checkedCount = document.querySelectorAll('.modal-reg-coach-cb:checked').length;
    const countEl = document.getElementById('modalSelectedCoachesCount');
    if (countEl) countEl.innerText = checkedCount;
}

function openAddCoachModalInline() {
    closeAthleteModal();
    switchTab('coaches');
    const singleBtn = document.getElementById('btnCoachModeSingle');
    if (singleBtn) singleBtn.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openAddStudentModalInline() {
    closeAthleteModal();
    switchTab('students');
    const singleBtn = document.getElementById('btnStudentModeSingle');
    if (singleBtn) singleBtn.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openAthleteModal(data) {
    document.getElementById('modalSportIcon').innerText = data.sport_icon || '🏅';
    document.getElementById('modalSportName').innerText = data.sport_name || '';
    const codeEl = document.getElementById('modalEventCode');
    if (codeEl) codeEl.innerText = data.event_code || '';
    document.getElementById('modalEventName').innerText = data.event_name || '';
    document.getElementById('modalCoachRegId').value = data.id || '';
    document.getElementById('modalAddAthleteRegId').value = data.id || '';

    // ซิงค์รายชื่อครูที่ถูกเลือกไว้
    const selectedCoaches = Array.isArray(data.coach_ids) && data.coach_ids.length > 0 
        ? data.coach_ids 
        : (data.coach_id ? [data.coach_id] : []);

    const coachCheckboxes = document.querySelectorAll('.modal-reg-coach-cb');
    coachCheckboxes.forEach(cb => {
        cb.checked = selectedCoaches.includes(cb.value);
    });
    updateModalCoachCount();

    // รายชื่อนักกีฬาในทีม
    const athletes = data.athletes || [];
    document.getElementById('modalAthletesCount').innerText = athletes.length;

    const listEl = document.getElementById('modalAthletesList');
    if (athletes.length === 0) {
        listEl.innerHTML = '<div class="p-6 text-center text-slate-400">ยังไม่มีรายชื่อนักกีฬาในทีมรายการนี้ กรุณาเลือกนักเรียนด้านบนเพื่อเพิ่มเข้าทีม</div>';
    } else {
        let html = '';
        athletes.forEach((ath, idx) => {
            html += `
                <div class="p-3 px-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            ${idx + 1}
                        </span>
                        <div>
                            <span class="font-bold text-slate-800">${escapeHtml(ath.prefix + ath.first_name + ' ' + ath.last_name)}</span>
                            <span class="text-[11px] text-slate-400 ml-2">${escapeHtml(ath.grade || '')} (${ath.gender === 'MALE' ? 'ชาย' : 'หญิง'})</span>
                        </div>
                    </div>
                    <form method="POST" onsubmit="return confirm('ยืนยันถอด ${escapeHtml(ath.first_name)} ออกจากรายการแข่งขันนี้?')" class="inline">
                        <input type="hidden" name="action_manage_reg" value="remove_athlete">
                        <input type="hidden" name="reg_id" value="${escapeHtml(data.id)}">
                        <input type="hidden" name="rs_id" value="${escapeHtml(ath.rs_id)}">
                        <button type="submit" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer">
                            ❌ ถอดออก
                        </button>
                    </form>
                </div>
            `;
        });
        listEl.innerHTML = html;
    }

    document.getElementById('athleteManageModal').classList.remove('hidden');
}

function closeAthleteModal() {
    document.getElementById('athleteManageModal').classList.add('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function downloadSchoolCertificateGroup(urls){urls.forEach((u,i)=>setTimeout(()=>{const x=document.createElement('a');x.href=u;x.target='_blank';x.rel='noopener';document.body.appendChild(x);x.click();x.remove()},i*700))}document.addEventListener('DOMContentLoaded',()=>{const groups={};document.querySelectorAll('.cert-card').forEach(c=>{const k=c.dataset.event||c.dataset.eventName;const u=c.dataset.driveUrl;if(!groups[k])groups[k]={name:c.dataset.eventName,urls:[]};if(u)groups[k].urls.push(u)});const box=document.getElementById('certificateGroupDownloads');if(box)Object.values(groups).forEach(g=>{if(!g.urls.length)return;const q=[...new Set(g.urls)];const btn=document.createElement('button');btn.type='button';btn.className='p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-xs font-bold text-emerald-800';btn.textContent='📦 ดาวน์โหลดรวม '+g.name+' ('+q.length+' PDF)';btn.onclick=()=>downloadSchoolCertificateGroup(q);box.appendChild(btn)})});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
