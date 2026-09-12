export function toThaiNumerals(numStr: string | number): string {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(numStr).replace(/[0-9]/g, (digit) => thaiDigits[parseInt(digit, 10)]);
}

export function formatThaiDate(dateStr: string, useThaiNumerals = false): string {
  if (!dateStr) return '';
  const months = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม'
  ];

  try {
    const match = String(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const year = parseInt(match[1], 10) + 543;
      const monthIndex = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const month = months[monthIndex] || '';
      const formatted = `${day} ${month} ${year}`;
      return useThaiNumerals ? toThaiNumerals(formatted) : formatted;
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543;

    const formatted = `${day} ${month} ${year}`;
    return useThaiNumerals ? toThaiNumerals(formatted) : formatted;
  } catch {
    return dateStr;
  }
}

export function formatThaiDateRange(startDateStr?: string, endDateStr?: string, useThaiNumerals = false): string {
  if (!startDateStr && !endDateStr) return '';
  if (startDateStr && !endDateStr) return formatThaiDate(startDateStr, useThaiNumerals);
  if (!startDateStr && endDateStr) return formatThaiDate(endDateStr, useThaiNumerals);

  const start = formatThaiDate(startDateStr!, useThaiNumerals);
  const end = formatThaiDate(endDateStr!, useThaiNumerals);
  return `${start} ถึง ${end}`;
}

/**
 * 3 Standard Education Levels strictly requested:
 * 1. ระดับชั้นอนุบาล
 * 2. ระดับชั้นประถมศึกษา
 * 3. ระดับชั้นมัธยมศึกษาตอนต้น
 */
export const STANDARD_EDUCATION_LEVELS = [
  'ระดับชั้นอนุบาล',
  'ระดับชั้นประถมศึกษา',
  'ระดับชั้นมัธยมศึกษาตอนต้น'
] as const;

export type StandardEducationLevel = (typeof STANDARD_EDUCATION_LEVELS)[number];

/**
 * Predefined Athletics (กรีฑา) Events
 */
export interface AthleticsPreset {
  name: string;
  type: 'INDIVIDUAL' | 'TEAM';
  minPlayers: number;
  maxPlayers: number;
  category: 'RUN' | 'RELAY' | 'FIELD';
}

export const ATHLETICS_PRESET_EVENTS: AthleticsPreset[] = [
  // วิ่งเดี่ยว
  { name: 'วิ่ง 50 เมตร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'RUN' },
  { name: 'วิ่ง 60 เมตร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'RUN' },
  { name: 'วิ่ง 80 เมตร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'RUN' },
  { name: 'วิ่ง 100 เมตร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'RUN' },
  { name: 'วิ่ง 200 เมตร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'RUN' },
  { name: 'วิ่ง 400 เมตร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'RUN' },
  { name: 'วิ่ง 800 เมตร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'RUN' },
  { name: 'วิ่ง 1,500 เมตร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'RUN' },
  
  // วิ่งผลัด
  { name: 'วิ่งผลัด 4 x 50 เมตร', type: 'TEAM', minPlayers: 4, maxPlayers: 6, category: 'RELAY' },
  { name: 'วิ่งผลัด 4 x 100 เมตร', type: 'TEAM', minPlayers: 4, maxPlayers: 6, category: 'RELAY' },
  { name: 'วิ่งผลัด 4 x 200 เมตร', type: 'TEAM', minPlayers: 4, maxPlayers: 6, category: 'RELAY' },
  { name: 'วิ่งผลัด 4 x 400 เมตร', type: 'TEAM', minPlayers: 4, maxPlayers: 6, category: 'RELAY' },
  { name: 'วิ่งผลัด 8 x 50 เมตร', type: 'TEAM', minPlayers: 8, maxPlayers: 10, category: 'RELAY' },
  
  // ลาน / ฟิลด์
  { name: 'กระโดดไกล', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'FIELD' },
  { name: 'กระโดดสูง', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'FIELD' },
  { name: 'ทุ่มน้ำหนัก', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'FIELD' },
  { name: 'ขว้างจักร', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'FIELD' },
  { name: 'พุ่งแหลน', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'FIELD' },
  { name: 'เขย่งก้าวกระโดด', type: 'INDIVIDUAL', minPlayers: 1, maxPlayers: 1, category: 'FIELD' },
];

/**
 * Checks if a sport is Athletics (กรีฑา)
 */
export function isAthleticsSport(sportName?: string): boolean {
  if (!sportName) return false;
  const s = sportName.trim().toLowerCase();
  return s.includes('กรีฑา') || s.includes('athletic') || s.includes('track') || s.includes('วิ่ง');
}

/**
 * Normalizes education level to strictly one of the 3 requested tiers:
 * - 'ระดับชั้นอนุบาล'
 * - 'ระดับชั้นประถมศึกษา'
 * - 'ระดับชั้นมัธยมศึกษาตอนต้น'
 */
export function normalizeEducationLevel(grade?: string): StandardEducationLevel {
  if (!grade) return 'ระดับชั้นประถมศึกษา';
  const g = grade.trim();
  if (g.includes('อนุบาล') || g.includes('ปฐมวัย') || g.startsWith('อ.') || g.toLowerCase().includes('kindergarten')) {
    return 'ระดับชั้นอนุบาล';
  }
  if (g.includes('มัธยม') || g.startsWith('ม.') || g.toLowerCase().includes('secondary')) {
    return 'ระดับชั้นมัธยมศึกษาตอนต้น';
  }
  return 'ระดับชั้นประถมศึกษา';
}

/**
 * Clean sport name without English or 'กีฬา' prefix
 * e.g. "ฟุตบอล (Football)" -> "ฟุตบอล", "กีฬาวอลเลย์บอล" -> "วอลเลย์บอล"
 */
export function getCleanSportName(sportName?: string): string {
  if (!sportName) return 'กีฬา';
  let clean = sportName.split('(')[0].trim();
  clean = clean.replace(/^[A-Za-z0-9_\-\.\:\/]+\s*[:\-\|]\s*/g, '');
  clean = clean.replace(/^กีฬา/, '').trim();
  clean = clean.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
  return clean || 'กีฬา';
}

/**
 * Standardizes sport name to have 'กีฬา' or 'กรีฑา' prefix if missing
 */
export function formatSportNameWithPrefix(sportName?: string): string {
  if (!sportName) return 'กีฬา';
  const clean = getCleanSportName(sportName);
  if (clean.startsWith('กรีฑา')) return clean;
  return `กีฬา${clean}`;
}

/**
 * Normalizes gender to standard display tag:
 * - 'FEMALE' / 'หญิง' -> '[ทีมหญิง]'
 * - 'MIXED' / 'ผสม' -> '[ทีมผสม]'
 * - 'MALE' / 'ชาย' -> '[ทีมชาย]'
 */
export function formatEventGenderTag(gender?: string, rawContext?: string): string {
  const g = (gender || '').trim().toUpperCase();
  const ctx = (rawContext || '').trim();

  if (
    g === 'FEMALE' || 
    g === 'F' || 
    g === 'WOMEN' || 
    g === 'GIRL' || 
    g === 'GIRLS' || 
    ctx.includes('ทีมหญิง') || 
    ctx.includes('[ทีมหญิง]') || 
    ctx.includes('(หญิง)') || 
    ctx.includes('[หญิง]') || 
    ctx.includes(' หญิง') ||
    ctx.endsWith('หญิง')
  ) {
    return '[ทีมหญิง]';
  }

  if (
    g === 'MIXED' || 
    g === 'MIX' || 
    ctx.includes('ทีมผสม') || 
    ctx.includes('[ทีมผสม]') || 
    ctx.includes('(ผสม)') || 
    ctx.includes('[ผสม]') || 
    ctx.includes(' ผสม') ||
    ctx.endsWith('ผสม')
  ) {
    return '[ทีมผสม]';
  }

  // Default to MALE
  return '[ทีมชาย]';
}

/**
 * Extracts pure sport or event item name without English prefixes,
 * redundant level strings, or duplicate brackets.
 * e.g. "กีฬาฟุตบอลระดับชั้นประถมศึกษา" -> "ฟุตบอล"
 * e.g. "FB-M-PRI: กีฬาฟุตบอลระดับชั้นประถมศึกษา[ระดับชั้นประถมศึกษา]" -> "ฟุตบอล"
 * e.g. "วิ่ง 50 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]" -> "วิ่ง 50 เมตร"
 */
export function extractPureSportOrEventName(rawName?: string, rawSportName?: string): string {
  if (!rawName && !rawSportName) return 'กีฬา';
  let str = (rawName || '').trim();

  // 1. Remove English prefix/code at the start: e.g. "FB-M-PRI: ", "ATH-01 - ", "EV-123 | "
  str = str.replace(/^[A-Za-z0-9_\-\.\:\/]+\s*[:\-\|]\s*/g, '');
  str = str.replace(/^[A-Za-z0-9_\-\/]{2,12}\s+/g, '');

  // 2. Remove parenthesized English: e.g. (Football), (Volleyball), (Athletics), (Sepak Takraw)
  str = str.replace(/\([A-Za-z0-9\s\/\-\.]+\)/g, '');

  // 3. Athletics specific check first
  const athleticsMatch = str.match(/(วิ่งผลัด\s*\d+\s*[x×]\s*\d+\s*เมตร|วิ่ง\s*[\d,]+\s*เมตร|กระโดดไกล|กระโดดสูง|ทุ่มน้ำหนัก|ขว้างจักร|พุ่งแหลน|เขย่งก้าวกระโดด)/i);
  if (athleticsMatch) {
    return athleticsMatch[1].replace(/×/g, 'x').replace(/\s+/g, ' ').trim();
  }

  const isAth = isAthleticsSport(rawSportName) || isAthleticsSport(str);

  // 4. Remove all bracketed tags: [ระดับชั้น...], [ทีมหญิง], [ทีมชาย], etc.
  str = str.replace(/\[.*?\]/g, '');

  // 5. Remove all parentheses
  str = str.replace(/\(.*?\)/g, '');

  // 6. Remove leading prefixes: "ประเภทกีฬา", "ชนิดกีฬา", "ประเภทกรีฑา", "กรีฑา - ", "กีฬา", "ประเภท"
  str = str.replace(/^(ประเภทกีฬา|ชนิดกีฬา|ประเภทกรีฑา|กรีฑา\s*-\s*|กีฬา|ประเภท)\s*/g, '');

  // 7. Remove trailing or embedded redundant educational level strings
  str = str.replace(/(ระดับชั้นมัธยมศึกษาตอนต้น|ระดับชั้นประถมศึกษา|ระดับชั้นอนุบาล|ระดับมัธยมศึกษาตอนต้น|ระดับประถมศึกษา|ระดับอนุบาล|มัธยมศึกษาตอนต้น|ประถมศึกษา|อนุบาล|ปฐมวัย|รุ่น\s*ป\.\s*\d+\s*-\s*ป\.\s*\d+|รุ่น\s*ม\.\s*\d+\s*-\s*ม\.\s*\d+|ป\.\s*\d+\s*-\s*ป\.\s*\d+|ม\.\s*\d+\s*-\s*ม\.\s*\d+|อ\.\s*\d+\s*-\s*อ\.\s*\d+|ป\.\d+-\d+|ม\.\d+-\d+)/g, '');

  // 8. Remove trailing or embedded redundant gender strings
  str = str.replace(/(ทีมชาย|ทีมหญิง|ทีมผสม|ชาย|หญิง|ผสม)/g, '');

  // 9. Remove extra punctuation and whitespace
  str = str.replace(/^[\s\-_:\|\.]+|[\s\-_:\|\.]+$/g, '').trim();

  // If string becomes empty or is just 'กีฬา' or 'กรีฑา', use clean sport name
  if (!str || str === 'กีฬา' || str === 'กรีฑา') {
    if (rawSportName) {
      let spClean = rawSportName.split('(')[0].trim();
      spClean = spClean.replace(/^[A-Za-z0-9_\-\.\:\/]+\s*[:\-\|]\s*/g, '');
      spClean = spClean.replace(/^กีฬา/, '').replace(/^กรีฑา/, '').trim();
      spClean = spClean.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
      if (spClean) return spClean;
    }
    return isAth ? 'วิ่ง 100 เมตร' : 'ฟุตบอล';
  }

  return str;
}

/**
 * Standardizes display format for an event:
 * - Format: "{ชื่อกีฬาหรือกรีฑา}[ทีมหญิง/ทีมชาย][ระดับชั้น...]"
 * - Example: "วิ่ง 50 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]"
 * - Example: "ฟุตบอล[ทีมชาย][ระดับชั้นประถมศึกษา]"
 */
export function formatEventDisplay(
  sportName: string,
  grade: string,
  customDetail?: string,
  gender?: string
): string {
  const level = normalizeEducationLevel(grade);
  const genderTag = formatEventGenderTag(gender, `${customDetail || ''} ${sportName}`);
  const cleanBase = extractPureSportOrEventName(customDetail || sportName, sportName);

  return `${cleanBase}${genderTag}[${level}]`;
}

/**
 * Formats event name for school registration cards, tables & select dropdowns
 * - Format: "{ชื่อกีฬาหรือกรีฑา}[ทีมหญิง/ทีมชาย][ระดับชั้น...]"
 * - Example: "วิ่ง 50 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]"
 * - Example: "ฟุตบอล[ทีมชาย][ระดับชั้นประถมศึกษา]"
 */
export function formatEventRegistrationDisplay(
  eventName?: string,
  grade?: string,
  sportName?: string,
  gender?: string
): string {
  if (!eventName && !sportName) return 'รายการแข่งขัน';
  const raw = eventName || sportName || '';
  const level = normalizeEducationLevel(grade || raw);
  const genderTag = formatEventGenderTag(gender, `${raw} ${sportName || ''}`);
  const cleanBase = extractPureSportOrEventName(raw, sportName);

  return `${cleanBase}${genderTag}[${level}]`;
}

/**
 * Returns numeric priority for grade/level sorting:
 * 1. ระดับชั้นอนุบาล (0)
 * 2. ระดับชั้นประถมศึกษา (1)
 * 3. ระดับชั้นมัธยมศึกษาตอนต้น (2)
 */
export function getEducationLevelWeight(grade?: string): number {
  const norm = normalizeEducationLevel(grade);
  const idx = STANDARD_EDUCATION_LEVELS.indexOf(norm);
  return idx >= 0 ? idx : 99;
}

/**
 * Returns numeric priority for gender sorting:
 * 1. MALE / ชาย (0)
 * 2. MIXED / ผสม (1)
 * 3. FEMALE / หญิง (2)
 */
export function getGenderWeight(gender?: string, eventName?: string): number {
  const g = (gender || '').toUpperCase();
  const name = eventName || '';
  if (g === 'MALE' || name.includes('[ทีมชาย]') || name.includes('ชาย')) {
    if (!name.includes('หญิง') && !name.includes('ผสม')) return 0;
  }
  if (g === 'MIXED' || name.includes('[ทีมผสม]') || name.includes('ผสม')) {
    return 1;
  }
  if (g === 'FEMALE' || name.includes('[ทีมหญิง]') || name.includes('หญิง')) {
    return 2;
  }
  return 0; // Default Male
}

/**
 * Comparator function to sort events according to standard requirements:
 * 1. ระดับชั้นอนุบาล -> ระดับชั้นประถมศึกษา -> ระดับชั้นมัธยมศึกษา
 * 2. รายการของผู้ชายอยู่ด้านบน รายการของผู้หญิงอยู่ด้านล่าง (ชาย -> ผสม -> หญิง)
 * 3. เรียงตามรหัสหรือชื่อรายการแข่งขัน
 */
export function compareEventsForSort(
  a: { grade?: string; gender?: string; event_name?: string; event_code?: string; sport_id?: string },
  b: { grade?: string; gender?: string; event_name?: string; event_code?: string; sport_id?: string }
): number {
  // 1. Grade level hierarchy (อนุบาล -> ประถมศึกษา -> มัธยมศึกษา)
  const gradeWeightA = getEducationLevelWeight(a.grade || a.event_name);
  const gradeWeightB = getEducationLevelWeight(b.grade || b.event_name);
  if (gradeWeightA !== gradeWeightB) {
    return gradeWeightA - gradeWeightB;
  }

  // 2. Gender priority (ชายอยู่ด้านบน หญิงอยู่ด้านล่าง: MALE -> MIXED -> FEMALE)
  const genderWeightA = getGenderWeight(a.gender, a.event_name);
  const genderWeightB = getGenderWeight(b.gender, b.event_name);
  if (genderWeightA !== genderWeightB) {
    return genderWeightA - genderWeightB;
  }

  // 3. Event name / code comparison
  const nameA = a.event_name || '';
  const nameB = b.event_name || '';
  return nameA.localeCompare(nameB, 'th');
}

/**
 * Sorts any list of events according to the standard sorting rules
 */
export function sortEventsList<T extends { grade?: string; gender?: string; event_name?: string; event_code?: string; sport_id?: string }>(
  eventList: T[]
): T[] {
  return [...eventList].sort(compareEventsForSort);
}

