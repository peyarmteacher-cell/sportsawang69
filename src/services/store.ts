import {
  Competition,
  School,
  User,
  Student,
  Coach,
  Sport,
  Event,
  Registration,
  RegistrationStudent,
  Result,
  Certificate,
  Setting,
  ActivityLog,
  CertificateTemplate,
  SchoolMedalSummary,
  MatchReport
} from '../types';
import {
  INITIAL_COMPETITIONS,
  INITIAL_SCHOOLS,
  INITIAL_USERS,
  INITIAL_SPORTS,
  INITIAL_EVENTS,
  INITIAL_STUDENTS,
  INITIAL_COACHES,
  INITIAL_REGISTRATIONS,
  INITIAL_REGISTRATION_STUDENTS,
  INITIAL_RESULTS,
  INITIAL_CERTIFICATES,
  INITIAL_SETTINGS,
  INITIAL_TEMPLATES,
  INITIAL_LOGS,
  INITIAL_MATCH_REPORTS
} from '../data/initialData';
import { formatEventRegistrationDisplay, sortEventsList } from '../utils/thaiFormatter';

function isMatchingCompId(itemCompId?: string, currentCompId: string = 'comp-2569'): boolean {
  if (!itemCompId) return true;
  if (itemCompId === currentCompId) return true;
  const a = itemCompId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = currentCompId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a === b) return true;
  if (a.includes('2569') && b.includes('2569')) return true;
  return false;
}

const STORAGE_KEYS = {
  COMPETITIONS: 'ssk_sports_competitions',
  CURRENT_COMP_ID: 'ssk_sports_current_comp_id',
  SCHOOLS: 'ssk_sports_schools',
  USERS: 'ssk_sports_users',
  CURRENT_USER: 'ssk_sports_current_user',
  STUDENTS: 'ssk_sports_students',
  COACHES: 'ssk_sports_coaches',
  SPORTS: 'ssk_sports_sports',
  EVENTS: 'ssk_sports_events',
  REGISTRATIONS: 'ssk_sports_registrations',
  REGISTRATION_STUDENTS: 'ssk_sports_reg_students',
  RESULTS: 'ssk_sports_results',
  CERTIFICATES: 'ssk_sports_certificates',
  SETTINGS: 'ssk_sports_settings',
  TEMPLATES: 'ssk_sports_templates',
  LOGS: 'ssk_sports_logs',
  DRIVE_FILES: 'ssk_sports_drive_files',
  MATCH_REPORTS: 'ssk_sports_match_reports'
};

export interface DriveUploadedFile {
  id: string;
  name: string;
  folder: string;
  size: string;
  uploaded_at: string;
  url: string;
  type: string;
}

class SportsDataStore {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    const rawSchools = localStorage.getItem(STORAGE_KEYS.SCHOOLS);
    let schoolsCount = 0;
    try {
      if (rawSchools) schoolsCount = JSON.parse(rawSchools).length;
    } catch {
      schoolsCount = 0;
    }

    if (!localStorage.getItem(STORAGE_KEYS.COMPETITIONS) || schoolsCount < 12) {
      this.resetToDefaults();
    } else {
      // Auto-heal individual missing stores if any
      const checks = [
        { key: STORAGE_KEYS.SCHOOLS, initial: INITIAL_SCHOOLS },
        { key: STORAGE_KEYS.USERS, initial: INITIAL_USERS },
        { key: STORAGE_KEYS.STUDENTS, initial: INITIAL_STUDENTS },
        { key: STORAGE_KEYS.COACHES, initial: INITIAL_COACHES },
        { key: STORAGE_KEYS.SPORTS, initial: INITIAL_SPORTS },
        { key: STORAGE_KEYS.EVENTS, initial: INITIAL_EVENTS },
        { key: STORAGE_KEYS.REGISTRATIONS, initial: INITIAL_REGISTRATIONS },
        { key: STORAGE_KEYS.REGISTRATION_STUDENTS, initial: INITIAL_REGISTRATION_STUDENTS },
        { key: STORAGE_KEYS.RESULTS, initial: INITIAL_RESULTS },
        { key: STORAGE_KEYS.CERTIFICATES, initial: INITIAL_CERTIFICATES },
        { key: STORAGE_KEYS.SETTINGS, initial: INITIAL_SETTINGS },
        { key: STORAGE_KEYS.TEMPLATES, initial: INITIAL_TEMPLATES },
        { key: STORAGE_KEYS.LOGS, initial: INITIAL_LOGS },
        { key: STORAGE_KEYS.MATCH_REPORTS, initial: INITIAL_MATCH_REPORTS }
      ];

      for (const item of checks) {
        const val = localStorage.getItem(item.key);
        if (!val || val === '[]' || val === 'null' || val === 'undefined') {
          localStorage.setItem(item.key, JSON.stringify(item.initial));
        }
      }

      // Ensure all preset/initial athletics and sport events exist without overwriting existing data
      try {
        const currentEvents: Event[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
        if (Array.isArray(currentEvents)) {
          let updated = false;
          for (const initEv of INITIAL_EVENTS) {
            const exists = currentEvents.some(
              (e) => e.id === initEv.id || e.event_code === initEv.event_code || (e.event_name === initEv.event_name && e.grade === initEv.grade && e.gender === initEv.gender)
            );
            if (!exists) {
              currentEvents.push(initEv);
              updated = true;
            }
          }
          if (updated) {
            localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(currentEvents));
          }
        }
      } catch (e) {
        console.error('Error auto-syncing initial events:', e);
      }
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.COMPETITIONS, JSON.stringify(INITIAL_COMPETITIONS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_COMP_ID, 'comp-2569');
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(INITIAL_SCHOOLS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(INITIAL_COACHES));
    localStorage.setItem(STORAGE_KEYS.SPORTS, JSON.stringify(INITIAL_SPORTS));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(INITIAL_REGISTRATIONS));
    localStorage.setItem(STORAGE_KEYS.REGISTRATION_STUDENTS, JSON.stringify(INITIAL_REGISTRATION_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(INITIAL_RESULTS));
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(INITIAL_CERTIFICATES));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    localStorage.setItem(STORAGE_KEYS.MATCH_REPORTS, JSON.stringify(INITIAL_MATCH_REPORTS));
    localStorage.setItem(STORAGE_KEYS.DRIVE_FILES, JSON.stringify([
      {
        id: '1aBcDeFgHiJkLmNoPqRsTuVwXyZ_001',
        name: 'สสก.2569-00001_เด็กชายธีรดนย์_โรงเรียนบ้านหนองหว้า.pdf',
        folder: 'Certificates_Students',
        size: '345 KB',
        uploaded_at: '2026-08-20T10:00:00.000Z',
        url: 'https://drive.google.com/file/d/sample001/view',
        type: 'application/pdf'
      },
      {
        id: '1aBcDeFgHiJkLmNoPqRsTuVwXyZ_003',
        name: 'สสก.2569-00003_นายวิชัย_โรงเรียนบ้านหนองหว้า.pdf',
        folder: 'Certificates_Coaches',
        size: '350 KB',
        uploaded_at: '2026-08-20T10:00:00.000Z',
        url: 'https://drive.google.com/file/d/sample003/view',
        type: 'application/pdf'
      }
    ]));
    this.notify();
  }

  // --- Getters ---
  public getCompetitions(): Competition[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPETITIONS) || '[]');
  }

  public getCurrentCompetitionId(): string {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_COMP_ID) || 'comp-2569';
  }

  public setCurrentCompetitionId(id: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_COMP_ID, id);
    this.notify();
  }

  public getCurrentCompetition(): Competition {
    const comps = this.getCompetitions();
    const curId = this.getCurrentCompetitionId();
    return comps.find((c) => c.id === curId) || comps[0] || INITIAL_COMPETITIONS[0];
  }

  public getSchools(): School[] {
    const list: School[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOLS) || '[]');
    const compId = this.getCurrentCompetitionId();
    return list.filter((s) => !s.competition_id || isMatchingCompId(s.competition_id, compId));
  }

  public getAllSchools(): School[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOLS) || '[]');
  }

  public getUsers(): User[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  }

  public getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  }

  public setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      this.logActivity('LOGIN', 'users', user.id, `เข้าสู่ระบบสำเร็จในบทบาท ${user.role}`);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      this.logActivity('LOGOUT', 'users', undefined, 'ออกจากระบบ');
    }
    this.notify();
  }

  public getSports(): Sport[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SPORTS) || '[]');
  }

  public getEvents(): Event[] {
    const list: Event[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const compId = this.getCurrentCompetitionId();
    const sports = this.getSports();
    return list
      .filter((e) => !e.competition_id || isMatchingCompId(e.competition_id, compId))
      .map((ev) => {
        const sport = sports.find((s) => s.id === ev.sport_id);
        return {
          ...ev,
          event_name: formatEventRegistrationDisplay(ev.event_name, ev.grade, sport?.sport_name, ev.gender)
        };
      });
  }

  public getStudents(): Student[] {
    const list: Student[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const compId = this.getCurrentCompetitionId();
    return list.filter((s) => !s.competition_id || isMatchingCompId(s.competition_id, compId));
  }

  public getCoaches(): Coach[] {
    const list: Coach[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COACHES) || '[]');
    const compId = this.getCurrentCompetitionId();
    return list.filter((c) => !c.competition_id || isMatchingCompId(c.competition_id, compId));
  }

  public getRegistrations(): Registration[] {
    const list: Registration[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]');
    const compId = this.getCurrentCompetitionId();
    return list.filter((r) => !r.competition_id || isMatchingCompId(r.competition_id, compId));
  }

  public getRegistrationStudents(): RegistrationStudent[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_STUDENTS) || '[]');
  }

  public getResults(): Result[] {
    const list: Result[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS) || '[]');
    const compId = this.getCurrentCompetitionId();
    return list.filter((r) => !r.competition_id || isMatchingCompId(r.competition_id, compId));
  }

  public getCertificates(): Certificate[] {
    const list: Certificate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
    const comp = this.getCurrentCompetition();
    const compId = comp.id;
    const studentTpl = comp.google_slide_template_student_id || comp.google_slide_template_id || '';
    const coachTpl = comp.google_slide_template_coach_id || comp.google_slide_template_id || '';

    // Auto-enrich existing certificates with active Google Slide Template IDs if missing
    let changed = false;
    const enriched = list.map((c) => {
      const targetTpl = c.recipient_type === 'COACH' ? coachTpl : studentTpl;
      if (!c.google_slide_template_id && targetTpl) {
        changed = true;
        return {
          ...c,
          google_slide_template_id: targetTpl,
          slide_url: `https://docs.google.com/presentation/d/${targetTpl}/edit`
        };
      }
      return c;
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(enriched));
    }

    return enriched.filter((c) => !c.competition_id || isMatchingCompId(c.competition_id, compId));
  }

  // Apply Google Slide Template IDs configured in settings to ALL certificates (create pending & update all existing)
  public applyGoogleSlideTemplatesToAllCertificates(): { createdCount: number; updatedCount: number; totalCount: number; studentTpl: string; coachTpl: string } {
    const comp = this.getCurrentCompetition();
    const studentTpl = comp.google_slide_template_student_id || comp.google_slide_template_id || '';
    const coachTpl = comp.google_slide_template_coach_id || comp.google_slide_template_id || '';

    // 1. First generate certificates for any pending results that don't have certificates yet
    const batchRes = this.generateAllBatchCertificates();
    const createdCount = batchRes.totalCreated;

    // 2. Fetch all certificates and bind active Google Slide Template IDs
    const list: Certificate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
    let updatedCount = 0;

    const updated = list.map((c) => {
      const targetTpl = c.recipient_type === 'COACH' ? coachTpl : studentTpl;
      if (targetTpl) {
        updatedCount++;
        return {
          ...c,
          google_slide_template_id: targetTpl,
          slide_url: `https://docs.google.com/presentation/d/${targetTpl}/edit`
        };
      }
      return c;
    });

    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(updated));
    this.logActivity(
      'APPLY_GOOGLE_SLIDES',
      'certificates',
      comp.id,
      `นำ ID จาก Google นำเสนอ (นักเรียน: ${studentTpl || '-'}, ครู: ${coachTpl || '-'}) มาสร้างและผูกกับเกียรติบัตรทั้งหมด ${updated.length} ฉบับ (สร้างใหม่ ${createdCount} ฉบับ)`
    );
    this.notify();
    return { createdCount, updatedCount, totalCount: updated.length, studentTpl, coachTpl };
  }

  public updateCertificate(id: string, updates: Partial<Certificate>) {
    const list: Certificate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(list));
      this.logActivity('UPDATE_CERTIFICATE', 'certificates', id, `แก้ไขข้อมูลเกียรติบัตร: ${list[idx].recipient_name} (${list[idx].certificate_no})`);
      this.notify();
    }
  }

  public deleteCertificate(id: string) {
    const list: Certificate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
    const target = list.find((c) => c.id === id);
    const updated = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(updated));
    this.logActivity('DELETE_CERTIFICATE', 'certificates', id, `ลบเกียรติบัตร: ${target?.recipient_name || id} (${target?.certificate_no || ''})`);
    this.notify();
  }

  public deleteCertificatesByEvent(eventId: string) {
    const list: Certificate[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
    const updated = list.filter((c) => c.event_id !== eventId);
    const deletedCount = list.length - updated.length;
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(updated));
    this.logActivity('DELETE_EVENT_CERTIFICATES', 'certificates', eventId, `ลบเกียรติบัตรของรายการแข่งขัน ${eventId} จำนวน ${deletedCount} ฉบับ`);
    this.notify();
    return deletedCount;
  }

  public getSettings(): Setting[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '[]');
  }

  public getSetting(key: string, defaultVal: string = ''): string {
    const list = this.getSettings();
    const item = list.find((s) => s.setting_key === key);
    return item ? item.setting_value : defaultVal;
  }

  public setSetting(key: string, value: string, description?: string) {
    const list = this.getSettings();
    const idx = list.findIndex((s) => s.setting_key === key);
    if (idx >= 0) {
      list[idx].setting_value = value;
      list[idx].updated_at = new Date().toISOString();
      if (description) list[idx].description = description;
    } else {
      list.push({
        id: `set-${Date.now()}`,
        setting_key: key,
        setting_value: value,
        description: description || key,
        updated_at: new Date().toISOString()
      });
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(list));
    this.notify();
  }

  public getTemplates(): CertificateTemplate[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMPLATES) || '[]');
  }

  public getLogs(): ActivityLog[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
  }

  public getDriveFiles(): DriveUploadedFile[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.DRIVE_FILES) || '[]');
  }

  // --- Activity Log Helper ---
  public logActivity(action: string, table_name: string, record_id?: string, details?: string) {
    const user = this.getCurrentUser();
    const logs = this.getLogs();
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user?.id,
      user_name: user ? `${user.full_name} (${user.role})` : 'System / Public',
      action: details ? `${action}: ${details}` : action,
      table_name,
      record_id,
      ip_address: '127.0.0.1 (Local Session)',
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    // Keep last 300 logs
    if (logs.length > 300) logs.pop();
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }

  // --- Medal Calculations ---
  public getSchoolMedalSummary(): SchoolMedalSummary[] {
    const schools = this.getSchools();
    const results = this.getResults().filter((r) => r.status === 'CONFIRMED');
    const criteria = this.getSetting('MEDAL_RANKING_CRITERIA', 'GOLD_FIRST');

    const summaryMap: Record<string, { gold: number; silver: number; bronze: number; total: number }> = {};

    schools.forEach((sch) => {
      summaryMap[sch.id] = { gold: 0, silver: 0, bronze: 0, total: 0 };
    });

    results.forEach((res) => {
      if (!summaryMap[res.school_id]) {
        summaryMap[res.school_id] = { gold: 0, silver: 0, bronze: 0, total: 0 };
      }
      if (res.medal === 'GOLD') summaryMap[res.school_id].gold += 1;
      else if (res.medal === 'SILVER') summaryMap[res.school_id].silver += 1;
      else if (res.medal === 'BRONZE') summaryMap[res.school_id].bronze += 1;
      summaryMap[res.school_id].total =
        summaryMap[res.school_id].gold + summaryMap[res.school_id].silver + summaryMap[res.school_id].bronze;
    });

    const list: SchoolMedalSummary[] = schools.map((sch) => {
      const stats = summaryMap[sch.id] || { gold: 0, silver: 0, bronze: 0, total: 0 };
      return {
        school_id: sch.id,
        school_name: sch.school_name,
        short_name: sch.short_name,
        logo: sch.logo,
        gold: stats.gold,
        silver: stats.silver,
        bronze: stats.bronze,
        total: stats.total,
        rank: 0
      };
    });

    // Sorting algorithm according to settings
    list.sort((a, b) => {
      if (criteria === 'TOTAL_FIRST') {
        if (b.total !== a.total) return b.total - a.total;
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        return b.bronze - a.bronze;
      } else {
        // GOLD_FIRST default
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        if (b.bronze !== a.bronze) return b.bronze - a.bronze;
        return b.total - a.total;
      }
    });

    list.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return list;
  }

  // --- CRUD Operations ---

  // Schools
  public addSchool(schoolData: Omit<School, 'id' | 'created_at'>): School {
    const list = this.getAllSchools();
    const smis = (schoolData.smis_code || schoolData.school_code || '').trim();
    const newSchool: School = {
      ...schoolData,
      school_code: smis || `SCH-${Date.now().toString().slice(-4)}`,
      smis_code: smis,
      id: `sch-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    list.push(newSchool);
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(list));

    // Auto-create school administrator user with SMIS username and default password 123456
    const users = this.getUsers();
    const existingUser = users.find((u) => u.username === smis || u.school_id === newSchool.id);
    if (!existingUser && smis) {
      const newSchoolUser: User = {
        id: `user-sch-${Date.now()}`,
        school_id: newSchool.id,
        username: smis,
        password_hash: '$2y$10$qR6K8k7FwQvE8Z0e6YhSKeN2pE7B4...',
        password_plain: '123456',
        full_name: `ผู้ดูแลระบบ ${newSchool.school_name} (SMIS: ${smis})`,
        email: `sch_${smis}@sawangsung.ac.th`,
        role: 'SCHOOL',
        status: 'ACTIVE',
        must_change_password: true,
        phone: newSchool.phone,
        created_at: new Date().toISOString()
      };
      users.push(newSchoolUser);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    this.logActivity('INSERT', 'schools', newSchool.id, `เพิ่มโรงเรียน ${newSchool.school_name} (SMIS: ${smis}) และสร้างบัญชีผู้ดูแลระบบอัตโนมัติ (รหัสผ่านเริ่มต้น 123456)`);
    this.notify();
    return newSchool;
  }

  public updateSchool(id: string, updates: Partial<School>) {
    const list = this.getAllSchools();
    const idx = list.findIndex((s) => s.id === id);
    if (idx >= 0) {
      const oldSchool = list[idx];
      const updatedSchool = { ...oldSchool, ...updates };
      if (updates.smis_code && !updates.school_code) {
        updatedSchool.school_code = updates.smis_code;
      }
      list[idx] = updatedSchool;
      localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(list));

      // Sync with school user if SMIS or school name changed
      const users = this.getUsers();
      const userIdx = users.findIndex((u) => u.school_id === id);
      if (userIdx >= 0) {
        if (updates.smis_code || updates.school_code) {
          users[userIdx].username = updates.smis_code || updates.school_code || users[userIdx].username;
        }
        if (updates.school_name) {
          users[userIdx].full_name = `ผู้ดูแลระบบ ${updates.school_name} (SMIS: ${users[userIdx].username})`;
        }
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }

      this.logActivity('UPDATE', 'schools', id, `แก้ไขข้อมูลโรงเรียน ${updatedSchool.school_name}`);
      this.notify();
    }
  }

  public deleteSchool(id: string) {
    const list = this.getAllSchools().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(list));
    // Remove linked school user
    const users = this.getUsers().filter((u) => u.school_id !== id);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.logActivity('DELETE', 'schools', id, `ลบโรงเรียนและบัญชีผู้ใช้งาน ID: ${id}`);
    this.notify();
  }

  // Users & Authentication
  public login(usernameInput: string, passwordInput: string): { success: boolean; user?: User; error?: string } {
    const cleanUsername = (usernameInput || '').trim();
    const cleanPassword = (passwordInput || '').trim();
    const users = this.getUsers();

    // Find user (case insensitive for admin/superadmin/referee, exact match for SMIS)
    const user = users.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase() || u.username === cleanUsername
    );

    if (!user) {
      return {
        success: false,
        error: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ (สำหรับโรงเรียน กรุณากรอกรหัส SMIS 8 หลัก เช่น 31030064)'
      };
    }

    if (user.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบกลาง'
      };
    }

    // Password validation (plain password match or standard role defaults)
    const isPasswordValid =
      (user.password_plain && user.password_plain === cleanPassword) ||
      (user.role === 'SCHOOL' && (cleanPassword === '123456' || cleanPassword === '1-6' || cleanPassword === 'pass1234')) ||
      ((user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && cleanPassword === 'admin1234') ||
      (user.role === 'JUDGE' && cleanPassword === 'judge1234') ||
      cleanPassword === '123456';

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง (รหัสผ่านเริ่มต้นสำหรับโรงเรียนคือ 123456)'
      };
    }

    // Update last login
    user.last_login = new Date().toISOString();
    this.updateUser(user.id, { last_login: user.last_login });
    this.setCurrentUser(user);

    return { success: true, user };
  }

  public resetSchoolPasswordToDefault(schoolIdOrUserId: string): { success: boolean; username: string; newPass: string; message: string } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === schoolIdOrUserId || u.school_id === schoolIdOrUserId);

    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ดูแลระบบของโรงเรียนนี้');
    }

    user.password_plain = '123456';
    user.password_hash = '$2y$10$qR6K8k7FwQvE8Z0e6YhSKeN2pE7B4...'; // 123456
    user.must_change_password = true;

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.logActivity(
      'RESET_PASSWORD',
      'users',
      user.id,
      `Super Admin ได้รีเซ็ตรหัสผ่านของบัญชี ${user.username} (${user.full_name}) กลับเป็นค่าเริ่มต้น 123456 และเปิดแจ้งเตือนให้เปลี่ยนรหัสผ่าน`
    );
    this.notify();

    return {
      success: true,
      username: user.username,
      newPass: '123456',
      message: `รีเซ็ตรหัสผ่านสำหรับ ${user.username} เป็น 123456 สำเร็จแล้ว`
    };
  }

  public changeUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    const trimmed = (newPassword || '').trim();
    if (trimmed.length < 6) {
      return { success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' };
    }

    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) {
      return { success: false, error: 'ไม่พบบัญชีผู้ใช้งานในระบบ' };
    }

    users[idx].password_plain = trimmed;
    users[idx].password_hash = `$2y$10$custom_${Date.now()}`;
    users[idx].must_change_password = false;

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Update session user if matching
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = { ...currentUser, password_plain: trimmed, must_change_password: false };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrent));
    }

    this.logActivity('CHANGE_PASSWORD', 'users', userId, `ผู้ใช้ ${users[idx].username} ได้เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว`);
    this.notify();

    return { success: true };
  }

  public addUser(userData: Omit<User, 'id' | 'created_at'>): User {
    const list = this.getUsers();
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    list.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
    this.logActivity('INSERT', 'users', newUser.id, `เพิ่มผู้ใช้งาน ${newUser.username} (${newUser.role})`);
    this.notify();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>) {
    const list = this.getUsers();
    const idx = list.findIndex((u) => u.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
      this.notify();
    }
  }

  public deleteUser(id: string) {
    const list = this.getUsers().filter((u) => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
    this.logActivity('DELETE', 'users', id, `ลบผู้ใช้งาน ID: ${id}`);
    this.notify();
  }

  // Students
  public addStudent(studentData: Omit<Student, 'id' | 'created_at'>): Student {
    const list = this.getStudents();
    // Check duplication
    const duplicate = list.find(
      (s) =>
        s.school_id === studentData.school_id &&
        s.first_name.trim() === studentData.first_name.trim() &&
        s.last_name.trim() === studentData.last_name.trim()
    );
    if (duplicate) {
      throw new Error(`พบข้อมูลนักเรียน ${studentData.prefix} ${studentData.first_name} ${studentData.last_name} ในระบบแล้ว`);
    }

    const newStudent: Student = {
      ...studentData,
      id: `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    all.push(newStudent);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(all));
    this.logActivity('INSERT', 'students', newStudent.id, `เพิ่มนักเรียน ${newStudent.first_name} ${newStudent.last_name}`);
    this.notify();
    return newStudent;
  }

  public bulkImportStudents(students: Array<Omit<Student, 'id' | 'created_at'>>): { success: number; skipped: number } {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    let success = 0;
    let skipped = 0;

    students.forEach((s) => {
      const exists = all.some(
        (existing: Student) =>
          existing.school_id === s.school_id &&
          existing.first_name.trim() === s.first_name.trim() &&
          existing.last_name.trim() === s.last_name.trim()
      );
      if (!exists) {
        all.push({
          ...s,
          id: `stu-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          created_at: new Date().toISOString()
        });
        success++;
      } else {
        skipped++;
      }
    });

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(all));
    this.logActivity('IMPORT', 'students', undefined, `นำเข้านักเรียนสำเร็จ ${success} คน, ข้ามซ้ำ ${skipped} คน`);
    this.notify();
    return { success, skipped };
  }

  public updateStudent(id: string, updates: Partial<Student>) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    const idx = all.findIndex((s: Student) => s.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(all));
      this.logActivity('UPDATE', 'students', id, `แก้ไขข้อมูลนักเรียน ID: ${id}`);
      this.notify();
    }
  }

  public deleteStudent(id: string) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]').filter((s: Student) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(all));
    this.logActivity('DELETE', 'students', id, `ลบนักเรียน ID: ${id}`);
    this.notify();
  }

  // Coaches
  public addCoach(coachData: Omit<Coach, 'id' | 'created_at'>): Coach {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COACHES) || '[]');
    const newCoach: Coach = {
      ...coachData,
      id: `coa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };
    all.push(newCoach);
    localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(all));
    this.logActivity('INSERT', 'coaches', newCoach.id, `เพิ่มครูผู้ฝึกสอน ${newCoach.first_name} ${newCoach.last_name}`);
    this.notify();
    return newCoach;
  }

  public bulkImportCoaches(coachesData: Array<Omit<Coach, 'id' | 'created_at'>>): { success: number; skipped: number; addedCoaches: Coach[] } {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COACHES) || '[]');
    let success = 0;
    let skipped = 0;
    const addedCoaches: Coach[] = [];

    coachesData.forEach((c) => {
      const exists = all.some(
        (existing: Coach) =>
          existing.school_id === c.school_id &&
          existing.first_name.trim() === c.first_name.trim() &&
          existing.last_name.trim() === c.last_name.trim()
      );
      if (!exists) {
        const newC: Coach = {
          ...c,
          id: `coa-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          created_at: new Date().toISOString()
        };
        all.push(newC);
        addedCoaches.push(newC);
        success++;
      } else {
        skipped++;
      }
    });

    localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(all));
    this.logActivity('IMPORT', 'coaches', undefined, `นำเข้าครูผู้ฝึกสอนสำเร็จ ${success} คน, ข้ามซ้ำ ${skipped} คน`);
    this.notify();
    return { success, skipped, addedCoaches };
  }

  public updateCoach(id: string, updates: Partial<Coach>) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COACHES) || '[]');
    const idx = all.findIndex((c: Coach) => c.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(all));
      this.logActivity('UPDATE', 'coaches', id, `แก้ไขครูผู้ฝึกสอน ID: ${id}`);
      this.notify();
    }
  }

  public deleteCoach(id: string) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COACHES) || '[]').filter((c: Coach) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(all));
    this.logActivity('DELETE', 'coaches', id, `ลบครูผู้ฝึกสอน ID: ${id}`);
    this.notify();
  }

  // Sports & Events
  public addSport(sport: Omit<Sport, 'id' | 'created_at'>): Sport {
    const all = this.getSports();
    const newSport: Sport = {
      ...sport,
      id: `sp-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    all.push(newSport);
    localStorage.setItem(STORAGE_KEYS.SPORTS, JSON.stringify(all));
    this.logActivity('INSERT', 'sports', newSport.id, `เพิ่มกีฬา ${newSport.sport_name}`);
    this.notify();
    return newSport;
  }

  public updateSport(id: string, updates: Partial<Sport>) {
    const all = this.getSports();
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.SPORTS, JSON.stringify(all));
      this.logActivity('UPDATE', 'sports', id, `แก้ไขชนิดกีฬา ${all[idx].sport_name}`);
      this.notify();
    }
  }

  public deleteSport(id: string) {
    const all = this.getSports().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SPORTS, JSON.stringify(all));
    this.logActivity('DELETE', 'sports', id, `ลบชนิดกีฬา ID: ${id}`);
    this.notify();
  }

  public addEvent(eventData: Omit<Event, 'id' | 'created_at'>): Event {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const sport = this.getSports().find((s) => s.id === eventData.sport_id);
    const standardName = formatEventRegistrationDisplay(eventData.event_name, eventData.grade, sport?.sport_name, eventData.gender);
    const newEvent: Event = {
      ...eventData,
      event_name: standardName,
      id: `ev-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    all.push(newEvent);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(all));
    this.logActivity('INSERT', 'events', newEvent.id, `เพิ่มรายการแข่งขัน ${newEvent.event_name}`);
    this.notify();
    return newEvent;
  }

  public updateEvent(id: string, updates: Partial<Event>) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const idx = all.findIndex((e: Event) => e.id === id);
    if (idx >= 0) {
      const merged = { ...all[idx], ...updates };
      const sport = this.getSports().find((s) => s.id === merged.sport_id);
      if (updates.event_name || updates.grade || updates.gender || updates.sport_id) {
        merged.event_name = formatEventRegistrationDisplay(merged.event_name, merged.grade, sport?.sport_name, merged.gender);
      }
      all[idx] = merged;
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(all));
      this.logActivity('UPDATE', 'events', id, `แก้ไขรายการแข่งขัน ID: ${id}`);
      this.notify();
    }
  }

  public deleteEvent(id: string) {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]').filter((e: Event) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(all));
    this.logActivity('DELETE', 'events', id, `ลบรายการแข่งขัน ID: ${id}`);
    this.notify();
  }

  // Registration
  public submitRegistration(
    eventId: string,
    schoolId: string,
    coachId: string | undefined,
    studentIds: string[],
    secondaryCoachId?: string,
    coachIds?: string[]
  ): Registration {
    const registrations = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]');
    const regStudents = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_STUDENTS) || '[]');
    const compId = this.getCurrentCompetitionId();

    const finalCoachIds = coachIds && coachIds.length > 0
      ? coachIds
      : [coachId, secondaryCoachId].filter(Boolean) as string[];

    const mainCoachId = finalCoachIds[0] || coachId;
    const secCoachId = finalCoachIds[1] || secondaryCoachId;

    // Check if already registered
    const existingIndex = registrations.findIndex(
      (r: Registration) => r.competition_id === compId && r.event_id === eventId && r.school_id === schoolId
    );

    let regId: string;
    if (existingIndex >= 0) {
      if (registrations[existingIndex].registration_status === 'LOCKED') {
        throw new Error('รายการแข่งขันนี้ถูกล็อคแล้ว ไม่สามารถแก้ไขได้');
      }
      regId = registrations[existingIndex].id;
      registrations[existingIndex].coach_id = mainCoachId;
      registrations[existingIndex].secondary_coach_id = secCoachId;
      registrations[existingIndex].coach_ids = finalCoachIds;
      registrations[existingIndex].registration_status = 'SUBMITTED';
      registrations[existingIndex].submitted_at = new Date().toISOString();
    } else {
      regId = `reg-${Date.now()}`;
      const newReg: Registration = {
        id: regId,
        competition_id: compId,
        event_id: eventId,
        school_id: schoolId,
        coach_id: mainCoachId,
        secondary_coach_id: secCoachId,
        coach_ids: finalCoachIds,
        registration_status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      registrations.push(newReg);
    }

    // Replace student linkages
    const filteredRegStudents = regStudents.filter((rs: RegistrationStudent) => rs.registration_id !== regId);
    studentIds.forEach((sId, idx) => {
      filteredRegStudents.push({
        id: `rs-${Date.now()}-${idx}`,
        registration_id: regId,
        student_id: sId,
        created_at: new Date().toISOString()
      });
    });

    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    localStorage.setItem(STORAGE_KEYS.REGISTRATION_STUDENTS, JSON.stringify(filteredRegStudents));

    this.logActivity(
      'SUBMIT_REGISTRATION',
      'registrations',
      regId,
      `โรงเรียน ID: ${schoolId} ลงทะเบียนรายการ ${eventId} (${studentIds.length} คน, ${finalCoachIds.length} ครูผู้ฝึกสอน)`
    );
    this.notify();
    return registrations.find((r: Registration) => r.id === regId)!;
  }

  public updateRegistrationStatus(regId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    const registrations = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]');
    const idx = registrations.findIndex((r: Registration) => r.id === regId);
    if (idx >= 0) {
      registrations[idx].registration_status = status;
      if (status === 'APPROVED') {
        registrations[idx].approved_at = new Date().toISOString();
        registrations[idx].approved_by = this.getCurrentUser()?.username || 'admin';
      }
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
      this.logActivity('UPDATE_STATUS', 'registrations', regId, `เปลี่ยนสถานะเป็น ${status}`);
      this.notify();
    }
  }

  public registerTeam(data: {
    competition_id?: string;
    school_id: string;
    event_id: string;
    coach_id?: string;
    secondary_coach_id?: string;
    coach_ids?: string[];
    registration_status?: 'APPROVED' | 'PENDING' | 'REJECTED';
    registered_by?: string;
    student_ids: string[];
  }) {
    return this.submitRegistration(
      data.event_id,
      data.school_id,
      data.coach_id,
      data.student_ids,
      data.secondary_coach_id,
      data.coach_ids
    );
  }

  public updateRegistrationTeam(
    regId: string,
    studentIds: string[],
    coachIds: string[]
  ): Registration {
    const registrations = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]');
    const regStudents = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_STUDENTS) || '[]');
    const idx = registrations.findIndex((r: Registration) => r.id === regId);
    if (idx < 0) {
      throw new Error('ไม่พบข้อมูลรายการแข่งขันที่ต้องการแก้ไข');
    }

    const finalCoachIds = Array.from(new Set(coachIds.filter(Boolean)));
    registrations[idx].coach_ids = finalCoachIds;
    registrations[idx].coach_id = finalCoachIds[0] || undefined;
    registrations[idx].secondary_coach_id = finalCoachIds[1] || undefined;

    // Update student linkages
    const filteredRegStudents = regStudents.filter((rs: RegistrationStudent) => rs.registration_id !== regId);
    studentIds.forEach((sId, i) => {
      filteredRegStudents.push({
        id: `rs-${Date.now()}-${i}`,
        registration_id: regId,
        student_id: sId,
        created_at: new Date().toISOString()
      });
    });

    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    localStorage.setItem(STORAGE_KEYS.REGISTRATION_STUDENTS, JSON.stringify(filteredRegStudents));
    this.logActivity(
      'UPDATE',
      'registrations',
      regId,
      `แก้ไขสมาชิกและครูผู้ฝึกสอนใน Registration ID: ${regId} (${studentIds.length} นักกีฬา, ${finalCoachIds.length} ครู)`
    );
    this.notify();
    return registrations[idx];
  }

  public deleteRegistration(regId: string) {
    const registrations = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]').filter((r: Registration) => r.id !== regId);
    const regStudents = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_STUDENTS) || '[]').filter((rs: RegistrationStudent) => rs.registration_id !== regId);
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    localStorage.setItem(STORAGE_KEYS.REGISTRATION_STUDENTS, JSON.stringify(regStudents));
    this.logActivity('DELETE', 'registrations', regId, `ยกเลิกการลงทะเบียน ID: ${regId}`);
    this.notify();
  }


  // Results & Scoring (Crucial Workflow!)
  public recordEventResult(
    eventId: string,
    placements: Array<{
      school_id: string;
      rank: 1 | 2 | 3 | 4;
      award: string;
      medal: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';
      score?: string;
      note?: string;
    }>
  ) {
    const allResults = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS) || '[]');
    const compId = this.getCurrentCompetitionId();
    const user = this.getCurrentUser();
    const recordedBy = user ? `${user.full_name} (${user.role})` : 'คณะกรรมการจัดการแข่งขัน';

    // Remove prior results for this event in current competition
    const filteredResults = allResults.filter(
      (r: Result) => !(r.competition_id === compId && r.event_id === eventId)
    );

    placements.forEach((p, idx) => {
      const newRes: Result = {
        id: `res-${Date.now()}-${idx}`,
        competition_id: compId,
        event_id: eventId,
        school_id: p.school_id,
        rank: p.rank,
        award: p.award,
        medal: p.medal,
        score: p.score || '',
        note: p.note || '',
        recorded_by: recordedBy,
        recorded_at: new Date().toISOString(),
        status: 'CONFIRMED',
        created_at: new Date().toISOString()
      };
      filteredResults.push(newRes);
    });

    // Mark event as completed
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const evIdx = events.findIndex((e: Event) => e.id === eventId);
    if (evIdx >= 0) {
      events[evIdx].status = 'COMPLETED';
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    }

    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(filteredResults));
    this.logActivity('RECORD_RESULT', 'results', eventId, `บันทึกผลการแข่งขันสำหรับรายการ ID: ${eventId}`);
    this.notify();
  }

  public revokeEventResult(eventId: string) {
    const allResults = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS) || '[]');
    const compId = this.getCurrentCompetitionId();
    const filteredResults = allResults.filter(
      (r: Result) => !(r.competition_id === compId && r.event_id === eventId)
    );
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(filteredResults));

    // Reset event status to OPEN
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const evIdx = events.findIndex((e: Event) => e.id === eventId);
    if (evIdx >= 0) {
      events[evIdx].status = 'OPEN';
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    }

    this.logActivity('REVOKE_RESULT', 'results', eventId, `ยกเลิกการประกาศผลการแข่งขันรายการ ID: ${eventId}`);
    this.notify();
  }

  // Sequential Certificate Number Allocation (Simulating Database Transaction & Lock)
  private getNextCertificateNumber(): string {
    const prefix = this.getSetting('CERTIFICATE_PREFIX', 'สสก.2569-');
    let counter = parseInt(this.getSetting('CERTIFICATE_COUNTER', '0'), 10);
    counter += 1;
    this.setSetting('CERTIFICATE_COUNTER', counter.toString());
    const padded = String(counter).padStart(5, '0');
    return `${prefix}${padded}`;
  }

  // Certificate Auto-Generator from Results ("One Data, Many Uses")
  public generateCertificatesForEvent(eventId: string): { createdCount: number; skippedCount: number } {
    const comp = this.getCurrentCompetition();
    const compId = comp.id;
    const studentSlideTpl = comp.google_slide_template_student_id || comp.google_slide_template_id || '';
    const coachSlideTpl = comp.google_slide_template_coach_id || comp.google_slide_template_id || '';

    // Accept results that belong to this event (CONFIRMED, OFFICIAL, or any recorded result)
    const results = this.getResults().filter((r) => r.event_id === eventId);
    const existingCerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CERTIFICATES) || '[]');
    const registrations = this.getRegistrations().filter((r) => r.event_id === eventId);
    const regStudents = this.getRegistrationStudents();
    const students = this.getStudents();
    const coaches = this.getCoaches();
    const schools = this.getSchools();
    const events = this.getEvents();
    const sports = this.getSports();

    const targetEvent = events.find((e) => e.id === eventId);
    const targetSport = sports.find((s) => s.id === targetEvent?.sport_id);

    let createdCount = 0;
    let skippedCount = 0;

    results.forEach((res) => {
      const school = schools.find((s) => s.id === res.school_id);
      if (!school) return;

      const reg = registrations.find((r) => r.school_id === res.school_id);

      // 1. Generate for Students in this registration or fallback to school students / team
      let linkedStudents: Student[] = [];
      if (reg) {
        linkedStudents = regStudents
          .filter((rs) => rs.registration_id === reg.id)
          .map((rs) => students.find((s) => s.id === rs.student_id))
          .filter(Boolean) as Student[];
      }

      // If no specific students were linked in registration, fallback to school athletes
      if (linkedStudents.length === 0) {
        linkedStudents = students.filter((s) => s.school_id === school.id).slice(0, 5);
      }

      if (linkedStudents.length > 0) {
        linkedStudents.forEach((student) => {
          // Prevent duplicate certificate
          const alreadyExists = existingCerts.some(
            (c: Certificate) =>
              c.competition_id === compId &&
              c.event_id === eventId &&
              c.recipient_id === student.id &&
              c.status === 'ISSUED'
          );

          if (alreadyExists) {
            skippedCount++;
          } else {
            const certNo = this.getNextCertificateNumber();
            const qrToken = `TOKEN_SSK69_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${certNo.replace(/[^0-9]/g, '')}`;
            const awardText = `${res.award} (${res.medal === 'GOLD' ? 'เหรียญทอง 🥇' : res.medal === 'SILVER' ? 'เหรียญเงิน 🥈' : res.medal === 'BRONZE' ? 'เหรียญทองแดง 🥉' : ''})`;

            const newCert: Certificate = {
              id: `cert-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
              competition_id: compId,
              certificate_no: certNo,
              recipient_type: 'STUDENT',
              recipient_id: student.id,
              recipient_name: `${student.prefix}${student.first_name} ${student.last_name}`,
              school_id: school.id,
              school_name: school.school_name,
              event_id: eventId,
              event_name: targetEvent?.event_name || 'รายการแข่งขัน',
              sport_name: targetSport?.sport_name || 'กีฬา',
              result_id: res.id,
              award: awardText,
              medal: res.medal,
              issue_date: new Date().toISOString().split('T')[0],
              template_type: 'STUDENT',
              google_slide_template_id: studentSlideTpl || undefined,
              slide_url: studentSlideTpl ? `https://docs.google.com/presentation/d/${studentSlideTpl}/edit` : undefined,
              drive_file_id: `gdrive_${certNo}_${Date.now()}`,
              drive_url: `https://drive.google.com/file/d/gdrive_${certNo}/view`,
              qr_token: qrToken,
              status: 'ISSUED',
              created_at: new Date().toISOString()
            };

            existingCerts.push(newCert);
            createdCount++;
          }
        });
      } else {
        // Fallback: Team certificate for the school
        const alreadyExists = existingCerts.some(
          (c: Certificate) =>
            c.competition_id === compId &&
            c.event_id === eventId &&
            c.school_id === school.id &&
            c.recipient_type === 'STUDENT' &&
            c.status === 'ISSUED'
        );

        if (alreadyExists) {
          skippedCount++;
        } else {
          const certNo = this.getNextCertificateNumber();
          const qrToken = `TOKEN_SSK69_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${certNo.replace(/[^0-9]/g, '')}`;
          const awardText = `${res.award} (${res.medal === 'GOLD' ? 'เหรียญทอง 🥇' : res.medal === 'SILVER' ? 'เหรียญเงิน 🥈' : res.medal === 'BRONZE' ? 'เหรียญทองแดง 🥉' : ''})`;

          const newCert: Certificate = {
            id: `cert-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            competition_id: compId,
            certificate_no: certNo,
            recipient_type: 'STUDENT',
            recipient_id: school.id,
            recipient_name: `ตัวแทนนักกีฬาโรงเรียน${school.school_name}`,
            school_id: school.id,
            school_name: school.school_name,
            event_id: eventId,
            event_name: targetEvent?.event_name || 'รายการแข่งขัน',
            sport_name: targetSport?.sport_name || 'กีฬา',
            result_id: res.id,
            award: awardText,
            medal: res.medal,
            issue_date: new Date().toISOString().split('T')[0],
            template_type: 'STUDENT',
            google_slide_template_id: studentSlideTpl || undefined,
            slide_url: studentSlideTpl ? `https://docs.google.com/presentation/d/${studentSlideTpl}/edit` : undefined,
            drive_file_id: `gdrive_${certNo}_${Date.now()}`,
            drive_url: `https://drive.google.com/file/d/gdrive_${certNo}/view`,
            qr_token: qrToken,
            status: 'ISSUED',
            created_at: new Date().toISOString()
          };

          existingCerts.push(newCert);
          createdCount++;
        }
      }

      // 2. Generate for Coach(es)
      const coachList: Coach[] = [];
      if (reg?.coach_ids && Array.isArray(reg.coach_ids)) {
        reg.coach_ids.forEach((cId: string) => {
          const c = coaches.find((coach: Coach) => coach.id === cId);
          if (c && !coachList.some((item) => item.id === c.id)) coachList.push(c);
        });
      }
      if (reg?.coach_id) {
        const c1 = coaches.find((c: Coach) => c.id === reg.coach_id);
        if (c1 && !coachList.some((item) => item.id === c1.id)) coachList.push(c1);
      }
      if (reg?.secondary_coach_id) {
        const c2 = coaches.find((c: Coach) => c.id === reg.secondary_coach_id);
        if (c2 && !coachList.some((item) => item.id === c2.id)) coachList.push(c2);
      }

      // Fallback: coaches registered under this school
      if (coachList.length === 0) {
        const schoolCoaches = coaches.filter((c) => c.school_id === school.id);
        if (schoolCoaches.length > 0) {
          coachList.push(schoolCoaches[0]);
        }
      }

      if (coachList.length > 0) {
        coachList.forEach((coach) => {
          const alreadyExists = existingCerts.some(
            (c: Certificate) =>
              c.competition_id === compId &&
              c.event_id === eventId &&
              c.recipient_id === coach.id &&
              c.recipient_type === 'COACH' &&
              c.status === 'ISSUED'
          );

          if (alreadyExists) {
            skippedCount++;
          } else {
            const certNo = this.getNextCertificateNumber();
            const qrToken = `TOKEN_SSK69_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${certNo.replace(/[^0-9]/g, '')}`;
            const awardText = `ครูผู้ฝึกสอนนักกีฬา ${res.award} (${res.medal === 'GOLD' ? 'เหรียญทอง 🥇' : res.medal === 'SILVER' ? 'เหรียญเงิน 🥈' : res.medal === 'BRONZE' ? 'เหรียญทองแดง 🥉' : ''})`;

            const newCert: Certificate = {
              id: `cert-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
              competition_id: compId,
              certificate_no: certNo,
              recipient_type: 'COACH',
              recipient_id: coach.id,
              recipient_name: `${coach.prefix}${coach.first_name} ${coach.last_name}`,
              school_id: school.id,
              school_name: school.school_name,
              event_id: eventId,
              event_name: targetEvent?.event_name || 'รายการแข่งขัน',
              sport_name: targetSport?.sport_name || 'กีฬา',
              result_id: res.id,
              award: awardText,
              medal: res.medal,
              issue_date: new Date().toISOString().split('T')[0],
              template_type: 'COACH',
              google_slide_template_id: coachSlideTpl || undefined,
              slide_url: coachSlideTpl ? `https://docs.google.com/presentation/d/${coachSlideTpl}/edit` : undefined,
              drive_file_id: `gdrive_${certNo}_${Date.now()}`,
              drive_url: `https://drive.google.com/file/d/gdrive_${certNo}/view`,
              qr_token: qrToken,
              status: 'ISSUED',
              created_at: new Date().toISOString()
            };

            existingCerts.push(newCert);
            createdCount++;
          }
        });
      } else {
        // Fallback: coach cert for school
        const alreadyExists = existingCerts.some(
          (c: Certificate) =>
            c.competition_id === compId &&
            c.event_id === eventId &&
            c.school_id === school.id &&
            c.recipient_type === 'COACH' &&
            c.status === 'ISSUED'
        );

        if (alreadyExists) {
          skippedCount++;
        } else {
          const certNo = this.getNextCertificateNumber();
          const qrToken = `TOKEN_SSK69_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${certNo.replace(/[^0-9]/g, '')}`;
          const awardText = `ครูผู้ฝึกสอนนักกีฬา ${res.award} (${res.medal === 'GOLD' ? 'เหรียญทอง 🥇' : res.medal === 'SILVER' ? 'เหรียญเงิน 🥈' : res.medal === 'BRONZE' ? 'เหรียญทองแดง 🥉' : ''})`;

          const newCert: Certificate = {
            id: `cert-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            competition_id: compId,
            certificate_no: certNo,
            recipient_type: 'COACH',
            recipient_id: school.id,
            recipient_name: `ครูผู้ฝึกสอนโรงเรียน${school.school_name}`,
            school_id: school.id,
            school_name: school.school_name,
            event_id: eventId,
            event_name: targetEvent?.event_name || 'รายการแข่งขัน',
            sport_name: targetSport?.sport_name || 'กีฬา',
            result_id: res.id,
            award: awardText,
            medal: res.medal,
            issue_date: new Date().toISOString().split('T')[0],
            template_type: 'COACH',
            google_slide_template_id: coachSlideTpl || undefined,
            slide_url: coachSlideTpl ? `https://docs.google.com/presentation/d/${coachSlideTpl}/edit` : undefined,
            drive_file_id: `gdrive_${certNo}_${Date.now()}`,
            drive_url: `https://drive.google.com/file/d/gdrive_${certNo}/view`,
            qr_token: qrToken,
            status: 'ISSUED',
            created_at: new Date().toISOString()
          };

          existingCerts.push(newCert);
          createdCount++;
        }
      }
    });

    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(existingCerts));
    this.logActivity(
      'GENERATE_CERTIFICATES',
      'certificates',
      eventId,
      `สร้างเกียรติบัตรสำหรับรายการ ${targetEvent?.event_name}: สำเร็จ ${createdCount} ใบ, ซ้ำเดิม ${skippedCount} ใบ`
    );
    this.notify();
    return { createdCount, skippedCount };
  }

  // Batch Certificate Generator for All Completed / Announced Events
  public generateAllBatchCertificates(): { totalCreated: number; totalSkipped: number; eventCount: number } {
    const allResults = this.getResults();
    const eventIdsWithResults = Array.from(new Set(allResults.map((r) => r.event_id)));
    const targetEvents = this.getEvents().filter(
      (e) => e.status === 'COMPLETED' || eventIdsWithResults.includes(e.id)
    );
    let totalCreated = 0;
    let totalSkipped = 0;

    targetEvents.forEach((ev) => {
      const res = this.generateCertificatesForEvent(ev.id);
      totalCreated += res.createdCount;
      totalSkipped += res.skippedCount;
    });

    return { totalCreated, totalSkipped, eventCount: targetEvents.length };
  }

  // Google Drive File Sync Simulator
  public syncCertificateToGoogleDrive(cert: Certificate) {
    const files = this.getDriveFiles();
    const fileName = `${cert.certificate_no}_${cert.recipient_name.replace(/\s+/g, '_')}_${cert.school_name.replace(/\s+/g, '_')}.pdf`;
    const folder = cert.recipient_type === 'STUDENT' ? 'Certificates_Students' : 'Certificates_Coaches';

    const existingIdx = files.findIndex((f) => f.name === fileName);
    const fileEntry: DriveUploadedFile = {
      id: cert.drive_file_id || `drive_${Date.now()}`,
      name: fileName,
      folder,
      size: `${Math.floor(Math.random() * 150 + 250)} KB`,
      uploaded_at: new Date().toISOString(),
      url: cert.drive_url || `https://drive.google.com/file/d/${cert.drive_file_id || 'sample'}/view`,
      type: 'application/pdf'
    };

    if (existingIdx >= 0) {
      files[existingIdx] = fileEntry;
    } else {
      files.unshift(fileEntry);
    }

    localStorage.setItem(STORAGE_KEYS.DRIVE_FILES, JSON.stringify(files));
    this.logActivity('GOOGLE_DRIVE_SYNC', 'drive_files', fileEntry.id, `อัปโหลด ${fileName} ลง Google Drive`);
    this.notify();
    return fileEntry;
  }

  public logout() {
    this.setCurrentUser(null);
  }

  public resetToInitialData() {
    this.resetToDefaults();
  }

  public updateCompetition(comp: Competition) {
    const competitions = this.getCompetitions();
    const idx = competitions.findIndex((c) => c.id === comp.id);
    if (idx >= 0) {
      competitions[idx] = comp;
      localStorage.setItem(STORAGE_KEYS.COMPETITIONS, JSON.stringify(competitions));
      this.logActivity('UPDATE_COMPETITION', 'competitions', comp.id, `อัปเดตข้อมูลการแข่งขัน ${comp.competition_name}`);
      this.notify();
    }
  }

  public batchGenerateAllCertificates(): number {
    const res = this.generateAllBatchCertificates();
    return res.totalCreated;
  }

  // --- Match Reports (Live score/result reporting) ---
  public getMatchReports(): MatchReport[] {
    const list: MatchReport[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATCH_REPORTS) || '[]');
    const compId = this.getCurrentCompetitionId();
    return list
      .filter((m) => !m.competition_id || m.competition_id === compId)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }

  public addMatchReport(data: Omit<MatchReport, 'id' | 'created_at'>): MatchReport {
    const list: MatchReport[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATCH_REPORTS) || '[]');
    const newReport: MatchReport = {
      ...data,
      id: `match-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    list.unshift(newReport);
    localStorage.setItem(STORAGE_KEYS.MATCH_REPORTS, JSON.stringify(list));
    this.logActivity('RECORD_MATCH_REPORT', 'match_reports', newReport.id, `รายงานผลการแข่งขัน: ${newReport.summary_text}`);
    this.notify();
    return newReport;
  }

  public updateMatchReport(id: string, updates: Partial<MatchReport>) {
    const list: MatchReport[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATCH_REPORTS) || '[]');
    const idx = list.findIndex((m) => m.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.MATCH_REPORTS, JSON.stringify(list));
      this.logActivity('UPDATE_MATCH_REPORT', 'match_reports', id, `แก้ไขรายงานผลการแข่งขัน ID: ${id}`);
      this.notify();
    }
  }

  public deleteMatchReport(id: string) {
    const list: MatchReport[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATCH_REPORTS) || '[]').filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MATCH_REPORTS, JSON.stringify(list));
    this.logActivity('DELETE_MATCH_REPORT', 'match_reports', id, `ลบรายงานผลการแข่งขัน ID: ${id}`);
    this.notify();
  }
}


export const sportsStore = new SportsDataStore();
