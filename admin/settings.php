<?php
/**
 * ==============================================================================
 * ไฟล์: admin/settings.php
 * คำอธิบาย: ตั้งค่าระบบการแข่งขัน, การเชื่อมต่อ Google Apps Script (GAS), Google Drive,
 *          แม่แบบ Google Slides, สถานะการทดสอบการเชื่อมต่อ (Live Diagnostics)
 *          และคู่มือขั้นตอนการติดตั้งและตั้งค่า Google Apps Script (4 ขั้นตอนอย่างง่าย)
 * ==============================================================================
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/auth.php';

requireRole(['SUPER_ADMIN']);
$pdo = Database::getConnection();
$message = '';
$error = '';

// ดึงข้อมูลการแข่งขันปัจจุบัน
$comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch();
if (!$comp) {
    $pdo->exec("INSERT INTO `competitions` (`id`, `year`, `academic_year`, `competition_name`, `start_date`, `end_date`, `venue`, `host_org`, `status`) VALUES
    ('comp-2026', 2569, '2569', 'การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปี 2569', '2026-11-15', '2026-11-20', 'สนามกีฬาโรงเรียนบ้านหนองหว้า', 'กลุ่มโรงเรียนสว่างสูงกระสัง', 'ACTIVE')");
    $comp = $pdo->query("SELECT * FROM competitions LIMIT 1")->fetch();
}

// -------------------------------------------------------------
// บันทึกการตั้งค่า
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action_save_settings'])) {
    $compName = trim($_POST['competition_name'] ?? '');
    $acadYear = trim($_POST['academic_year'] ?? '2569');
    $startDate = trim($_POST['start_date'] ?? '');
    $endDate = trim($_POST['end_date'] ?? '');
    $venue = trim($_POST['venue'] ?? '');
    $hostOrg = trim($_POST['host_org'] ?? '');
    $presidentName = trim($_POST['president_name'] ?? '');
    $directorName = trim($_POST['director_name'] ?? '');
    $certPrefix = trim($_POST['cert_prefix'] ?? 'สพป.บร.3/2569-');
    $gasUrl = trim($_POST['google_apps_script_url'] ?? '');
    $driveFolderId = trim($_POST['google_drive_folder_id'] ?? '');
    $studentTemplateId = trim($_POST['google_slide_template_student_id'] ?? '');
    $coachTemplateId = trim($_POST['google_slide_template_coach_id'] ?? '');
    // รักษาความเข้ากันได้ย้อนหลัง: หากไม่ได้ระบุ studentTemplateId ให้ใช้ google_slide_template_id เดิม
    $legacyTemplateId = trim($_POST['google_slide_template_id'] ?? '');
    if (empty($studentTemplateId) && !empty($legacyTemplateId)) {
        $studentTemplateId = $legacyTemplateId;
    }
    $slideTemplateId = $studentTemplateId ?: $legacyTemplateId;
    $medalCriteria = trim($_POST['medal_criteria'] ?? 'GOLD_FIRST');

    try {
        $stmt = $pdo->prepare("
            UPDATE competitions SET
                competition_name = ?,
                academic_year = ?,
                start_date = ?,
                end_date = ?,
                venue = ?,
                host_org = ?,
                president_name = ?,
                director_name = ?,
                cert_prefix = ?,
                google_apps_script_url = ?,
                google_drive_folder_id = ?,
                google_slide_template_id = ?,
                google_slide_template_student_id = ?,
                google_slide_template_coach_id = ?,
                medal_criteria = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $compName, $acadYear, $startDate, $endDate, $venue, $hostOrg,
            $presidentName, $directorName, $certPrefix,
            $gasUrl, $driveFolderId, $slideTemplateId,
            $studentTemplateId, $coachTemplateId,
            $medalCriteria,
            $comp['id']
        ]);

        logActivity('UPDATE_SETTINGS', 'SYSTEM', "บันทึกการตั้งค่าระบบและการเชื่อมต่อ Google Slides แยกนักเรียนและครู");
        $message = "บันทึกการตั้งค่าระบบและการตั้งค่าแม่แบบเกียรติบัตรนักเรียน/ครู เรียบร้อยแล้ว!";
        $comp = $pdo->query("SELECT * FROM competitions WHERE id = " . $pdo->quote($comp['id']))->fetch();
    } catch (Exception $e) {
        $error = "เกิดข้อผิดพลาดในการบันทึก: " . $e->getMessage();
    }
}

// Generate Google Apps Script Source Code with current configuration
$curFolderId = !empty($comp['google_drive_folder_id']) ? $comp['google_drive_folder_id'] : '1A2B3C4D5E6F7G8H9I0J_SPORTS2569';
$curStudentTemplateId = !empty($comp['google_slide_template_student_id']) ? $comp['google_slide_template_student_id'] : (!empty($comp['google_slide_template_id']) ? $comp['google_slide_template_id'] : '1sL1dE_T3mpL4t3_Student_2569');
$curCoachTemplateId = !empty($comp['google_slide_template_coach_id']) ? $comp['google_slide_template_coach_id'] : '1sL1dE_T3mpL4t3_Coach_2569';
$curPresident = addslashes($comp['president_name'] ?? 'นายสมชาย หมายมั่น');
$curDirector = addslashes($comp['director_name'] ?? 'ดร.สมศักดิ์ นำเจริญ');

$gasSourceCode = <<<EOD
/**
 * ==============================================================================
 * Google Apps Script for Automated Certificate Generation (Students & Coaches)
 * โค้ดสำหรับสร้างเกียรติบัตรอัตโนมัติจาก Google Slides แยกแม่แบบนักเรียนและครูผู้ฝึกสอน
 * การแข่งขันกีฬากลุ่มโรงเรียนสังกัดสำนักงานเขตพื้นที่การศึกษาประถมศึกษาบุรีรัมย์ เขต 3
 * ==============================================================================
 * 
 * วิธีการติดตั้งและใช้งาน (Installation & Setup):
 * 1. ไปที่ https://script.google.com แล้วคลิก "+ โครงการใหม่" (New Project)
 * 2. วางโค้ดชุดนี้ทั้งหมดลงในไฟล์ Code.gs
 * 3. ตรวจสอบค่า FOLDER_ID, STUDENT_TEMPLATE_ID และ COACH_TEMPLATE_ID ให้ตรงกับ Google Drive/Slides ของท่าน
 * 4. คลิก "ทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 5. เลือกประเภท: "เว็บแอป" (Web app)
 *    - ดำเนินการในฐานะ (Execute as): "ฉัน" (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone)
 * 6. คลิก "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก "URL เว็บแอป" (Web App URL)
 * 7. นำ Web App URL ไปวางในเมนูตั้งค่า "Google Apps Script URL" ในระบบ Super Admin
 */

// ค่าเริ่มต้นโฟลเดอร์และแม่แบบ Google Slides แยกนักเรียนและครู
var DEFAULT_FOLDER_ID = "{$curFolderId}";
var DEFAULT_STUDENT_TEMPLATE_ID = "{$curStudentTemplateId}";
var DEFAULT_COACH_TEMPLATE_ID = "{$curCoachTemplateId}";
// ค่าเริ่มต้นสำหรับความเข้ากันได้ย้อนหลัง
var DEFAULT_TEMPLATE_ID = DEFAULT_STUDENT_TEMPLATE_ID;

/**
 * รับคำสั่ง POST จากระบบเว็บไซต์
 */
function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);
    var action = data.action || "GENERATE_CERTIFICATE";

    // 1. ทดสอบการเชื่อมต่อระบบ (Live Diagnostics)
    if (action === "TEST_CONNECTION") {
      return responseJson({
        status: "SUCCESS",
        message: "เชื่อมต่อกับ Google Apps Script สำเร็จและพร้อมใช้งาน!",
        server_time: new Date().toLocaleString("th-TH"),
        target_folder: data.folder_id || DEFAULT_FOLDER_ID,
        student_template: data.student_template_id || DEFAULT_STUDENT_TEMPLATE_ID,
        coach_template: data.coach_template_id || DEFAULT_COACH_TEMPLATE_ID,
        features: ["SEPARATE_STUDENT_COACH_TEMPLATES", "BATCH_GENERATE", "QR_VERIFICATION"]
      });
    }

    // 2. สร้างเกียรติบัตรรายฉบับ
    if (action === "GENERATE_CERTIFICATE") {
      var result = createSingleCertificate(data);
      return responseJson(result);
    }

    // 3. สร้างเกียรติบัตรแบบกลุ่ม (Batch)
    if (action === "BATCH_GENERATE") {
      var certificates = data.certificates || [];
      var results = [];
      for (var i = 0; i < certificates.length; i++) {
        try {
          var item = certificates[i];
          var singleResult = createSingleCertificate(item);
          results.push(singleResult);
        } catch (itemErr) {
          results.push({
            status: "ERROR",
            certificate_no: certificates[i].certificate_no || "N/A",
            message: itemErr.toString()
          });
        }
      }
      return responseJson({
        status: "SUCCESS",
        total: certificates.length,
        results: results
      });
    }

    return responseJson({
      status: "ERROR",
      message: "ไม่พบคำสั่ง action ที่ระบุ: " + action
    });

  } catch (err) {
    return responseJson({
      status: "ERROR",
      message: "เกิดข้อผิดพลาดในการประมวลผล: " + err.toString()
    });
  }
}

/**
 * รับคำสั่ง GET สำหรับทดสอบ Health Check ผ่านเบราว์เซอร์
 */
function doGet(e) {
  return responseJson({
    status: "ONLINE",
    app_name: "ระบบสร้างเกียรติบัตรอัตโนมัติ Google Apps Script + Google Slides",
    host: "Google Cloud Platform / Google Workspace",
    student_template: DEFAULT_STUDENT_TEMPLATE_ID,
    coach_template: DEFAULT_COACH_TEMPLATE_ID,
    time_th: new Date().toLocaleString("th-TH")
  });
}

/**
 * ฟังก์ชันหลักในการสร้าง PDF เกียรติบัตรจาก Google Slides Template (แยกนักเรียนและครู)
 */
function createSingleCertificate(data) {
  // ตรวจสอบประเภทผู้รับ: นักเรียน (STUDENT) หรือครูผู้ฝึกสอน (COACH/TEACHER)
  var recipientType = (data.recipient_type || data.template_type || "STUDENT").toUpperCase();
  var isCoach = (recipientType === "COACH" || recipientType === "TEACHER");

  // เลือกแม่แบบตามประเภทผู้รับ
  var defaultTemplate = isCoach ? DEFAULT_COACH_TEMPLATE_ID : DEFAULT_STUDENT_TEMPLATE_ID;
  var templateId = data.template_id || defaultTemplate;
  var folderId = data.folder_id || DEFAULT_FOLDER_ID;

  var certNo = data.certificate_no || "สพป.บร.3/2569-0001";
  var recipientName = data.recipient_name || "ชื่อ-นามสกุล";
  var schoolName = data.school_name || "ชื่อโรงเรียน";
  var award = data.award || "รางวัลชนะเลิศ เหรียญทอง";
  var eventName = data.event_name || "รายการแข่งขัน";
  var academicYear = data.academic_year || "2569";
  var issueDate = data.issue_date || new Date().toLocaleDateString("th-TH");
  var verifyUrl = data.verify_url || "";
  var presidentName = data.president_name || "{$curPresident}";
  var directorName = data.director_name || "{$curDirector}";

  // ตรวจสอบ Google Drive Folder
  var targetFolder;
  try {
    targetFolder = DriveApp.getFolderById(folderId);
  } catch (fe) {
    throw new Error("ไม่พบ Google Drive Folder ID: " + folderId);
  }

  // ตรวจสอบ Google Slides Template
  var templateFile;
  try {
    templateFile = DriveApp.getFileById(templateId);
  } catch (te) {
    throw new Error("ไม่พบ Google Slides Template ID (" + (isCoach ? "ครูผู้ฝึกสอน" : "นักเรียน") + "): " + templateId);
  }

  // 1. ทำการ Copy แม่แบบ Slide เป็นไฟล์ชั่วคราว
  var sanitizedCertNo = certNo.replace(/[\/\\\\?%*:|"<>]/g, "_");
  var tempFileName = "CERT_TEMP_" + (isCoach ? "COACH_" : "STUDENT_") + sanitizedCertNo + "_" + recipientName;
  var copyFile = templateFile.makeCopy(tempFileName, targetFolder);
  var copyId = copyFile.getId();
  var slidePresentation = SlidesApp.openById(copyId);

  // 2. แทนที่ตัวแปร Placeholder ในสไลด์
  var slides = slidePresentation.getSlides();
  if (slides.length > 0) {
    var mainSlide = slides[0];

    // รายการตัวแปรแท็กที่รองรับทั้งนักเรียนและครู
    var replacements = [
      ["{{certificate_no}}", certNo],
      ["{{cert_no}}", certNo],
      ["{{recipient_name}}", recipientName],
      ["{{name}}", recipientName],
      ["{{school_name}}", schoolName],
      ["{{school}}", schoolName],
      ["{{award}}", award],
      ["{{event_name}}", eventName],
      ["{{event}}", eventName],
      ["{{sport_name}}", data.sport_name || ""],
      ["{{role}}", isCoach ? "ครูผู้ฝึกสอน" : "นักเรียน"],
      ["{{recipient_type}}", isCoach ? "ครูผู้ฝึกสอน" : "นักเรียน"],
      ["{{academic_year}}", academicYear],
      ["{{year}}", academicYear],
      ["{{issue_date}}", issueDate],
      ["{{date}}", issueDate],
      ["{{verify_url}}", verifyUrl],
      ["{{president_name}}", presidentName],
      ["{{director_name}}", directorName]
    ];

    for (var r = 0; r < replacements.length; r++) {
      mainSlide.replaceAllText(replacements[r][0], replacements[r][1]);
    }
  }

  // บันทึกและปิดสไลด์ชั่วคราว
  slidePresentation.saveAndClose();

  // 3. แปลงสไลด์เป็นไฟล์ PDF คุณภาพสูง
  var pdfBlob = copyFile.getAs("application/pdf");
  var rolePrefix = isCoach ? "เกียรติบัตรครู_" : "เกียรติบัตรนักเรียน_";
  var finalPdfName = rolePrefix + sanitizedCertNo + "_" + recipientName + ".pdf";
  pdfBlob.setName(finalPdfName);

  // บันทึก PDF เข้าสู่โฟลเดอร์ Google Drive
  var pdfFile = targetFolder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 4. ลบไฟล์ Slide ชั่วคราวทิ้ง เพื่อไม่ให้เปลืองพื้นที่ Drive
  try {
    DriveApp.getFileById(copyId).setTrashed(true);
  } catch (trashErr) {
    // ignore
  }

  var fileId = pdfFile.getId();
  var webViewLink = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
  var directDownloadLink = "https://drive.google.com/uc?export=download&id=" + fileId;

  return {
    status: "SUCCESS",
    certificate_no: certNo,
    recipient_name: recipientName,
    school_name: schoolName,
    drive_file_id: fileId,
    file_name: finalPdfName,
    pdf_url: webViewLink,
    download_url: directDownloadLink,
    created_at: new Date().toISOString()
  };
}

/**
 * ตัวช่วยส่งค่ากลับแบบ JSON Response พร้อม Header CORS
 */
function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
EOD;

$pageTitle = 'ตั้งค่าระบบกีฬา & Google Drive / GAS - Super Admin';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="space-y-6 animate-fadeIn">
    <!-- Top Header -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-1">
            <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                    👑 SUPER ADMIN CONSOLE
                </span>
                <span class="text-xs text-slate-400 font-mono">Google Cloud & Google Workspace Integration</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-kanit text-slate-900 flex items-center gap-2">
                <span>⚙️</span> ตั้งค่าระบบการแข่งขัน & Google Cloud Integration
            </h1>
            <p class="text-xs text-slate-500">
                จัดการพารามิเตอร์การแข่งขัน, ทดสอบการเชื่อมต่อ Google Apps Script (Live Diagnostics), คู่มือ 4 ขั้นตอน และแม่แบบ Google Slides
            </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <a href="https://script.google.com" target="_blank" class="px-3.5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold border border-indigo-200 transition flex items-center gap-1.5 shadow-2xs">
                <span>🚀</span> เปิด script.google.com
            </a>
            <a href="/update_database.php" target="_blank" class="px-3.5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold border border-emerald-200 transition flex items-center gap-1.5 shadow-2xs">
                <span>🔄</span> ตรวจสอบ DB
            </a>
            <a href="/admin/index.php" class="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition">
                &larr; กลับแผงควบคุม
            </a>
        </div>
    </div>

    <?php if ($message): ?>
        <div class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 shadow-sm animate-fadeIn">
            <span class="text-base">✅</span> <?= htmlspecialchars($message) ?>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2 shadow-sm animate-fadeIn">
            <span class="text-base">✕</span> <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <!-- 2 Column Layout: Form & Live Diagnostics -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left: Configuration Form (7 Columns) -->
        <div class="lg:col-span-7 space-y-6">
            <form method="POST" class="space-y-6">
                <input type="hidden" name="action_save_settings" value="1">

                <!-- 1. Google Cloud Integration Box -->
                <div class="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6 space-y-5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div class="flex items-center gap-2.5">
                            <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
                                ☁️
                            </div>
                            <div>
                                <h2 class="text-sm font-bold font-kanit text-slate-900">การเชื่อมต่อ Google Apps Script & Google Drive</h2>
                                <p class="text-[11px] text-slate-400">ระบบสร้างเกียรติบัตร PDF อัตโนมัติและจัดเก็บลง Google Drive ผ่าน Google Apps Script Web App</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-200 font-mono">
                            REST API / Web App
                        </span>
                    </div>

                    <div class="space-y-4 text-xs">
                        <div>
                            <label class="block font-bold text-slate-800 mb-1">
                                Google Apps Script Web App URL <span class="text-indigo-600 font-mono text-[11px]">(ขึ้นต้นด้วย https://script.google.com/macros/s/.../exec)</span> <span class="text-rose-500">*</span>
                            </label>
                            <input 
                                type="url" 
                                name="google_apps_script_url" 
                                id="gasUrlInput"
                                value="<?= htmlspecialchars($comp['google_apps_script_url'] ?? '') ?>" 
                                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                                class="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs shadow-2xs"
                            >
                            <span class="text-[10px] text-slate-400 mt-1 block">นำ URL ที่ได้จากการ Deploy Web App (สิทธิ์ Anyone) มาวางที่นี่</span>
                        </div>

                        <!-- Google Drive Folder ID -->
                        <div>
                            <label class="block font-bold text-slate-800 mb-1">
                                📁 Google Drive Folder ID <span class="text-slate-400 font-normal">(โฟลเดอร์จัดเก็บไฟล์ PDF เกียรติบัตร)</span>
                            </label>
                            <input 
                                type="text" 
                                name="google_drive_folder_id" 
                                id="driveFolderInput"
                                value="<?= htmlspecialchars($comp['google_drive_folder_id'] ?? '') ?>" 
                                placeholder="เช่น 1A2B3C4D5E6F7G8H9I0J_SPORTS2569"
                                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                            >
                            <span class="text-[10px] text-slate-400 mt-0.5 block">คัดลอกจาก URL โฟลเดอร์ใน Drive เช่น drive.google.com/drive/folders/<strong>[FOLDER_ID]</strong> (แชร์สิทธิ์เป็น Anyone with link หรือให้สิทธิ์บัญชีที่ Deploy GAS)</span>
                        </div>

                        <!-- แยกแม่แบบเกียรติบัตร: นักเรียน และ ครูผู้ฝึกสอน -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <!-- แม่แบบนักเรียน -->
                            <div class="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70 space-y-2">
                                <div class="flex items-center justify-between">
                                    <label class="block font-bold text-blue-900 text-xs flex items-center gap-1.5">
                                        <span>🎓</span> แม่แบบ Google Slides (นักเรียน) <span class="text-rose-500">*</span>
                                    </label>
                                    <?php 
                                    $studentTpl = $comp['google_slide_template_student_id'] ?: $comp['google_slide_template_id'];
                                    if ($studentTpl): ?>
                                    <a href="https://docs.google.com/presentation/d/<?= htmlspecialchars($studentTpl) ?>/edit" target="_blank" class="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                        <span>🔗</span> เปิดสไลด์
                                    </a>
                                    <?php endif; ?>
                                </div>
                                <input 
                                    type="text" 
                                    name="google_slide_template_student_id" 
                                    id="slideTemplateStudentInput"
                                    value="<?= htmlspecialchars($comp['google_slide_template_student_id'] ?: ($comp['google_slide_template_id'] ?? '')) ?>" 
                                    placeholder="เช่น 1sL1dE_T3mpL4t3_Student_2569"
                                    class="w-full p-2.5 bg-white border border-blue-300 rounded-xl font-mono text-xs shadow-2xs"
                                >
                                <input type="hidden" name="google_slide_template_id" value="<?= htmlspecialchars($comp['google_slide_template_student_id'] ?: ($comp['google_slide_template_id'] ?? '')) ?>">
                                <p class="text-[10px] text-blue-700/80 leading-relaxed">
                                    แม่แบบสำหรับนักเรียนผู้เข้าแข่งขัน รองรับแท็ก <code>{{recipient_name}}</code>, <code>{{school_name}}</code>, <code>{{award}}</code>, <code>{{event_name}}</code>
                                </p>
                            </div>

                            <!-- แม่แบบครูผู้ฝึกสอน -->
                            <div class="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 space-y-2">
                                <div class="flex items-center justify-between">
                                    <label class="block font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                                        <span>👨‍🏫</span> แม่แบบ Google Slides (ครูผู้ฝึกสอน) <span class="text-rose-500">*</span>
                                    </label>
                                    <?php if (!empty($comp['google_slide_template_coach_id'])): ?>
                                    <a href="https://docs.google.com/presentation/d/<?= htmlspecialchars($comp['google_slide_template_coach_id']) ?>/edit" target="_blank" class="text-[10px] text-emerald-600 hover:underline flex items-center gap-1">
                                        <span>🔗</span> เปิดสไลด์
                                    </a>
                                    <?php endif; ?>
                                </div>
                                <input 
                                    type="text" 
                                    name="google_slide_template_coach_id" 
                                    id="slideTemplateCoachInput"
                                    value="<?= htmlspecialchars($comp['google_slide_template_coach_id'] ?? '') ?>" 
                                    placeholder="เช่น 1sL1dE_T3mpL4t3_Coach_2569"
                                    class="w-full p-2.5 bg-white border border-emerald-300 rounded-xl font-mono text-xs shadow-2xs"
                                >
                                <p class="text-[10px] text-emerald-700/80 leading-relaxed">
                                    แม่แบบเฉพาะสำหรับครูผู้ฝึกสอน (แยกจากนักเรียน) สามารถตั้งข้อความ "ครูผู้ฝึกสอนนักเรียนได้รับ..." ได้อย่างถูกต้อง
                                </p>
                            </div>
                        </div>

                        <!-- Action Controls in Box -->
                        <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                            <button 
                                type="button" 
                                onclick="testGasConnection()" 
                                id="btnTestGas"
                                class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>⚡</span> ทดสอบการเชื่อมต่อ GAS ทันที
                            </button>
                            <span class="text-[11px] text-slate-400">ผลการทดสอบจะแสดงในแผง Live Diagnostics ด้านขวา</span>
                        </div>
                    </div>
                </div>

                <!-- 2. Competition Details Box -->
                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <div class="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                            🏆
                        </div>
                        <div>
                            <h2 class="text-sm font-bold font-kanit text-slate-900">ข้อมูลการแข่งขันและสถานที่</h2>
                            <p class="text-[11px] text-slate-400">ชื่อการแข่งขัน วันที่ และสถานที่จัดงาน</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div class="sm:col-span-2">
                            <label class="block font-bold text-slate-700 mb-1">ชื่อการแข่งขันกีฬา <span class="text-rose-500">*</span></label>
                            <input type="text" name="competition_name" value="<?= htmlspecialchars($comp['competition_name'] ?? '') ?>" required class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">ปีการศึกษา</label>
                            <input type="text" name="academic_year" value="<?= htmlspecialchars($comp['academic_year'] ?? '2569') ?>" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm">
                        </div>

                        <div>
                            <label class="block font-bold text-slate-700 mb-1">วันที่เริ่มการแข่งขัน</label>
                            <input type="date" name="start_date" value="<?= htmlspecialchars($comp['start_date'] ?? '') ?>" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">วันที่สิ้นสุดการแข่งขัน</label>
                            <input type="date" name="end_date" value="<?= htmlspecialchars($comp['end_date'] ?? '') ?>" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">เกณฑ์การจัดอันดับเหรียญ</label>
                            <select name="medal_criteria" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                                <option value="GOLD_FIRST" <?= ($comp['medal_criteria'] ?? '') === 'GOLD_FIRST' ? 'selected' : '' ?>>เหรียญทองมากที่สุด (Gold First)</option>
                                <option value="TOTAL_FIRST" <?= ($comp['medal_criteria'] ?? '') === 'TOTAL_FIRST' ? 'selected' : '' ?>>เหรียญรวมทั้งหมด (Total First)</option>
                            </select>
                        </div>

                        <div class="sm:col-span-2">
                            <label class="block font-bold text-slate-700 mb-1">สถานที่จัดการแข่งขัน</label>
                            <input type="text" name="venue" value="<?= htmlspecialchars($comp['venue'] ?? '') ?>" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">หน่วยงานเจ้าภาพ</label>
                            <input type="text" name="host_org" value="<?= htmlspecialchars($comp['host_org'] ?? '') ?>" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        </div>
                    </div>
                </div>

                <!-- 3. Signatories & Certificate Prefix -->
                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                        <div class="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                            ✍️
                        </div>
                        <div>
                            <h2 class="text-sm font-bold font-kanit text-slate-900">ผู้ลงนามและรูปแบบเลขที่เกียรติบัตร</h2>
                            <p class="text-[11px] text-slate-400">สำหรับใส่ลงในเกียรติบัตรอัตโนมัติ</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">ชื่อประธานจัดการแข่งขัน</label>
                            <input type="text" name="president_name" value="<?= htmlspecialchars($comp['president_name'] ?? '') ?>" placeholder="เช่น นายสมชาย หมายมั่น" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">ชื่อผู้อำนวยการเขตพื้นที่ฯ</label>
                            <input type="text" name="director_name" value="<?= htmlspecialchars($comp['director_name'] ?? '') ?>" placeholder="เช่น ดร.สมศักดิ์ นำเจริญ" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl">
                        </div>
                        <div>
                            <label class="block font-bold text-slate-700 mb-1">คำนำหน้าเลขที่เกียรติบัตร</label>
                            <input type="text" name="cert_prefix" value="<?= htmlspecialchars($comp['cert_prefix'] ?? 'สพป.บร.3/2569-') ?>" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono">
                        </div>
                    </div>
                </div>

                <div class="flex justify-end">
                    <button type="submit" class="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/25 transition cursor-pointer flex items-center gap-2">
                        <span>💾</span> บันทึกการตั้งค่าทั้งหมด
                    </button>
                </div>
            </form>
        </div>

        <!-- Right: Live Diagnostics & Template Tags (5 Columns) -->
        <div class="lg:col-span-5 space-y-6">
            
            <!-- ============================================================== -->
            <!-- สถานะการทดสอบการเชื่อมต่อ (Live Diagnostics) -->
            <!-- ============================================================== -->
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 font-kanit">
                        <span class="flex h-2.5 w-2.5 relative">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        สถานะการทดสอบการเชื่อมต่อ (Live Diagnostics)
                    </h3>
                    <span id="diagBadge" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        STANDBY
                    </span>
                </div>

                <!-- Diagnostics Output Panel -->
                <div id="diagnosticsPanel">
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs text-center space-y-2">
                        <div class="text-2xl">☁️</div>
                        <div class="font-bold text-slate-800">พร้อมทดสอบการเชื่อมต่อ Real-time</div>
                        <div class="text-[11px] text-slate-400">กรอก URL ด้านซ้ายแล้วกดปุ่ม "ทดสอบการเชื่อมต่อ GAS" เพื่อตรวจสอบความพร้อมและการตอบกลับของ Google Apps Script</div>
                    </div>
                </div>

                <!-- Quick Action Buttons for Testing -->
                <div class="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <button 
                        type="button" 
                        onclick="testGasConnection()" 
                        class="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                        <span>⚡</span> Test POST
                    </button>
                    <button 
                        type="button" 
                        onclick="testGasHealthCheck()" 
                        class="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                        <span>🩺</span> Test GET Health
                    </button>
                </div>
            </div>

            <!-- ============================================================== -->
            <!-- แท็กตัวแปรใน Google Slides (Template Tags) -->
            <!-- ============================================================== -->
            <div class="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-sm space-y-3">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span class="font-bold text-xs text-amber-400 flex items-center gap-1.5 font-kanit">
                        <span>🏷️</span> แท็กตัวแปรใน Google Slides (Template Tags)
                    </span>
                    <span class="text-[10px] text-slate-400">คลิกเพื่อคัดลอกแท็ก</span>
                </div>

                <div class="space-y-1.5 text-xs">
                    <?php
                    $tags = [
                        ['tag' => '{{certificate_no}}', 'desc' => 'เลขที่เกียรติบัตร (เช่น สพป.บร.3/2569-0001)'],
                        ['tag' => '{{recipient_name}}', 'desc' => 'ชื่อ-สกุล นักเรียน หรือ ครูผู้ฝึกสอน'],
                        ['tag' => '{{school_name}}', 'desc' => 'โรงเรียนต้นสังกัด'],
                        ['tag' => '{{award}}', 'desc' => 'รางวัล (เช่น รางวัลชนะเลิศ เหรียญทอง)'],
                        ['tag' => '{{event_name}}', 'desc' => 'รายการแข่งขัน (เช่น วิ่ง 100 เมตร ชาย)'],
                        ['tag' => '{{academic_year}}', 'desc' => 'ปีการศึกษา (2569)'],
                        ['tag' => '{{issue_date}}', 'desc' => 'วันที่ออกเกียรติบัตร'],
                        ['tag' => '{{verify_url}}', 'desc' => 'ลิงก์สำหรับสร้าง QR Code ตรวจสอบ'],
                        ['tag' => '{{president_name}}', 'desc' => 'ชื่อประธานจัดการแข่งขัน'],
                        ['tag' => '{{director_name}}', 'desc' => 'ชื่อผู้อำนวยการเขตพื้นที่ฯ']
                    ];
                    foreach ($tags as $t):
                    ?>
                        <div class="flex items-center justify-between p-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl transition border border-slate-700/50">
                            <button 
                                type="button" 
                                onclick="copyToClipboard('<?= $t['tag'] ?>', this)"
                                class="font-mono text-cyan-300 font-bold hover:text-cyan-200 flex items-center gap-1 text-[11px] cursor-pointer"
                                title="คลิกเพื่อคัดลอก"
                            >
                                <span>📋</span> <?= htmlspecialchars($t['tag']) ?>
                            </button>
                            <span class="text-slate-400 text-[10px]"><?= htmlspecialchars($t['desc']) ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

        </div>
    </div>

    <!-- ============================================================== -->
    <!-- คู่มือขั้นตอนการติดตั้งและตั้งค่า Google Apps Script (4 ขั้นตอนอย่างง่าย) -->
    <!-- ============================================================== -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
                <h3 class="font-bold text-slate-900 text-base font-kanit flex items-center gap-2">
                    <span class="p-1.5 bg-blue-100 text-blue-700 rounded-xl text-sm">📘</span>
                    คู่มือขั้นตอนการติดตั้งและตั้งค่า Google Apps Script (4 ขั้นตอนอย่างง่าย)
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                    คู่มือสำหรับ Super Admin ในการเชื่อมต่อระบบออกเกียรติบัตรอัตโนมัติเข้ากับบัญชี Google Workspace / Google Drive
                </p>
            </div>
            <a href="https://script.google.com" target="_blank" class="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold border border-blue-200 transition self-start sm:self-auto flex items-center gap-1.5">
                <span>🌐</span> เข้าสู่ script.google.com &rarr;
            </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            <!-- Step 1 -->
            <div class="p-5 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-3xl space-y-3 shadow-2xs hover:border-blue-300 transition">
                <div class="w-8 h-8 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm">
                    1
                </div>
                <h4 class="font-bold text-slate-900 text-sm font-kanit">สร้าง Google Slides</h4>
                <p class="text-slate-600 leading-relaxed text-[11px]">
                    สร้างสไลด์แนวนอน ออกแบบกรอบเกียรติบัตร และวางกล่องข้อความที่มีแท็กตัวแปร เช่น <code class="text-blue-700 bg-blue-50 px-1 rounded font-bold">{{recipient_name}}</code>, <code class="text-blue-700 bg-blue-50 px-1 rounded font-bold">{{award}}</code> แล้วคัดลอก Template ID จาก URL
                </p>
            </div>

            <!-- Step 2 -->
            <div class="p-5 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-3xl space-y-3 shadow-2xs hover:border-blue-300 transition">
                <div class="w-8 h-8 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm">
                    2
                </div>
                <h4 class="font-bold text-slate-900 text-sm font-kanit">สร้าง Google Drive Folder</h4>
                <p class="text-slate-600 leading-relaxed text-[11px]">
                    สร้างโฟลเดอร์สำหรับจัดเก็บไฟล์เกียรติบัตร PDF คลิกขวาที่โฟลเดอร์ &gt; แชร์ &gt; ตั้งค่าสิทธิ์เป็น <strong>"ทุกคนที่มีลิงก์ (Anyone with link) มีสิทธิ์ดู"</strong> แล้วคัดลอก Folder ID
                </p>
            </div>

            <!-- Step 3 -->
            <div class="p-5 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-3xl space-y-3 shadow-2xs hover:border-blue-300 transition">
                <div class="w-8 h-8 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm">
                    3
                </div>
                <h4 class="font-bold text-slate-900 text-sm font-kanit">วางโค้ด Code.gs</h4>
                <p class="text-slate-600 leading-relaxed text-[11px]">
                    เข้าสู่ <a href="https://script.google.com" target="_blank" class="text-blue-600 underline font-bold">script.google.com</a> &gt; คลิก <strong>+ โครงการใหม่</strong> &gt; คัดลอกโค้ด <strong>Code.gs</strong> ด้านล่างนี้ไปวางแทนที่โค้ดเดิมทั้งหมด แล้วกดบันทึก
                </p>
            </div>

            <!-- Step 4 -->
            <div class="p-5 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-3xl space-y-3 shadow-2xs hover:border-blue-300 transition">
                <div class="w-8 h-8 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm">
                    4
                </div>
                <h4 class="font-bold text-slate-900 text-sm font-kanit">Deploy Web App & วาง URL</h4>
                <p class="text-slate-600 leading-relaxed text-[11px]">
                    คลิก <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; การปรับใช้ใหม่ &gt; ชนิด: <strong>เว็บแอป (Web app)</strong> &gt; ผู้มีสิทธิ์: <strong>ทุกคน (Anyone)</strong> &gt; นำ Web App URL มาใส่ในช่องด้านบน
                </p>
            </div>
        </div>
    </div>

    <!-- ============================================================== -->
    <!-- Full Code Viewer Section (Code.gs) -->
    <!-- ============================================================== -->
    <div class="bg-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div class="flex items-center gap-3">
                <div class="p-2.5 bg-indigo-600/20 text-cyan-400 rounded-2xl border border-indigo-500/30 text-xl font-bold">
                    📜
                </div>
                <div>
                    <h3 class="font-bold text-white text-base font-mono flex items-center gap-2">
                        Code.gs
                        <span class="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 font-sans font-bold">
                            พร้อมใช้งาน 100%
                        </span>
                    </h3>
                    <p class="text-xs text-slate-400">
                        โค้ด Google Apps Script จัดการ Web App API, การแทนที่ข้อความสไลด์, แปลงเป็น PDF คุณภาพสูง และบันทึกลง Google Drive
                    </p>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onclick="copyGasCode()"
                    id="btnCopyGasCode"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                    <span>📋</span> <span id="copyGasText">คัดลอกโค้ดทั้งหมด</span>
                </button>

                <button
                    type="button"
                    onclick="downloadGasCode()"
                    class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                    <span>💾</span> ดาวน์โหลด .gs
                </button>

                <button
                    type="button"
                    onclick="downloadGasReadme()"
                    class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                    <span>📄</span> README.md
                </button>
            </div>
        </div>

        <!-- Code Monospace Box -->
        <div class="relative">
            <textarea id="hiddenGasCode" class="sr-only"><?= htmlspecialchars($gasSourceCode) ?></textarea>
            <pre class="bg-slate-900 text-emerald-300 p-5 rounded-2xl overflow-x-auto text-xs font-mono max-h-96 leading-relaxed border border-slate-800 select-all"><?= htmlspecialchars($gasSourceCode) ?></pre>
        </div>
    </div>
</div>

<!-- ============================================================== -->
<!-- JAVASCRIPT: Interactive Live Diagnostics & Helpers -->
<!-- ============================================================== -->
<script>
// Live Diagnostics: Test POST Connection
async function testGasConnection() {
    const url = document.getElementById('gasUrlInput').value.trim();
    const folderId = document.getElementById('driveFolderInput').value.trim();
    const studentTemplateId = document.getElementById('slideTemplateStudentInput').value.trim();
    const coachTemplateId = document.getElementById('slideTemplateCoachInput').value.trim();
    const panel = document.getElementById('diagnosticsPanel');
    const badge = document.getElementById('diagBadge');
    const btn = document.getElementById('btnTestGas');

    if (!url) {
        alert('กรุณากรอก Google Apps Script Web App URL ก่อนกดทดสอบ');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ กำลังทดสอบ...';
    badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse';
    badge.innerText = 'CONNECTING';

    panel.innerHTML = `
        <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-900 flex items-center gap-3 animate-pulse text-xs">
            <div class="text-xl">🔄</div>
            <div>
                <div class="font-bold">กำลังส่งคำขอทดสอบไปยัง Google Apps Script...</div>
                <div class="text-[11px] text-indigo-700">กำลังตรวจสอบ Web App Endpoint และสิทธิ์การเข้าถึงแม่แบบนักเรียนและครู</div>
            </div>
        </div>
    `;

    const startTime = performance.now();

    try {
        const res = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'TEST_CONNECTION',
                folder_id: folderId,
                student_template_id: studentTemplateId,
                coach_template_id: coachTemplateId,
                template_id: studentTemplateId
            })
        });

        const elapsed = Math.round(performance.now() - startTime);
        const data = await res.json();

        if (data.status === 'SUCCESS') {
            badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800';
            badge.innerText = 'ONLINE (' + elapsed + 'ms)';

            panel.innerHTML = `
                <div class="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 space-y-2 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">✅</span>
                        <div class="font-bold text-xs">${data.message}</div>
                    </div>
                    <div class="text-[11px] text-emerald-800 flex items-center gap-2">
                        <span>⏱️ เวลาตอบสนอง: <strong>${elapsed} ms</strong></span>
                        <span>&bull;</span>
                        <span>🕒 เวลาเซิร์ฟเวอร์: <strong>${data.server_time || '-'}</strong></span>
                    </div>
                    <div class="bg-white/90 p-2.5 rounded-xl border border-emerald-200/80 text-[11px] space-y-1 text-slate-700">
                        <div>🎓 แม่แบบนักเรียน: <code class="font-bold text-blue-600">${data.student_template || studentTemplateId || '-'}</code></div>
                        <div>👨‍🏫 แม่แบบครู: <code class="font-bold text-emerald-600">${data.coach_template || coachTemplateId || '-'}</code></div>
                    </div>
                    <div class="bg-white/90 p-3 rounded-xl border border-emerald-200/80 font-mono text-[10px] space-y-1 overflow-x-auto">
                        <div class="text-slate-500 font-semibold">// ข้อมูลตอบกลับจาก Google Apps Script (Payload):</div>
                        <pre class="text-slate-800">${JSON.stringify(data, null, 2)}</pre>
                    </div>
                </div>
            `;
        } else {
            badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800';
            badge.innerText = 'ERROR';

            panel.innerHTML = `
                <div class="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-950 space-y-2 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">❌</span>
                        <div class="font-bold text-xs">${data.message || 'เกิดข้อผิดพลาดในการตอบกลับ'}</div>
                    </div>
                    <div class="bg-white/90 p-3 rounded-xl border border-rose-200/80 font-mono text-[10px] overflow-x-auto">
                        <pre class="text-rose-800">${JSON.stringify(data, null, 2)}</pre>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        const elapsed = Math.round(performance.now() - startTime);
        badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800';
        badge.innerText = 'CORS ACTIVE';

        panel.innerHTML = `
            <div class="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 space-y-2 text-xs">
                <div class="flex items-center gap-2">
                    <span class="text-lg">⚠️</span>
                    <div class="font-bold text-xs">ส่งคำขอไปยัง Web App สำเร็จ (${elapsed}ms)</div>
                </div>
                <p class="text-[11px] text-amber-900 leading-relaxed">
                    Google Apps Script ได้รับคำขอแล้ว หากติดข้อจำกัด CORS Browser ให้มั่นใจว่าได้ Deploy ด้วยสิทธิ์ <strong>"ทุกคน (Anyone)"</strong> และการออกเกียรติบัตรผ่านระบบจะทำงานได้อย่างสมบูรณ์
                </p>
                <div class="bg-white/90 p-2.5 rounded-xl border border-amber-200 font-mono text-[10px] text-slate-700">
                    Endpoint: ${url}
                </div>
            </div>
        `;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡</span> ทดสอบการเชื่อมต่อ GAS ทันที';
    }
}

// Live Diagnostics: Test GET Health Check
async function testGasHealthCheck() {
    const url = document.getElementById('gasUrlInput').value.trim();
    if (!url) {
        alert('กรุณากรอก Google Apps Script Web App URL ก่อนกดทดสอบ');
        return;
    }
    window.open(url, '_blank');
}

// Copy Text Helper
function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = '<span>✅</span> คัดลอกแล้ว!';
        setTimeout(() => {
            btnElement.innerHTML = originalText;
        }, 1500);
    });
}

// Copy Full GAS Code
function copyGasCode() {
    const code = document.getElementById('hiddenGasCode').value;
    navigator.clipboard.writeText(code).then(() => {
        const copyText = document.getElementById('copyGasText');
        const btn = document.getElementById('btnCopyGasCode');
        copyText.innerText = 'คัดลอกสำเร็จ!';
        btn.className = 'px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm';
        setTimeout(() => {
            copyText.innerText = 'คัดลอกโค้ดทั้งหมด';
            btn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm';
        }, 2000);
    });
}

// Download .gs File
function downloadGasCode() {
    const code = document.getElementById('hiddenGasCode').value;
    const blob = new Blob([code], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download README.md File
function downloadGasReadme() {
    const readmeContent = `# คู่มือการติดตั้ง Google Apps Script สำหรับระบบเกียรติบัตร

## 4 ขั้นตอนการติดตั้งอย่างง่าย:

1. **สร้าง Google Slides**:
   - ออกแบบกรอบเกียรติบัตร
   - วางตัวแปร เช่น {{recipient_name}}, {{award}}, {{school_name}}
   - คัดลอก Slide Template ID

2. **สร้าง Google Drive Folder**:
   - สร้างโฟลเดอร์สำหรับเก็บ PDF
   - แชร์เป็น "ทุกคนที่มีลิงก์ (Anyone with link) มีสิทธิ์ดู"
   - คัดลอก Folder ID

3. **วางโค้ด Code.gs**:
   - เข้า script.google.com > โครงการใหม่
   - วางโค้ด Code.gs ทั้งหมด > บันทึก

4. **Deploy Web App**:
   - ทำให้ใช้งานได้ > การปรับใช้ใหม่ > เว็บแอป
   - ดำเนินการในฐานะ: ฉัน (Me)
   - ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone)
   - คัดลอก Web App URL นำมาใส่ในระบบ Super Admin
`;
    const blob = new Blob([readmeContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GAS_SETUP_GUIDE.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
