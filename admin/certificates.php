<?php
/**
 * ==============================================================================
 * ไฟล์: admin/certificates.php
 * คำอธิบาย: ระบบจัดการและออกเกียรติบัตร (Certificates Management & E-Certificate)
 *            - รายการที่รอออกเกียรติบัตร (Pending Events)
 *            - รายการที่ออกเกียรติบัตรแล้ว (Issued Events)
 *            - ตรวจสอบ แก้ไข และลบเกียรติบัตรรายฉบับ / รายรายการ
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

requireRole(['SUPER_ADMIN', 'ADMIN']);
$pdo = Database::getConnection();
$message = '';
$error = '';

// ตรวจสอบและอัปเดตคอลัมน์ google_slide_template_id และ slide_url ในตาราง certificates อย่างแม่นยำ
$hasSlideCols = false;
try {
    // 1. ตรวจสอบว่ามีคอลัมน์อยู่แล้วหรือไม่
    $colCheck = $pdo->query("SHOW COLUMNS FROM `certificates` LIKE 'google_slide_template_id'")->fetch();
    if (!empty($colCheck)) {
        $hasSlideCols = true;
    } else {
        // 2. ถ้ายังไม่มี ให้ลอง ALTER TABLE เพิ่มคอลัมน์
        try {
            @$pdo->exec("ALTER TABLE `certificates` ADD COLUMN `google_slide_template_id` VARCHAR(255) NULL AFTER `template_type`");
            @$pdo->exec("ALTER TABLE `certificates` ADD COLUMN `slide_url` VARCHAR(500) NULL AFTER `google_slide_template_id`");
        } catch (Throwable $eIgnore) {
            // โฮสติ้งอาจจำกัดสิทธิ์ ALTER TABLE ในช่วงรันสคริปต์ปกติ
        }

        // 3. ตรวจสอบซ้ำอีกครั้งว่าคอลัมน์ถูกสร้างขึ้นจริงหรือไม่ (ห้ามเดาว่าสำเร็จ)
        $colCheckAgain = $pdo->query("SHOW COLUMNS FROM `certificates` LIKE 'google_slide_template_id'")->fetch();
        $hasSlideCols = !empty($colCheckAgain);
    }
} catch (Throwable $e) {
    $hasSlideCols = false;
}

/**
 * ฟังก์ชันช่วยบันทึกข้อมูลเกียรติบัตรอย่างปลอดภัยสูงสุด 
 * (มี Auto-Fallback: หากฐานข้อมูลยังไม่มีคอลัมน์ google_slide_template_id ระบบจะสลับไปบันทึกแบบมาตรฐานทันทีโดยไม่เกิด Error)
 */
function insertCertificateRecord(
    PDO $pdo,
    bool &$hasSlideCols,
    string $id,
    string $compId,
    string $certNo,
    string $recipientType,
    string $recipientId,
    string $recipientName,
    string $schoolId,
    string $schoolName,
    string $eventId,
    string $eventName,
    string $sportName,
    string $resultId,
    string $award,
    string $medal,
    string $templateType,
    ?string $slideTpl,
    ?string $slideUrl,
    string $qrToken,
    string $status = 'ISSUED'
) {
    if ($hasSlideCols) {
        try {
            $ins = $pdo->prepare("
                INSERT INTO certificates (
                    id, competition_id, certificate_no, recipient_type, recipient_id, recipient_name,
                    school_id, school_name, event_id, event_name, sport_name, result_id,
                    award, medal, issue_date, template_type, google_slide_template_id, slide_url, qr_token, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)
            ");
            $success = $ins->execute([
                $id, $compId, $certNo, $recipientType, $recipientId, $recipientName,
                $schoolId, $schoolName, $eventId, $eventName, $sportName, $resultId,
                $award, $medal, $templateType, $slideTpl, $slideUrl, $qrToken, $status
            ]);
            if ($success) {
                return true;
            }
            // หาก execute ล้มเหลวและเกิดจากคอลัมน์ไม่มี
            $errInfo = $ins->errorInfo();
            if (isset($errInfo[1]) && ($errInfo[1] == 1054 || strpos($errInfo[2] ?? '', 'google_slide_template_id') !== false)) {
                $hasSlideCols = false;
            }
        } catch (Throwable $e) {
            $err = $e->getMessage();
            if (strpos($err, '42S22') !== false || strpos($err, '1054') !== false || strpos($err, 'google_slide_template_id') !== false) {
                // หากไม่มีคอลัมน์ google_slide_template_id ให้ปิด flag ทันที แล้วข้ามไปรันคำสั่งมาตรฐานด้านล่าง
                $hasSlideCols = false;
            } else {
                throw $e;
            }
        }
    }

    // Fallback ปลอดภัย 100%: บันทึกข้อมูลเฉพาะฟิลด์มาตรฐานที่มีอยู่ในทุกเวอร์ชันของตาราง certificates
    $ins = $pdo->prepare("
        INSERT INTO certificates (
            id, competition_id, certificate_no, recipient_type, recipient_id, recipient_name,
            school_id, school_name, event_id, event_name, sport_name, result_id,
            award, medal, issue_date, template_type, qr_token, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?)
    ");
    return $ins->execute([
        $id, $compId, $certNo, $recipientType, $recipientId, $recipientName,
        $schoolId, $schoolName, $eventId, $eventName, $sportName, $resultId,
        $award, $medal, $templateType, $qrToken, $status
    ]);
}

$comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch();
$compId = $comp['id'] ?? 'comp-2026';
$certPrefix = $comp['cert_prefix'] ?? 'สพป.บร.3/2569-';
$studentSlideTpl = $comp['google_slide_template_student_id'] ?? $comp['google_slide_template_id'] ?? '';
$coachSlideTpl = $comp['google_slide_template_coach_id'] ?? $comp['google_slide_template_id'] ?? '';
$studentSlideUrl = !empty($studentSlideTpl) ? "https://docs.google.com/presentation/d/{$studentSlideTpl}/edit" : null;
$coachSlideUrl = !empty($coachSlideTpl) ? "https://docs.google.com/presentation/d/{$coachSlideTpl}/edit" : null;

/**
 * ตรวจสอบคอลัมน์สำหรับเก็บไฟล์ PDF ที่ Google Drive สร้างขึ้น
 */
function ensureGoogleDriveColumns(PDO $pdo): bool {
    try {
        $driveFile = $pdo->query("SHOW COLUMNS FROM certificates LIKE 'drive_file_id'")->fetch();
        $driveUrl = $pdo->query("SHOW COLUMNS FROM certificates LIKE 'drive_url'")->fetch();
        if (!$driveFile) $pdo->exec("ALTER TABLE certificates ADD COLUMN drive_file_id VARCHAR(255) NULL");
        if (!$driveUrl) $pdo->exec("ALTER TABLE certificates ADD COLUMN drive_url VARCHAR(500) NULL");
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/** จัดรูปแบบชื่อรายการสำหรับข้อความบนเกียรติบัตร: ตัดคำอังกฤษนำหน้าและวงเล็บเหลี่ยม */
function formatCertificateEventName(string $eventName): string {
    $formatted = trim($eventName);
    $formatted = preg_replace('/^[A-Za-z0-9 .,&'\/-]+(?=\p{Thai})/u', '', $formatted) ?? $formatted;
    $formatted = preg_replace('/\[([^\]]+)\]/u', ' $1', $formatted) ?? $formatted;
    return trim(preg_replace('/\s+/u', ' ', $formatted) ?? $formatted);
}

/** ส่งข้อมูลเกียรติบัตรไปยัง Google Apps Script และบันทึก PDF URL ที่ตอบกลับ */
function syncCertificateToGoogleDrive(PDO $pdo, array $certificate, array $competition): array {
    $endpoint = trim((string)($competition['google_apps_script_url'] ?? ''));
    $folderId = trim((string)($competition['google_drive_folder_id'] ?? ''));
    $templateId = trim((string)($certificate['google_slide_template_id'] ?? ''));
    if ($templateId === '') {
        $templateId = $certificate['recipient_type'] === 'COACH'
            ? trim((string)($competition['google_slide_template_coach_id'] ?? $competition['google_slide_template_id'] ?? ''))
            : trim((string)($competition['google_slide_template_student_id'] ?? $competition['google_slide_template_id'] ?? ''));
    }
    if ($endpoint === '' || $folderId === '' || $templateId === '') {
        return ['success' => false, 'message' => 'ยังตั้งค่า Google Apps Script, Drive Folder หรือ Google Slides Template ไม่ครบ'];
    }
    if (!function_exists('curl_init')) {
        return ['success' => false, 'message' => 'เซิร์ฟเวอร์ PHP ยังไม่ได้เปิดใช้งาน cURL'];
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $verifyUrl = $host !== '' ? $scheme . '://' . $host . '/verify.php?token=' . rawurlencode((string)$certificate['qr_token']) : '';
    $payload = [
        'action' => 'GENERATE_CERTIFICATE',
        'folder_id' => $folderId,
        'template_id' => $templateId,
        'recipient_type' => $certificate['recipient_type'],
        'certificate_no' => $certificate['certificate_no'],
        'recipient_name' => $certificate['recipient_name'],
        'school_name' => $certificate['school_name'],
        'award' => $certificate['award'],
        'event_name' => formatCertificateEventName((string)$certificate['event_name']),
        'sport_name' => $certificate['sport_name'],
        'academic_year' => $competition['academic_year'] ?? $competition['year'] ?? '',
        'issue_date' => $certificate['issue_date'],
        'president_name' => $competition['president_name'] ?? '',
        'director_name' => $competition['director_name'] ?? '',
        'verify_url' => $verifyUrl
    ];

    $curl = curl_init($endpoint);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Content-Type: text/plain; charset=utf-8'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 60
    ]);
    $raw = curl_exec($curl);
    $httpCode = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);
    $result = is_string($raw) ? json_decode($raw, true) : null;
    $driveFileId = is_array($result) ? (string)($result['drive_file_id'] ?? $result['file_id'] ?? $result['id'] ?? '') : '';
    $pdfUrl = is_array($result) ? (string)($result['pdf_url'] ?? $result['download_url'] ?? $result['drive_url'] ?? $result['pdfUrl'] ?? $result['downloadUrl'] ?? '') : '';
    if ($pdfUrl === '' && $driveFileId !== '') $pdfUrl = 'https://drive.google.com/file/d/' . rawurlencode($driveFileId) . '/view';
    if ($raw === false || !is_array($result) || ($result['status'] ?? '') !== 'SUCCESS' || $driveFileId === '' || $pdfUrl === '') {
        $detail = is_array($result) ? (string)($result['message'] ?? '') : '';
        if ($detail === '') $detail = $curlError ?: ('Google Apps Script ตอบกลับไม่สำเร็จ (HTTP ' . $httpCode . ')');
        return ['success' => false, 'message' => $detail];
    }

    $update = $pdo->prepare("UPDATE certificates SET drive_file_id = ?, drive_url = ?, google_slide_template_id = ?, slide_url = ? WHERE id = ?");
    $update->execute([
        $driveFileId,
        $pdfUrl,
        $templateId,
        'https://docs.google.com/presentation/d/' . $templateId . '/edit',
        $certificate['id']
    ]);
    return ['success' => true, 'message' => 'บันทึก PDF ลง Google Drive สำเร็จ'];
}

/** ซิงค์เฉพาะเกียรติบัตรที่ยังไม่มีลิงก์ PDF บน Google Drive */
function syncPendingCertificatesToGoogleDrive(PDO $pdo, array $competition, ?string $eventId = null): array {
    if (!ensureGoogleDriveColumns($pdo)) return ['success' => 0, 'failed' => 0, 'message' => 'ไม่สามารถสร้างคอลัมน์ Google Drive ในฐานข้อมูลได้'];
    $sql = "SELECT * FROM certificates WHERE (drive_url IS NULL OR drive_url = '')";
    $params = [];
    if ($eventId) { $sql .= " AND event_id = ?"; $params[] = $eventId; }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $success = 0; $failed = 0; $lastError = '';
    foreach ($stmt->fetchAll() as $certificate) {
        $sync = syncCertificateToGoogleDrive($pdo, $certificate, $competition);
        if ($sync['success']) $success++; else { $failed++; $lastError = $sync['message']; }
    }
    return ['success' => $success, 'failed' => $failed, 'message' => $lastError];
}

/**
 * ฟังก์ชันช่วยออกเกียรติบัตรแบบกลุ่มจากผลการแข่งขัน
 */
function batchGenerateCertificatesHelper(
    PDO $pdo,
    bool &$hasSlideCols,
    string $compId,
    string $certPrefix,
    ?string $studentSlideTpl,
    ?string $studentSlideUrl,
    ?string $coachSlideTpl,
    ?string $coachSlideUrl,
    ?string $targetEventId = null
): array {
    $whereSql = "WHERE 1=1";
    $queryParams = [];
    if ($targetEventId) {
        $whereSql .= " AND r.event_id = ?";
        $queryParams[] = $targetEventId;
    }

    $query = "
        SELECT r.*, e.event_name, sp.sport_name, sch.school_name, sch.school_code
        FROM results r
        JOIN events e ON r.event_id = e.id
        JOIN sports sp ON e.sport_id = sp.id
        JOIN schools sch ON r.school_id = sch.id
        $whereSql
        ORDER BY e.event_code ASC, r.rank ASC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($queryParams);
    $results = $stmt->fetchAll();

    if (empty($results)) {
        return ['newCount' => 0, 'skippedCount' => 0, 'totalResults' => 0];
    }

    $currentCount = (int)$pdo->query("SELECT COUNT(*) FROM certificates")->fetchColumn();
    $newCount = 0;
    $skippedCount = 0;

    foreach ($results as $res) {
        $evId = $res['event_id'];
        $schId = $res['school_id'];
        $schName = $res['school_name'];
        $evName = $res['event_name'];
        $spName = $res['sport_name'];
        $resId = $res['id'];
        $award = $res['award'];
        $medal = $res['medal'];

        // ค้นหาข้อมูลการลงทะเบียนของโรงเรียนในรายการนี้
        $regStmt = $pdo->prepare("SELECT id, coach_id, secondary_coach_id, coach_ids FROM registrations WHERE event_id = ? AND school_id = ?");
        $regStmt->execute([$evId, $schId]);
        $reg = $regStmt->fetch();

        // --------------------------------------------------
        // 1. ดึงรายชื่อนักเรียน
        // --------------------------------------------------
        $studentList = [];
        if ($reg) {
            $stStmt = $pdo->prepare("
                SELECT s.* FROM students s
                JOIN registration_students rs ON s.id = rs.student_id
                WHERE rs.registration_id = ?
            ");
            $stStmt->execute([$reg['id']]);
            $studentList = $stStmt->fetchAll();
        }

        // Fallback A: หากไม่ได้ระบุนักเรียนในใบสมัคร ให้ดึงนักเรียนของโรงเรียนนี้
        if (empty($studentList)) {
            $fallbackSt = $pdo->prepare("SELECT * FROM students WHERE school_id = ? LIMIT 5");
            $fallbackSt->execute([$schId]);
            $studentList = $fallbackSt->fetchAll();
        }

        if (!empty($studentList)) {
            foreach ($studentList as $st) {
                $fullName = trim(($st['prefix'] ?? '') . $st['first_name'] . ' ' . $st['last_name']);
                
                // ตรวจสอบว่าเคยออกเกียรติบัตรให้นักเรียนคนนี้ในผลนี้แล้วหรือยัง
                $chk = $pdo->prepare("SELECT id FROM certificates WHERE event_id = ? AND recipient_id = ? AND recipient_type = 'STUDENT'");
                $chk->execute([$evId, $st['id']]);
                if ($chk->fetch()) {
                    $skippedCount++;
                    continue;
                }

                $currentCount++;
                $certNo = $certPrefix . str_pad($currentCount, 5, '0', STR_PAD_LEFT);
                $qrToken = bin2hex(random_bytes(16));
                $newId = 'cert-' . uniqid();

                insertCertificateRecord(
                    $pdo, $hasSlideCols,
                    $newId, $compId, $certNo, 'STUDENT', $st['id'], $fullName,
                    $schId, $schName, $evId, $evName, $spName,
                    $resId, $award, $medal, 'STUDENT', $studentSlideTpl, $studentSlideUrl, $qrToken, 'ISSUED'
                );
                $newCount++;
            }
        } else {
            // Fallback B: กรณีไม่มีรายชื่อนักเรียนรายบุคคลเลย ออกเกียรติบัตรให้ทีมโรงเรียน
            $chkTeam = $pdo->prepare("SELECT id FROM certificates WHERE event_id = ? AND school_id = ? AND recipient_type = 'STUDENT'");
            $chkTeam->execute([$evId, $schId]);
            if (!$chkTeam->fetch()) {
                $currentCount++;
                $certNo = $certPrefix . str_pad($currentCount, 5, '0', STR_PAD_LEFT);
                $qrToken = bin2hex(random_bytes(16));
                $newId = 'cert-' . uniqid();
                $teamName = 'ตัวแทนนักกีฬาโรงเรียน' . $schName;

                insertCertificateRecord(
                    $pdo, $hasSlideCols,
                    $newId, $compId, $certNo, 'STUDENT', $schId, $teamName,
                    $schId, $schName, $evId, $evName, $spName,
                    $resId, $award, $medal, 'STUDENT', $studentSlideTpl, $studentSlideUrl, $qrToken, 'ISSUED'
                );
                $newCount++;
            } else {
                $skippedCount++;
            }
        }

        // --------------------------------------------------
        // 2. ดึงรายชื่อครูผู้ฝึกสอน
        // --------------------------------------------------
        $targetCoachIds = [];
        if ($reg) {
            try {
                $rcStmt = $pdo->prepare("SELECT coach_id FROM registration_coaches WHERE registration_id = ?");
                $rcStmt->execute([$reg['id']]);
                $targetCoachIds = $rcStmt->fetchAll(PDO::FETCH_COLUMN);
            } catch (Exception $e) {
                $targetCoachIds = [];
            }

            if (!empty($reg['coach_ids'])) {
                $cDecoded = json_decode($reg['coach_ids'], true);
                if (is_array($cDecoded)) {
                    $targetCoachIds = array_merge($targetCoachIds, $cDecoded);
                }
            }
            if (!empty($reg['coach_id'])) $targetCoachIds[] = $reg['coach_id'];
            if (!empty($reg['secondary_coach_id'])) $targetCoachIds[] = $reg['secondary_coach_id'];
        }

        $targetCoachIds = array_unique(array_filter($targetCoachIds));

        // Fallback A: หาโค้ชที่สังกัดโรงเรียนนี้
        if (empty($targetCoachIds)) {
            $cSchStmt = $pdo->prepare("SELECT id FROM coaches WHERE school_id = ? LIMIT 2");
            $cSchStmt->execute([$schId]);
            $targetCoachIds = $cSchStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        if (!empty($targetCoachIds)) {
            foreach ($targetCoachIds as $cId) {
                $cStmt = $pdo->prepare("SELECT * FROM coaches WHERE id = ?");
                $cStmt->execute([$cId]);
                $coach = $cStmt->fetch();
                if ($coach) {
                    $coachName = trim(($coach['prefix'] ?? '') . $coach['first_name'] . ' ' . $coach['last_name']);
                    
                    $chk = $pdo->prepare("SELECT id FROM certificates WHERE event_id = ? AND recipient_id = ? AND recipient_type = 'COACH'");
                    $chk->execute([$evId, $coach['id']]);
                    if ($chk->fetch()) {
                        $skippedCount++;
                        continue;
                    }

                    $currentCount++;
                    $certNo = $certPrefix . str_pad($currentCount, 5, '0', STR_PAD_LEFT);
                    $qrToken = bin2hex(random_bytes(16));
                    $newId = 'cert-' . uniqid();

                    insertCertificateRecord(
                        $pdo, $hasSlideCols,
                        $newId, $compId, $certNo, 'COACH', $coach['id'], $coachName,
                        $schId, $schName, $evId, $evName, $spName,
                        $resId, 'ครูผู้ฝึกสอน - ' . $award, $medal, 'COACH', $coachSlideTpl, $coachSlideUrl, $qrToken, 'ISSUED'
                    );
                    $newCount++;
                }
            }
        } else {
            // Fallback B: ออกเกียรติบัตรครูผู้ฝึกสอนประจำโรงเรียน
            $chkCoachTeam = $pdo->prepare("SELECT id FROM certificates WHERE event_id = ? AND school_id = ? AND recipient_type = 'COACH'");
            $chkCoachTeam->execute([$evId, $schId]);
            if (!$chkCoachTeam->fetch()) {
                $currentCount++;
                $certNo = $certPrefix . str_pad($currentCount, 5, '0', STR_PAD_LEFT);
                $qrToken = bin2hex(random_bytes(16));
                $newId = 'cert-' . uniqid();
                $coachSchoolName = 'ครูผู้ฝึกสอนโรงเรียน' . $schName;

                insertCertificateRecord(
                    $pdo, $hasSlideCols,
                    $newId, $compId, $certNo, 'COACH', $schId, $coachSchoolName,
                    $schId, $schName, $evId, $evName, $spName,
                    $resId, 'ครูผู้ฝึกสอน - ' . $award, $medal, 'COACH', $coachSlideTpl, $coachSlideUrl, $qrToken, 'ISSUED'
                );
                $newCount++;
            } else {
                $skippedCount++;
            }
        }
    }

    return ['newCount' => $newCount, 'skippedCount' => $skippedCount, 'totalResults' => count($results)];
}

// -------------------------------------------------------------
// 0. ผูกและนำ ID จาก Google นำเสนอมาสร้างและอัปเดตเกียรติบัตรทั้งหมด
// -------------------------------------------------------------
if (isset($_POST['migrate_slide_columns'])) {
    try {
        $pdo->exec("ALTER TABLE `certificates` ADD COLUMN `google_slide_template_id` VARCHAR(255) NULL AFTER `template_type`");
        $pdo->exec("ALTER TABLE `certificates` ADD COLUMN `slide_url` VARCHAR(500) NULL AFTER `google_slide_template_id`");
        $hasSlideCols = true;
        $message = "เพิ่มคอลัมน์ google_slide_template_id และ slide_url ในตาราง certificates สำเร็จแล้ว!";
    } catch (Exception $e) {
        $error = "ไม่สามารถรันคำสั่งแก้ไขตารางอัตโนมัติได้: " . $e->getMessage() . " (กรุณารันคำสั่ง SQL ผ่าน phpMyAdmin หรือเปิดไฟล์ update_database.php)";
    }
}

if (isset($_POST['apply_google_slides_to_all'])) {
    // 1. ตรวจสอบและพยายามสร้างคอลัมน์อัตโนมัติหากยังไม่มี
    if (!$hasSlideCols) {
        try {
            $pdo->exec("ALTER TABLE `certificates` ADD COLUMN `google_slide_template_id` VARCHAR(255) NULL AFTER `template_type`");
            $pdo->exec("ALTER TABLE `certificates` ADD COLUMN `slide_url` VARCHAR(500) NULL AFTER `google_slide_template_id`");
            $hasSlideCols = true;
        } catch (Throwable $eIgnore) {}
    }

    try {
        // 2. ออกเกียรติบัตรสำหรับผลการแข่งขันที่ยังรออยู่ทั้งหมดโดยอัตโนมัติ (Batch Generate Pending Results)
        $genRes = batchGenerateCertificatesHelper($pdo, $hasSlideCols, $compId, $certPrefix, $studentSlideTpl, $studentSlideUrl, $coachSlideTpl, $coachSlideUrl);
        $newCreated = $genRes['newCount'];

        // 3. ผูก ID แม่แบบ Google Slides ปัจจุบันให้กับเกียรติบัตรทั้งหมดในระบบ
        if ($hasSlideCols) {
            $upSt = $pdo->prepare("UPDATE certificates SET google_slide_template_id = ?, slide_url = ? WHERE recipient_type = 'STUDENT'");
            $upSt->execute([$studentSlideTpl, $studentSlideUrl]);

            $upCo = $pdo->prepare("UPDATE certificates SET google_slide_template_id = ?, slide_url = ? WHERE recipient_type = 'COACH'");
            $upCo->execute([$coachSlideTpl, $coachSlideUrl]);
        }

        $totalAfter = (int)$pdo->query("SELECT COUNT(*) FROM certificates")->fetchColumn();
        logActivity('APPLY_GOOGLE_SLIDES', 'CERTIFICATES', "นำ ID Google นำเสนอมาสร้างและผูกกับเกียรติบัตรทั้งหมด (นักเรียน: $studentSlideTpl, ครู: $coachSlideTpl, สร้างใหม่ $newCreated, รวม $totalAfter ฉบับ)");
        $message = "🎉 ดำเนินการสำเร็จ! นำ ID จาก Google นำเสนอ (นักเรียน: " . ($studentSlideTpl ?: '-') . ", ครู: " . ($coachSlideTpl ?: '-') . ") มาสร้างและผูกกับเกียรติบัตรทั้งหมดเรียบร้อยแล้ว! (สร้างเกียรติบัตรใหม่ $newCreated ฉบับ, ผูก ID ให้เกียรติบัตรทั้งหมดรวม $totalAfter ฉบับ)";
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาด: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// 1. ลบเกียรติบัตรรายฉบับ (Delete Single Certificate)
// -------------------------------------------------------------
if (isset($_POST['delete_cert_id']) || (isset($_GET['action']) && $_GET['action'] === 'delete' && !empty($_GET['cert_id']))) {
    $delId = $_POST['delete_cert_id'] ?? $_GET['cert_id'];
    try {
        $stmt = $pdo->prepare("SELECT certificate_no, recipient_name FROM certificates WHERE id = ?");
        $stmt->execute([$delId]);
        $targetCert = $stmt->fetch();

        $delStmt = $pdo->prepare("DELETE FROM certificates WHERE id = ?");
        $delStmt->execute([$delId]);
        logActivity('DELETE_CERTIFICATE', 'CERTIFICATES', "ลบเกียรติบัตร: " . ($targetCert['recipient_name'] ?? $delId) . " (" . ($targetCert['certificate_no'] ?? '') . ")");
        $message = "ลบเกียรติบัตรเลขที่ " . htmlspecialchars($targetCert['certificate_no'] ?? '') . " เรียบร้อยแล้ว!";
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาดในการลบเกียรติบัตร: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// 2. ลบเกียรติบัตรทั้งหมดของรายการแข่งขัน (Delete Event Certificates)
// -------------------------------------------------------------
if (isset($_POST['delete_event_certs']) || (isset($_GET['action']) && $_GET['action'] === 'delete_event' && !empty($_GET['event_id']))) {
    $delEventId = $_POST['event_id'] ?? $_GET['event_id'];
    try {
        $evStmt = $pdo->prepare("SELECT event_name FROM events WHERE id = ?");
        $evStmt->execute([$delEventId]);
        $evName = $evStmt->fetchColumn() ?: $delEventId;

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM certificates WHERE event_id = ?");
        $countStmt->execute([$delEventId]);
        $cCount = $countStmt->fetchColumn();

        $pdo->prepare("DELETE FROM certificates WHERE event_id = ?")->execute([$delEventId]);
        logActivity('DELETE_EVENT_CERTS', 'CERTIFICATES', "ลบเกียรติบัตรทั้งหมดของรายการ: $evName จำนวน $cCount ฉบับ");
        $message = "ลบเกียรติบัตรของรายการ \"$evName\" จำนวน $cCount ฉบับเรียบร้อยแล้ว ท่านสามารถกดออกใหม่ได้ทันที";
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาดในการลบเกียรติบัตรของรายการ: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// 3. แก้ไขข้อมูลเกียรติบัตร (Edit Certificate)
// -------------------------------------------------------------
if (isset($_POST['save_edit_cert'])) {
    $editId = trim($_POST['cert_id'] ?? '');
    $editNo = trim($_POST['certificate_no'] ?? '');
    $editName = trim($_POST['recipient_name'] ?? '');
    $editSchool = trim($_POST['school_name'] ?? '');
    $editAward = trim($_POST['award'] ?? '');
    $editMedal = trim($_POST['medal'] ?? 'GOLD');
    $editIssueDate = trim($_POST['issue_date'] ?? date('Y-m-d'));
    $editType = trim($_POST['recipient_type'] ?? 'STUDENT');

    if ($editId && $editName && $editNo) {
        try {
            $stmt = $pdo->prepare("
                UPDATE certificates 
                SET certificate_no = ?, recipient_name = ?, school_name = ?, 
                    award = ?, medal = ?, issue_date = ?, recipient_type = ?
                WHERE id = ?
            ");
            $stmt->execute([$editNo, $editName, $editSchool, $editAward, $editMedal, $editIssueDate, $editType, $editId]);
            logActivity('EDIT_CERTIFICATE', 'CERTIFICATES', "แก้ไขเกียรติบัตร: $editName ($editNo)");
            $message = "แก้ไขข้อมูลเกียรติบัตรเลขที่ \"$editNo\" เรียบร้อยแล้ว!";
        } catch (Exception $e) {
            $error = "เกิดข้อผิดพลาดในการแก้ไขเกียรติบัตร: " . $e->getMessage();
        }
    } else {
        $error = "กรุณากรอกข้อมูลเลขที่เกียรติบัตรและชื่อผู้ได้รับให้ครบถ้วน";
    }
}

// -------------------------------------------------------------
// 4. ออกเกียรติบัตรจากผลการแข่งขัน (Generate Certificates - Batch or Per Event)
// -------------------------------------------------------------
if (isset($_POST['generate_from_results']) || isset($_POST['generate_single_event'])) {
    $targetEventId = isset($_POST['generate_single_event']) ? trim($_POST['event_id'] ?? '') : null;

    try {
        $genRes = batchGenerateCertificatesHelper($pdo, $hasSlideCols, $compId, $certPrefix, $studentSlideTpl, $studentSlideUrl, $coachSlideTpl, $coachSlideUrl, $targetEventId);
        $newCount = $genRes['newCount'];
        $skippedCount = $genRes['skippedCount'];
        $driveSync = syncPendingCertificatesToGoogleDrive($pdo, $comp, $targetEventId ?: null);

        if ($genRes['totalResults'] === 0) {
            $error = "ไม่พบรายการผลการแข่งขันที่บันทึกไว้ในระบบ กรุณาบันทึกผลการแข่งขันในเมนู \"ประกาศผลการแข่งขัน\" ก่อน";
        } else {
            logActivity('GENERATE_CERTS', 'CERTIFICATES', "ประมวลผลออกเกียรติบัตร: สร้างใหม่ $newCount ฉบับ (เคยมีแล้ว $skippedCount ฉบับ)");
            if ($newCount > 0) {
                $message = "🎉 ประมวลผลและสร้างเลขที่เกียรติบัตรใหม่สำเร็จ $newCount ฉบับ! ซิงค์ PDF ลง Google Drive สำเร็จ {$driveSync['success']} ฉบับ" . ($driveSync['failed'] > 0 ? " (ไม่สำเร็จ {$driveSync['failed']} ฉบับ: {$driveSync['message']})" : '') . " (มีอยู่เดิมแล้ว $skippedCount ฉบับ)";
            } else {
                $message = "ℹ️ รายการนี้ได้เคยออกเกียรติบัตรไปครบถ้วนแล้วทั้งหมด ($skippedCount ฉบับ) ไม่มีรายการตกค้าง!";
            }
        }
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาดในการสร้างเกียรติบัตร: " . $e->getMessage();
    }
}

// -------------------------------------------------------------
// 5. ดึงข้อมูลภาพรวม: รายการที่รอออกเกียรติบัตร vs รายการที่ออกเกียรติบัตรแล้ว
// -------------------------------------------------------------
$allEventsWithResults = $pdo->query("
    SELECT e.id as event_id, e.event_name, e.event_code, e.age_group, sp.sport_name, sp.sport_icon,
           COUNT(DISTINCT r.id) as result_count,
           COUNT(DISTINCT c.id) as cert_count,
           SUM(CASE WHEN c.recipient_type = 'STUDENT' THEN 1 ELSE 0 END) as student_cert_count,
           SUM(CASE WHEN c.recipient_type = 'COACH' THEN 1 ELSE 0 END) as coach_cert_count,
           MAX(c.created_at) as last_cert_at,
           MAX(CASE WHEN r.medal = 'GOLD' THEN sch.school_name END) as gold_school,
           MAX(CASE WHEN r.medal = 'SILVER' THEN sch.school_name END) as silver_school,
           MAX(CASE WHEN r.medal = 'BRONZE' THEN sch.school_name END) as bronze_school
    FROM events e
    JOIN sports sp ON e.sport_id = sp.id
    JOIN results r ON e.id = r.event_id
    JOIN schools sch ON r.school_id = sch.id
    LEFT JOIN certificates c ON e.id = c.event_id
    GROUP BY e.id, e.event_name, e.event_code, e.age_group, sp.sport_name, sp.sport_icon
    ORDER BY e.event_code ASC, e.event_name ASC
")->fetchAll();

$pendingEvents = [];
$completedEvents = [];

foreach ($allEventsWithResults as $ev) {
    if ($ev['cert_count'] == 0) {
        $pendingEvents[] = $ev;
    } else {
        $completedEvents[] = $ev;
    }
}

// -------------------------------------------------------------
// 6. ตัวกรองและค้นหาเกียรติบัตรทั้งหมด
// -------------------------------------------------------------
$search = trim($_GET['search'] ?? '');
$filterSchool = trim($_GET['school_id'] ?? '');
$filterEvent = trim($_GET['event_id'] ?? '');
$filterType = trim($_GET['recipient_type'] ?? '');

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
if ($filterEvent) {
    $sql .= " AND event_id = ?";
    $params[] = $filterEvent;
}
if ($filterType) {
    $sql .= " AND recipient_type = ?";
    $params[] = $filterType;
}
$sql .= " ORDER BY created_at DESC, certificate_no DESC LIMIT 200";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$certs = $stmt->fetchAll();

$schools = $pdo->query("SELECT id, school_name FROM schools ORDER BY school_name ASC")->fetchAll();
$totalCerts = $pdo->query("SELECT COUNT(*) FROM certificates")->fetchColumn();
$studentCertsCount = $pdo->query("SELECT COUNT(*) FROM certificates WHERE recipient_type = 'STUDENT'")->fetchColumn();
$coachCertsCount = $pdo->query("SELECT COUNT(*) FROM certificates WHERE recipient_type = 'COACH'")->fetchColumn();

$pageTitle = 'ระบบจัดการและออกเกียรติบัตร (E-Certificate) - Admin Console';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6">
    <!-- Header Banner -->
    <div class="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/30 text-amber-100 rounded-full text-xs font-semibold mb-2 border border-amber-400/30">
                <span>📜</span> Batch E-Certificate Engine (One Data, Many Uses)
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit">
                ระบบจัดการและออกเกียรติบัตรอิเล็กทรอนิกส์
            </h1>
            <p class="text-xs text-amber-100 mt-1 max-w-2xl leading-relaxed">
                ออกเกียรติบัตรพร้อมรหัส QR Code สำหรับสแกนตรวจสอบความถูกต้อง และสามารถแก้ไขหรือลบเกียรติบัตรได้ตลอดเวลา
            </p>
            <div class="flex flex-wrap items-center gap-4 mt-3 text-xs font-medium text-amber-200">
                <span>เกียรติบัตรในระบบ: <strong class="text-white font-mono"><?= number_format($totalCerts) ?></strong> ฉบับ</span>
                <span>&bull;</span>
                <span>🎒 นักเรียน: <strong class="text-white font-mono"><?= number_format($studentCertsCount) ?></strong></span>
                <span>&bull;</span>
                <span>👨‍🏫 ครูผู้ฝึกสอน: <strong class="text-white font-mono"><?= number_format($coachCertsCount) ?></strong></span>
            </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <form method="POST" onsubmit="return confirm('⚡ ระบบจะทำการออกเกียรติบัตรให้นักเรียนและครูผู้ฝึกสอนในทุกรายการที่ประกาศผลแล้ว ต้องการดำเนินการหรือไม่?')">
                <button type="submit" name="generate_from_results" class="w-full sm:w-auto px-5 py-3 bg-white hover:bg-amber-50 text-amber-950 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                    <span>⚡</span> ออกเกียรติบัตรทุกรายการที่รอ (Batch)
                </button>
            </form>
            <a href="/admin/settings.php" class="px-4 py-3 bg-amber-800/60 hover:bg-amber-800 text-amber-100 rounded-xl text-xs font-semibold border border-amber-500/30 transition flex items-center justify-center gap-1.5">
                <span>⚙️</span> ตั้งค่าแม่แบบ / Drive
            </a>
        </div>
    </div>

    <?php if ($message): ?>
        <div class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-2xl flex items-center gap-3 shadow-sm">
            <span class="text-lg">✅</span>
            <div class="font-medium"><?= htmlspecialchars($message) ?></div>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="p-4 bg-rose-50 border border-rose-300 text-rose-900 text-xs rounded-2xl flex items-center gap-3 shadow-sm">
            <span class="text-lg">❌</span>
            <div class="font-medium"><?= htmlspecialchars($error) ?></div>
        </div>
    <?php endif; ?>

    <?php if (!$hasSlideCols): ?>
        <div class="p-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div class="flex items-start gap-2.5">
                <span class="text-xl">💡</span>
                <div>
                    <span class="font-bold">ระบบเกียรติบัตรทำงานในโหมดมาตรฐาน (Safe Mode):</span>
                    <p class="text-amber-800 text-[11px] mt-0.5">
                        ตาราง <code class="bg-amber-200/60 px-1 py-0.5 rounded font-mono">certificates</code> ใน MySQL ยังไม่มีคอลัมน์ <code class="bg-amber-200/60 px-1 py-0.5 rounded font-mono">google_slide_template_id</code> ระบบจึงออกเกียรติบัตรด้วยฟิลด์มาตรฐานโดยไม่เกิดข้อผิดพลาด คุณสามารถคลิกปุ่มด้านขวาเพื่อเพิ่มคอลัมน์อัตโนมัติ หรือรันผ่าน phpMyAdmin: <code class="bg-white/80 px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[10px] select-all">ALTER TABLE `certificates` ADD `google_slide_template_id` VARCHAR(255) NULL, ADD `slide_url` VARCHAR(500) NULL;</code>
                    </p>
                </div>
            </div>
            <form method="POST" class="shrink-0">
                <button type="submit" name="migrate_slide_columns" class="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                    <span>⚡</span> เพิ่มคอลัมน์ใน MySQL ตอนนี้
                </button>
            </form>
        </div>
    <?php endif; ?>

    <!-- SECTION 1: รายการที่รอออกเกียรติบัตร (Pending Events) -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
                <h2 class="text-base font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>⏳</span> รายการที่รอออกเกียรติบัตร 
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold <?= count($pendingEvents) > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600' ?>">
                        <?= count($pendingEvents) ?> รายการ
                    </span>
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">
                    รายการแข่งขันที่ประกาศผลแล้ว แต่ยังไม่ได้สร้างเลขที่เกียรติบัตร กดปุ่ม "ออกเกียรติบัตรรายการนี้" เพื่อสร้างได้ทันที
                </p>
            </div>
            <?php if (count($pendingEvents) > 0): ?>
                <form method="POST" onsubmit="return confirm('ต้องการออกเกียรติบัตรให้รายการที่รอทั้งหมดใช่หรือไม่?')">
                    <button type="submit" name="generate_from_results" class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                        <span>⚡</span> ออกเกียรติบัตรทั้งหมด (<?= count($pendingEvents) ?> รายการ)
                    </button>
                </form>
            <?php endif; ?>
        </div>

        <?php if (empty($pendingEvents)): ?>
            <div class="p-6 bg-slate-50/70 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                <span class="text-2xl">✨</span>
                <span class="font-bold text-slate-700">ไม่มีรายการแข่งขันที่รอออกเกียรติบัตร</span>
                <span class="text-[11px] text-slate-400">ทุกรายการที่ประกาศผลได้รับการออกเกียรติบัตรครบถ้วนสมบูรณ์แล้ว</span>
            </div>
        <?php else: ?>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <?php foreach ($pendingEvents as $pe): ?>
                    <div class="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition space-y-3 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-1">
                                <span class="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                                    <span><?= $pe['sport_icon'] ?></span> <?= htmlspecialchars($pe['sport_name']) ?>
                                </span>
                                <span class="px-2 py-0.5 rounded bg-white text-slate-700 font-mono text-[10px] font-bold border border-amber-200">
                                    <?= htmlspecialchars($pe['event_code']) ?>
                                </span>
                            </div>
                            <h3 class="font-bold font-kanit text-slate-900 text-sm leading-snug">
                                <?= htmlspecialchars($pe['event_name']) ?>
                            </h3>
                            <div class="mt-2 text-[11px] text-slate-600 space-y-0.5 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                                <div>🥇 ชนะเลิศ: <span class="font-bold text-amber-900"><?= htmlspecialchars($pe['gold_school'] ?: '-') ?></span></div>
                                <?php if ($pe['silver_school']): ?>
                                    <div>🥈 รอง 1: <span class="font-medium text-slate-700"><?= htmlspecialchars($pe['silver_school']) ?></span></div>
                                <?php endif; ?>
                                <?php if ($pe['bronze_school']): ?>
                                    <div>🥉 รอง 2: <span class="font-medium text-orange-800"><?= htmlspecialchars($pe['bronze_school']) ?></span></div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <form method="POST" class="pt-1">
                            <input type="hidden" name="event_id" value="<?= htmlspecialchars($pe['event_id']) ?>">
                            <button type="submit" name="generate_single_event" class="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                                <span>⚡</span> ออกเกียรติบัตรรายการนี้
                            </button>
                        </form>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

    <!-- SECTION 2: รายการที่ออกเกียรติบัตรแล้ว (Issued Events) -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
                <h2 class="text-base font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>🏆</span> รายการที่ออกเกียรติบัตรแล้ว 
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <?= count($completedEvents) ?> รายการ
                    </span>
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">
                    รายการที่สร้างเกียรติบัตรแล้ว สามารถกดดูเกียรติบัตร ออกเพิ่มเติม หรือลบเพื่อสร้างใหม่ได้
                </p>
            </div>
        </div>

        <?php if (empty($completedEvents)): ?>
            <div class="p-6 bg-slate-50/70 rounded-2xl text-center text-slate-400 text-xs">
                ยังไม่มีรายการที่ออกเกียรติบัตร กรุณากดปุ่ม "ออกเกียรติบัตร" ในส่วนด้านบน
            </div>
        <?php else: ?>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                        <tr>
                            <th class="p-3.5 pl-6">รายการแข่งขัน</th>
                            <th class="p-3.5">กีฬา</th>
                            <th class="p-3.5 text-center">นักเรียน</th>
                            <th class="p-3.5 text-center">ครูผู้ฝึกสอน</th>
                            <th class="p-3.5 text-center">รวมที่ออก</th>
                            <th class="p-3.5 pr-6 text-right">การจัดการรายการ</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php foreach ($completedEvents as $ce): ?>
                            <tr class="hover:bg-slate-50/80 transition">
                                <td class="p-3.5 pl-6">
                                    <div class="font-bold font-kanit text-slate-900 text-sm">
                                        <?= htmlspecialchars($ce['event_name']) ?>
                                    </div>
                                    <span class="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                                        <?= htmlspecialchars($ce['event_code']) ?>
                                    </span>
                                </td>
                                <td class="p-3.5 text-slate-600 font-medium">
                                    <span><?= $ce['sport_icon'] ?></span> <?= htmlspecialchars($ce['sport_name']) ?>
                                </td>
                                <td class="p-3.5 text-center">
                                    <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-[11px] border border-blue-200">
                                        🎒 <?= number_format($ce['student_cert_count']) ?>
                                    </span>
                                </td>
                                <td class="p-3.5 text-center">
                                    <span class="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-mono font-bold text-[11px] border border-purple-200">
                                        👨‍🏫 <?= number_format($ce['coach_cert_count']) ?>
                                    </span>
                                </td>
                                <td class="p-3.5 text-center">
                                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
                                        <?= number_format($ce['cert_count']) ?> ฉบับ
                                    </span>
                                </td>
                                <td class="p-3.5 pr-6 text-right space-x-1.5">
                                    <!-- กรองดูในตารางล่าง -->
                                    <a href="?event_id=<?= urlencode($ce['event_id']) ?>#table-certs" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
                                        🔍 ดูรายชื่อ
                                    </a>

                                    <!-- ออกเพิ่มเติม / ออกใหม่ -->
                                    <form method="POST" class="inline" onsubmit="return confirm('ระบบจะตรวจสอบผู้ได้รับรางวัลที่ยังไม่มีเกียรติบัตรและสร้างเพิ่ม ต้องการดำเนินการหรือไม่?')">
                                        <input type="hidden" name="event_id" value="<?= htmlspecialchars($ce['event_id']) ?>">
                                        <button type="submit" name="generate_single_event" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition cursor-pointer">
                                            🔄 ออกเพิ่ม
                                        </button>
                                    </form>

                                    <!-- ลบเกียรติบัตรทั้งหมดของรายการนี้ -->
                                    <form method="POST" class="inline" onsubmit="return confirm('⚠️ คำเตือน: คุณต้องการลบเกียรติบัตรทั้งหมด (<?= $ce['cert_count'] ?> ฉบับ) ของรายการนี้ใช่หรือไม่? หลังจากลบแล้วจะสามารถกดออกใหม่ได้')">
                                        <input type="hidden" name="event_id" value="<?= htmlspecialchars($ce['event_id']) ?>">
                                        <button type="submit" name="delete_event_certs" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer">
                                            🗑️ ลบทั้งหมด
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>

    <!-- SECTION 3: ตารางรายการเกียรติบัตรทั้งหมด (All Issued Certificates Table) -->
    <div id="table-certs" class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
                <h2 class="text-base font-bold font-kanit text-slate-900 flex items-center gap-2">
                    <span>📋</span> รายการเกียรติบัตรทั้งหมดในระบบ (<?= count($certs) ?> ฉบับ)
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">
                    คลิกปุ่ม "📥 พิมพ์ / PDF" เพื่อดาวน์โหลดหรือสั่งพิมพ์เกียรติบัตร
                </p>
            </div>
        </div>

        <!-- Download & Print Help Banner -->
        <div class="p-4 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
            <div class="flex items-start gap-3">
                <div class="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                    📥
                </div>
                <div>
                    <h4 class="font-bold text-sm font-kanit text-amber-950 flex items-center gap-2">
                        💡 วิธีดาวน์โหลดเกียรติบัตรเป็นไฟล์ PDF หรือสั่งพิมพ์
                    </h4>
                    <p class="text-amber-900/90 mt-1 leading-relaxed">
                        1. กดปุ่ม <span class="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold text-[11px]">📥 พิมพ์ / PDF (Google Drive)</span> เพื่อเปิดไฟล์ PDF ต้นฉบับที่ Google Drive สร้างจากแม่แบบ Google Slides<br/>
                        2. หากรายการใดยังไม่มีไฟล์ Google Drive ระบบจะแสดงปุ่มพิมพ์สำรองของเว็บไซต์แทน
                    </p>
                </div>
            </div>
        </div>

        <!-- Filter Bar -->
        <form method="GET" class="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
            <input 
                type="text" 
                name="search" 
                value="<?= htmlspecialchars($search) ?>" 
                placeholder="🔍 ค้นหาชื่อผู้รับ, เลขที่, รายการ..." 
                class="p-2.5 bg-white border border-slate-300 rounded-xl text-xs w-60 focus:ring-2 focus:ring-amber-500"
            >
            <select name="school_id" class="p-2.5 bg-white border border-slate-300 rounded-xl text-xs">
                <option value="">-- ทุกโรงเรียน --</option>
                <?php foreach ($schools as $s): ?>
                    <option value="<?= $s['id'] ?>" <?= $filterSchool === $s['id'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($s['school_name']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <select name="recipient_type" class="p-2.5 bg-white border border-slate-300 rounded-xl text-xs">
                <option value="">-- ทุกประเภทผู้รับ --</option>
                <option value="STUDENT" <?= $filterType === 'STUDENT' ? 'selected' : '' ?>>🎒 นักเรียน</option>
                <option value="COACH" <?= $filterType === 'COACH' ? 'selected' : '' ?>>👨‍🏫 ครูผู้ฝึกสอน</option>
            </select>
            <button type="submit" class="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer">
                ค้นหา
            </button>
            <?php if ($search || $filterSchool || $filterEvent || $filterType): ?>
                <a href="/admin/certificates.php#table-certs" class="text-slate-500 hover:text-slate-800 ml-1 font-medium underline">
                    ล้างตัวกรอง
                </a>
            <?php endif; ?>
        </form>

        <!-- Certificates Table -->
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
                        <th class="p-3.5 pr-6 text-right">การจัดการ</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($certs)): ?>
                        <tr>
                            <td colspan="7" class="p-8 text-center text-slate-400">
                                📭 ไม่พบรายการเกียรติบัตรตามเงื่อนไขที่ค้นหา
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
                                    <span class="text-[10px] text-slate-500">
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
                                <td class="p-3.5 pr-6 text-right space-x-1.5 whitespace-nowrap">
                                    <?php if (!empty($c['drive_url'])): ?>
                                        <a href="<?= htmlspecialchars($c['drive_url']) ?>" target="_blank" rel="noopener" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="เปิดไฟล์ PDF ต้นฉบับจาก Google Drive">
                                            📥 พิมพ์ / PDF (Google Drive)
                                        </a>
                                    <?php else: ?>
                                        <a href="/print_certificate.php?id=<?= urlencode($c['id']) ?>" target="_blank" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-2xs" title="ยังไม่มีไฟล์ Google Drive จึงเปิดหน้าพิมพ์สำรองของระบบ">
                                            📥 พิมพ์ / PDF
                                        </a>
                                    <?php endif; ?>
                                    <a href="/verify.php?token=<?= urlencode($c['qr_token'] ?? $c['certificate_no']) ?>" target="_blank" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition">
                                        🔍 QR
                                    </a>
                                    <!-- ปุ่มแก้ไข -->
                                    <button 
                                        type="button"
                                        onclick='openEditModal(<?= json_encode($c) ?>)'
                                        class="px-2 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
                                    >
                                        ✏️ แก้ไข
                                    </button>
                                    <!-- ปุ่มลบ -->
                                    <form method="POST" class="inline" onsubmit="return confirm('ยืนยันการลบเกียรติบัตรฉบับนี้หรือไม่?')">
                                        <input type="hidden" name="delete_cert_id" value="<?= htmlspecialchars($c['id']) ?>">
                                        <button type="submit" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-medium transition cursor-pointer">
                                            🗑️ ลบ
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- EDIT CERTIFICATE MODAL -->
<div id="editModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-lg font-bold font-kanit text-slate-900 flex items-center gap-2">
                <span>✏️</span> แก้ไขข้อมูลเกียรติบัตร
            </h3>
            <button type="button" onclick="closeEditModal()" class="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">
                &times;
            </button>
        </div>

        <form method="POST" class="space-y-4 text-xs">
            <input type="hidden" name="save_edit_cert" value="1">
            <input type="hidden" name="cert_id" id="edit_cert_id">

            <div>
                <label class="block font-bold text-slate-700 mb-1">เลขที่เกียรติบัตร <span class="text-rose-500">*</span></label>
                <input type="text" name="certificate_no" id="edit_cert_no" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500">
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">ชื่อผู้ได้รับเกียรติบัตร <span class="text-rose-500">*</span></label>
                <input type="text" name="recipient_name" id="edit_recipient_name" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block font-bold text-slate-700 mb-1">ประเภทผู้รับ</label>
                    <select name="recipient_type" id="edit_recipient_type" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                        <option value="STUDENT">🎒 นักเรียน</option>
                        <option value="COACH">👨‍🏫 ครูผู้ฝึกสอน</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 mb-1">เหรียญรางวัล</label>
                    <select name="medal" id="edit_medal" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                        <option value="GOLD">🥇 เหรียญทอง</option>
                        <option value="SILVER">🥈 เหรียญเงิน</option>
                        <option value="BRONZE">🥉 เหรียญทองแดง</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">โรงเรียน</label>
                <input type="text" name="school_name" id="edit_school_name" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium">
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">ข้อความรางวัล</label>
                <input type="text" name="award" id="edit_award" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium">
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">วันที่ออกเกียรติบัตร</label>
                <input type="date" name="issue_date" id="edit_issue_date" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono">
            </div>

            <div class="pt-3 flex gap-2 justify-end">
                <button type="button" onclick="closeEditModal()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition cursor-pointer">
                    ยกเลิก
                </button>
                <button type="submit" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer">
                    💾 บันทึกการแก้ไข
                </button>
            </div>
        </form>
    </div>
</div>

<script>
function openEditModal(cert) {
    document.getElementById('edit_cert_id').value = cert.id || '';
    document.getElementById('edit_cert_no').value = cert.certificate_no || '';
    document.getElementById('edit_recipient_name').value = cert.recipient_name || '';
    document.getElementById('edit_recipient_type').value = cert.recipient_type || 'STUDENT';
    document.getElementById('edit_medal').value = cert.medal || 'GOLD';
    document.getElementById('edit_school_name').value = cert.school_name || '';
    document.getElementById('edit_award').value = cert.award || '';
    document.getElementById('edit_issue_date').value = cert.issue_date || '';
    
    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
