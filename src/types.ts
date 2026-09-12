export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SCHOOL' | 'JUDGE';

export type RegistrationStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED';

export type CompetitionStatus = 'PREPARATION' | 'OPEN_REGISTRATION' | 'CLOSED_REGISTRATION' | 'COMPETING' | 'SUMMARIZING' | 'CLOSED';

export type MedalType = 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';

export interface Competition {
  id: string;
  year: number; // e.g. 2569
  academic_year?: string; // e.g. 2569
  competition_name: string;
  start_date: string;
  end_date: string;
  venue: string;
  status: CompetitionStatus;
  host_org: string;
  header_bg_image?: string; // Custom Header Banner Image URL or base64
  google_drive_folder_id?: string; // Google Drive target folder ID
  google_slide_template_id?: string; // Google Slide template ID for certificate generation (legacy fallback)
  google_slide_template_student_id?: string; // Google Slide template ID for students
  google_slide_template_coach_id?: string; // Google Slide template ID for coaches/teachers
  google_apps_script_url?: string; // Google Apps Script Web App Deployment URL
  president_name?: string;
  director_name?: string;
  cert_prefix?: string;
  medal_criteria?: 'GOLD_FIRST' | 'TOTAL_FIRST';
  created_at: string;
}

export interface School {
  id: string;
  competition_id: string;
  school_code: string; // SMIS 8 digits e.g. 31030064
  smis_code?: string; // Explicit SMIS alias
  school_name: string;
  short_name: string;
  address: string;
  phone: string;
  logo: string;
  status: 'ACTIVE' | 'INACTIVE';
  director_name?: string;
  created_at: string;
}

export interface User {
  id: string;
  school_id?: string; // null for SUPER_ADMIN, ADMIN, JUDGE (unless assigned)
  username: string; // For school admin, SMIS 8 digits e.g. 31030064
  password_hash: string; // bcrypt simulation
  password_plain?: string; // For simulated display/reset
  full_name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  must_change_password?: boolean; // True by default for school accounts until changed
  phone?: string;
  last_login?: string;
  created_at: string;
}

export interface Student {
  id: string;
  competition_id: string;
  school_id: string;
  student_code?: string;
  prefix: 'เด็กชาย' | 'เด็กหญิง' | 'นาย' | 'นางสาว' | string;
  first_name: string;
  last_name: string;
  gender: 'MALE' | 'FEMALE';
  birth_date: string;
  grade: string; // e.g. ป.3, ป.5, ม.2
  class_room?: string;
  id_card?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Coach {
  id: string;
  competition_id: string;
  school_id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  position: string; // e.g. ผู้ฝึกสอน, ผู้ช่วยผู้ฝึกสอน, ผู้จัดการทีม
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Sport {
  id: string;
  sport_name: string;
  sport_icon: string;
  description: string;
  category: 'BALL' | 'TRACK' | 'RACQUET' | 'COMBAT' | 'TRADITIONAL' | 'OTHER';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Event {
  id: string;
  competition_id: string;
  sport_id: string;
  event_code: string;
  event_name: string;
  gender: 'MALE' | 'FEMALE' | 'MIXED';
  age_group: string; // e.g. ไม่เกิน 12 ปี, ประถมศึกษา, มัธยมศึกษาตอนต้น
  grade: string; // e.g. ป.1-3, ป.4-6, ม.1-3
  competition_type: 'INDIVIDUAL' | 'TEAM';
  award_type: string; // e.g. เหรียญรางวัล ทอง เงิน ทองแดง
  max_players: number;
  min_players: number;
  status: 'OPEN' | 'LOCKED' | 'COMPLETED';
  created_at: string;
}

export interface Registration {
  id: string;
  competition_id: string;
  event_id: string;
  school_id: string;
  coach_id?: string;
  secondary_coach_id?: string;
  coach_ids?: string[];
  registration_status: RegistrationStatus;
  note?: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
}

export interface RegistrationStudent {
  id: string;
  registration_id: string;
  student_id: string;
  jersey_number?: number;
  created_at: string;
}

export interface Result {
  id: string;
  competition_id: string;
  event_id: string;
  school_id: string;
  rank: 1 | 2 | 3 | 4;
  award: string; // e.g. ชนะเลิศ, รองชนะเลิศอันดับ 1, รองชนะเลิศอันดับ 2, ชมเชย
  medal: MedalType;
  score?: string;
  note?: string;
  recorded_by: string;
  recorded_at: string;
  status: 'CONFIRMED' | 'DRAFT';
  created_at: string;
}

export interface Certificate {
  id: string;
  competition_id: string;
  certificate_no: string; // e.g. สสก.2569-00001
  recipient_type: 'STUDENT' | 'COACH';
  recipient_id: string;
  recipient_name: string;
  school_id: string;
  school_name: string;
  event_id: string;
  event_name: string;
  sport_name: string;
  result_id: string;
  award: string;
  medal: MedalType;
  issue_date: string;
  template_type: 'STUDENT' | 'COACH';
  drive_file_id?: string;
  drive_url?: string;
  qr_token: string;
  status: 'ISSUED' | 'REVOKED';
  created_at: string;
}

export interface Setting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_name: string;
  action: string;
  table_name: string;
  record_id?: string;
  details?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export type Log = ActivityLog;

export interface CertificateTemplate {
  id: string;
  name: string;
  type: 'STUDENT' | 'COACH';
  title_text: string;
  body_format: string;
  signatory_name: string;
  signatory_position: string;
  signatory_name_2?: string;
  signatory_position_2?: string;
  logo_url: string;
  border_theme: 'ROYAL_GOLD' | 'BLUE_ELEGANT' | 'EMERALD_ACADEMIC';
}

export interface SchoolMedalSummary {
  school_id: string;
  school_name: string;
  short_name: string;
  logo: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  rank: number;
}

export interface MatchReport {
  id: string;
  competition_id: string;
  sport_id: string;
  sport_name: string;
  event_name: string; // e.g. ฟุตบอล 7 คน ชาย (ป.1-6)
  team_1_school_id: string;
  team_1_school_name: string;
  team_1_score: number;
  team_2_school_id: string;
  team_2_school_name: string;
  team_2_score: number;
  winner_school_id?: string; // empty if draw
  match_date: string; // YYYY-MM-DD
  match_time?: string; // e.g. 09:30
  round_name: string; // e.g. รอบแรก, รอบ 8 ทีม, รอบรองชนะเลิศ, ชิงชนะเลิศ
  summary_text: string; // e.g. โรงเรียนบ้านสว่าง ชนะ โรงเรียนบ้านหนองหว้า 3 ต่อ 0
  reporter_name: string;
  status: 'LIVE' | 'COMPLETED';
  created_at: string;
}

