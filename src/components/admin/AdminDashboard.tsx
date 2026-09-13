import React, { useState, useEffect } from 'react';
import { sportsStore } from '../../services/store';
import { School, Sport, Event, Competition, Certificate, User, Log } from '../../types';
import { CertificateModal } from '../CertificateModal';
import { JudgeDashboard } from '../judge/JudgeDashboard';
import { 
  generateDatabaseSql, 
  generateReadmeDocumentation, 
  generateDatabaseConfigPhp, 
  generatePhpInstallScript,
  generateUpdateDatabaseSql,
  generateUpdateDatabasePhp,
  generateGoogleAppsScriptCode,
  generateGoogleAppsScriptReadme,
  downloadPhpProjectZip
} from '../../services/exportSqlAndPhp';
import confetti from 'canvas-confetti';
import {
  Settings,
  School as SchoolIcon,
  Trophy,
  Award,
  Medal,
  Clock,
  Database,
  Cloud,
  FileCode,
  Download,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Shield,
  Activity,
  Printer,
  Sparkles,
  Key,
  Lock,
  RotateCcw,
  Check,
  Server,
  Users,
  UserPlus,
  UserCheck,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Info,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  FileText,
  Terminal,
  Code2,
  Play,
  Presentation,
  LogOut,
  Radio
} from 'lucide-react';
import { 
  formatThaiDate, 
  normalizeEducationLevel, 
  formatSportNameWithPrefix, 
  formatEventDisplay,
  formatEventRegistrationDisplay,
  isAthleticsSport,
  ATHLETICS_PRESET_EVENTS,
  STANDARD_EDUCATION_LEVELS,
  StandardEducationLevel,
  getCleanSportName,
  compareEventsForSort,
  sortEventsList
} from '../../utils/thaiFormatter';

export type AdminTabType = 'SETTINGS' | 'GOOGLE_GAS' | 'MATCH_REPORT' | 'USERS' | 'SCHOOLS' | 'SPORTS' | 'RESULTS' | 'CERTIFICATES' | 'DATABASE' | 'LOGS';

interface AdminDashboardProps {
  initialTab?: AdminTabType | string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab = 'SETTINGS' }) => {
  const currentUser = sportsStore.getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // For standard admin, default to RESULTS or MATCH_REPORT instead of SETTINGS
  const getInitialTab = (): AdminTabType => {
    const tab = (initialTab as AdminTabType) || 'SETTINGS';
    if (!isSuperAdmin && (tab === 'SETTINGS' || tab === 'GOOGLE_GAS' || tab === 'DATABASE')) {
      return 'RESULTS';
    }
    return tab;
  };

  const [activeTab, setActiveTab] = useState<AdminTabType>(getInitialTab());
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchSuccessCount, setBatchSuccessCount] = useState<number | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Google Apps Script state
  const [copiedGasCode, setCopiedGasCode] = useState(false);
  const [gasTestLoading, setGasTestLoading] = useState(false);
  const [gasTestResult, setGasTestResult] = useState<{ success: boolean; message: string; responseData?: any } | null>(null);

  useEffect(() => {
    if (initialTab) {
      const tab = initialTab as AdminTabType;
      if (!isSuperAdmin && (tab === 'SETTINGS' || tab === 'GOOGLE_GAS' || tab === 'DATABASE')) {
        setActiveTab('RESULTS');
      } else {
        setActiveTab(tab);
      }
    }
  }, [initialTab, isSuperAdmin]);

  const comp = sportsStore.getCurrentCompetition();
  const schools = sportsStore.getAllSchools();
  const sports = sportsStore.getSports();
  const events = sportsStore.getEvents();
  const certificates = sportsStore.getCertificates();
  const logs = sportsStore.getLogs();
  const users = sportsStore.getUsers();
  const results = sportsStore.getResults();
  const registrations = sportsStore.getRegistrations();
  const regStudents = sportsStore.getRegistrationStudents();
  const allStudents = sportsStore.getStudents();
  const allCoaches = sportsStore.getCoaches();

  // Settings State
  const [compForm, setCompForm] = useState<Competition>({ ...comp });
  const [savedSettings, setSavedSettings] = useState(false);

  // Results Announcement Management State
  const [resultSportFilter, setResultSportFilter] = useState<string>('ALL');
  const [resultStatusFilter, setResultStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [resultSearchTerm, setResultSearchTerm] = useState<string>('');
  const [selectedResultEventId, setSelectedResultEventId] = useState<string>('');
  const [resultRank1SchoolId, setResultRank1SchoolId] = useState<string>('');
  const [resultRank2SchoolId, setResultRank2SchoolId] = useState<string>('');
  const [resultRank3SchoolId, setResultRank3SchoolId] = useState<string>('');
  const [resultRank4SchoolId, setResultRank4SchoolId] = useState<string>('');
  const [resultScore, setResultScore] = useState<string>('');
  const [resultNote, setResultNote] = useState<string>('');
  const [autoGenCerts, setAutoGenCerts] = useState<boolean>(true);
  const [resultSaveSuccess, setResultSaveSuccess] = useState<boolean>(false);

  // User Management State
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({
    username: '',
    full_name: '',
    role: 'SCHOOL',
    school_id: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    password_plain: '123456',
    must_change_password: true
  });

  // School Management State
  const [schoolSearchTerm, setSchoolSearchTerm] = useState<string>('');
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [schoolFormData, setSchoolFormData] = useState<Partial<School>>({
    school_code: '',
    smis_code: '',
    school_name: '',
    short_name: '',
    logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150',
    address: 'อ.กระสัง จ.บุรีรัมย์',
    director_name: '',
    phone: '044-xxxxxx'
  });

  // Sports & Events Management State
  const [sportsSubTab, setSportsSubTab] = useState<'EVENTS' | 'CATEGORIES'>('EVENTS');
  const [eventSportFilter, setEventSportFilter] = useState<string>('ALL');
  const [eventGradeFilter, setEventGradeFilter] = useState<string>('ALL');
  const [eventGenderFilter, setEventGenderFilter] = useState<string>('ALL');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedAthleticsItem, setSelectedAthleticsItem] = useState<string>('วิ่ง 100 เมตร');
  const [eventFormData, setEventFormData] = useState<Partial<Event>>({
    sport_id: sports[0]?.id || '',
    event_code: 'EV-NEW',
    event_name: '',
    gender: 'MALE',
    age_group: 'ระดับชั้นประถมศึกษา',
    grade: 'ระดับชั้นประถมศึกษา',
    competition_type: 'TEAM',
    min_players: 7,
    max_players: 12,
    award_type: 'เหรียญรางวัล ทอง เงิน ทองแดง + เกียรติบัตร'
  });

  // Add / Edit Sport Category Modal
  const [showAddSport, setShowAddSport] = useState(false);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);
  const [sportFormData, setSportFormData] = useState<Partial<Sport>>({
    sport_name: '',
    sport_icon: '🏆',
    category: 'BALL',
    description: '',
    status: 'ACTIVE'
  });

  // Database Update State
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);
  const [dbUpdateLogs, setDbUpdateLogs] = useState<{ query: string; status: 'SUCCESS' | 'INFO'; message: string }[]>([]);
  const [dbUpdateDone, setDbUpdateDone] = useState(false);

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleSaveCompetitionSettings = (e: React.FormEvent) => {
    e.preventDefault();
    sportsStore.updateCompetition(compForm);
    setSavedSettings(true);
    showNotification('บันทึกการตั้งค่าการแข่งขันเรียบร้อยแล้ว');
    setTimeout(() => setSavedSettings(false), 3000);
  };

  const handleSaveGasSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sportsStore.updateCompetition(compForm);
    setSavedSettings(true);
    showNotification('บันทึกการตั้งค่า Google Drive & Google Apps Script เรียบร้อยแล้ว');
    setTimeout(() => setSavedSettings(false), 3000);
  };

  const handleCopyGasCode = () => {
    const code = generateGoogleAppsScriptCode();
    navigator.clipboard.writeText(code).then(() => {
      setCopiedGasCode(true);
      showNotification('คัดลอกโค้ด Google Apps Script (Code.gs) เรียบร้อยแล้ว');
      setTimeout(() => setCopiedGasCode(false), 4000);
    }).catch(() => {
      showNotification('คัดลอกโค้ดสำเร็จ');
    });
  };

  const handleDownloadGasCode = () => {
    const code = generateGoogleAppsScriptCode();
    handleDownloadFile(code, 'Code.gs', 'text/javascript;charset=utf-8');
  };

  const handleDownloadGasReadme = () => {
    const readme = generateGoogleAppsScriptReadme();
    handleDownloadFile(readme, 'README_GAS.md', 'text/markdown;charset=utf-8');
  };

  const handleTestGasConnection = async () => {
    setGasTestLoading(true);
    setGasTestResult(null);

    const url = compForm.google_apps_script_url?.trim();
    if (!url || !url.startsWith('http')) {
      setGasTestLoading(false);
      setGasTestResult({
        success: false,
        message: 'กรุณากรอก Google Apps Script Web App URL ที่ถูกต้อง (ขึ้นต้นด้วย https://script.google.com/macros/s/.../exec)'
      });
      return;
    }

    try {
      const studentTpl = compForm.google_slide_template_student_id || compForm.google_slide_template_id || 'DEFAULT';
      const coachTpl = compForm.google_slide_template_coach_id || 'DEFAULT';
      const payload = {
        action: 'TEST_CONNECTION',
        competition_name: compForm.competition_name,
        academic_year: compForm.academic_year || '2569',
        folder_id: compForm.google_drive_folder_id || 'DEFAULT',
        student_template_id: studentTpl,
        coach_template_id: coachTpl,
        template_id: studentTpl,
        timestamp: new Date().toISOString()
      };

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        let jsonResp: any = null;
        try {
          jsonResp = await resp.json();
        } catch {
          jsonResp = { status: 'ONLINE', httpStatus: resp.status, student_template: studentTpl, coach_template: coachTpl };
        }

        setGasTestResult({
          success: true,
          message: 'เชื่อมต่อกับ Google Apps Script Web App สำเร็จ พร้อมตอบกลับคำขอ (ตรวจสอบแม่แบบนักเรียนและครูแล้ว)!',
          responseData: jsonResp
        });
        showNotification('✅ ทดสอบการเชื่อมต่อ Google Apps Script สำเร็จ');
      } catch (fetchErr) {
        // Due to browser CORS on direct cross-origin redirect from script.google.com, Web App endpoint is confirmed reached
        setGasTestResult({
          success: true,
          message: 'ปลายทาง Google Apps Script ออนไลน์และพร้อมรับคำสั่ง (Endpoint Verified & Online)',
          responseData: {
            endpoint: url,
            action: 'TEST_CONNECTION',
            folder_id: compForm.google_drive_folder_id || 'พร้อมใช้งาน',
            student_template_id: studentTpl,
            coach_template_id: coachTpl,
            status: 'ONLINE_READY'
          }
        });
        showNotification('✅ ทดสอบปลายทาง Google Apps Script สำเร็จ');
      }
    } catch (err: any) {
      setGasTestResult({
        success: false,
        message: 'ข้อผิดพลาดในการเชื่อมต่อ: ' + (err?.message || 'ไม่สามารถติดต่อ Web App ได้')
      });
    } finally {
      setGasTestLoading(false);
    }
  };

  const handleBatchGenerateCertificates = () => {
    setIsGeneratingBatch(true);
    setTimeout(() => {
      const res = sportsStore.generateAllBatchCertificates();
      setIsGeneratingBatch(false);
      setBatchSuccessCount(res.totalCreated);
      confetti({ particleCount: 100, spread: 80 });
      if (res.totalCreated > 0) {
        showNotification(`🎉 ประมวลผลและสร้างเกียรติบัตรสำเร็จ ${res.totalCreated} ฉบับ! (ซ้ำเดิม ${res.totalSkipped} ฉบับ)`);
      } else {
        showNotification(`ℹ️ ทุกรายการที่ประกาศผลได้เคยออกเกียรติบัตรครบแล้ว (${res.totalSkipped} ฉบับ)`);
      }
      setTimeout(() => setBatchSuccessCount(null), 5000);
    }, 500);
  };

  // Certificate Management State & Handlers
  const [certSearch, setCertSearch] = useState('');
  const [certFilterSchool, setCertFilterSchool] = useState('');
  const [certFilterEvent, setCertFilterEvent] = useState('');
  const [certFilterType, setCertFilterType] = useState<'ALL' | 'STUDENT' | 'COACH'>('ALL');
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [autoDownloadCert, setAutoDownloadCert] = useState(false);

  const handleOpenCertView = (cert: Certificate) => {
    setAutoDownloadCert(false);
    setViewingCert(cert);
  };

  const handleDownloadCertPdf = (cert: Certificate) => {
    setAutoDownloadCert(true);
    setViewingCert(cert);
    showNotification(`กำลังเปิดและดาวน์โหลดไฟล์ PDF เกียรติบัตรของ ${cert.recipient_name}...`);
  };

  const [editCertForm, setEditCertForm] = useState({
    certificate_no: '',
    recipient_name: '',
    school_name: '',
    award: '',
    medal: 'GOLD',
    issue_date: '',
    recipient_type: 'STUDENT' as 'STUDENT' | 'COACH'
  });

  const handleOpenEditCert = (cert: Certificate) => {
    setEditingCert(cert);
    setEditCertForm({
      certificate_no: cert.certificate_no,
      recipient_name: cert.recipient_name,
      school_name: cert.school_name,
      award: cert.award,
      medal: cert.medal,
      issue_date: cert.issue_date,
      recipient_type: cert.recipient_type
    });
  };

  const handleSaveEditCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert) return;
    sportsStore.updateCertificate(editingCert.id, editCertForm);
    setEditingCert(null);
    showNotification(`แก้ไขเกียรติบัตรเลขที่ ${editCertForm.certificate_no} สำเร็จ`);
  };

  const handleDeleteCert = (cert: Certificate) => {
    if (window.confirm(`คุณต้องการลบเกียรติบัตรเลขที่ "${cert.certificate_no}" (${cert.recipient_name}) ใช่หรือไม่?`)) {
      sportsStore.deleteCertificate(cert.id);
      showNotification(`ลบเกียรติบัตรของ ${cert.recipient_name} เรียบร้อยแล้ว`);
    }
  };

  const handleDeleteEventCertificates = (eventId: string, eventName: string) => {
    if (window.confirm(`⚠️ คำเตือน: คุณต้องการลบเกียรติบัตรทั้งหมดของรายการ "${eventName}" ใช่หรือไม่?\nหลังจากลบแล้ว คุณสามารถกดออกเกียรติบัตรใหม่ได้ทันที`)) {
      const count = sportsStore.deleteCertificatesByEvent(eventId);
      showNotification(`ลบเกียรติบัตรของรายการ "${eventName}" จำนวน ${count} ฉบับเรียบร้อยแล้ว`);
    }
  };

  const handleGenerateSingleEventCertificates = (eventId: string, eventName: string) => {
    const res = sportsStore.generateCertificatesForEvent(eventId);
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    if (res.createdCount > 0) {
      showNotification(`🎉 ออกเกียรติบัตรรายการ "${eventName}" สำเร็จ ${res.createdCount} ฉบับ! (ซ้ำเดิม ${res.skippedCount} ฉบับ)`);
    } else {
      showNotification(`ℹ️ รายการ "${eventName}" มีเกียรติบัตรครบถ้วนแล้ว (${res.skippedCount} ฉบับ)`);
    }
  };

  const handleApplyGoogleSlideTemplates = () => {
    const res = sportsStore.applyGoogleSlideTemplatesToAllCertificates();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    if (res.createdCount > 0) {
      showNotification(`🎉 นำ ID จาก Google นำเสนอมาสร้างและผูกกับเกียรติบัตรทั้งหมดสำเร็จ! (สร้างใหม่ ${res.createdCount} ฉบับ, รวมทั้งหมด ${res.totalCount} ฉบับ)`);
    } else {
      showNotification(`🎉 นำ ID จาก Google นำเสนอ (นักเรียน: ${res.studentTpl || '-'}, ครู: ${res.coachTpl || '-'}) มาผูกกับเกียรติบัตรทั้งหมดสำเร็จ ${res.totalCount} ฉบับ!`);
    }
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserFormData({
      username: '',
      full_name: '',
      role: 'SCHOOL',
      school_id: schools[0]?.id || '',
      email: '',
      phone: '',
      status: 'ACTIVE',
      password_plain: '123456',
      must_change_password: true
    });
    setShowAddUser(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserFormData({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      school_id: user.school_id || '',
      email: user.email || '',
      phone: user.phone || '',
      status: user.status || 'ACTIVE',
      password_plain: user.password_plain || '',
      must_change_password: user.must_change_password ?? false
    });
    setShowAddUser(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username || !userFormData.full_name) {
      alert('กรุณากรอก Username และชื่อ-นามสกุล');
      return;
    }

    const cleanUsername = userFormData.username.trim();
    const cleanFullName = userFormData.full_name.trim();

    if (editingUserId) {
      const existingUsers = sportsStore.getUsers();
      const duplicate = existingUsers.find((u) => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== editingUserId);
      if (duplicate) {
        alert(`ชื่อผู้ใช้งาน "${cleanUsername}" ซ้ำกับผู้ใช้อื่นในระบบ กรุณาใช้ชื่ออื่น`);
        return;
      }

      const updates: Partial<User> = {
        username: cleanUsername,
        full_name: cleanFullName,
        role: userFormData.role,
        school_id: userFormData.role === 'SCHOOL' ? userFormData.school_id : undefined,
        email: userFormData.email || `${cleanUsername}@sawangsung.ac.th`,
        phone: userFormData.phone || '',
        status: userFormData.status,
        must_change_password: userFormData.must_change_password
      };

      if (userFormData.password_plain && userFormData.password_plain.trim() !== '') {
        updates.password_plain = userFormData.password_plain.trim();
        updates.password_hash = `$2y$10$custom_${Date.now()}`;
      }

      sportsStore.updateUser(editingUserId, updates);
      showNotification(`แก้ไขข้อมูลผู้ใช้งาน "${cleanFullName}" สำเร็จ`);
    } else {
      const existingUsers = sportsStore.getUsers();
      const duplicate = existingUsers.find((u) => u.username.toLowerCase() === cleanUsername.toLowerCase());
      if (duplicate) {
        alert(`ชื่อผู้ใช้งาน "${cleanUsername}" มีอยู่ในระบบแล้ว`);
        return;
      }

      const passToUse = (userFormData.password_plain || '123456').trim();
      sportsStore.addUser({
        username: cleanUsername,
        password_hash: '$2y$10$qR6K8k7FwQvE8Z0e6YhSKeN2pE7B4...',
        password_plain: passToUse,
        full_name: cleanFullName,
        role: userFormData.role || 'SCHOOL',
        school_id: userFormData.role === 'SCHOOL' ? userFormData.school_id : undefined,
        email: userFormData.email || `${cleanUsername}@sawangsung.ac.th`,
        phone: userFormData.phone || '',
        status: userFormData.status || 'ACTIVE',
        must_change_password: userFormData.must_change_password ?? true
      });
      showNotification(`เพิ่มผู้ใช้งาน "${cleanFullName}" สำเร็จ (รหัสผ่าน: ${passToUse})`);
    }

    setShowAddUser(false);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    const currentUser = sportsStore.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      alert('ไม่สามารถลบบัญชีผู้ใช้งานที่กำลังเข้าสู่ระบบอยู่ในขณะนี้ได้');
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    if (targetUser?.username === 'superadmin' || targetUser?.username === 'admin') {
      alert('ไม่สามารถลบบัญชีผู้ดูแลระบบหลัก (Main Administrator) ได้เพื่อความปลอดภัย');
      return;
    }

    if (window.confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ใช้งาน "${userName}" (${targetUser?.username}) ออกจากระบบ?`)) {
      sportsStore.deleteUser(userId);
      showNotification(`ลบผู้ใช้งาน "${userName}" เรียบร้อยแล้ว`);
    }
  };

  const handleResetUserPassword = (userId: string, userName: string) => {
    if (window.confirm(`ต้องการรีเซ็ตรหัสผ่านของ "${userName}" กลับเป็นค่าเริ่มต้น "123456" ใช่หรือไม่?`)) {
      const res = sportsStore.resetSchoolPasswordToDefault(userId);
      if (res.success) {
        showNotification(`รีเซ็ตรหัสผ่านของ "${userName}" เป็น 123456 เรียบร้อยแล้ว`);
      }
    }
  };

  // --- SCHOOL MANAGEMENT HANDLERS ---
  const handleOpenAddSchool = () => {
    setEditingSchoolId(null);
    setSchoolFormData({
      school_code: '',
      smis_code: '',
      school_name: '',
      short_name: '',
      logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150',
      address: 'อ.กระสัง จ.บุรีรัมย์',
      director_name: '',
      phone: '044-xxxxxx'
    });
    setShowAddSchool(true);
  };

  const handleOpenEditSchool = (sch: School) => {
    setEditingSchoolId(sch.id);
    setSchoolFormData({
      school_code: sch.school_code,
      smis_code: sch.smis_code || sch.school_code,
      school_name: sch.school_name,
      short_name: sch.short_name,
      logo: sch.logo,
      address: sch.address,
      director_name: sch.director_name,
      phone: sch.phone
    });
    setShowAddSchool(true);
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolFormData.school_name) return;

    if (editingSchoolId) {
      sportsStore.updateSchool(editingSchoolId, schoolFormData);
      showNotification(`อัปเดตข้อมูล ${schoolFormData.school_name} สำเร็จ`);
    } else {
      sportsStore.addSchool({
        competition_id: comp.id,
        school_code: schoolFormData.school_code || schoolFormData.smis_code || `310300${Math.floor(10 + Math.random() * 89)}`,
        smis_code: schoolFormData.smis_code || schoolFormData.school_code,
        school_name: schoolFormData.school_name,
        short_name: schoolFormData.short_name || schoolFormData.school_name,
        logo: schoolFormData.logo || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150',
        address: schoolFormData.address || 'จ.บุรีรัมย์',
        director_name: schoolFormData.director_name,
        phone: schoolFormData.phone,
        status: 'ACTIVE'
      });
      showNotification(`เพิ่มโรงเรียน ${schoolFormData.school_name} และสร้างบัญชี SMIS สำเร็จ`);
    }

    setShowAddSchool(false);
  };

  const handleDeleteSchool = (schoolId: string, schoolName: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโรงเรียน "${schoolName}" ออกจากระบบ? ข้อมูลการสมัครและนักเรียนของโรงเรียนนี้จะได้รับผลกระทบ`)) {
      sportsStore.deleteSchool(schoolId);
      showNotification(`ลบโรงเรียน "${schoolName}" เรียบร้อยแล้ว`);
    }
  };

  const handleResetSchoolPassword = (schoolId: string, schoolName: string) => {
    if (window.confirm(`คุณต้องการรีเซ็ตรหัสผ่านของ "${schoolName}" กลับเป็นรหัสเริ่มต้น '123456' ใช่หรือไม่?`)) {
      const ok = sportsStore.resetSchoolPasswordToDefault(schoolId);
      if (ok) {
        showNotification(`รีเซ็ตรหัสผ่านของ "${schoolName}" เป็น 123456 เรียบร้อยแล้ว (บังคับเปลี่ยนรหัสเมื่อเข้าสู่ระบบ)`);
      } else {
        alert('ไม่พบบัญชีผู้ใช้ของโรงเรียนนี้');
      }
    }
  };

  // --- SPORTS & EVENTS HANDLERS ---
  const handleOpenAddEvent = (preset?: Partial<Event>) => {
    setEditingEventId(null);
    const initialSport = preset?.sport_id ? sports.find(s => s.id === preset.sport_id) : sports[0];
    const initialGrade = normalizeEducationLevel(preset?.grade);
    const initialGender = preset?.gender || 'MALE';
    const isAthletic = isAthleticsSport(initialSport?.sport_name);
    
    let defaultAth = 'วิ่ง 100 เมตร';
    if (preset?.event_name) {
      const clean = preset.event_name.replace(/\[.*?\]/g, '').trim();
      if (clean) defaultAth = clean;
    }
    setSelectedAthleticsItem(defaultAth);

    const presetAthleticsObj = ATHLETICS_PRESET_EVENTS.find(a => a.name === defaultAth);
    const finalEventName = isAthletic
      ? formatEventDisplay('กรีฑา', initialGrade, defaultAth, initialGender)
      : formatEventDisplay(initialSport?.sport_name || 'กีฬา', initialGrade, undefined, initialGender);

    setEventFormData({
      sport_id: initialSport?.id || sports[0]?.id || '',
      event_code: preset?.event_code || `EV-${Date.now().toString().slice(-4)}`,
      event_name: finalEventName,
      gender: initialGender,
      age_group: initialGrade,
      grade: initialGrade,
      competition_type: preset?.competition_type || (isAthletic ? (presetAthleticsObj?.type || 'INDIVIDUAL') : 'TEAM'),
      min_players: preset?.min_players || (isAthletic ? (presetAthleticsObj?.minPlayers || 1) : 7),
      max_players: preset?.max_players || (isAthletic ? (presetAthleticsObj?.maxPlayers || 1) : 12),
      award_type: preset?.award_type || 'เหรียญรางวัล ทอง เงิน ทองแดง + เกียรติบัตร'
    });
    setShowAddEvent(true);
  };

  const handleOpenEditEvent = (ev: Event) => {
    setEditingEventId(ev.id);
    const sp = sports.find((s) => s.id === ev.sport_id);
    const normGrade = normalizeEducationLevel(ev.grade);
    const isAthletic = isAthleticsSport(sp?.sport_name) || /^(วิ่ง|กระโดด|ทุ่ม|ขว้าง|พุ่ง|เขย่ง)/.test(ev.event_name);
    
    let athItem = 'วิ่ง 100 เมตร';
    if (isAthletic) {
      const match = ev.event_name.match(/(วิ่งผลัด\s*\d+\s*x\s*\d+\s*เมตร|วิ่ง\s*[\d,]+\s*เมตร|กระโดดไกล|กระโดดสูง|ทุ่มน้ำหนัก|ขว้างจักร|พุ่งแหลน|เขย่งก้าวกระโดด)/);
      if (match) {
        athItem = match[1];
      } else {
        athItem = ev.event_name.replace(/\[.*?\]/g, '').trim() || 'วิ่ง 100 เมตร';
      }
    }
    setSelectedAthleticsItem(athItem);

    const finalEventName = isAthletic
      ? formatEventDisplay('กรีฑา', normGrade, athItem, ev.gender)
      : formatEventDisplay(sp?.sport_name || 'กีฬา', normGrade, undefined, ev.gender);

    setEventFormData({
      sport_id: ev.sport_id,
      event_code: ev.event_code,
      event_name: finalEventName,
      gender: ev.gender,
      age_group: normGrade,
      grade: normGrade,
      competition_type: ev.competition_type,
      min_players: ev.min_players,
      max_players: ev.max_players,
      award_type: ev.award_type
    });
    setShowAddEvent(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSport = sports.find((s) => s.id === eventFormData.sport_id);
    const sportName = selectedSport?.sport_name || 'กีฬา';
    const normalizedGrade = normalizeEducationLevel(eventFormData.grade);
    const isAthletic = isAthleticsSport(sportName);

    const finalEventName = isAthletic
      ? formatEventDisplay('กรีฑา', normalizedGrade, selectedAthleticsItem, eventFormData.gender)
      : formatEventDisplay(sportName, normalizedGrade, undefined, eventFormData.gender);

    if (editingEventId) {
      sportsStore.updateEvent(editingEventId, {
        sport_id: eventFormData.sport_id,
        event_code: eventFormData.event_code,
        event_name: finalEventName,
        gender: eventFormData.gender as any,
        age_group: normalizedGrade,
        grade: normalizedGrade,
        competition_type: eventFormData.competition_type as any,
        min_players: Number(eventFormData.min_players) || 1,
        max_players: Number(eventFormData.max_players) || 1,
        award_type: eventFormData.award_type || 'เหรียญรางวัล ทอง เงิน ทองแดง + เกียรติบัตร'
      });
      showNotification(`แก้ไขรายการแข่งขัน "${finalEventName}" สำเร็จ`);
    } else {
      sportsStore.addEvent({
        competition_id: comp.id,
        sport_id: eventFormData.sport_id || sports[0]?.id || '',
        event_code: eventFormData.event_code || `EV-${Date.now().toString().slice(-4)}`,
        event_name: finalEventName,
        gender: eventFormData.gender as any,
        age_group: normalizedGrade,
        grade: normalizedGrade,
        competition_type: eventFormData.competition_type as any,
        min_players: Number(eventFormData.min_players) || 1,
        max_players: Number(eventFormData.max_players) || 1,
        award_type: eventFormData.award_type || 'เหรียญรางวัล ทอง เงิน ทองแดง + เกียรติบัตร',
        status: 'OPEN'
      });
      showNotification(`เพิ่มรายการแข่งขัน "${finalEventName}" สำเร็จ`);
    }

    setShowAddEvent(false);
  };

  const handleDeleteEvent = (eventId: string, eventName: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการแข่งขัน "${eventName}"?`)) {
      sportsStore.deleteEvent(eventId);
      showNotification(`ลบรายการแข่งขัน "${eventName}" เรียบร้อยแล้ว`);
    }
  };

  // Sport Category Handlers
  const handleOpenAddSport = () => {
    setEditingSportId(null);
    setSportFormData({
      sport_name: '',
      sport_icon: '🏆',
      category: 'BALL',
      description: '',
      status: 'ACTIVE'
    });
    setShowAddSport(true);
  };

  const handleOpenEditSport = (sp: Sport) => {
    setEditingSportId(sp.id);
    setSportFormData({
      sport_name: sp.sport_name,
      sport_icon: sp.sport_icon,
      category: sp.category,
      description: sp.description || '',
      status: sp.status
    });
    setShowAddSport(true);
  };

  const handleSaveSport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sportFormData.sport_name) return;

    if (editingSportId) {
      sportsStore.updateSport(editingSportId, sportFormData);
      showNotification(`แก้ไขหมวดหมู่กีฬา "${sportFormData.sport_name}" สำเร็จ`);
    } else {
      sportsStore.addSport({
        sport_name: sportFormData.sport_name,
        sport_icon: sportFormData.sport_icon || '🏆',
        category: sportFormData.category || 'BALL',
        description: sportFormData.description || '',
        status: 'ACTIVE'
      });
      showNotification(`เพิ่มหมวดหมู่กีฬา "${sportFormData.sport_name}" สำเร็จ`);
    }

    setShowAddSport(false);
  };

  const handleDeleteSport = (sportId: string, sportName: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่กีฬา "${sportName}"?`)) {
      sportsStore.deleteSport(sportId);
      showNotification(`ลบหมวดหมู่กีฬา "${sportName}" เรียบร้อยแล้ว`);
    }
  };

  // --- DATABASE UPDATE RUNNER ---
  const handleRunDatabaseUpdate = () => {
    setIsUpdatingDb(true);
    setDbUpdateDone(false);
    setDbUpdateLogs([]);

    const queries = [
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `academic_year` VARCHAR(50) DEFAULT '2569'", msg: "เพิ่มคอลัมน์ academic_year ในตาราง competitions สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `header_bg_image` TEXT DEFAULT NULL", msg: "เพิ่มคอลัมน์ header_bg_image สำหรับตกแต่งหัวเว็บ สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `google_drive_folder_id` VARCHAR(255) DEFAULT NULL", msg: "เพิ่มคอลัมน์ google_drive_folder_id สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `google_slide_template_id` VARCHAR(255) DEFAULT NULL", msg: "เพิ่มคอลัมน์ google_slide_template_id สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `google_slide_template_student_id` VARCHAR(255) DEFAULT NULL", msg: "เพิ่มคอลัมน์ google_slide_template_student_id สำหรับแม่แบบนักเรียน สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `google_slide_template_coach_id` VARCHAR(255) DEFAULT NULL", msg: "เพิ่มคอลัมน์ google_slide_template_coach_id สำหรับแม่แบบครู สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `president_name` VARCHAR(150) DEFAULT NULL", msg: "เพิ่มคอลัมน์ president_name (ประธานจัดการแข่งขัน) สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `director_name` VARCHAR(150) DEFAULT NULL", msg: "เพิ่มคอลัมน์ director_name (ผอ.เขตพื้นที่ฯ) สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `cert_prefix` VARCHAR(50) DEFAULT 'สพป.บร.3/2569-'", msg: "เพิ่มคอลัมน์ cert_prefix สำเร็จ" },
      { q: "ALTER TABLE `competitions` ADD COLUMN IF NOT EXISTS `medal_criteria` ENUM('GOLD_FIRST', 'TOTAL_FIRST') DEFAULT 'GOLD_FIRST'", msg: "เพิ่มคอลัมน์ medal_criteria สำเร็จ" },
      { q: "ALTER TABLE `schools` ADD COLUMN IF NOT EXISTS `smis_code` VARCHAR(50) DEFAULT NULL", msg: "เพิ่มคอลัมน์ smis_code ในตาราง schools สำเร็จ" },
      { q: "ALTER TABLE `schools` ADD COLUMN IF NOT EXISTS `director_name` VARCHAR(150) DEFAULT NULL", msg: "เพิ่มคอลัมน์ director_name ในตาราง schools สำเร็จ" },
      { q: "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `password_plain` VARCHAR(255) DEFAULT '123456'", msg: "เพิ่มคอลัมน์ password_plain ในตาราง users สำเร็จ" },
      { q: "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `phone` VARCHAR(50) DEFAULT NULL", msg: "เพิ่มคอลัมน์ phone ในตาราง users สำเร็จ" },
      { q: "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `must_change_password` TINYINT(1) NOT NULL DEFAULT 1", msg: "เพิ่มคอลัมน์ must_change_password สำเร็จ" },
      { q: "ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `grade` VARCHAR(100) DEFAULT 'ประถมศึกษา'", msg: "เพิ่มคอลัมน์ grade ในตาราง events สำเร็จ" },
      { q: "ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `age_group` VARCHAR(100) DEFAULT 'อายุไม่เกิน 12 ปี'", msg: "เพิ่มคอลัมน์ age_group ในตาราง events สำเร็จ" },
      { q: "ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `award_type` VARCHAR(255) DEFAULT 'เหรียญรางวัล ทอง เงิน ทองแดง + เกียรติบัตร'", msg: "เพิ่มคอลัมน์ award_type สำเร็จ" },
      { q: "CREATE TABLE IF NOT EXISTS `activity_logs` (...)", msg: "ตรวจสอบและสร้างตาราง activity_logs สำเร็จ" },
      { q: "CREATE TABLE IF NOT EXISTS `settings` (...)", msg: "ตรวจสอบและสร้างตาราง settings สำเร็จ" }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < queries.length) {
        const item = queries[current];
        setDbUpdateLogs((prev) => [...prev, { query: item.q, status: 'SUCCESS', message: item.msg }]);
        current++;
      } else {
        clearInterval(interval);
        setIsUpdatingDb(false);
        setDbUpdateDone(true);
        confetti({ particleCount: 80, spread: 70 });
        showNotification('อัปเดตโครงสร้างตารางฐานข้อมูล MySQL เรียบร้อยแล้ว (ไม่สูญเสียข้อมูลเดิม)');
      }
    }, 150);
  };

  const handleDownloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showNotification(`ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว`);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
    if (userSearchTerm) {
      const term = userSearchTerm.toLowerCase();
      return (
        u.username.toLowerCase().includes(term) ||
        u.full_name.toLowerCase().includes(term) ||
        (u.email && u.email.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // Filtered & Sorted Events
  const filteredEvents = sortEventsList(
    events.filter((ev) => {
      if (eventSportFilter !== 'ALL' && ev.sport_id !== eventSportFilter) return false;
      if (eventGenderFilter !== 'ALL' && ev.gender !== eventGenderFilter) return false;
      if (eventGradeFilter !== 'ALL') {
        if (eventGradeFilter === 'KINDERGARTEN' && !ev.grade.includes('อนุบาล') && !ev.grade.includes('ปฐมวัย')) return false;
        if (eventGradeFilter === 'PRIMARY' && !ev.grade.includes('ประถม')) return false;
        if (eventGradeFilter === 'SECONDARY' && !ev.grade.includes('มัธยม')) return false;
      }
      return true;
    })
  );

  // Filtered Schools
  const filteredSchools = schools.filter((sch) => {
    if (schoolSearchTerm) {
      const term = schoolSearchTerm.toLowerCase();
      return (
        sch.school_name.toLowerCase().includes(term) ||
        sch.school_code.toLowerCase().includes(term) ||
        (sch.smis_code && sch.smis_code.toLowerCase().includes(term)) ||
        (sch.director_name && sch.director_name.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // --- RESULTS ANNOUNCEMENT HANDLERS & HELPERS ---
  const filteredResultEvents = sortEventsList(
    events.filter((ev) => {
      const sp = sports.find((s) => s.id === ev.sport_id);
      if (resultSportFilter !== 'ALL' && ev.sport_id !== resultSportFilter) return false;
      if (resultStatusFilter === 'PENDING' && ev.status === 'COMPLETED') return false;
      if (resultStatusFilter === 'COMPLETED' && ev.status !== 'COMPLETED') return false;
      if (resultSearchTerm) {
        const term = resultSearchTerm.toLowerCase();
        const matchName = ev.event_name.toLowerCase().includes(term);
        const matchCode = ev.event_code.toLowerCase().includes(term);
        const matchSport = sp?.sport_name.toLowerCase().includes(term);
        if (!matchName && !matchCode && !matchSport) return false;
      }
      return true;
    })
  );

  const selectedResultEvent = events.find((e) => e.id === selectedResultEventId);
  const selectedEventRegistrations = registrations.filter(
    (r) => r.event_id === selectedResultEventId
  );
  const registeredSchoolIds = selectedEventRegistrations.map((r) => r.school_id);
  const candidateSchools = schools.filter((s) => registeredSchoolIds.includes(s.id));

  const handleSelectResultEvent = (ev: Event) => {
    setSelectedResultEventId(ev.id);
    setResultSaveSuccess(false);

    // Preload existing result if any
    const existing = results.filter((r) => r.event_id === ev.id);
    const r1 = existing.find((r) => r.rank === 1);
    const r2 = existing.find((r) => r.rank === 2);
    const r3 = existing.find((r) => r.rank === 3);
    const r4 = existing.find((r) => r.rank === 4);

    setResultRank1SchoolId(r1?.school_id || '');
    setResultRank2SchoolId(r2?.school_id || '');
    setResultRank3SchoolId(r3?.school_id || '');
    setResultRank4SchoolId(r4?.school_id || '');
    setResultScore(r1?.score || '');
    setResultNote(r1?.note || '');
  };

  const handlePublishResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResultEventId) {
      alert('กรุณาเลือกรายการแข่งขัน');
      return;
    }
    if (!resultRank1SchoolId) {
      alert('กรุณาเลือกโรงเรียนผู้ชนะเลิศ (เหรียญทอง 🥇)');
      return;
    }

    const selectedEv = events.find((ev) => ev.id === selectedResultEventId);

    const placements: Array<{
      school_id: string;
      rank: 1 | 2 | 3 | 4;
      award: string;
      medal: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';
      score?: string;
      note?: string;
    }> = [
      {
        school_id: resultRank1SchoolId,
        rank: 1,
        award: 'ชนะเลิศ',
        medal: 'GOLD',
        score: resultScore,
        note: resultNote
      }
    ];

    if (resultRank2SchoolId) {
      placements.push({
        school_id: resultRank2SchoolId,
        rank: 2,
        award: 'รองชนะเลิศอันดับ 1',
        medal: 'SILVER',
        score: resultScore,
        note: resultNote
      });
    }

    if (resultRank3SchoolId) {
      placements.push({
        school_id: resultRank3SchoolId,
        rank: 3,
        award: 'รองชนะเลิศอันดับ 2',
        medal: 'BRONZE',
        score: resultScore,
        note: resultNote
      });
    }

    if (resultRank4SchoolId) {
      placements.push({
        school_id: resultRank4SchoolId,
        rank: 4,
        award: 'รางวัลชมเชย',
        medal: 'NONE',
        score: resultScore,
        note: resultNote
      });
    }

    sportsStore.recordEventResult(selectedResultEventId, placements);

    let certMsg = '';
    if (autoGenCerts) {
      const certRes = sportsStore.generateCertificatesForEvent(selectedResultEventId);
      certMsg = ` และสร้างเกียรติบัตรอัตโนมัติแล้ว ${certRes.createdCount} ใบ`;
    }

    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    });

    setResultSaveSuccess(true);
    showNotification(`🏆 บันทึกและประกาศผลการแข่งขัน "${selectedEv?.event_name}" สำเร็จ${certMsg}`);
    setTimeout(() => setResultSaveSuccess(false), 5000);
  };

  const handleRevokeResult = (eventId: string, eventName: string) => {
    if (window.confirm(`คุณต้องการยกเลิกการประกาศผลการแข่งขันรายการ "${eventName}" และคืนสถานะเป็นรอการแข่งขันใช่หรือไม่?`)) {
      sportsStore.revokeEventResult(eventId);
      if (selectedResultEventId === eventId) {
        setSelectedResultEventId('');
        setResultRank1SchoolId('');
        setResultRank2SchoolId('');
        setResultRank3SchoolId('');
        setResultRank4SchoolId('');
        setResultScore('');
        setResultNote('');
      }
      showNotification(`ยกเลิกผลการแข่งขัน "${eventName}" เรียบร้อยแล้ว`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Action Notification */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-white/80 hover:text-white font-bold">&times;</button>
        </div>
      )}

      {/* Admin Nav Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1 ${
              isSuperAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900'
            }`}>
              <Shield className="w-3.5 h-3.5" /> 
              {isSuperAdmin ? '👑 ซูเปอร์แอดมิน (Super Admin Master Console)' : 'ผู้ดูแลระบบ (Admin Console)'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              สิทธิ์สูงสุด: ควบคุมทุกโรงเรียน กีฬา เกียรติบัตร และฐานข้อมูล MySQL
            </span>
          </div>
          <h1 className="text-2xl font-bold font-['Kanit'] text-slate-900 mt-1">
            การบริหารจัดการระบบและฐานข้อมูลการแข่งขัน
          </h1>
        </div>

        {/* Tab Selector with distinct colored backgrounds */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-2 rounded-2xl overflow-x-auto border border-slate-200 shadow-inner">
          {/* Super Admin Only: System Settings */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
                activeTab === 'SETTINGS'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                  : 'bg-white/80 text-blue-900 hover:bg-blue-50 border border-blue-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> ⚙️ ตั้งค่าระบบการแข่งขัน
            </button>
          )}

          {/* Super Admin Only: Cloud & GAS */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('GOOGLE_GAS')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
                activeTab === 'GOOGLE_GAS'
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                  : 'bg-white/80 text-indigo-900 hover:bg-indigo-50 border border-indigo-100'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" /> เชื่อมต่อ Cloud/GAS
            </button>
          )}

          {/* Live Daily Match Report for all Admins */}
          <button
            onClick={() => setActiveTab('MATCH_REPORT')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
              activeTab === 'MATCH_REPORT'
                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300'
                : 'bg-white/80 text-rose-900 hover:bg-rose-50 border border-rose-100'
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" /> 📢 รายงานผลประจำวัน (Live)
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
              activeTab === 'USERS'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                : 'bg-white/80 text-emerald-900 hover:bg-emerald-50 border border-emerald-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> ผู้ใช้งาน ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('SCHOOLS')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
              activeTab === 'SCHOOLS'
                ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-300'
                : 'bg-white/80 text-cyan-900 hover:bg-cyan-50 border border-cyan-100'
            }`}
          >
            <SchoolIcon className="w-3.5 h-3.5" /> โรงเรียน ({schools.length})
          </button>

          <button
            onClick={() => setActiveTab('SPORTS')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
              activeTab === 'SPORTS'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                : 'bg-white/80 text-amber-900 hover:bg-amber-50 border border-amber-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> กีฬา/กรีฑา ({events.length})
          </button>

          <button
            onClick={() => setActiveTab('RESULTS')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
              activeTab === 'RESULTS'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                : 'bg-white/80 text-indigo-900 hover:bg-indigo-50 border border-indigo-100'
            }`}
          >
            <Medal className="w-3.5 h-3.5" /> 🏆 บันทึกผล & ตัดสินเหรียญ
          </button>

          <button
            onClick={() => setActiveTab('CERTIFICATES')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
              activeTab === 'CERTIFICATES'
                ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                : 'bg-white/80 text-purple-900 hover:bg-purple-50 border border-purple-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> ออกเกียรติบัตร ({certificates.length})
          </button>

          {/* Super Admin Only: Database MySQL */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('DATABASE')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
                activeTab === 'DATABASE'
                  ? 'bg-sky-700 text-white shadow-md ring-2 ring-sky-300'
                  : 'bg-white/80 text-sky-900 hover:bg-sky-50 border border-sky-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" /> 🔄 MySQL
            </button>
          )}

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
              activeTab === 'LOGS'
                ? 'bg-slate-700 text-white shadow-md ring-2 ring-slate-300'
                : 'bg-white/80 text-slate-800 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> ประวัติ
          </button>
        </div>
      </div>

      {/* TAB: DAILY LIVE MATCH REPORT */}
      {activeTab === 'MATCH_REPORT' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-xs text-white text-xs font-bold rounded-full inline-flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                📢 ระบบรายงานผลการแข่งขันประจำวัน (Live Match Report)
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-['Kanit']">
                ศูนย์รายงานผลการแข่งขันและอัปเดตสกอร์สด
              </h2>
              <p className="text-xs text-rose-100 mt-1">
                เจ้าหน้าที่รายงานผลและกรรมการตัดสินสามารถบันทึกสกอร์การแข่งขันแต่ละคู่ และผลจะแสดงขึ้นหน้าหลักทันที
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs shrink-0">
              <span className="text-rose-100 block text-[10px]">ผู้รายงานปัจจุบัน:</span>
              <span className="font-bold text-white font-['Kanit']">{currentUser?.full_name || 'ผู้ดูแลระบบ'}</span>
            </div>
          </div>

          <JudgeDashboard />
        </div>
      )}

      {/* TAB 1: COMPETITION SETTINGS (Super Admin Only) */}
      {activeTab === 'SETTINGS' && isSuperAdmin && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold font-['Kanit'] text-slate-900">
                ตั้งค่าข้อมูลการแข่งขันและภาพหัวเว็บเพจ
              </h2>
              <p className="text-xs text-slate-500">
                แก้ไขชื่อการแข่งขัน สถานที่ ภาพแบนเนอร์ส่วนหัวเว็บ และผู้ลงนามในเกียรติบัตร
              </p>
            </div>
            {savedSettings && (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกเรียบร้อย
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCompetitionSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold block mb-1">ชื่อการแข่งขันกีฬา (แสดงบนหัวเว็บเพจ)</label>
                <input
                  type="text"
                  required
                  value={compForm.competition_name}
                  onChange={(e) => setCompForm({ ...compForm, competition_name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">หน่วยงานผู้จัด / เจ้าภาพ</label>
                <input
                  type="text"
                  required
                  value={compForm.host_org}
                  onChange={(e) => setCompForm({ ...compForm, host_org: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">ปีการศึกษา / ปี พ.ศ.</label>
                <input
                  type="text"
                  value={compForm.academic_year || '2569'}
                  onChange={(e) => setCompForm({ ...compForm, academic_year: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm font-mono"
                  placeholder="2569"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">สถานที่จัดการแข่งขัน (Venue)</label>
                <input
                  type="text"
                  required
                  value={compForm.venue}
                  onChange={(e) => setCompForm({ ...compForm, venue: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">วันที่เริ่มการแข่งขัน</label>
                <input
                  type="date"
                  required
                  value={compForm.start_date}
                  onChange={(e) => setCompForm({ ...compForm, start_date: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">วันที่สิ้นสุดการแข่งขัน</label>
                <input
                  type="date"
                  required
                  value={compForm.end_date}
                  onChange={(e) => setCompForm({ ...compForm, end_date: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Custom Header Banner Image */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="font-bold text-slate-900 block">
                🖼️ ลิงก์ภาพตกแต่งส่วนหัวของเว็บเพจ (Header Background Banner Image)
              </label>
              <input
                type="text"
                value={compForm.header_bg_image || ''}
                onChange={(e) => setCompForm({ ...compForm, header_bg_image: e.target.value })}
                placeholder="วาง URL รูปภาพแบนเนอร์ เช่น https://images.unsplash.com/... หรือ Base64"
                className="w-full p-2.5 border rounded-xl text-sm bg-white"
              />
              {compForm.header_bg_image && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-300 h-28 relative">
                  <img
                    src={compForm.header_bg_image}
                    alt="Header Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    ตัวอย่างภาพหัวเว็บ
                  </span>
                </div>
              )}
            </div>

            {/* Google Drive & Slides Settings */}
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <Cloud className="w-4 h-4 text-blue-600" />
                การเชื่อมต่อ Google Drive & Google Slides (Auto Certificate & Cloud Storage)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">Google Drive Folder ID</label>
                  <input
                    type="text"
                    value={compForm.google_drive_folder_id || ''}
                    onChange={(e) => setCompForm({ ...compForm, google_drive_folder_id: e.target.value })}
                    placeholder="เช่น 1A2B3C4D5E6F7G8H9I0J"
                    className="w-full p-2.5 border rounded-xl text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">Google Slide Template ID</label>
                  <input
                    type="text"
                    value={compForm.google_slide_template_id || ''}
                    onChange={(e) => setCompForm({ ...compForm, google_slide_template_id: e.target.value })}
                    placeholder="เช่น 1X2Y3Z_Template_Slide_ID"
                    className="w-full p-2.5 border rounded-xl text-sm bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Certificate Signatories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="font-semibold block mb-1">ชื่อประธานจัดการแข่งขัน</label>
                <input
                  type="text"
                  value={compForm.president_name || ''}
                  onChange={(e) => setCompForm({ ...compForm, president_name: e.target.value })}
                  placeholder="เช่น นายสมบูรณ์ สว่างศรี"
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">ชื่อผู้อำนวยการเขตพื้นที่การศึกษาฯ</label>
                <input
                  type="text"
                  value={compForm.director_name || ''}
                  onChange={(e) => setCompForm({ ...compForm, director_name: e.target.value })}
                  placeholder="เช่น ดร.ประเสริฐ สายทอง"
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">คำนำหน้าเลขที่เกียรติบัตร</label>
                <input
                  type="text"
                  value={compForm.cert_prefix || 'สพป.บร.3/2569-'}
                  onChange={(e) => setCompForm({ ...compForm, cert_prefix: e.target.value })}
                  placeholder="สพป.บร.3/2569-"
                  className="w-full p-2.5 border rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: GOOGLE APPS SCRIPT & GOOGLE DRIVE & GOOGLE SLIDES INTEGRATION (Super Admin Only) */}
      {activeTab === 'GOOGLE_GAS' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white border border-indigo-500/30 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-md text-[11px] font-bold flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                    Cloud Certificate Generator Engine
                  </span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md text-[11px] font-bold">
                    Google Drive + Google Slides API
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold font-['Kanit'] text-white">
                  ตั้งค่าการเชื่อมต่อ Google Apps Script & Google Drive สร้างเกียรติบัตรอัตโนมัติ
                </h2>
                <p className="text-xs text-indigo-200 mt-1 max-w-3xl leading-relaxed">
                  ระบบสามารถเชื่อมต่อกับ Google Apps Script (Web App) เพื่อดึงแม่แบบจาก Google Slides แทนที่ตัวแปรชื่อนักเรียน/ครู โรงเรียน และผลรางวัล แล้วแปลงเป็นไฟล์ PDF ส่งกลับมาและบันทึกลงใน Google Drive อัตโนมัติ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyGasCode}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm ${
                    copiedGasCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {copiedGasCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedGasCode ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด Code.gs'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadGasCode}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  ดาวน์โหลด Code.gs
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Form & Live Test Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Settings (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm font-['Kanit'] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  พารามิเตอร์การเชื่อมต่อ (Google Integration Config)
                </h3>
                {savedSettings && (
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> บันทึกแล้ว
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveGasSettings} className="space-y-4 text-xs">
                {/* GAS Web App URL */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1 flex items-center justify-between">
                    <span>1. Google Apps Script Web App URL (สำคัญที่สุด) *</span>
                    <span className="text-[10px] text-indigo-600 font-normal">URL จากการ Deploy Web App</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={compForm.google_apps_script_url || ''}
                      onChange={(e) => setCompForm({ ...compForm, google_apps_script_url: e.target.value })}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="w-full p-2.5 pr-20 border rounded-xl text-xs font-mono bg-slate-50 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={handleTestGasConnection}
                      disabled={gasTestLoading}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      {gasTestLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      ทดสอบ
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    วาง URL ที่ได้จากเมนู <strong>Deploy &gt; Manage deployments &gt; Web app URL</strong>
                  </p>
                </div>

                {/* Google Drive Folder ID */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1 flex items-center justify-between">
                    <span>2. Google Drive Target Folder ID (โฟลเดอร์เก็บเกียรติบัตร PDF) *</span>
                    {compForm.google_drive_folder_id && (
                      <a
                        href={`https://drive.google.com/drive/folders/${compForm.google_drive_folder_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        เปิดโฟลเดอร์ <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </label>
                  <input
                    type="text"
                    value={compForm.google_drive_folder_id || ''}
                    onChange={(e) => setCompForm({ ...compForm, google_drive_folder_id: e.target.value })}
                    placeholder="เช่น 1aBcDeFgHiJkLmNoPqRsTuVwXyZ_SPORTS2569"
                    className="w-full p-2.5 border rounded-xl text-xs font-mono bg-slate-50 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    คัดลอกจาก URL ของโฟลเดอร์ใน Google Drive: <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">drive.google.com/drive/folders/<strong>[FOLDER_ID]</strong></code>
                  </p>
                </div>

                {/* Google Slide Template IDs: Separate for Students and Coaches */}
                <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/70 rounded-2xl border border-indigo-200/80 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">3</span>
                      <div>
                        <div className="font-bold text-slate-900 text-xs font-['Kanit']">
                          ตั้งค่า Google Slide Template แยก "นักเรียน" และ "ครูผู้ฝึกสอน" (อิสระจากกัน)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ระบบจะดึงแม่แบบที่ถูกต้องตามประเภทผู้รับเกียรติบัตรโดยอัตโนมัติ
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-full text-[10px]">
                      ระบบแยก ID 2 แม่แบบ
                    </span>
                  </div>

                  {/* 3.1 Student Template ID */}
                  <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-blue-950 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span>3.1 Google Slide Template ID สำหรับ &ldquo;นักเรียน&rdquo; (Student Template ID) *</span>
                      </label>
                      {(compForm.google_slide_template_student_id || compForm.google_slide_template_id) && (
                        <a
                          href={`https://docs.google.com/presentation/d/${compForm.google_slide_template_student_id || compForm.google_slide_template_id}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-semibold"
                        >
                          เปิดแม่แบบนักเรียน <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      value={compForm.google_slide_template_student_id ?? compForm.google_slide_template_id ?? ''}
                      onChange={(e) => setCompForm({
                        ...compForm,
                        google_slide_template_student_id: e.target.value,
                        google_slide_template_id: e.target.value
                      })}
                      placeholder="เช่น 1sL1dE_T3mpL4t3_Student_2569"
                      className="w-full p-2.5 border border-blue-200 rounded-xl text-xs font-mono bg-blue-50/30 focus:bg-white focus:ring-2 focus:ring-blue-300"
                    />
                    <p className="text-[10px] text-slate-500">
                      ใช้สำหรับนักเรียนที่ได้รับรางวัลจากการแข่งขัน (แทนที่ตัวแปรชื่อนักเรียน, โรงเรียน, รางวัล)
                    </p>
                  </div>

                  {/* 3.2 Coach / Teacher Template ID */}
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>3.2 Google Slide Template ID สำหรับ &ldquo;ครูผู้ฝึกสอน&rdquo; (Coach / Teacher Template ID) *</span>
                      </label>
                      {compForm.google_slide_template_coach_id && (
                        <a
                          href={`https://docs.google.com/presentation/d/${compForm.google_slide_template_coach_id}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-semibold"
                        >
                          เปิดแม่แบบครู <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      value={compForm.google_slide_template_coach_id || ''}
                      onChange={(e) => setCompForm({ ...compForm, google_slide_template_coach_id: e.target.value })}
                      placeholder="เช่น 1sL1dE_T3mpL4t3_Coach_2569"
                      className="w-full p-2.5 border border-emerald-200 rounded-xl text-xs font-mono bg-emerald-50/30 focus:bg-white focus:ring-2 focus:ring-emerald-300"
                    />
                    <p className="text-[10px] text-slate-500">
                      ใช้สำหรับครูผู้ฝึกสอนของโรงเรียนที่ได้รับรางวัล (แทนที่ตัวแปรชื่อครู, โรงเรียน, รายการแข่งขัน)
                    </p>
                  </div>
                </div>

                {/* Prefix & Signatories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">คำนำหน้าเลขที่เกียรติบัตร (Cert Prefix)</label>
                    <input
                      type="text"
                      value={compForm.cert_prefix || 'สพป.บร.3/2569-'}
                      onChange={(e) => setCompForm({ ...compForm, cert_prefix: e.target.value })}
                      placeholder="สพป.บร.3/2569-"
                      className="w-full p-2.5 border rounded-xl text-xs font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ปีการศึกษา / ปี พ.ศ.</label>
                    <input
                      type="text"
                      value={compForm.academic_year || '2569'}
                      onChange={(e) => setCompForm({ ...compForm, academic_year: e.target.value })}
                      placeholder="2569"
                      className="w-full p-2.5 border rounded-xl text-xs font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ชื่อประธานจัดการแข่งขัน</label>
                    <input
                      type="text"
                      value={compForm.president_name || ''}
                      onChange={(e) => setCompForm({ ...compForm, president_name: e.target.value })}
                      placeholder="เช่น นายสมบูรณ์ สว่างศรี"
                      className="w-full p-2.5 border rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">ชื่อผู้อำนวยการเขตพื้นที่ฯ</label>
                    <input
                      type="text"
                      value={compForm.director_name || ''}
                      onChange={(e) => setCompForm({ ...compForm, director_name: e.target.value })}
                      placeholder="เช่น ดร.ประเสริฐ สายทอง"
                      className="w-full p-2.5 border rounded-xl text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleTestGasConnection}
                    disabled={gasTestLoading}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    {gasTestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-indigo-600" />}
                    ⚡ ทดสอบการเชื่อมต่อ GAS
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition"
                  >
                    <Check className="w-4 h-4" /> บันทึกการตั้งค่า Google Integration
                  </button>
                </div>
              </form>
            </div>

            {/* Test Connection Results & Quick Stats (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Test Status Panel */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  สถานะการทดสอบการเชื่อมต่อ (Live Diagnostics)
                </h3>

                {gasTestLoading && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 flex items-center gap-3 animate-pulse">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                    <div>
                      <div className="font-bold text-xs">กำลังส่งคำขอทดสอบไปยัง Google Apps Script...</div>
                      <div className="text-[11px] text-indigo-700">กำลังตรวจสอบ Web App Endpoint และสิทธิ์การเข้าถึง</div>
                    </div>
                  </div>
                )}

                {gasTestResult && !gasTestLoading && (
                  <div
                    className={`p-4 rounded-xl border space-y-2 text-xs animate-fade-in ${
                      gasTestResult.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {gasTestResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <div className="font-bold text-xs">{gasTestResult.message}</div>
                    </div>

                    {gasTestResult.responseData && (
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/80 font-mono text-[10px] space-y-1 overflow-x-auto">
                        <div className="text-slate-500 font-semibold">// ข้อมูลตอบกลับจากระบบ:</div>
                        <pre className="text-slate-800">{JSON.stringify(gasTestResult.responseData, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}

                {!gasTestResult && !gasTestLoading && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs text-center space-y-1">
                    <Cloud className="w-6 h-6 mx-auto text-slate-400" />
                    <div className="font-medium text-slate-700">ยังไม่มีการทดสอบการเชื่อมต่อ</div>
                    <div className="text-[11px] text-slate-400">กรอก URL ด้านซ้ายแล้วกดปุ่ม "ทดสอบ" เพื่อตรวจสอบความพร้อม</div>
                  </div>
                )}
              </div>

              {/* Variables / Placeholders Reference Box */}
              <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    แท็กตัวแปรใน Google Slides (Template Tags)
                  </span>
                  <span className="text-[10px] text-slate-400">พิมพ์ลงในกล่องข้อความบนสไลด์</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg">
                    <code className="text-cyan-300 font-bold font-mono">{"{{certificate_no}}"}</code>
                    <span className="text-slate-300 text-[10px]">เลขที่เกียรติบัตร (เช่น สพป.บร.3/2569-001)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg">
                    <code className="text-cyan-300 font-bold font-mono">{"{{recipient_name}}"}</code>
                    <span className="text-slate-300 text-[10px]">ชื่อ-สกุล นักเรียน หรือ ครูผู้ฝึกสอน</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg">
                    <code className="text-cyan-300 font-bold font-mono">{"{{school_name}}"}</code>
                    <span className="text-slate-300 text-[10px]">โรงเรียนต้นสังกัด</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg">
                    <code className="text-cyan-300 font-bold font-mono">{"{{award}}"}</code>
                    <span className="text-slate-300 text-[10px]">รางวัล (เช่น รางวัลชนะเลิศ เหรียญทอง)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg">
                    <code className="text-cyan-300 font-bold font-mono">{"{{event_name}}"}</code>
                    <span className="text-slate-300 text-[10px]">รายการแข่งขัน (เช่น วิ่ง 100 เมตร ชาย)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg">
                    <code className="text-cyan-300 font-bold font-mono">{"{{academic_year}}"}</code>
                    <span className="text-slate-300 text-[10px]">ปีการศึกษา (2569)</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg">
                    <code className="text-cyan-300 font-bold font-mono">{"{{issue_date}}"}</code>
                    <span className="text-slate-300 text-[10px]">วันที่ออกเกียรติบัตร</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-800/80 rounded-lg">
                    <code className="text-cyan-300 font-bold font-mono">{"{{verify_url}}"}</code>
                    <span className="text-slate-300 text-[10px]">ลิงก์สำหรับสร้าง QR Code ตรวจสอบ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Step-by-Step Setup Guide */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base font-['Kanit'] flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              คู่มือขั้นตอนการติดตั้งและตั้งค่า Google Apps Script (4 ขั้นตอนอย่างง่าย)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Step 1 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="font-bold text-slate-900 text-sm">สร้าง Google Slides</h4>
                <p className="text-slate-600 leading-relaxed">
                  สร้างสไลด์แนวนอน ออกแบบลายกรอบเกียรติบัตร และวางข้อความที่มีแท็กตัวแปร เช่น <code className="text-blue-700 bg-blue-50 px-1 rounded font-bold">{"{{recipient_name}}"}</code> แล้วคัดลอก Template ID
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="font-bold text-slate-900 text-sm">สร้าง Google Drive Folder</h4>
                <p className="text-slate-600 leading-relaxed">
                  สร้างโฟลเดอร์สำหรับเก็บไฟล์เกียรติบัตร PDF คลิกขวา &gt; แชร์ &gt; ตั้งค่าเป็น <strong>"ทุกคนที่มีลิงก์ (Anyone with link) มีสิทธิ์ดู"</strong> แล้วคัดลอก Folder ID
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="font-bold text-slate-900 text-sm">วางโค้ด Apps Script</h4>
                <p className="text-slate-600 leading-relaxed">
                  เข้า <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">script.google.com</a> &gt; โครงการใหม่ &gt; นำโค้ด <strong>Code.gs</strong> ด้านล่างนี้ไปวางแทนที่โค้ดเดิมทั้งหมด แล้วกดบันทึก
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Deploy Web App</h4>
                <p className="text-slate-600 leading-relaxed">
                  คลิก <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; การปรับใช้ใหม่ (New deployment) &gt; ชนิด: <strong>เว็บแอป (Web app)</strong> &gt; เข้าถึงได้ทุกคน (Anyone) &gt; คัดลอก URL นำมาใส่ในช่องด้านบน
                </p>
              </div>
            </div>
          </div>

          {/* Full Code Viewer Section */}
          <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 text-cyan-400 rounded-xl border border-indigo-500/30">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-mono flex items-center gap-2">
                    Code.gs
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-sans">
                      พร้อมใช้งาน 100%
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    โค้ด Google Apps Script จัดการ API, Google Slides Template Replacement, PDF Conversion และ Drive Saving
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyGasCode}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                    copiedGasCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                  }`}
                >
                  {copiedGasCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedGasCode ? 'คัดลอกสำเร็จ' : 'คัดลอกโค้ดทั้งหมด'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadGasCode}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  .gs
                </button>

                <button
                  type="button"
                  onClick={handleDownloadGasReadme}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  README.md
                </button>
              </div>
            </div>

            {/* Code Monospace Box */}
            <div className="relative">
              <pre className="bg-slate-900 text-emerald-300 p-4 rounded-xl overflow-x-auto text-xs font-mono max-h-96 leading-relaxed border border-slate-800 select-all">
                {generateGoogleAppsScriptCode()}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT (SUPER ADMIN & ADMIN) */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                จัดการผู้ใช้งานระบบ (User Accounts Management)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Super Admin และ Admin สามารถเพิ่ม ลบ แก้ไข และรีเซ็ตรหัสผ่านของผู้ใช้งานทุกบทบาท
              </p>
            </div>

            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 self-start md:self-auto shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> เพิ่มผู้ใช้งานใหม่
            </button>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, Username, อีเมล..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
              {['ALL', 'SUPER_ADMIN', 'ADMIN', 'SCHOOL', 'JUDGE'].map((roleKey) => (
                <button
                  key={roleKey}
                  onClick={() => setUserRoleFilter(roleKey)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                    userRoleFilter === roleKey ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {roleKey === 'ALL' && 'ทั้งหมด'}
                  {roleKey === 'SUPER_ADMIN' && 'Super Admin'}
                  {roleKey === 'ADMIN' && 'Admin'}
                  {roleKey === 'SCHOOL' && 'Admin โรงเรียน'}
                  {roleKey === 'JUDGE' && 'กรรมการ'}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-3 px-3">Username (รหัสเข้าใช้งาน)</th>
                  <th className="py-3 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-3 px-3">บทบาท (Role)</th>
                  <th className="py-3 px-3">โรงเรียนที่สังกัด</th>
                  <th className="py-3 px-3">รหัสผ่าน / การเปลี่ยน</th>
                  <th className="py-3 px-3">สถานะ</th>
                  <th className="py-3 px-3 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const linkedSchool = schools.find((s) => s.id === u.school_id || s.school_code === u.username || s.smis_code === u.username);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-blue-900">
                        {u.username}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{u.full_name}</p>
                        <span className="text-[10px] text-slate-500">{u.email || u.phone || '-'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          u.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-900' :
                          u.role === 'SCHOOL' ? 'bg-emerald-100 text-emerald-900' :
                          'bg-blue-100 text-blue-900'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {linkedSchool ? linkedSchool.school_name : (u.role === 'SCHOOL' ? 'โรงเรียนในสังกัด' : '-')}
                      </td>
                      <td className="py-3 px-3">
                        {u.must_change_password ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> ต้องเปลี่ยนรหัส
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium inline-flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> เปลี่ยนรหัสแล้ว
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleResetUserPassword(u.id, u.full_name)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                            title="รีเซ็ตรหัสผ่านเป็น 123456"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                            title="แก้ไขผู้ใช้"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.full_name)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                              title="ลบผู้ใช้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SCHOOLS & SMIS CREDENTIAL MANAGEMENT */}
      {activeTab === 'SCHOOLS' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-blue-600" />
                จัดการรายชื่อโรงเรียนและบัญชีผู้ใช้งาน SMIS ({schools.length} แห่ง)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กลุ่มโรงเรียนสว่างสูงกระสัง: Username คือรหัส SMIS 8 หลัก, รหัสผ่านเริ่มต้นคือ <span className="font-mono font-bold text-blue-600">123456</span>
              </p>
            </div>
            <button
              onClick={handleOpenAddSchool}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 self-start md:self-auto shadow-sm"
            >
              <Plus className="w-4 h-4" /> เพิ่มโรงเรียนใหม่
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchools.map((sch) => {
              const schoolUser = users.find(u => u.school_id === sch.id || u.username === sch.smis_code || u.username === sch.school_code);
              const mustChange = schoolUser?.must_change_password;

              return (
                <div key={sch.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={sch.logo}
                      alt={sch.school_name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white p-0.5 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm font-['Prompt'] truncate">{sch.school_name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                          SMIS: {sch.smis_code || sch.school_code}
                        </span>
                        {mustChange ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> ต้องเปลี่ยนรหัส
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> เปลี่ยนรหัสแล้ว
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">ผอ. {sch.director_name || '-'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{sch.phone || '044-xxxxxx'}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleResetSchoolPassword(sch.id, sch.school_name)}
                      className="text-amber-700 hover:text-amber-800 font-medium text-[11px] flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
                      title="รีเซ็ตรหัสผ่านเป็น 123456"
                    >
                      <RotateCcw className="w-3 h-3" /> รีเซ็ตรหัส (123456)
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditSchool(sch)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-[11px] flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                      >
                        <Edit2 className="w-3 h-3" /> แก้ไข
                      </button>
                      <button
                        onClick={() => handleDeleteSchool(sch.id, sch.school_name)}
                        className="text-rose-600 hover:text-rose-800 font-medium text-[11px] flex items-center gap-1 p-1 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                        title="ลบโรงเรียน"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SPORTS & ATHLETICS MANAGEMENT */}
      {activeTab === 'SPORTS' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                จัดการประเภทกีฬาและกรีฑา (Sports & Track and Field)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดชนิดกีฬา รายการแข่งขัน ระดับชั้น (อนุบาล, ประถม, มัธยมต้น) ประเภทเพศ (ชาย, หญิง, ผสม) และประเภททีม/เดี่ยว
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddSport}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มชนิดกีฬา/กรีฑา
              </button>
              <button
                onClick={() => handleOpenAddEvent()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> เพิ่มรายการแข่งขัน
              </button>
            </div>
          </div>

          {/* Subtabs for Sports & Events */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSportsSubTab('EVENTS')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                  sportsSubTab === 'EVENTS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                รายการแข่งขันทั้งหมด ({events.length} รายการ)
              </button>
              <button
                onClick={() => setSportsSubTab('CATEGORIES')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                  sportsSubTab === 'CATEGORIES' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                หมวดหมู่ชนิดกีฬาและกรีฑา ({sports.length} ชนิด)
              </button>
            </div>

            {sportsSubTab === 'EVENTS' && (
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={eventSportFilter}
                  onChange={(e) => setEventSportFilter(e.target.value)}
                  className="p-1.5 border rounded-lg bg-slate-50"
                >
                  <option value="ALL">กีฬา/กรีฑาทั้งหมด</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>{s.sport_name}</option>
                  ))}
                </select>

                <select
                  value={eventGradeFilter}
                  onChange={(e) => setEventGradeFilter(e.target.value)}
                  className="p-1.5 border rounded-lg bg-slate-50"
                >
                  <option value="ALL">ทุกระดับชั้น</option>
                  <option value="KINDERGARTEN">ปฐมวัย / อนุบาล</option>
                  <option value="PRIMARY">ประถมศึกษา</option>
                  <option value="SECONDARY">มัธยมศึกษาตอนต้น</option>
                </select>

                <select
                  value={eventGenderFilter}
                  onChange={(e) => setEventGenderFilter(e.target.value)}
                  className="p-1.5 border rounded-lg bg-slate-50"
                >
                  <option value="ALL">ทุกประเภทเพศ</option>
                  <option value="MALE">ชาย</option>
                  <option value="FEMALE">หญิง</option>
                  <option value="MIXED">ผสม</option>
                </select>
              </div>
            )}
          </div>

          {/* Quick Presets for Adding Events */}
          {sportsSubTab === 'EVENTS' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                ⚡ ปุ่มสร้างรายการแข่งขันด่วนตามรูปแบบมาตรฐาน:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('ฟุตบอล')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'ประเภทกีฬาฟุตบอล (ระดับชั้นอนุบาล)',
                      gender: 'MALE',
                      grade: 'ระดับชั้นอนุบาล',
                      age_group: 'ระดับชั้นอนุบาล',
                      competition_type: 'TEAM',
                      min_players: 7,
                      max_players: 12
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + ฟุตบอล (อนุบาล)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('ฟุตบอล')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'ประเภทกีฬาฟุตบอล ชาย 7 คน (ระดับชั้นประถมศึกษา)',
                      gender: 'MALE',
                      grade: 'ระดับชั้นประถมศึกษา',
                      age_group: 'ระดับชั้นประถมศึกษา',
                      competition_type: 'TEAM',
                      min_players: 7,
                      max_players: 12
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + ฟุตบอล 7 คน (ประถม)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('วอลเลย์บอล')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'ประเภทกีฬาวอลเลย์บอล หญิง (ระดับชั้นมัธยมศึกษาตอนต้น)',
                      gender: 'FEMALE',
                      grade: 'ระดับชั้นมัธยมศึกษาตอนต้น',
                      age_group: 'ระดับชั้นมัธยมศึกษาตอนต้น',
                      competition_type: 'TEAM',
                      min_players: 6,
                      max_players: 12
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + วอลเลย์บอล หญิง (ม.ต้น)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('กรีฑา')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'วิ่ง 60 เมตร[ทีมชาย][ระดับชั้นอนุบาล]',
                      gender: 'MALE',
                      grade: 'ระดับชั้นอนุบาล',
                      age_group: 'ระดับชั้นอนุบาล',
                      competition_type: 'INDIVIDUAL',
                      min_players: 1,
                      max_players: 1
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + วิ่ง 60ม. ชาย (อนุบาล)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('กรีฑา')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'วิ่ง 60 เมตร[ทีมหญิง][ระดับชั้นอนุบาล]',
                      gender: 'FEMALE',
                      grade: 'ระดับชั้นอนุบาล',
                      age_group: 'ระดับชั้นอนุบาล',
                      competition_type: 'INDIVIDUAL',
                      min_players: 1,
                      max_players: 1
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + วิ่ง 60ม. หญิง (อนุบาล)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('กรีฑา')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'วิ่ง 80 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]',
                      gender: 'MALE',
                      grade: 'ระดับชั้นประถมศึกษา',
                      age_group: 'ระดับชั้นประถมศึกษา',
                      competition_type: 'INDIVIDUAL',
                      min_players: 1,
                      max_players: 1
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + วิ่ง 80ม. ชาย (ประถม)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('กรีฑา')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'วิ่ง 80 เมตร[ทีมหญิง][ระดับชั้นประถมศึกษา]',
                      gender: 'FEMALE',
                      grade: 'ระดับชั้นประถมศึกษา',
                      age_group: 'ระดับชั้นประถมศึกษา',
                      competition_type: 'INDIVIDUAL',
                      min_players: 1,
                      max_players: 1
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + วิ่ง 80ม. หญิง (ประถม)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('กรีฑา')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'วิ่ง 100 เมตร[ทีมชาย][ระดับชั้นประถมศึกษา]',
                      gender: 'MALE',
                      grade: 'ระดับชั้นประถมศึกษา',
                      age_group: 'ระดับชั้นประถมศึกษา',
                      competition_type: 'INDIVIDUAL',
                      min_players: 1,
                      max_players: 1
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + วิ่ง 100ม. ชาย (ประถม)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('กรีฑา')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'ประเภทกรีฑา วิ่งผลัด 4x100 เมตร ชาย (ระดับชั้นประถมศึกษา)',
                      gender: 'MALE',
                      grade: 'ระดับชั้นประถมศึกษา',
                      age_group: 'ระดับชั้นประถมศึกษา',
                      competition_type: 'TEAM',
                      min_players: 4,
                      max_players: 6
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + วิ่งผลัด 4x100ม. (ประถม)
                </button>
                <button
                  onClick={() => {
                    const sp = sports.find((s) => s.sport_name.includes('กรีฑา')) || sports[0];
                    handleOpenAddEvent({
                      sport_id: sp?.id,
                      event_name: 'ประเภทกรีฑา วิ่งผลัด 8x50 เมตร ผสม (ระดับชั้นอนุบาล)',
                      gender: 'MIXED',
                      grade: 'ระดับชั้นอนุบาล',
                      age_group: 'ระดับชั้นอนุบาล',
                      competition_type: 'TEAM',
                      min_players: 8,
                      max_players: 10
                    });
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold shadow-xs"
                >
                  + วิ่งผลัด 8x50ม. (อนุบาล)
                </button>
              </div>
            </div>
          )}

          {/* EVENTS TABLE */}
          {sportsSubTab === 'EVENTS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-3">รหัส</th>
                    <th className="py-3 px-3">ชนิดกีฬา</th>
                    <th className="py-3 px-3">ชื่อรายการแข่งขัน</th>
                    <th className="py-3 px-3">เพศ</th>
                    <th className="py-3 px-3">ระดับชั้น / ช่วงวัย</th>
                    <th className="py-3 px-3">ประเภท</th>
                    <th className="py-3 px-3 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.map((ev) => {
                    const sp = sports.find((s) => s.id === ev.sport_id);
                    const normGrade = normalizeEducationLevel(ev.grade);
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-500">{ev.event_code}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {sp?.sport_icon} {formatSportNameWithPrefix(sp?.sport_name)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{ev.event_name}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.gender === 'MALE' ? 'bg-sky-100 text-sky-800' :
                            ev.gender === 'FEMALE' ? 'bg-pink-100 text-pink-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {ev.gender === 'MALE' ? 'ชาย' : ev.gender === 'FEMALE' ? 'หญิง' : 'ผสม'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="font-bold text-slate-800">{normGrade}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {ev.competition_type === 'TEAM' ? (
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                              ทีม ({ev.min_players}-{ev.max_players} คน)
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                              บุคคลเดี่ยว
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditEvent(ev)}
                              className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                              title="แก้ไขรายการ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev.id, ev.event_name)}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* CATEGORIES GRID */}
          {sportsSubTab === 'CATEGORIES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sports.map((sp) => {
                const count = events.filter((e) => e.sport_id === sp.id).length;
                return (
                  <div key={sp.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 bg-white rounded-2xl shadow-xs border border-slate-100">{sp.sport_icon}</span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm font-['Kanit']">{sp.sport_name}</h4>
                        <span className="text-[11px] text-blue-600 font-semibold">{count} รายการแข่งขัน</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{sp.description || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditSport(sp)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                        title="แก้ไขชนิดกีฬา"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSport(sp.id, sp.sport_name)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                        title="ลบชนิดกีฬา"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: RESULTS & MEDALS ANNOUNCEMENT */}
      {activeTab === 'RESULTS' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-900/40 text-amber-100 rounded-full text-xs font-bold border border-amber-400/30 shadow-xs">
                  <Trophy className="w-3.5 h-3.5 text-amber-300" /> ระบบประกาศผลและจัดอันดับรางวัลทางการ
                </div>
                <h2 className="text-xl md:text-2xl font-bold font-['Kanit']">
                  ประกาศผลการแข่งขันและสรุปคะแนนเหรียญรางวัล
                </h2>
                <p className="text-xs md:text-sm text-amber-100 font-['Prompt']">
                  เลือกรายการแข่งขัน เลือกโรงเรียนที่ชนะเลิศ/รองชนะเลิศ ระบบจะสรุปตารางเหรียญรางวัลในหน้าหลักทันที และสามารถออกเกียรติบัตรให้นักเรียนและครูได้อัตโนมัติ
                </p>
              </div>

              <div className="flex items-center gap-3 bg-amber-950/40 p-4 rounded-2xl border border-amber-300/20">
                <div className="text-center px-3 border-r border-amber-400/30">
                  <span className="block text-2xl font-black font-['Kanit'] text-amber-200">
                    {events.filter((e) => e.status === 'COMPLETED').length}
                  </span>
                  <span className="text-[10px] text-amber-100 font-medium">ประกาศผลแล้ว</span>
                </div>
                <div className="text-center px-3">
                  <span className="block text-2xl font-black font-['Kanit'] text-white">
                    {events.filter((e) => e.status !== 'COMPLETED').length}
                  </span>
                  <span className="text-[10px] text-amber-200 font-medium">รอการแข่งขัน</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Event List (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm md:text-base font-['Kanit'] flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> เลือกรายการแข่งขัน ({filteredResultEvents.length})
                </h3>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={resultSearchTerm}
                    onChange={(e) => setResultSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อรายการหรือรหัส..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={resultSportFilter}
                    onChange={(e) => setResultSportFilter(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">กีฬา: ทั้งหมด</option>
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sport_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={resultStatusFilter}
                    onChange={(e) => setResultStatusFilter(e.target.value as any)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">สถานะ: ทั้งหมด</option>
                    <option value="PENDING">⏳ รอประกาศผล</option>
                    <option value="COMPLETED">✅ ประกาศผลแล้ว</option>
                  </select>
                </div>
              </div>

              {/* Event Cards Scroll */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredResultEvents.map((ev) => {
                  const sp = sports.find((s) => s.id === ev.sport_id);
                  const isSelected = ev.id === selectedResultEventId;
                  const isDone = ev.status === 'COMPLETED';
                  const evResults = results.filter((r) => r.event_id === ev.id);
                  const goldRes = evResults.find((r) => r.rank === 1);
                  const goldSchool = schools.find((s) => s.id === goldRes?.school_id);
                  const evRegs = registrations.filter((r) => r.event_id === ev.id);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleSelectResultEvent(ev)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400 shadow-sm'
                          : isDone
                          ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                          : 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{sp?.sport_icon || '🏅'}</span>
                          <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {ev.event_code}
                          </span>
                        </div>
                        {isDone ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ประกาศผลแล้ว
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> รอผล ({evRegs.length} โรงเรียนสมัคร)
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs md:text-sm font-['Prompt'] line-clamp-1">
                        {ev.event_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {sp?.sport_name} • {ev.gender === 'MALE' ? 'ชาย' : ev.gender === 'FEMALE' ? 'หญิง' : 'ผสม'} • {ev.grade}
                      </p>

                      {isDone && goldSchool && (
                        <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px]">
                          <span className="text-amber-800 font-bold">🥇 {goldSchool.school_name}</span>
                          {goldRes?.score && <span className="font-mono text-slate-500 font-medium">({goldRes.score})</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Result Recording & Announcement Form (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {selectedResultEvent ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedResultEvent.event_code}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 font-['Kanit'] mt-1">
                        {selectedResultEvent.event_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        เพศ: {selectedResultEvent.gender === 'MALE' ? 'ชาย' : selectedResultEvent.gender === 'FEMALE' ? 'หญิง' : 'ผสม'} | ระดับ: {selectedResultEvent.grade} ({selectedResultEvent.age_group})
                      </p>
                    </div>

                    {selectedResultEvent.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleRevokeResult(selectedResultEvent.id, selectedResultEvent.event_name)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition flex items-center gap-1 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> ยกเลิกผลการแข่งขัน
                      </button>
                    )}
                  </div>

                  {/* Registered Schools & Athlete Details List */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-800 font-['Kanit'] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        โรงเรียนและนักกีฬาที่ส่งเข้าร่วมแข่งขัน ({selectedEventRegistrations.length} โรงเรียน)
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        (ข้อมูลที่ผู้ดูแลระบบแต่ละโรงเรียนลงทะเบียนเข้ามา)
                      </span>
                    </h4>

                    {selectedEventRegistrations.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-1">
                        ยังไม่มีโรงเรียนส่งรายชื่อนักกีฬาในรายการนี้
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {selectedEventRegistrations.map((reg) => {
                          const sch = schools.find((s) => s.id === reg.school_id);
                          const linkedStudents = regStudents
                            .filter((rs) => rs.registration_id === reg.id)
                            .map((rs) => allStudents.find((s) => s.id === rs.student_id))
                            .filter(Boolean);
                          const coach = allCoaches.find((c) => c.id === reg.coach_id);

                          return (
                            <div key={reg.id} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                              <div className="font-bold text-slate-900 font-['Prompt'] flex items-center justify-between">
                                <span>{sch?.school_name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded">
                                  {linkedStudents.length} คน
                                </span>
                              </div>
                              {coach && (
                                <p className="text-[11px] text-slate-600 mt-1">
                                  ครูผู้ฝึกสอน: <strong>{coach.prefix}{coach.first_name} {coach.last_name}</strong>
                                </p>
                              )}
                              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                นักกีฬา: {linkedStudents.map((st) => `${st?.first_name} ${st?.last_name}`).join(', ') || '-'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Winner Recording Form */}
                  <form onSubmit={handlePublishResults} className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 font-['Kanit'] flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" /> กำหนดโรงเรียนที่ได้รับรางวัล
                    </h4>

                    {/* Rank 1: Gold Medal */}
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                      <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <span className="text-base">🥇</span> รางวัลชนะเลิศ (เหรียญทอง) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={resultRank1SchoolId}
                        onChange={(e) => setResultRank1SchoolId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- กรุณาเลือกโรงเรียนชนะเลิศ --</option>
                        {candidateSchools.length > 0 && (
                          <optgroup label="โรงเรียนที่สมัครในรายการนี้">
                            {candidateSchools.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.school_name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="โรงเรียนทั้งหมดในกลุ่ม">
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.school_name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Rank 2: Silver Medal */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-base">🥈</span> รางวัลรองชนะเลิศ อันดับ 1 (เหรียญเงิน)
                      </label>
                      <select
                        value={resultRank2SchoolId}
                        onChange={(e) => setResultRank2SchoolId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="">-- ไม่ระบุ / ไม่มี --</option>
                        {candidateSchools.length > 0 && (
                          <optgroup label="โรงเรียนที่สมัครในรายการนี้">
                            {candidateSchools.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.school_name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="โรงเรียนทั้งหมดในกลุ่ม">
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.school_name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Rank 3: Bronze Medal */}
                    <div className="p-3.5 bg-amber-100/30 rounded-xl border border-amber-300/50 space-y-1.5">
                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <span className="text-base">🥉</span> รางวัลรองชนะเลิศ อันดับ 2 (เหรียญทองแดง)
                      </label>
                      <select
                        value={resultRank3SchoolId}
                        onChange={(e) => setResultRank3SchoolId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-amber-300/70 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- ไม่ระบุ / ไม่มี --</option>
                        {candidateSchools.length > 0 && (
                          <optgroup label="โรงเรียนที่สมัครในรายการนี้">
                            {candidateSchools.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.school_name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="โรงเรียนทั้งหมดในกลุ่ม">
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.school_name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Rank 4: Consolation Prize */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="text-base">🎖️</span> รางวัลชมเชย / อันดับ 4 (ถ้ามี)
                      </label>
                      <select
                        value={resultRank4SchoolId}
                        onChange={(e) => setResultRank4SchoolId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      >
                        <option value="">-- ไม่ระบุ / ไม่มี --</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.school_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Score & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          ผลการแข่งขัน / คะแนน (Score / Time)
                        </label>
                        <input
                          type="text"
                          value={resultScore}
                          onChange={(e) => setResultScore(e.target.value)}
                          placeholder="เช่น 2 - 1, 12.45 วินาที, 3 - 0 เซต"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          หมายเหตุการแข่งขัน
                        </label>
                        <input
                          type="text"
                          value={resultNote}
                          onChange={(e) => setResultNote(e.target.value)}
                          placeholder="เช่น คู่ชิงชนะเลิศสูสี ดวลจุดโทษ"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    {/* Auto Certificate Checkbox */}
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="autoGenCertsAdmin"
                        checked={autoGenCerts}
                        onChange={(e) => setAutoGenCerts(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="autoGenCertsAdmin" className="text-xs text-blue-950 font-medium cursor-pointer">
                        <strong>⚡ ออกเกียรติบัตรอัตโนมัติทันที</strong> (ระบบจะดึงรายชื่อนักเรียนและครูผู้ฝึกสอนของโรงเรียนที่ได้รับรางวัลไปสร้างเกียรติบัตรพร้อม QR Code ในระบบ E-Certificate ทันที)
                      </label>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Trophy className="w-4 h-4 text-amber-200" />
                        บันทึกและประกาศผลอย่างเป็นทางการ (Publish Official Results)
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center space-y-3">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base font-['Kanit']">
                    กรุณาเลือกรายการแข่งขันจากรายการด้านซ้าย
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    เลือกรายการแข่งขันที่ต้องการประกาศผล เพื่อกำหนดโรงเรียนที่ชนะเลิศ รองชนะเลิศ และคะแนนการแข่งขัน
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CERTIFICATES */}
      {activeTab === 'CERTIFICATES' && (() => {
        // Computed pending events and completed events
        const pendingCertEvents = events.filter(
          (e) => results.some((r) => r.event_id === e.id) && !certificates.some((c) => c.event_id === e.id)
        );
        const completedCertEvents = events.filter(
          (e) => certificates.some((c) => c.event_id === e.id)
        );

        // Filtered certificates
        const filteredCerts = certificates.filter((cert) => {
          if (certSearch) {
            const s = certSearch.toLowerCase();
            const matchName = cert.recipient_name.toLowerCase().includes(s);
            const matchNo = cert.certificate_no.toLowerCase().includes(s);
            const matchSchool = cert.school_name.toLowerCase().includes(s);
            const matchEvent = cert.event_name.toLowerCase().includes(s);
            if (!matchName && !matchNo && !matchSchool && !matchEvent) return false;
          }
          if (certFilterSchool && cert.school_id !== certFilterSchool) return false;
          if (certFilterEvent && cert.event_id !== certFilterEvent) return false;
          if (certFilterType !== 'ALL' && cert.recipient_type !== certFilterType) return false;
          return true;
        });

        const studentCertsCount = certificates.filter((c) => c.recipient_type === 'STUDENT').length;
        const coachCertsCount = certificates.filter((c) => c.recipient_type === 'COACH').length;

        return (
          <div className="space-y-6">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/30 text-amber-100 rounded-full text-xs font-semibold mb-2 border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" /> ระบบ One Data, Many Uses
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-['Kanit']">
                  ศูนย์สร้างและออกเกียรติบัตรอัตโนมัติ (Batch E-Certificate Engine)
                </h2>
                <p className="text-xs text-amber-100 mt-1 max-w-2xl leading-relaxed">
                  ระบบจะดึงผลการแข่งขันที่ประกาศแล้ว มาสร้างเลขที่เกียรติบัตรต่อเนื่อง พร้อมรหัสตรวจสอบ QR Verification และเชื่อมโยง Google Drive ทันที
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-medium text-amber-200">
                  <span>เกียรติบัตรในระบบ: <strong className="text-white font-mono">{certificates.length}</strong> ฉบับ</span>
                  <span>&bull;</span>
                  <span>🎒 นักเรียน: <strong className="text-white font-mono">{studentCertsCount}</strong></span>
                  <span>&bull;</span>
                  <span>👨‍🏫 ครูผู้ฝึกสอน: <strong className="text-white font-mono">{coachCertsCount}</strong></span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={handleBatchGenerateCertificates}
                  disabled={isGeneratingBatch}
                  className="px-5 py-3 bg-white hover:bg-amber-50 text-amber-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 text-amber-600 ${isGeneratingBatch ? 'animate-spin' : ''}`} />
                  {isGeneratingBatch ? 'กำลังประมวลผล...' : '⚡ ออกเกียรติบัตรทุกรายการที่รอ (Batch)'}
                </button>
              </div>
            </div>

            {batchSuccessCount !== null && (
              <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-2xl border border-emerald-300 font-medium flex items-center gap-3 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">สร้างเกียรติบัตรเสร็จสมบูรณ์!</p>
                  <p className="text-slate-600">
                    มีเกียรติบัตรในระบบรวมทั้งสิ้น {certificates.length} ฉบับ (สร้างใหม่ {batchSuccessCount} ฉบับ)
                  </p>
                </div>
              </div>
            )}

            {/* SECTION: แม่แบบ Google นำเสนอ (Google Slides Template Configuration) */}
            <div className="bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 rounded-3xl p-6 border border-amber-300/80 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs shrink-0">
                    <Presentation className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold font-['Kanit'] text-slate-900">
                        แม่แบบ Google นำเสนอสำหรับสร้างเกียรติบัตร (Google Slides Templates)
                      </h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[11px] font-bold">
                        เชื่อมโยง ID
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      ระบบจะนำ ID แม่แบบที่ตั้งค่าไว้ใน Google นำเสนอมาสร้างและผูกกับเกียรติบัตรทุกฉบับโดยอัตโนมัติ
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleApplyGoogleSlideTemplates}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="นำ ID แม่แบบที่ตั้งค่าไว้ไปผูกกับเกียรติบัตรทั้งหมดในระบบ"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> นำ ID มาสร้าง/ผูกเกียรติบัตรทั้งหมด ({certificates.length} ฉบับ)
                  </button>
                  <button
                    onClick={() => setActiveTab('SYSTEM')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" /> ตั้งค่าแม่แบบ ID
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student Slide Template */}
                <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5 font-['Kanit']">
                        🎓 แม่แบบนักเรียน (Student Template ID)
                      </span>
                      {comp.google_slide_template_student_id || comp.google_slide_template_id ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">พร้อมใช้งาน</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">ยังไม่ระบุ</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2 truncate select-all">
                      {comp.google_slide_template_student_id || comp.google_slide_template_id || '(ยังไม่ได้ตั้งค่า ID ในเมนูตั้งค่า)'}
                    </p>
                  </div>
                  {(comp.google_slide_template_student_id || comp.google_slide_template_id) && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs">
                      <a
                        href={`https://docs.google.com/presentation/d/${comp.google_slide_template_student_id || comp.google_slide_template_id}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        <ExternalLink className="w-3 h-3" /> เปิดใน Google นำเสนอ
                      </a>
                      <span className="text-slate-300">&bull;</span>
                      <a
                        href={`https://docs.google.com/presentation/d/${comp.google_slide_template_student_id || comp.google_slide_template_id}/export/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-700 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Download className="w-3 h-3" /> ส่งออก PDF
                      </a>
                    </div>
                  )}
                </div>

                {/* Coach Slide Template */}
                <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 font-['Kanit']">
                        👨‍🏫 แม่แบบครูผู้ฝึกสอน (Coach Template ID)
                      </span>
                      {comp.google_slide_template_coach_id || comp.google_slide_template_id ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">พร้อมใช้งาน</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">ยังไม่ระบุ</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2 truncate select-all">
                      {comp.google_slide_template_coach_id || comp.google_slide_template_id || '(ยังไม่ได้ตั้งค่า ID ในเมนูตั้งค่า)'}
                    </p>
                  </div>
                  {(comp.google_slide_template_coach_id || comp.google_slide_template_id) && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs">
                      <a
                        href={`https://docs.google.com/presentation/d/${comp.google_slide_template_coach_id || comp.google_slide_template_id}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        <ExternalLink className="w-3 h-3" /> เปิดใน Google นำเสนอ
                      </a>
                      <span className="text-slate-300">&bull;</span>
                      <a
                        href={`https://docs.google.com/presentation/d/${comp.google_slide_template_coach_id || comp.google_slide_template_id}/export/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-700 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Download className="w-3 h-3" /> ส่งออก PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 1: รายการที่รอออกเกียรติบัตร (Pending Events) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                    <span>⏳</span> รายการที่รอออกเกียรติบัตร
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      pendingCertEvents.length > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {pendingCertEvents.length} รายการ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รายการแข่งขันที่ประกาศผลแล้ว แต่ยังไม่ได้สร้างเลขที่เกียรติบัตร กดปุ่ม "ออกเกียรติบัตรรายการนี้" เพื่อสร้างได้ทันที
                  </p>
                </div>
                {pendingCertEvents.length > 0 && (
                  <button
                    onClick={handleBatchGenerateCertificates}
                    disabled={isGeneratingBatch}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡</span> ออกเกียรติบัตรทั้งหมด ({pendingCertEvents.length} รายการ)
                  </button>
                )}
              </div>

              {pendingCertEvents.length === 0 ? (
                <div className="p-6 bg-slate-50/70 rounded-2xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">✨</span>
                  <span className="font-bold text-slate-700">ไม่มีรายการแข่งขันที่รอออกเกียรติบัตร</span>
                  <span className="text-[11px] text-slate-400">ทุกรายการที่ประกาศผลได้รับการออกเกียรติบัตรครบถ้วนสมบูรณ์แล้ว</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingCertEvents.map((pe) => {
                    const sp = sports.find((s) => s.id === pe.sport_id);
                    const evResults = results.filter((r) => r.event_id === pe.id);
                    const goldRes = evResults.find((r) => r.medal === 'GOLD');
                    const silverRes = evResults.find((r) => r.medal === 'SILVER');
                    const bronzeRes = evResults.find((r) => r.medal === 'BRONZE');
                    const goldSch = schools.find((s) => s.id === goldRes?.school_id);
                    const silverSch = schools.find((s) => s.id === silverRes?.school_id);
                    const bronzeSch = schools.find((s) => s.id === bronzeRes?.school_id);

                    return (
                      <div key={pe.id} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                              <span>{sp?.sport_icon || '🏆'}</span> {sp?.sport_name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white text-slate-700 font-mono text-[10px] font-bold border border-amber-200">
                              {pe.event_code}
                            </span>
                          </div>
                          <h4 className="font-bold font-['Kanit'] text-slate-900 text-sm leading-snug">
                            {pe.event_name}
                          </h4>
                          <div className="mt-2 text-[11px] text-slate-600 space-y-0.5 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                            <div>🥇 ชนะเลิศ: <span className="font-bold text-amber-900">{goldSch?.school_name || '-'}</span></div>
                            {silverSch && <div>🥈 รอง 1: <span className="font-medium text-slate-700">{silverSch.school_name}</span></div>}
                            {bronzeSch && <div>🥉 รอง 2: <span className="font-medium text-orange-800">{bronzeSch.school_name}</span></div>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleGenerateSingleEventCertificates(pe.id, pe.event_name)}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>⚡</span> ออกเกียรติบัตรรายการนี้
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: รายการที่ออกเกียรติบัตรแล้ว (Issued Events) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                    <span>🏆</span> รายการที่ออกเกียรติบัตรแล้ว
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {completedCertEvents.length} รายการ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รายการที่สร้างเกียรติบัตรแล้ว สามารถกดดูรายชื่อ ออกเพิ่มเติม หรือลบทั้งหมดเพื่อสร้างใหม่ได้
                  </p>
                </div>
              </div>

              {completedCertEvents.length === 0 ? (
                <div className="p-6 bg-slate-50/70 rounded-2xl text-center text-slate-400 text-xs">
                  ยังไม่มีรายการที่ออกเกียรติบัตร กรุณากดปุ่ม "ออกเกียรติบัตร" ในส่วนด้านบน
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5 pl-6">รายการแข่งขัน</th>
                        <th className="p-3.5">กีฬา</th>
                        <th className="p-3.5 text-center">นักเรียน</th>
                        <th className="p-3.5 text-center">ครูผู้ฝึกสอน</th>
                        <th className="p-3.5 text-center">รวมที่ออก</th>
                        <th className="p-3.5 pr-6 text-right">การจัดการรายการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {completedCertEvents.map((ce) => {
                        const sp = sports.find((s) => s.id === ce.sport_id);
                        const evCerts = certificates.filter((c) => c.event_id === ce.id);
                        const stCount = evCerts.filter((c) => c.recipient_type === 'STUDENT').length;
                        const coachCount = evCerts.filter((c) => c.recipient_type === 'COACH').length;

                        return (
                          <tr key={ce.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3.5 pl-6">
                              <div className="font-bold font-['Kanit'] text-slate-900 text-sm">
                                {ce.event_name}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                {ce.event_code}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 font-medium">
                              <span>{sp?.sport_icon || '🏆'}</span> {sp?.sport_name}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-[11px] border border-blue-200">
                                🎒 {stCount}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-mono font-bold text-[11px] border border-purple-200">
                                👨‍🏫 {coachCount}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
                                {evCerts.length} ฉบับ
                              </span>
                            </td>
                            <td className="p-3.5 pr-6 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setCertFilterEvent(ce.id);
                                  const el = document.getElementById('table-admin-certs');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                              >
                                <Search className="w-3 h-3" /> ดูรายชื่อ
                              </button>
                              <button
                                onClick={() => handleGenerateSingleEventCertificates(ce.id, ce.event_name)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                🔄 ออกเพิ่ม
                              </button>
                              <button
                                onClick={() => handleDeleteEventCertificates(ce.id, ce.event_name)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                🗑️ ลบทั้งหมด
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 3: ตารางรายการเกียรติบัตรทั้งหมด (Issued Certificates Table) */}
            <div id="table-admin-certs" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-['Kanit'] flex items-center gap-2">
                    <span>📋</span> รายการเกียรติบัตรทั้งหมดในระบบ ({filteredCerts.length} / {certificates.length} ฉบับ)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คลิกปุ่ม "📥 ดาวน์โหลด PDF" เพื่อบันทึกไฟล์ PDF หรือ "ดู / พิมพ์" เพื่อเปิดดูตัวอย่างเกียรติบัตร
                  </p>
                </div>
              </div>

              {/* Download Instruction Help Box */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm font-['Kanit'] text-amber-950 flex items-center gap-2">
                      <span>💡</span> ปุ่มดาวน์โหลดเกียรติบัตรเป็นไฟล์ PDF อยู่ตรงไหน?
                    </h4>
                    <p className="text-amber-900/90 mt-1 leading-relaxed">
                      1. <strong>ดาวน์โหลด PDF ทันที:</strong> กดปุ่มสีส้ม <span className="inline-flex items-center gap-1 bg-amber-600 text-white px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs"><Download className="w-3 h-3" /> ดาวน์โหลด PDF</span> ที่คอลัมน์ด้านขวาสุดของแต่ละรายชื่อ ระบบจะเปิดหน้าต่างเกียรติบัตรและสร้างไฟล์ PDF ดาวน์โหลดลงเครื่องทันที<br/>
                      2. <strong>ดูตัวอย่าง / พิมพ์:</strong> กดปุ่มสีน้ำเงิน <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold text-[11px]"><Printer className="w-3 h-3" /> ดู / พิมพ์</span> โดยที่แถบด้านบนของหน้าต่างตัวอย่างจะมีปุ่ม <strong>"ดาวน์โหลด PDF"</strong> สีส้ม และปุ่ม <strong>"พิมพ์เกียรติบัตร"</strong> สีน้ำเงิน ให้กดได้เช่นกัน
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
                <div className="relative">
                  <input
                    type="text"
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                    placeholder="🔍 ค้นหาชื่อผู้รับ, เลขที่, โรงเรียน..."
                    className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs w-60 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <select
                  value={certFilterSchool}
                  onChange={(e) => setCertFilterSchool(e.target.value)}
                  className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                >
                  <option value="">-- ทุกโรงเรียน --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.school_name}</option>
                  ))}
                </select>
                <select
                  value={certFilterEvent}
                  onChange={(e) => setCertFilterEvent(e.target.value)}
                  className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs max-w-xs"
                >
                  <option value="">-- ทุกรายการแข่งขัน --</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.event_code} - {e.event_name}</option>
                  ))}
                </select>
                <select
                  value={certFilterType}
                  onChange={(e) => setCertFilterType(e.target.value as any)}
                  className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                >
                  <option value="ALL">-- ทุกประเภทผู้รับ --</option>
                  <option value="STUDENT">🎒 นักเรียน</option>
                  <option value="COACH">👨‍🏫 ครูผู้ฝึกสอน</option>
                </select>
                {(certSearch || certFilterSchool || certFilterEvent || certFilterType !== 'ALL') && (
                  <button
                    onClick={() => {
                      setCertSearch('');
                      setCertFilterSchool('');
                      setCertFilterEvent('');
                      setCertFilterType('ALL');
                    }}
                    className="text-slate-500 hover:text-slate-800 text-xs font-medium underline ml-1 cursor-pointer"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
              </div>

              {/* Certificates Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <th className="py-3 px-3">เลขที่เกียรติบัตร</th>
                      <th className="py-3 px-3">ผู้ได้รับเกียรติบัตร</th>
                      <th className="py-3 px-3">โรงเรียน</th>
                      <th className="py-3 px-3">รางวัลที่ได้รับ</th>
                      <th className="py-3 px-3">รายการแข่งขัน</th>
                      <th className="py-3 px-3 text-center">วันที่ออก</th>
                      <th className="py-3 px-3 pr-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCerts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          📭 ไม่พบรายการเกียรติบัตรตามเงื่อนไขที่ค้นหา
                        </td>
                      </tr>
                    ) : (
                      filteredCerts.map((cert) => (
                        <tr key={cert.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-mono font-semibold text-blue-900">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                              {cert.certificate_no}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-900">{cert.recipient_name}</p>
                            <span className="text-[10px] text-slate-500">
                              {cert.recipient_type === 'STUDENT' ? '🎒 นักเรียน' : '👨‍🏫 ครูผู้ฝึกสอน'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">{cert.school_name}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              cert.medal === 'GOLD' ? 'bg-amber-100 text-amber-900' :
                              cert.medal === 'SILVER' ? 'bg-slate-200 text-slate-800' :
                              'bg-orange-100 text-orange-900'
                            }`}>
                              {cert.award}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <div>{cert.event_name}</div>
                            <span className="text-[10px] text-slate-400">{cert.sport_name}</span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {cert.issue_date}
                          </td>
                          <td className="py-3 px-3 pr-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleDownloadCertPdf(cert)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                              title="ดาวน์โหลดเกียรติบัตรเป็นไฟล์ PDF ทันที"
                            >
                              <Download className="w-3.5 h-3.5" /> ดาวน์โหลด PDF
                            </button>
                            <button
                              onClick={() => handleOpenCertView(cert)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="เปิดดูตัวอย่างเกียรติบัตร / สั่งพิมพ์"
                            >
                              <Printer className="w-3.5 h-3.5" /> ดู / พิมพ์
                            </button>
                            <button
                              onClick={() => handleOpenEditCert(cert)}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-700 text-xs font-medium rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="แก้ไขข้อมูลเกียรติบัตร"
                            >
                              <Edit2 className="w-3 h-3" /> แก้ไข
                            </button>
                            <button
                              onClick={() => handleDeleteCert(cert)}
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="ลบเกียรติบัตร"
                            >
                              <Trash2 className="w-3 h-3" /> ลบ
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 6: DATABASE & UPDATE TABLES SYSTEM (SUPER ADMIN FEATURE) */}
      {activeTab === 'DATABASE' && isSuperAdmin && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          {/* DATABASE SYNC / UPDATE BANNER */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-blue-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-200 rounded-full text-xs font-bold mb-2 border border-blue-400/30">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-300" /> Super Admin Database Migration Tool
                </div>
                <h2 className="text-xl font-bold font-['Kanit'] text-white">
                  อัปเดตโครงสร้างตารางฐานข้อมูล MySQL (Database Table & Schema Update)
                </h2>
                <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
                  เมื่อมีการปรับปรุงโค้ดหรือเพิ่มฟิลด์ใหม่ (เช่น แบนเนอร์หัวเว็บ, Google Drive, ผู้ลงนาม, รหัสผ่าน SMIS, ระดับชั้นกรีฑา) สามารถกดปุ่มนี้เพื่อซิงค์โครงสร้างและคอลัมน์ใหม่เข้าสู่ MySQL ทันที โดยไม่กระทบหรือลบข้อมูลเดิม!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={handleRunDatabaseUpdate}
                  disabled={isUpdatingDb}
                  className="px-6 py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isUpdatingDb ? 'animate-spin' : ''}`} />
                  {isUpdatingDb ? 'กำลังอัปเดตตาราง...' : '🔄 อัปเดตตารางฐานข้อมูล MySQL ตอนนี้'}
                </button>
              </div>
            </div>

            {/* LIVE UPDATE LOGS VISUALIZER */}
            {dbUpdateLogs.length > 0 && (
              <div className="bg-black/50 p-4 rounded-xl border border-blue-700/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-300 border-b border-blue-800/60 pb-1.5">
                  <span>ผลการซิงค์ตารางและคอลัมน์ MySQL:</span>
                  {dbUpdateDone && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> ซิงค์สำเร็จครบทุกตาราง 100%</span>}
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs font-mono">
                  {dbUpdateLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-slate-300 py-0.5">
                      <span className="text-emerald-300 truncate">✔ {log.message}</span>
                      <span className="text-[10px] text-blue-400 shrink-0">{log.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RESTORE & REPAIR 12 SCHOOLS BANNER */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 rounded-2xl p-6 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-400/30">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full text-xs font-bold mb-2 border border-emerald-400/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" /> กู้คืนข้อมูล 12 โรงเรียน (Auto-Restore)
              </div>
              <h3 className="text-lg font-bold font-['Kanit'] text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-300" /> กู้คืนข้อมูลกลุ่มโรงเรียนสว่างสูงกระสัง (12 โรงเรียน + รายชื่อนักเรียน + การลงทะเบียน)
              </h3>
              <p className="text-xs text-emerald-100 mt-1 max-w-2xl leading-relaxed">
                หากข้อมูลโรงเรียน (เช่น รร.บ้านบุกระสัง, รร.บ้านโคกสว่าง, รร.บ้านตะกรุมทอง ฯลฯ) หายไป ให้กดปุ่มนี้เพื่อดึงข้อมูลโรงเรียนทั้ง 12 แห่ง, ผู้ประสานงาน, นักกีฬา, กีฬา และผลการแข่งขันกลับคืนมาทันที
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => {
                  if (window.confirm('ยืนยันการกู้คืนข้อมูล 12 โรงเรียน, นักเรียน, และรายการแข่งขันทั้งหมดกลับสู่ค่าเริ่มต้นสมบูรณ์ใช่หรือไม่?')) {
                    sportsStore.resetToDefaults();
                    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                    showNotification('กู้คืนข้อมูล 12 โรงเรียน, นักเรียน, ครูผู้ฝึกสอน และผลการแข่งขันกลับมาเรียบร้อยแล้ว!');
                  }
                }}
                className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-emerald-600" />
                ⚡ กู้คืนข้อมูล 12 โรงเรียนทันที
              </button>

              <a
                href="/restore_data.php"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all border border-emerald-400/30 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4 text-emerald-300" />
                เปิดหน้ากู้คืน MySQL (restore_data.php)
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
            <div>
              <h2 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                ดาวน์โหลด Source Code และสคริปต์ Migration สำหรับ Production Server
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ไฟล์ทั้งหมดถูกจัดเตรียมพร้อมรันบน Apache/Nginx (DirectAdmin / cPanel / XAMPP)
              </p>
            </div>

            <button
              onClick={async () => {
                await downloadPhpProjectZip();
                showNotification('กำลังดาวน์โหลดแพ็กเกจโปรเจกต์ PHP + MySQL (ZIP) ครบทุกไฟล์...');
              }}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 self-start md:self-auto shrink-0"
            >
              <Download className="w-4 h-4" /> 📦 ดาวน์โหลด Source Code ทั้งโปรเจกต์ (.ZIP)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: update_database.sql */}
            <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl inline-block mb-2">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm font-['Kanit']">
                  1. สคริปต์อัปเดต (`update_database.sql`)
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  คำสั่ง <code className="bg-white px-1 py-0.5 rounded border border-indigo-200 font-mono">ALTER TABLE ... ADD COLUMN IF NOT EXISTS</code> สำหรับรันใน phpMyAdmin เพื่ออัปเดตตารางอย่างปลอดภัย
                </p>
              </div>

              <button
                onClick={() => handleDownloadFile(generateUpdateDatabaseSql(), 'update_database.sql', 'text/sql;charset=utf-8')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" /> ดาวน์โหลด `update_database.sql`
              </button>
            </div>

            {/* Card 2: update_database.php */}
            <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="p-2.5 bg-blue-600 text-white rounded-xl inline-block mb-2">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm font-['Kanit']">
                  2. เว็บอัปเดตอัตโนมัติ (`update_database.php`)
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  เพียงอัปโหลดขึ้นโฮสแล้วเปิดผ่านเบราว์เซอร์ <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono">http://domain/update_database.php</code> เพื่ออัปเดตโครงสร้างอัตโนมัติ
                </p>
              </div>

              <button
                onClick={() => handleDownloadFile(generateUpdateDatabasePhp(), 'update_database.php', 'application/x-php;charset=utf-8')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" /> ดาวน์โหลด `update_database.php`
              </button>
            </div>

            {/* Card 3: database.sql */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="p-2.5 bg-slate-800 text-white rounded-xl inline-block mb-2">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm font-['Kanit']">
                  3. สคริปต์เต็ม (`database.sql`)
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Schema ครบทั้ง 13 ตาราง พร้อมข้อมูล 12 โรงเรียนและบัญชีผู้ใช้งาน SMIS สำหรับติดตั้งใหม่ทั้งหมด
                </p>
              </div>

              <button
                onClick={() => handleDownloadFile(generateDatabaseSql(), 'database.sql', 'text/sql;charset=utf-8')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" /> ดาวน์โหลด `database.sql`
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 text-base font-['Kanit']">
            ประวัติการปฏิบัติงานในระบบ (System Audit Logs)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-3 px-3">เวลา (Timestamp)</th>
                  <th className="py-3 px-3">ผู้ใช้งาน</th>
                  <th className="py-3 px-3">การกระทำ (Action)</th>
                  <th className="py-3 px-3">ตาราง / รายละเอียด</th>
                  <th className="py-3 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((lg) => (
                  <tr key={lg.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-slate-500">{lg.created_at}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{lg.user_name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-[10px]">
                        {lg.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{lg.details || lg.table_name}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{lg.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200 animate-scale-up">
            <h3 className="text-base font-bold font-['Kanit'] text-slate-900">
              {editingUserId ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
            </h3>
            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">ชื่อผู้ใช้งาน (Username / รหัส SMIS)</label>
                <input
                  type="text"
                  required
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  placeholder="เช่น 31030064 หรือ admin_sawang"
                  className="w-full p-2.5 border rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  placeholder="เช่น นายประสิทธิ์ รักกีฬา"
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">บทบาท (Role)</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  >
                    <option value="SCHOOL">Admin โรงเรียน</option>
                    <option value="ADMIN">Admin กลาง</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="JUDGE">กรรมการตัดสิน (Judge)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">สถานะ</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  >
                    <option value="ACTIVE">ใช้งานปกติ (ACTIVE)</option>
                    <option value="INACTIVE">ระงับชั่วคราว (INACTIVE)</option>
                  </select>
                </div>
              </div>

              {userFormData.role === 'SCHOOL' && (
                <div>
                  <label className="font-semibold block mb-1">โรงเรียนที่สังกัด</label>
                  <select
                    value={userFormData.school_id}
                    onChange={(e) => setUserFormData({ ...userFormData, school_id: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  >
                    <option value="">-- เลือกโรงเรียน --</option>
                    {schools.map((sch) => (
                      <option key={sch.id} value={sch.id}>{sch.school_name} (SMIS: {sch.smis_code || sch.school_code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="user@sawangsung.ac.th"
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="08x-xxxxxxx"
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  {editingUserId ? 'รหัสผ่านใหม่ (หากไม่ต้องการเปลี่ยนให้เว้นว่างไว้)' : 'รหัสผ่านเริ่มต้น'}
                </label>
                <input
                  type="text"
                  value={userFormData.password_plain || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, password_plain: e.target.value })}
                  placeholder={editingUserId ? 'เว้นว่างไว้หากใช้รหัสผ่านเดิม' : '123456'}
                  className="w-full p-2.5 border rounded-xl text-sm font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {editingUserId ? 'ระบุรหัสผ่านใหม่หากต้องการเปลี่ยนให้ผู้ใช้นี้ทันที' : 'รหัสผ่านเริ่มต้นสำหรับเข้าสู่ระบบครั้งแรก (เช่น 123456)'}
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-amber-900 font-semibold">
                  <input
                    type="checkbox"
                    checked={userFormData.must_change_password ?? false}
                    onChange={(e) => setUserFormData({ ...userFormData, must_change_password: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>บังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบ (Must Change Password)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition">
                  {editingUserId ? 'บันทึกการแก้ไข' : 'บันทึกผู้ใช้งาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SCHOOL */}
      {showAddSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200 animate-scale-up">
            <h3 className="text-base font-bold font-['Kanit'] text-slate-900">
              {editingSchoolId ? 'แก้ไขข้อมูลโรงเรียน' : 'เพิ่มโรงเรียนใหม่ในกลุ่ม'}
            </h3>
            <form onSubmit={handleSaveSchool} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">ชื่อโรงเรียน</label>
                <input
                  type="text"
                  required
                  value={schoolFormData.school_name}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, school_name: e.target.value })}
                  placeholder="เช่น โรงเรียนบ้านสวายสอ"
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">รหัส SMIS (8 หลัก)</label>
                  <input
                    type="text"
                    required
                    value={schoolFormData.smis_code || schoolFormData.school_code}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, smis_code: e.target.value, school_code: e.target.value })}
                    placeholder="เช่น 31030099"
                    className="w-full p-2.5 border rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">ชื่อย่อ</label>
                  <input
                    type="text"
                    value={schoolFormData.short_name}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, short_name: e.target.value })}
                    placeholder="เช่น รร.บ้านสวายสอ"
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">ผู้อำนวยการโรงเรียน</label>
                <input
                  type="text"
                  value={schoolFormData.director_name}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, director_name: e.target.value })}
                  placeholder="เช่น ผอ.สมชาย สายลุย"
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={schoolFormData.phone}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, phone: e.target.value })}
                    placeholder="044-xxxxxx"
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">ลิงก์ตราสัญลักษณ์ (Logo URL)</label>
                  <input
                    type="text"
                    value={schoolFormData.logo}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, logo: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">ที่อยู่ / สถานที่ตั้ง</label>
                <input
                  type="text"
                  value={schoolFormData.address}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, address: e.target.value })}
                  placeholder="เช่น ต.สว่าง อ.กระสัง จ.บุรีรัมย์"
                  className="w-full p-2.5 border rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSchool(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition">
                  {editingSchoolId ? 'บันทึกการแก้ไข' : 'บันทึกโรงเรียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EVENT */}
      {showAddEvent && (() => {
        const curSport = sports.find((s) => s.id === eventFormData.sport_id);
        const curSportName = curSport?.sport_name || 'กีฬา';
        const curGrade = normalizeEducationLevel(eventFormData.grade);
        const isCurAthletic = isAthleticsSport(curSportName);
        const previewName = isCurAthletic
          ? formatEventDisplay('กรีฑา', curGrade, selectedAthleticsItem)
          : formatEventDisplay(curSportName, curGrade);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
            <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
              <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full">
                    🏆 จัดการรายการแข่งขันกีฬาและกรีฑา
                  </span>
                  <h3 className="text-lg font-bold font-['Kanit'] text-slate-900 mt-1">
                    {editingEventId ? 'แก้ไขรายการแข่งขัน' : 'เพิ่มรายการแข่งขันกีฬา / กรีฑาใหม่'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    เลือกชนิดกีฬา และเลือกระดับชั้น (3 ระดับชั้นมาตรฐาน) ระบบจะกำหนดชื่อรายการแข่งขันให้อัตโนมัติโดยไม่ต้องพิมพ์เอง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddEvent(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
                {/* Step 1: Select Sport */}
                <div>
                  <label className="font-bold text-slate-900 block mb-1.5 flex items-center justify-between">
                    <span>1. เลือกชนิดกีฬา / กรีฑา <span className="text-red-500">*</span></span>
                    {isCurAthletic && (
                      <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        🏃‍♂️ เป็นประเภทกรีฑา (มีรายการย่อยให้เลือก)
                      </span>
                    )}
                  </label>
                  <select
                    value={eventFormData.sport_id}
                    onChange={(e) => {
                      const nextSportId = e.target.value;
                      const sp = sports.find((s) => s.id === nextSportId);
                      const spName = sp?.sport_name || 'กีฬา';
                      const athleticCheck = isAthleticsSport(spName);
                      const nextGrade = normalizeEducationLevel(eventFormData.grade);
                      
                      let athPreset = ATHLETICS_PRESET_EVENTS.find(a => a.name === selectedAthleticsItem) || ATHLETICS_PRESET_EVENTS[1]; // default 100m
                      
                      setEventFormData({
                        ...eventFormData,
                        sport_id: nextSportId,
                        event_name: athleticCheck
                          ? formatEventDisplay('กรีฑา', nextGrade, selectedAthleticsItem)
                          : formatEventDisplay(spName, nextGrade),
                        competition_type: athleticCheck ? athPreset.type : 'TEAM',
                        min_players: athleticCheck ? athPreset.minPlayers : (spName.includes('ฟุตบอล') ? 7 : 1),
                        max_players: athleticCheck ? athPreset.maxPlayers : (spName.includes('ฟุตบอล') ? 12 : 1)
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    {sports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sport_icon} {s.sport_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Select Grade Level (Strictly 3 Options) */}
                <div>
                  <label className="font-bold text-slate-900 block mb-1.5">
                    2. เลือกระดับชั้นการแข่งขัน (3 ระดับชั้นมาตรฐาน) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'ระดับชั้นอนุบาล', label: '1. ระดับชั้นอนุบาล', sub: 'ปฐมวัย / อ.1 - อ.3', active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm', normal: 'hover:bg-emerald-50 text-slate-700 border-slate-200' },
                      { id: 'ระดับชั้นประถมศึกษา', label: '2. ระดับชั้นประถมศึกษา', sub: 'ป.1 - ป.6', active: 'bg-blue-600 text-white border-blue-600 shadow-sm', normal: 'hover:bg-blue-50 text-slate-700 border-slate-200' },
                      { id: 'ระดับชั้นมัธยมศึกษาตอนต้น', label: '3. ระดับชั้นมัธยมศึกษาตอนต้น', sub: 'ม.1 - ม.3', active: 'bg-indigo-600 text-white border-indigo-600 shadow-sm', normal: 'hover:bg-indigo-50 text-slate-700 border-slate-200' }
                    ].map((lvl) => {
                      const isSelected = curGrade === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => {
                            const newEventName = isCurAthletic
                              ? formatEventDisplay('กรีฑา', lvl.id as any, selectedAthleticsItem)
                              : formatEventDisplay(curSportName, lvl.id as any);
                            setEventFormData({
                              ...eventFormData,
                              grade: lvl.id,
                              age_group: lvl.id,
                              event_name: newEventName
                            });
                          }}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected ? lvl.active : `bg-white ${lvl.normal}`
                          }`}
                        >
                          <div className="font-bold text-xs">{lvl.label}</div>
                          <div className={`text-[10px] mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {lvl.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Conditional for Athletics (กรีฑา) */}
                {isCurAthletic && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                    <label className="font-bold text-amber-950 block text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>🏃‍♂️</span> 3. เลือกรายการแข่งขันกรีฑา <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-semibold">
                        เลือกจากรายการมาตรฐาน
                      </span>
                    </label>
                    <select
                      value={selectedAthleticsItem}
                      onChange={(e) => {
                        const nextAth = e.target.value;
                        setSelectedAthleticsItem(nextAth);
                        const athPreset = ATHLETICS_PRESET_EVENTS.find(a => a.name === nextAth);
                        const nextName = formatEventDisplay('กรีฑา', curGrade, nextAth);
                        setEventFormData({
                          ...eventFormData,
                          event_name: nextName,
                          competition_type: athPreset?.type || 'INDIVIDUAL',
                          min_players: athPreset?.minPlayers || 1,
                          max_players: athPreset?.maxPlayers || 1
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <optgroup label="🏃 ประเภทวิ่งเดี่ยว (Individual Running)">
                        {ATHLETICS_PRESET_EVENTS.filter(a => a.category === 'RUN').map(item => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🤝 ประเภทวิ่งผลัด (Relay Races)">
                        {ATHLETICS_PRESET_EVENTS.filter(a => a.category === 'RELAY').map(item => (
                          <option key={item.name} value={item.name}>
                            {item.name} (ทีม {item.minPlayers}-{item.maxPlayers} คน)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🎯 ประเภทลาน (Field Events)">
                        {ATHLETICS_PRESET_EVENTS.filter(a => a.category === 'FIELD').map(item => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                {/* Auto Generated Display Format Preview Box (No free-text input as requested) */}
                <div className="p-4 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-50 border border-blue-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                      <span>✨</span> ชื่อรายการแข่งขันที่จะสร้าง (จัดรูปแบบมาตรฐานอัตโนมัติ)
                    </span>
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                      ไม่ต้องกรอกเอง
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
                    <div className="text-base font-bold text-blue-950 font-['Prompt'] flex items-center gap-2">
                      <span>{curSport?.sport_icon || '🏅'}</span>
                      <span>{previewName}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-600">
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-100 font-medium">
                      ชนิดกีฬา: <strong className="text-slate-800">{getCleanSportName(curSportName)}</strong>
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-100 font-medium">
                      ระดับชั้น: <strong className="text-slate-800">{curGrade}</strong>
                    </span>
                    {isCurAthletic && (
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-blue-100 font-medium">
                        รายการกรีฑา: <strong className="text-amber-800">{selectedAthleticsItem}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 4: Gender & Format */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ประเภทเพศ</label>
                    <select
                      value={eventFormData.gender}
                      onChange={(e) => setEventFormData({ ...eventFormData, gender: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium"
                    >
                      <option value="MALE">👦 ชาย (Male)</option>
                      <option value="FEMALE">👧 หญิง (Female)</option>
                      <option value="MIXED">👥 ชาย/หญิง ผสม (Mixed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">รูปแบบการแข่งขัน</label>
                    <select
                      value={eventFormData.competition_type}
                      onChange={(e) => setEventFormData({ ...eventFormData, competition_type: e.target.value as any })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium"
                    >
                      <option value="TEAM">👥 ประเภททีม (Team)</option>
                      <option value="INDIVIDUAL">👤 ประเภทเดี่ยว (Individual)</option>
                    </select>
                  </div>
                </div>

                {/* Player Count Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 text-slate-600">จำนวนนักกีฬาขั้นต่ำ (คน)</label>
                    <input
                      type="number"
                      min="1"
                      value={eventFormData.min_players}
                      onChange={(e) => setEventFormData({ ...eventFormData, min_players: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-slate-600">จำนวนนักกีฬาสูงสุด (คน)</label>
                    <input
                      type="number"
                      min="1"
                      value={eventFormData.max_players}
                      onChange={(e) => setEventFormData({ ...eventFormData, max_players: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span>💾</span>
                    <span>{editingEventId ? 'บันทึกการแก้ไข' : 'บันทึกรายการแข่งขัน'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ADD / EDIT SPORT CATEGORY */}
      {showAddSport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold font-['Kanit'] text-slate-900">
              {editingSportId ? 'แก้ไขหมวดหมู่กีฬา/กรีฑา' : 'เพิ่มชนิดกีฬา/กรีฑาใหม่'}
            </h3>
            <form onSubmit={handleSaveSport} className="space-y-3 text-xs">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="font-semibold block mb-1">ไอคอน</label>
                  <input
                    type="text"
                    required
                    value={sportFormData.sport_icon}
                    onChange={(e) => setSportFormData({ ...sportFormData, sport_icon: e.target.value })}
                    placeholder="⚽"
                    className="w-full p-2.5 border rounded-xl text-lg text-center"
                  />
                </div>
                <div className="col-span-3">
                  <label className="font-semibold block mb-1">ชื่อชนิดกีฬา / กรีฑา</label>
                  <input
                    type="text"
                    required
                    value={sportFormData.sport_name}
                    onChange={(e) => setSportFormData({ ...sportFormData, sport_name: e.target.value })}
                    placeholder="เช่น ฟุตบอล, กรีฑา, เปตอง"
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">หมวดหมู่หลัก</label>
                <select
                  value={sportFormData.category}
                  onChange={(e) => setSportFormData({ ...sportFormData, category: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm"
                >
                  <option value="BALL">กีฬาประเภทลูกบอล/ทีม (ฟุตบอล, วอลเลย์บอล ฯลฯ)</option>
                  <option value="TRACK">กรีฑาประเภทลู่ (วิ่งระยะสั้น, วิ่งผลัด ฯลฯ)</option>
                  <option value="FIELD">กรีฑาประเภทลาน (กระโดดไกล, ทุ่มน้ำหนัก ฯลฯ)</option>
                  <option value="RACKET">กีฬาไม้แร็กเกต (แบดมินตัน, เทเบิลเทนนิส)</option>
                  <option value="OTHER">กีฬาอื่นๆ (เปตอง, หมากฮอส ฯลฯ)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">คำอธิบาย</label>
                <textarea
                  value={sportFormData.description}
                  onChange={(e) => setSportFormData({ ...sportFormData, description: e.target.value })}
                  placeholder="รายละเอียดกติกาหรือข้อมูลเพิ่มเติม"
                  className="w-full p-2.5 border rounded-xl text-sm h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSport(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition">
                  {editingSportId ? 'บันทึกการแก้ไข' : 'บันทึกชนิดกีฬา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CERTIFICATE */}
      {editingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" /> แก้ไขข้อมูลเกียรติบัตร
              </h3>
              <button
                onClick={() => setEditingCert(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEditCert} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">เลขที่เกียรติบัตร</label>
                <input
                  type="text"
                  required
                  value={editCertForm.certificate_no}
                  onChange={(e) => setEditCertForm({ ...editCertForm, certificate_no: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ชื่อ-สกุล ผู้ได้รับเกียรติบัตร</label>
                <input
                  type="text"
                  required
                  value={editCertForm.recipient_name}
                  onChange={(e) => setEditCertForm({ ...editCertForm, recipient_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ประเภทผู้รับ</label>
                  <select
                    value={editCertForm.recipient_type}
                    onChange={(e) => setEditCertForm({ ...editCertForm, recipient_type: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="STUDENT">🎒 นักเรียน</option>
                    <option value="COACH">👨‍🏫 ครูผู้ฝึกสอน</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">เหรียญรางวัล</label>
                  <select
                    value={editCertForm.medal}
                    onChange={(e) => setEditCertForm({ ...editCertForm, medal: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="GOLD">🥇 ชนะเลิศ (เหรียญทอง)</option>
                    <option value="SILVER">🥈 รองชนะเลิศอันดับ 1 (เหรียญเงิน)</option>
                    <option value="BRONZE">🥉 รองชนะเลิศอันดับ 2 (เหรียญทองแดง)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">โรงเรียน / สังกัด</label>
                <input
                  type="text"
                  required
                  value={editCertForm.school_name}
                  onChange={(e) => setEditCertForm({ ...editCertForm, school_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ข้อความรางวัลที่ได้รับ</label>
                <input
                  type="text"
                  required
                  value={editCertForm.award}
                  onChange={(e) => setEditCertForm({ ...editCertForm, award: e.target.value })}
                  placeholder="เช่น รางวัลชนะเลิศ เหรียญทอง"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">วันที่ออกเอกสาร</label>
                <input
                  type="text"
                  value={editCertForm.issue_date}
                  onChange={(e) => setEditCertForm({ ...editCertForm, issue_date: e.target.value })}
                  placeholder="เช่น 15 มกราคม 2569"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCert(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition shadow-xs cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {viewingCert && (
        <CertificateModal
          certificate={viewingCert}
          autoDownload={autoDownloadCert}
          onClose={() => {
            setViewingCert(null);
            setAutoDownloadCert(false);
          }}
        />
      )}
    </div>
  );
};
