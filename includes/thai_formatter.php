<?php
/**
 * ==============================================================================
 * ไฟล์: includes/thai_formatter.php
 * คำอธิบาย: ฟังก์ชันจัดรูปแบบภาษาไทย ระดับชั้นการศึกษา 3 ระดับ และการแข่งขันกีฬา/กรีฑา
 * ==============================================================================
 */

if (!defined('STANDARD_LEVEL_KINDERGARTEN')) {
    define('STANDARD_LEVEL_KINDERGARTEN', 'ระดับชั้นอนุบาล');
    define('STANDARD_LEVEL_PRIMARY', 'ระดับชั้นประถมศึกษา');
    define('STANDARD_LEVEL_SECONDARY', 'ระดับชั้นมัธยมศึกษาตอนต้น');
}

/**
 * ปรับระดับชั้นให้อยู่ใน 3 ระดับชั้นมาตรฐาน
 */
function normalizeEducationLevel(?string $level): string {
    if (empty($level)) {
        return STANDARD_LEVEL_PRIMARY;
    }

    $raw = trim($level);

    // อนุบาล / ปฐมวัย
    if (preg_match('/(อนุบาล|ปฐมวัย|kindergarten|k\b|preschool|อ\.\s*[1-3]|อ\.[1-3])/ui', $raw)) {
        return STANDARD_LEVEL_KINDERGARTEN;
    }

    // มัธยมศึกษาตอนต้น / ขยายโอกาส
    if (preg_match('/(มัธยม|ม\.ต้น|ม\.\s*[1-3]|ม\.[1-3]|secondary|junior\s*high|grade\s*[7-9])/ui', $raw)) {
        return STANDARD_LEVEL_SECONDARY;
    }

    // ประถมศึกษา
    if (preg_match('/(ประถม|ป\.\s*[1-6]|ป\.[1-6]|primary|elementary|grade\s*[1-6])/ui', $raw)) {
        return STANDARD_LEVEL_PRIMARY;
    }

    return STANDARD_LEVEL_PRIMARY;
}

/**
 * ตรวจสอบว่าเป็นกีฬาประเภทกรีฑาหรือไม่
 */
function isAthleticsSport(?string $sportName): bool {
    if (empty($sportName)) return false;
    return (bool)preg_match('/(กรีฑา|athletics|track\s*&\s*field|ลู่-ลาน|ลู่และลาน|วิ่ง|ขว้าง|ทุ่ม|พุ่ง|กระโดด)/ui', $sportName);
}

/**
 * ตัดคำนำหน้าออกเพื่อให้ได้ชื่อกีฬาแกนหลัก
 */
function getCleanSportName(?string $sportName): string {
    if (empty($sportName)) return 'กีฬา';
    $name = trim($sportName);
    $name = preg_replace('/^[A-Za-z0-9_\-\.\:\/]+\s*[:\-\|]\s*/u', '', $name);
    $name = preg_replace('/^(ประเภทกีฬา|ชนิดกีฬา|กีฬา)\s*/ui', '', $name);
    $name = preg_replace('/\[.*?\]|\(.*?\)/u', '', $name);
    $name = trim($name);
    return !empty($name) ? $name : 'กีฬา';
}

/**
 * คำนำหน้าชื่อกีฬาสำหรับเกียรติบัตร
 */
function formatSportNameWithPrefix(?string $sportName): string {
    $clean = getCleanSportName($sportName);
    if (isAthleticsSport($clean)) {
        return 'กรีฑา';
    }
    return 'กีฬา' . $clean;
}

/**
 * แปลงเพศเป็นป้ายกำกับมาตรฐาน:
 * - FEMALE / หญิง -> [ทีมหญิง]
 * - MIXED / ผสม -> [ทีมผสม]
 * - MALE / ชาย -> [ทีมชาย]
 */
function formatEventGenderTag(?string $gender = 'MALE', ?string $rawContext = ''): string {
    $g = strtoupper(trim($gender ?? ''));
    $ctx = trim($rawContext ?? '');

    if (
        $g === 'FEMALE' || 
        $g === 'F' || 
        $g === 'WOMEN' || 
        $g === 'GIRL' || 
        $g === 'GIRLS' || 
        mb_strpos($ctx, 'ทีมหญิง') !== false || 
        mb_strpos($ctx, '[ทีมหญิง]') !== false || 
        mb_strpos($ctx, '(หญิง)') !== false || 
        mb_strpos($ctx, '[หญิง]') !== false || 
        mb_strpos($ctx, ' หญิง') !== false ||
        preg_match('/หญิง$/u', $ctx)
    ) {
        return '[ทีมหญิง]';
    }

    if (
        $g === 'MIXED' || 
        $g === 'MIX' || 
        mb_strpos($ctx, 'ทีมผสม') !== false || 
        mb_strpos($ctx, '[ทีมผสม]') !== false || 
        mb_strpos($ctx, '(ผสม)') !== false || 
        mb_strpos($ctx, '[ผสม]') !== false || 
        mb_strpos($ctx, ' ผสม') !== false ||
        preg_match('/ผสม$/u', $ctx)
    ) {
        return '[ทีมผสม]';
    }

    return '[ทีมชาย]';
}

/**
 * สกัดเฉพาะชื่อกีฬาหรือรายการกรีฑาหลัก โดยลบคำภาษาอังกฤษ รหัส และคำซ้ำซ้อนออก
 * เช่น "กีฬาฟุตบอลระดับชั้นประถมศึกษา" -> "ฟุตบอล"
 * เช่น "FB-M-PRI: กีฬาฟุตบอลระดับชั้นประถมศึกษา[ระดับชั้นประถมศึกษา]" -> "ฟุตบอล"
 * เช่น "วิ่ง 50 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]" -> "วิ่ง 50 เมตร"
 */
function extractPureSportOrEventName(?string $rawName, ?string $rawSportName = ''): string {
    if (empty($rawName) && empty($rawSportName)) return 'กีฬา';
    $str = trim((string)($rawName ?: ''));

    // 1. ลบรหัสภาษาอังกฤษด้านหน้า เช่น "FB-M-PRI: ", "ATH-01 - ", "EV-123 | "
    $str = preg_replace('/^[A-Za-z0-9_\-\.\:\/]+\s*[:\-\|]\s*/u', '', $str);
    $str = preg_replace('/^[A-Za-z0-9_\-\/]{2,12}\s+/u', '', $str);

    // 2. ลบภาษาอังกฤษในวงเล็บ เช่น (Football), (Volleyball), (Athletics)
    $str = preg_replace('/\([A-Za-z0-9\s\/\-\.]+\)/u', '', $str);

    // 3. ตรวจสอบรายการกรีฑาเฉพาะเจาะจงก่อน
    if (preg_match('/(วิ่งผลัด\s*\d+\s*[x×]\s*\d+\s*เมตร|วิ่ง\s*[\d,]+\s*เมตร|กระโดดไกล|กระโดดสูง|ทุ่มน้ำหนัก|ขว้างจักร|พุ่งแหลน|เขย่งก้าวกระโดด)/ui', $str, $athMatch)) {
        $found = str_replace('×', 'x', $athMatch[1]);
        return preg_replace('/\s+/u', ' ', trim($found));
    }

    $isAth = isAthleticsSport($rawSportName) || isAthleticsSport($str);

    // 4. ลบแท็กก้ามปูทั้งหมด [ระดับชั้น...], [ทีมหญิง], [ทีมชาย] ฯลฯ
    $str = preg_replace('/\[.*?\]/u', '', $str);

    // 5. ลบวงเล็บทั้งหมด
    $str = preg_replace('/\(.*?\)/u', '', $str);

    // 6. ลบคำนำหน้า "ประเภทกีฬา", "ชนิดกีฬา", "ประเภทกรีฑา", "กรีฑา - ", "กีฬา", "ประเภท"
    $str = preg_replace('/^(ประเภทกีฬา|ชนิดกีฬา|ประเภทกรีฑา|กรีฑา\s*-\s*|กีฬา|ประเภท)\s*/u', '', $str);

    // 7. ลบคำระบุระดับชั้นการศึกษาซ้ำซ้อน
    $str = preg_replace('/(ระดับชั้นมัธยมศึกษาตอนต้น|ระดับชั้นประถมศึกษา|ระดับชั้นอนุบาล|ระดับมัธยมศึกษาตอนต้น|ระดับประถมศึกษา|ระดับอนุบาล|มัธยมศึกษาตอนต้น|ประถมศึกษา|อนุบาล|ปฐมวัย|รุ่น\s*ป\.\s*\d+\s*-\s*ป\.\s*\d+|รุ่น\s*ม\.\s*\d+\s*-\s*ม\.\s*\d+|ป\.\s*\d+\s*-\s*ป\.\s*\d+|ม\.\s*\d+\s*-\s*ม\.\s*\d+|อ\.\s*\d+\s*-\s*อ\.\s*\d+|ป\.\d+-\d+|ม\.\d+-\d+)/u', '', $str);

    // 8. ลบคำระบุเพศซ้ำซ้อน
    $str = preg_replace('/(ทีมชาย|ทีมหญิง|ทีมผสม|ชาย|หญิง|ผสม)/u', '', $str);

    // 9. ตัดเครื่องหมายและช่องว่างหัวท้าย
    $str = preg_replace('/^[\s\-_:\|\.]+|[\s\-_:\|\.]+$/u', '', $str);
    $str = trim($str);

    if (empty($str) || $str === 'กีฬา' || $str === 'กรีฑา') {
        if (!empty($rawSportName)) {
            $spClean = explode('(', (string)$rawSportName)[0];
            $spClean = preg_replace('/^[A-Za-z0-9_\-\.\:\/]+\s*[:\-\|]\s*/u', '', $spClean);
            $spClean = preg_replace('/^(กีฬา|กรีฑา)/u', '', trim($spClean));
            $spClean = preg_replace('/\[.*?\]|\(.*?\)/u', '', $spClean);
            $spClean = trim($spClean);
            if (!empty($spClean)) return $spClean;
        }
        return $isAth ? 'วิ่ง 100 เมตร' : 'ฟุตบอล';
    }

    return $str;
}

/**
 * จัดรูปแบบชื่อรายการแข่งขันตามมาตรฐานระบบ:
 * รูปแบบ: "{ชื่อกีฬาหรือกรีฑา}[ทีมหญิง/ทีมชาย][ระดับชั้น...]"
 * เช่น: "วิ่ง 50 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]"
 * เช่น: "ฟุตบอล[ทีมชาย][ระดับชั้นประถมศึกษา]"
 */
function formatEventDisplay(string $sportName, string $grade, string $athleticsItem = '', string $gender = 'MALE'): string {
    $normGrade = normalizeEducationLevel($grade);
    $genderTag = formatEventGenderTag($gender, ($athleticsItem ?: '') . ' ' . $sportName);
    $cleanBase = extractPureSportOrEventName($athleticsItem ?: $sportName, $sportName);

    return "{$cleanBase}{$genderTag}[{$normGrade}]";
}

/**
 * จัดรูปแบบชื่อรายการสำหรับการแสดงผลหน้าจอและการลงทะเบียน
 * รูปแบบ: "{ชื่อกีฬาหรือกรีฑา}[ทีมหญิง/ทีมชาย][ระดับชั้น...]"
 * เช่น: "วิ่ง 50 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]"
 * เช่น: "ฟุตบอล[ทีมชาย][ระดับชั้นประถมศึกษา]"
 */
function formatEventRegistrationDisplay(?string $eventName, ?string $grade = '', ?string $sportName = '', ?string $gender = 'MALE'): string {
    if (empty($eventName) && empty($sportName)) return 'รายการแข่งขัน';
    $raw = (string)($eventName ?: $sportName ?: '');
    $normGrade = normalizeEducationLevel($grade ?: $raw);
    $genderTag = formatEventGenderTag($gender, $raw . ' ' . ($sportName ?: ''));
    $cleanBase = extractPureSportOrEventName($raw, $sportName);

    return "{$cleanBase}{$genderTag}[{$normGrade}]";
}

/**
 * รายการกรีฑามาตรฐาน (Athletics Presets)
 */
function getAthleticsPresets(): array {
    return [
        ['name' => 'วิ่ง 50 เมตร', 'category' => 'RUN', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'วิ่ง 60 เมตร', 'category' => 'RUN', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'วิ่ง 80 เมตร', 'category' => 'RUN', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'วิ่ง 100 เมตร', 'category' => 'RUN', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'วิ่ง 200 เมตร', 'category' => 'RUN', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'วิ่ง 400 เมตร', 'category' => 'RUN', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'วิ่ง 800 เมตร', 'category' => 'RUN', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'วิ่ง 1,500 เมตร', 'category' => 'RUN', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'วิ่งผลัด 4 x 50 เมตร', 'category' => 'RELAY', 'type' => 'TEAM', 'min_players' => 4, 'max_players' => 6],
        ['name' => 'วิ่งผลัด 4 x 100 เมตร', 'category' => 'RELAY', 'type' => 'TEAM', 'min_players' => 4, 'max_players' => 6],
        ['name' => 'วิ่งผลัด 4 x 200 เมตร', 'category' => 'RELAY', 'type' => 'TEAM', 'min_players' => 4, 'max_players' => 6],
        ['name' => 'วิ่งผลัด 4 x 400 เมตร', 'category' => 'RELAY', 'type' => 'TEAM', 'min_players' => 4, 'max_players' => 6],
        ['name' => 'วิ่งผลัด 8 x 50 เมตร', 'category' => 'RELAY', 'type' => 'TEAM', 'min_players' => 8, 'max_players' => 10],
        ['name' => 'กระโดดไกล', 'category' => 'FIELD', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'กระโดดสูง', 'category' => 'FIELD', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'ทุ่มน้ำหนัก', 'category' => 'FIELD', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'ขว้างจักร', 'category' => 'FIELD', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'พุ่งแหลน', 'category' => 'FIELD', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
        ['name' => 'เขย่งก้าวกระโดด', 'category' => 'FIELD', 'type' => 'INDIVIDUAL', 'min_players' => 1, 'max_players' => 1],
    ];
}

/**
 * ลำดับความสำคัญของระดับชั้นการศึกษา:
 * 1. ระดับชั้นอนุบาล (0)
 * 2. ระดับชั้นประถมศึกษา (1)
 * 3. ระดับชั้นมัธยมศึกษาตอนต้น (2)
 */
function getEducationLevelWeight(?string $grade): int {
    $norm = normalizeEducationLevel($grade);
    if ($norm === STANDARD_LEVEL_KINDERGARTEN) return 0;
    if ($norm === STANDARD_LEVEL_PRIMARY) return 1;
    if ($norm === STANDARD_LEVEL_SECONDARY) return 2;
    return 99;
}

/**
 * ลำดับความสำคัญของเพศ:
 * 1. ชาย / MALE (0)
 * 2. ผสม / MIXED (1)
 * 3. หญิง / FEMALE (2)
 */
function getGenderWeight(?string $gender, ?string $eventName = ''): int {
    $g = strtoupper(trim($gender ?? ''));
    $name = (string)($eventName ?? '');
    if ($g === 'MALE' || mb_strpos($name, '[ทีมชาย]') !== false || mb_strpos($name, 'ชาย') !== false) {
        if (mb_strpos($name, 'หญิง') === false && mb_strpos($name, 'ผสม') === false) {
            return 0;
        }
    }
    if ($g === 'MIXED' || mb_strpos($name, '[ทีมผสม]') !== false || mb_strpos($name, 'ผสม') !== false) {
        return 1;
    }
    if ($g === 'FEMALE' || mb_strpos($name, '[ทีมหญิง]') !== false || mb_strpos($name, 'หญิง') !== false) {
        return 2;
    }
    return 0;
}

/**
 * เปรียบเทียบลำดับรายการแข่งขัน:
 * 1. อนุบาล -> ประถมศึกษา -> มัธยมศึกษา
 * 2. ชาย (ด้านบน) -> ผสม -> หญิง (ด้านล่าง)
 * 3. เรียงตามชื่อรายการ
 */
function compareEventsForSort(array $a, array $b): int {
    // 1. ระดับชั้นการศึกษา (อนุบาล -> ประถมศึกษา -> มัธยมศึกษา)
    $gradeA = $a['grade'] ?? $a['age_group'] ?? $a['event_name'] ?? '';
    $gradeB = $b['grade'] ?? $b['age_group'] ?? $b['event_name'] ?? '';
    $wGradeA = getEducationLevelWeight($gradeA);
    $wGradeB = getEducationLevelWeight($gradeB);
    if ($wGradeA !== $wGradeB) {
        return $wGradeA <=> $wGradeB;
    }

    // 2. เพศ (ชายอยู่ด้านบน หญิงอยู่ด้านล่าง)
    $genA = $a['gender'] ?? '';
    $genB = $b['gender'] ?? '';
    $nameA = $a['event_name'] ?? '';
    $nameB = $b['event_name'] ?? '';
    $wGenA = getGenderWeight($genA, $nameA);
    $wGenB = getGenderWeight($genB, $nameB);
    if ($wGenA !== $wGenB) {
        return $wGenA <=> $wGenB;
    }

    // 3. ชื่อรายการ
    return strcmp($nameA, $nameB);
}

/**
 * จัดเรียงอาร์เรย์รายการแข่งขันตามลำดับมาตรฐาน
 */
function sortEventsList(array $eventsList): array {
    $sorted = $eventsList;
    usort($sorted, 'compareEventsForSort');
    return $sorted;
}
