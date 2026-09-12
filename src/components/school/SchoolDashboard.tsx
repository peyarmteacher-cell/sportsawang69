import React, { useState } from 'react';
import { sportsStore } from '../../services/store';
import { School, Student, Coach, Event, Sport, Certificate, Registration } from '../../types';
import { CertificateModal } from '../CertificateModal';
import {
  Users,
  UserPlus,
  Trophy,
  Award,
  FileText,
  School as SchoolIcon,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Download,
  Printer,
  Search,
  Filter,
  Save,
  LogOut
} from 'lucide-react';
import { 
  formatThaiDate, 
  normalizeEducationLevel, 
  formatSportNameWithPrefix, 
  formatEventDisplay,
  formatEventRegistrationDisplay,
  sortEventsList
} from '../../utils/thaiFormatter';

interface SchoolDashboardProps {
  currentSchoolId: string;
}

export const SchoolDashboard: React.FC<SchoolDashboardProps> = ({ currentSchoolId }) => {
  const [activeTab, setActiveTab] = useState<'REGISTRATION' | 'STUDENTS' | 'COACHES' | 'CERTIFICATES' | 'SCHOOL_PROFILE'>('REGISTRATION');
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);

  const school = sportsStore.getSchools().find((s) => s.id === currentSchoolId) || sportsStore.getSchools()[0];
  const sports = sportsStore.getSports();
  const events = sportsStore.getEvents();
  const students = sportsStore.getStudents().filter((s) => s.school_id === school.id);
  const coaches = sportsStore.getCoaches().filter((c) => c.school_id === school.id);
  const registrations = sportsStore.getRegistrations().filter((r) => r.school_id === school.id);
  const certificates = sportsStore.getCertificates().filter((c) => c.school_id === school.id);
  const regStudents = sportsStore.getRegistrationStudents();

  // School Profile Edit State
  const [schoolFormData, setSchoolFormData] = useState<Partial<School>>({
    school_name: school.school_name,
    short_name: school.short_name || '',
    director_name: school.director_name || '',
    address: school.address || '',
    phone: school.phone || '',
    logo: school.logo || ''
  });
  const [schoolProfileSaveMessage, setSchoolProfileSaveMessage] = useState('');

  // Keep form data in sync if school changes
  React.useEffect(() => {
    setSchoolFormData({
      school_name: school.school_name,
      short_name: school.short_name || '',
      director_name: school.director_name || '',
      address: school.address || '',
      phone: school.phone || '',
      logo: school.logo || ''
    });
  }, [school]);

  const handleSaveSchoolProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolFormData.school_name?.trim()) {
      alert('กรุณากรอกชื่อสถานศึกษา');
      return;
    }
    sportsStore.updateSchool(school.id, {
      school_name: schoolFormData.school_name.trim(),
      short_name: schoolFormData.short_name?.trim() || schoolFormData.school_name.trim(),
      director_name: schoolFormData.director_name?.trim() || '',
      address: schoolFormData.address?.trim() || '',
      phone: schoolFormData.phone?.trim() || '',
      logo: schoolFormData.logo?.trim() || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150'
    });
    setSchoolProfileSaveMessage('บันทึกและปรับปรุงข้อมูลสถานศึกษาเรียบร้อยแล้ว');
    setTimeout(() => setSchoolProfileSaveMessage(''), 4000);
  };

  // Registration Form State
  const [selectedSportId, setSelectedSportId] = useState(sports[0]?.id || '');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>(coaches.length > 0 ? [coaches[0].id] : []);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [regSuccessMessage, setRegSuccessMessage] = useState('');

  // Synchronize coach selection if coaches load or change
  React.useEffect(() => {
    if (selectedCoachIds.length === 0 && coaches.length > 0) {
      setSelectedCoachIds([coaches[0].id]);
    }
  }, [coaches]);

  // Certificates tab filters
  const [certSearchTerm, setCertSearchTerm] = useState('');
  const [certTypeFilter, setCertTypeFilter] = useState<'ALL' | 'STUDENT' | 'COACH'>('ALL');

  // Student Tab Filtering & Management State
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState('ALL');
  const [studentActionMessage, setStudentActionMessage] = useState('');

  // Add Single Student Form State (No ID required)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    prefix: 'เด็กชาย',
    first_name: '',
    last_name: '',
    gender: 'MALE',
    grade: 'ป.4',
    birth_date: '2014-05-15'
  });

  // Batch Add Students Form State
  const [showBatchStudentModal, setShowBatchStudentModal] = useState(false);
  const [batchGrade, setBatchGrade] = useState('ป.4');
  const [batchNamesText, setBatchNamesText] = useState('');

  // Edit Student Form State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Add Coach Form State
  const [showAddCoachModal, setShowAddCoachModal] = useState(false);
  const [coachModalTab, setCoachModalTab] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [batchCoachText, setBatchCoachText] = useState('');
  const [batchCoachPosition, setBatchCoachPosition] = useState('ครูผู้ฝึกสอน');
  const [newCoach, setNewCoach] = useState<Partial<Coach>>({
    prefix: 'นาย',
    first_name: '',
    last_name: '',
    position: 'ครูผู้ฝึกสอน',
    phone: '',
    email: ''
  });

  // Manage Registered Team (Athletes & Coaches) Modal State
  const [managingRegistration, setManagingRegistration] = useState<Registration | null>(null);
  const [manageStudentIds, setManageStudentIds] = useState<string[]>([]);
  const [manageCoachIds, setManageCoachIds] = useState<string[]>([]);
  const [manageStudentSearch, setManageStudentSearch] = useState('');
  const [manageGradeFilter, setManageGradeFilter] = useState('ALL');

  const availableEvents = sortEventsList(events.filter((e) => e.sport_id === selectedSportId));
  const currentEvent = events.find((e) => e.id === selectedEventId);

  const handleToggleStudentSelection = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      if (currentEvent && selectedStudentIds.length >= currentEvent.max_players) {
        alert(`รายการนี้จำกัดผู้เล่นไม่เกิน ${currentEvent.max_players} คน`);
        return;
      }
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleToggleCoachSelection = (coachId: string) => {
    if (selectedCoachIds.includes(coachId)) {
      if (selectedCoachIds.length === 1) {
        alert('ต้องเลือกครูผู้ฝึกสอนอย่างน้อย 1 คน');
        return;
      }
      setSelectedCoachIds(selectedCoachIds.filter((id) => id !== coachId));
    } else {
      setSelectedCoachIds([...selectedCoachIds, coachId]);
    }
  };

  const handleRegisterEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert('กรุณาเลือกรายการแข่งขัน');
      return;
    }
    if (selectedCoachIds.length === 0) {
      alert('กรุณาเลือกครูผู้ฝึกสอนอย่างน้อย 1 คน');
      return;
    }
    if (selectedStudentIds.length === 0) {
      alert('กรุณาเลือกนักกีฬาอย่างน้อย 1 คน');
      return;
    }

    sportsStore.registerTeam({
      competition_id: sportsStore.getCurrentCompetitionId(),
      school_id: school.id,
      event_id: selectedEventId,
      coach_id: selectedCoachIds[0],
      coach_ids: selectedCoachIds,
      registration_status: 'APPROVED',
      registered_by: school.school_name,
      student_ids: selectedStudentIds
    });

    setRegSuccessMessage('ลงทะเบียนรายการแข่งขันและครูผู้ฝึกสอนสำเร็จเรียบร้อยแล้ว!');
    setSelectedStudentIds([]);
    setTimeout(() => setRegSuccessMessage(''), 4000);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.first_name?.trim() || !newStudent.last_name?.trim()) {
      alert('กรุณากรอกชื่อและนามสกุลนักเรียน');
      return;
    }

    try {
      sportsStore.addStudent({
        competition_id: sportsStore.getCurrentCompetitionId(),
        school_id: school.id,
        student_code: `STD-${Math.floor(1000 + Math.random() * 9000)}`,
        prefix: newStudent.prefix || 'เด็กชาย',
        first_name: newStudent.first_name.trim(),
        last_name: newStudent.last_name.trim(),
        gender: (newStudent.gender || 'MALE') as 'MALE' | 'FEMALE',
        grade: newStudent.grade || 'ป.4',
        birth_date: newStudent.birth_date || '2014-01-01',
        status: 'ACTIVE'
      });

      setShowAddStudentModal(false);
      setNewStudent({
        prefix: 'เด็กชาย',
        first_name: '',
        last_name: '',
        gender: 'MALE',
        grade: 'ป.4',
        birth_date: '2014-05-15'
      });
      setStudentActionMessage(`เพิ่มข้อมูลนักเรียน "${newStudent.prefix || ''}${newStudent.first_name} ${newStudent.last_name}" เรียบร้อยแล้ว (ไม่ต้องใช้รหัสประจำตัว)`);
      setTimeout(() => setStudentActionMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเพิ่มนักเรียน');
    }
  };

  const handleBatchCreateStudents = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNamesText.trim()) {
      alert('กรุณากรอกหรือวางรายชื่อนักเรียนอย่างน้อย 1 รายชื่อ');
      return;
    }

    const lines = batchNamesText.split(/\r?\n/);
    const studentsToImport: Array<Omit<Student, 'id' | 'created_at'>> = [];

    lines.forEach((rawLine) => {
      let line = rawLine.trim();
      if (!line) return;

      // ลบตัวเลขนำหน้า เช่น 1., 1), 01.
      line = line.replace(/^\d+[\.\)\s\-]+/, '').trim();
      if (!line) return;

      let pfx = 'เด็กชาย';
      let gen: 'MALE' | 'FEMALE' = 'MALE';

      if (/^(เด็กชาย|ด\.ช\.)/i.test(line)) {
        pfx = 'เด็กชาย';
        gen = 'MALE';
        line = line.replace(/^(เด็กชาย|ด\.ช\.)\s*/i, '').trim();
      } else if (/^(เด็กหญิง|ด\.ญ\.)/i.test(line)) {
        pfx = 'เด็กหญิง';
        gen = 'FEMALE';
        line = line.replace(/^(เด็กหญิง|ด\.ญ\.)\s*/i, '').trim();
      } else if (/^(นางสาว|น\.ส\.)/i.test(line)) {
        pfx = 'นางสาว';
        gen = 'FEMALE';
        line = line.replace(/^(นางสาว|น\.ส\.)\s*/i, '').trim();
      } else if (/^(นาย)/i.test(line)) {
        pfx = 'นาย';
        gen = 'MALE';
        line = line.replace(/^(นาย)\s*/i, '').trim();
      }

      const parts = line.split(/\s+/);
      const fName = parts[0] || '';
      const lName = parts.length > 1 ? parts.slice(1).join(' ') : '-';

      if (fName) {
        studentsToImport.push({
          competition_id: sportsStore.getCurrentCompetitionId(),
          school_id: school.id,
          student_code: `STD-${Math.floor(1000 + Math.random() * 9000)}`,
          prefix: pfx,
          first_name: fName,
          last_name: lName,
          gender: gen,
          grade: batchGrade,
          birth_date: '2014-01-01',
          status: 'ACTIVE'
        });
      }
    });

    if (studentsToImport.length === 0) {
      alert('ไม่พบรายชื่อที่ถูกต้อง กรุณาตรวจสอบข้อความที่วาง');
      return;
    }

    const res = sportsStore.bulkImportStudents(studentsToImport);
    setShowBatchStudentModal(false);
    setBatchNamesText('');
    setStudentActionMessage(`นำเข้ารายชื่อนักเรียนชั้น ${batchGrade} สำเร็จ ${res.success} คน` + (res.skipped > 0 ? ` (ข้ามรายชื่อที่ซ้ำ ${res.skipped} คน)` : ''));
    setTimeout(() => setStudentActionMessage(''), 5000);
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.first_name.trim() || !editingStudent.last_name.trim()) {
      alert('กรุณากรอกชื่อและนามสกุลนักเรียน');
      return;
    }

    sportsStore.updateStudent(editingStudent.id, {
      prefix: editingStudent.prefix,
      first_name: editingStudent.first_name.trim(),
      last_name: editingStudent.last_name.trim(),
      gender: editingStudent.gender,
      grade: editingStudent.grade,
      birth_date: editingStudent.birth_date
    });

    setEditingStudent(null);
    setStudentActionMessage(`แก้ไขข้อมูลนักเรียน "${editingStudent.prefix}${editingStudent.first_name} ${editingStudent.last_name}" เรียบร้อยแล้ว`);
    setTimeout(() => setStudentActionMessage(''), 4000);
  };

  const handleDeleteStudent = (student: Student) => {
    if (window.confirm(`ยืนยันการลบนักเรียน "${student.prefix} ${student.first_name} ${student.last_name}" ออกจากระบบ?`)) {
      sportsStore.deleteStudent(student.id);
      setStudentActionMessage(`ลบนักเรียน "${student.prefix} ${student.first_name} ${student.last_name}" เรียบร้อยแล้ว`);
      setTimeout(() => setStudentActionMessage(''), 4000);
    }
  };

  const handleSelectAllCoaches = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedCoachIds(coaches.map((c) => c.id));
    } else {
      setSelectedCoachIds(coaches.length > 0 ? [coaches[0].id] : []);
    }
  };

  const handleCreateCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoach.first_name || !newCoach.last_name) return;

    const added = sportsStore.addCoach({
      competition_id: 'COMP-2569-SSK',
      school_id: school.id,
      prefix: newCoach.prefix || 'นาย',
      first_name: newCoach.first_name,
      last_name: newCoach.last_name,
      position: newCoach.position || 'ครูผู้ฝึกสอน',
      phone: newCoach.phone,
      status: 'ACTIVE'
    });

    // Auto-select this newly created coach
    if (added?.id && !selectedCoachIds.includes(added.id)) {
      setSelectedCoachIds([...selectedCoachIds, added.id]);
    }
    if (managingRegistration && added?.id && !manageCoachIds.includes(added.id)) {
      setManageCoachIds([...manageCoachIds, added.id]);
    }

    setShowAddCoachModal(false);
    setNewCoach({
      prefix: 'นาย',
      first_name: '',
      last_name: '',
      position: 'ครูผู้ฝึกสอน',
      phone: '',
      email: ''
    });
  };

  const handleBatchCreateCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCoachText.trim()) {
      alert('กรุณาวางรายชื่อครูผู้ฝึกสอนอย่างน้อย 1 คน');
      return;
    }

    const lines = batchCoachText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const coachesToInsert: Array<Omit<Coach, 'id' | 'created_at'>> = [];

    lines.forEach((raw) => {
      let line = raw.replace(/^\d+[\.\)\s\-]+/, '').trim();
      if (!line) return;

      let prefix = 'นาย';
      if (/^(นางสาว|น\.ส\.)\s*/i.test(line)) {
        prefix = 'นางสาว';
        line = line.replace(/^(นางสาว|น\.ส\.)\s*/i, '');
      } else if (/^(นาง)\s*/i.test(line)) {
        prefix = 'นาง';
        line = line.replace(/^(นาง)\s*/i, '');
      } else if (/^(ว่าที่ร้อยตรีหญิง|ว่าที่ ร\.ต\.หญิง)\s*/i.test(line)) {
        prefix = 'นางสาว';
        line = line.replace(/^(ว่าที่ร้อยตรีหญิง|ว่าที่ ร\.ต\.หญิง)\s*/i, '');
      } else if (/^(ว่าที่ร้อยตรี|ว่าที่ ร\.ต\.)\s*/i.test(line)) {
        prefix = 'นาย';
        line = line.replace(/^(ว่าที่ร้อยตรี|ว่าที่ ร\.ต\.)\s*/i, '');
      } else if (/^(ดร\.|อาจารย์|ครู)\s*/i.test(line)) {
        prefix = 'นาย';
        line = line.replace(/^(ดร\.|อาจารย์|ครู)\s*/i, '');
      } else if (/^(นาย)\s*/i.test(line)) {
        prefix = 'นาย';
        line = line.replace(/^(นาย)\s*/i, '');
      }

      const parts = line.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '-';

      if (firstName) {
        coachesToInsert.push({
          competition_id: 'COMP-2569-SSK',
          school_id: school.id,
          prefix,
          first_name: firstName,
          last_name: lastName,
          position: batchCoachPosition || 'ครูผู้ฝึกสอน',
          phone: '',
          status: 'ACTIVE'
        });
      }
    });

    if (coachesToInsert.length === 0) {
      alert('ไม่พบรายชื่อที่ถูกต้อง');
      return;
    }

    const res = sportsStore.bulkImportCoaches(coachesToInsert);
    // Auto-select newly added coaches
    if (res.addedCoaches && res.addedCoaches.length > 0) {
      const newIds = res.addedCoaches.map((c) => c.id);
      setSelectedCoachIds(Array.from(new Set([...selectedCoachIds, ...newIds])));
      if (managingRegistration) {
        setManageCoachIds(Array.from(new Set([...manageCoachIds, ...newIds])));
      }
    }

    setShowAddCoachModal(false);
    setBatchCoachText('');
    alert(`นำเข้ารายชื่อครูผู้ฝึกสอนสำเร็จ ${res.success} คน` + (res.skipped > 0 ? ` (ข้ามรายชื่อซ้ำ ${res.skipped} คน)` : ''));
  };

  const handleOpenManageTeam = (reg: Registration) => {
    const currentTeamStudents = regStudents
      .filter((rs) => rs.registration_id === reg.id)
      .map((rs) => rs.student_id);

    const currentCoaches = reg.coach_ids && reg.coach_ids.length > 0
      ? reg.coach_ids
      : [reg.coach_id, reg.secondary_coach_id].filter(Boolean) as string[];

    setManagingRegistration(reg);
    setManageStudentIds(currentTeamStudents);
    setManageCoachIds(currentCoaches);
    setManageStudentSearch('');
    setManageGradeFilter('ALL');
  };

  const handleToggleManageStudent = (studentId: string) => {
    if (!managingRegistration) return;
    const regEvent = events.find((e) => e.id === managingRegistration.event_id);
    if (manageStudentIds.includes(studentId)) {
      setManageStudentIds(manageStudentIds.filter((id) => id !== studentId));
    } else {
      if (regEvent && manageStudentIds.length >= regEvent.max_players) {
        alert(`รายการนี้จำกัดจำนวนนักกีฬาไม่เกิน ${regEvent.max_players} คน`);
        return;
      }
      setManageStudentIds([...manageStudentIds, studentId]);
    }
  };

  const handleToggleManageCoach = (coachId: string) => {
    if (manageCoachIds.includes(coachId)) {
      if (manageCoachIds.length === 1) {
        alert('ต้องมีครูผู้ฝึกสอนอย่างน้อย 1 คน');
        return;
      }
      setManageCoachIds(manageCoachIds.filter((id) => id !== coachId));
    } else {
      setManageCoachIds([...manageCoachIds, coachId]);
    }
  };

  const handleSelectAllManageCoaches = (selectAll: boolean) => {
    if (selectAll) {
      setManageCoachIds(coaches.map((c) => c.id));
    } else {
      setManageCoachIds(coaches.length > 0 ? [coaches[0].id] : []);
    }
  };

  const handleSaveManageTeam = () => {
    if (!managingRegistration) return;
    const regEvent = events.find((e) => e.id === managingRegistration.event_id);
    if (regEvent && manageStudentIds.length > regEvent.max_players) {
      alert(`จำนวนนักกีฬาเกินโควตาสูงสุด (${regEvent.max_players} คน)`);
      return;
    }
    if (manageCoachIds.length === 0) {
      alert('กรุณาเลือกครูผู้ฝึกสอนอย่างน้อย 1 คน');
      return;
    }
    if (manageStudentIds.length === 0) {
      if (!confirm('รายการนี้ยังไม่มีนักกีฬาที่เลือกไว้ ยืนยันบันทึกหรือไม่?')) {
        return;
      }
    }

    try {
      sportsStore.updateRegistrationTeam(
        managingRegistration.id,
        manageStudentIds,
        manageCoachIds
      );
      setManagingRegistration(null);
      alert('บันทึกการปรับปรุงรายชื่อนักกีฬาและครูผู้ฝึกสอนเรียบร้อยแล้ว');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + (err?.message || ''));
    }
  };

  const handleDeleteRegisteredTeam = (regId: string, eventName?: string) => {
    if (confirm(`ยืนยันยกเลิกการส่งแข่งขันรายการ "${eventName || regId}" ใช่หรือไม่?`)) {
      sportsStore.deleteRegistration(regId);
      if (managingRegistration?.id === regId) {
        setManagingRegistration(null);
      }
      alert('ยกเลิกการลงทะเบียนรายการนี้เรียบร้อยแล้ว');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* School Header Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={school.logo}
            alt={school.school_name}
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold">
                ระบบจัดการสถานศึกษา (School Portal)
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">SMIS: {school.smis_code || school.school_code}</span>
            </div>
            <h1 className="text-2xl font-bold font-['Kanit'] text-slate-900 mt-1">
              {school.school_name}
            </h1>
            <p className="text-xs text-slate-500">{school.address} | ผู้อำนวยการ: {school.director_name || '-'} | โทร. {school.phone || '-'}</p>
          </div>
        </div>

        {/* Action Button: Clear Logout Button */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            onClick={() => {
              sportsStore.logout();
              window.location.reload();
            }}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="ออกจากระบบสถานศึกษา"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Prominent Colored Navigation Tabs for School Admin */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Tab 1: Registration (Blue) */}
        <button
          onClick={() => setActiveTab('REGISTRATION')}
          className={`p-3.5 rounded-2xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center gap-2 border text-left cursor-pointer ${
            activeTab === 'REGISTRATION'
              ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/30 scale-[1.02]'
              : 'bg-blue-50/90 text-blue-900 hover:bg-blue-100 border-blue-200 shadow-2xs'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${activeTab === 'REGISTRATION' ? 'bg-white/20 text-white' : 'bg-blue-200/80 text-blue-800'}`}>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block font-['Kanit'] text-xs font-bold leading-tight">ลงทะเบียนแข่งขัน</span>
            <span className={`text-[10px] ${activeTab === 'REGISTRATION' ? 'text-blue-100' : 'text-blue-700'}`}>
              ส่งรายชื่อ ({registrations.length} รายการ)
            </span>
          </div>
        </button>

        {/* Tab 2: Students Database (Emerald) */}
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`p-3.5 rounded-2xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center gap-2 border text-left cursor-pointer ${
            activeTab === 'STUDENTS'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/30 scale-[1.02]'
              : 'bg-emerald-50/90 text-emerald-950 hover:bg-emerald-100 border-emerald-300 shadow-2xs'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${activeTab === 'STUDENTS' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-800'}`}>
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block font-['Kanit'] text-xs font-bold leading-tight">ฐานข้อมูลนักเรียน</span>
            <span className={`text-[10px] ${activeTab === 'STUDENTS' ? 'text-emerald-100' : 'text-emerald-800 font-semibold'}`}>
              {students.length} คน (ไม่ต้องใส่รหัส)
            </span>
          </div>
        </button>

        {/* Tab 3: Coaches (Purple) */}
        <button
          onClick={() => setActiveTab('COACHES')}
          className={`p-3.5 rounded-2xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center gap-2 border text-left cursor-pointer ${
            activeTab === 'COACHES'
              ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-500/30 scale-[1.02]'
              : 'bg-purple-50/90 text-purple-950 hover:bg-purple-100 border-purple-300 shadow-2xs'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${activeTab === 'COACHES' ? 'bg-white/20 text-white' : 'bg-purple-200/80 text-purple-800'}`}>
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block font-['Kanit'] text-xs font-bold leading-tight">ครูผู้ฝึกสอน</span>
            <span className={`text-[10px] ${activeTab === 'COACHES' ? 'text-purple-100' : 'text-purple-800'}`}>
              {coaches.length} คน (ผู้ควบคุมทีม)
            </span>
          </div>
        </button>

        {/* Tab 4: Results & Certificates (Amber) */}
        <button
          onClick={() => setActiveTab('CERTIFICATES')}
          className={`p-3.5 rounded-2xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center gap-2 border text-left cursor-pointer ${
            activeTab === 'CERTIFICATES'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/30 scale-[1.02]'
              : 'bg-amber-50/90 text-amber-950 hover:bg-amber-100 border-amber-300 shadow-2xs'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${activeTab === 'CERTIFICATES' ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-800'}`}>
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block font-['Kanit'] text-xs font-bold leading-tight">ผลงาน & เกียรติบัตร</span>
            <span className={`text-[10px] ${activeTab === 'CERTIFICATES' ? 'text-amber-100' : 'text-amber-800'}`}>
              {certificates.length} ใบ (ดาวน์โหลด)
            </span>
          </div>
        </button>

        {/* Tab 5: School Profile (Slate) */}
        <button
          onClick={() => setActiveTab('SCHOOL_PROFILE')}
          className={`p-3.5 rounded-2xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center gap-2 border text-left cursor-pointer ${
            activeTab === 'SCHOOL_PROFILE'
              ? 'bg-slate-800 text-white border-slate-900 shadow-md shadow-slate-800/30 scale-[1.02]'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-300 shadow-2xs'
          }`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${activeTab === 'SCHOOL_PROFILE' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
            <SchoolIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block font-['Kanit'] text-xs font-bold leading-tight">ข้อมูลโรงเรียน</span>
            <span className={`text-[10px] ${activeTab === 'SCHOOL_PROFILE' ? 'text-slate-300' : 'text-slate-600'}`}>
              ตั้งค่า / แก้ไขข้อมูล
            </span>
          </div>
        </button>
      </div>

      {/* TAB 1: REGISTRATION */}
      {activeTab === 'REGISTRATION' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                ส่งรายชื่อและลงทะเบียนนักกีฬาเข้าร่วมแข่งขัน
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกชนิดกีฬา ➔ รายการแข่งขัน ➔ ครูผู้ฝึกสอน ➔ ติ๊กเลือกนักกีฬาจากฐานข้อมูลโรงเรียน
              </p>
            </div>

            {regSuccessMessage && (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{regSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleRegisterEvent} className="space-y-6">
              {/* Sport Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  1. เลือกชนิดกีฬา
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {sports.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setSelectedSportId(sp.id);
                        setSelectedEventId('');
                        setSelectedStudentIds([]);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        selectedSportId === sp.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span>{sp.sport_icon}</span>
                      <span>{sp.sport_name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  2. เลือกรายการแข่งขัน
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {availableEvents.map((ev) => {
                    const isSelected = ev.id === selectedEventId;
                    const alreadyReg = registrations.some((r) => r.event_id === ev.id);
                    const sportObj = sports.find((s) => s.id === ev.sport_id);
                    const displayTitle = formatEventRegistrationDisplay(ev.event_name, ev.grade, sportObj?.sport_name, ev.gender);
                    const normGrade = normalizeEducationLevel(ev.grade);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setSelectedStudentIds([]);
                        }}
                        className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/30 shadow-xs'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="font-mono text-slate-500 font-bold bg-slate-200/70 px-1.5 py-0.5 rounded">{ev.event_code}</span>
                          {alreadyReg && (
                            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                              ✓ ลงทะเบียนแล้ว
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 text-xs font-['Prompt'] line-clamp-2 leading-tight">
                          {displayTitle}
                        </p>
                        <div className="text-[11px] text-slate-600 mt-2 flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                          <span className="font-semibold text-blue-800">{normGrade}</span>
                          <span>{ev.competition_type === 'TEAM' ? `ทีม (${ev.min_players}-${ev.max_players} คน)` : 'บุคคล'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coach Multi-Selection */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-slate-800">
                      3. เลือกครูผู้ฝึกสอน (เลือกได้หลายคน / ตำแหน่งครูผู้ฝึกสอน) <span className="text-rose-500">*</span>
                    </label>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                      เลือกแล้ว {selectedCoachIds.length} / {coaches.length} คน
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllCoaches(true)}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-lg transition cursor-pointer"
                    >
                      ✓ เลือกครูทุกคน
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllCoaches(false)}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-lg transition cursor-pointer"
                    >
                      ✕ ล้างการเลือก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoachModalTab('BATCH');
                        setShowAddCoachModal(true);
                      }}
                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มครูผู้ฝึกสอน (เดี่ยว/หลายคน)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                  {coaches.map((c) => {
                    const isSelected = selectedCoachIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleCoachSelection(c.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/95 border-indigo-500 ring-2 ring-indigo-300 text-indigo-950 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-slate-100'
                        }`}>
                          {isSelected ? '✓' : ''}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate">
                            {c.prefix}{c.first_name} {c.last_name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            ตำแหน่ง: ครูผู้ฝึกสอน
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {coaches.length === 0 && (
                    <div className="col-span-full py-4 text-center text-xs text-slate-500">
                      ยังไม่มีรายชื่อครูผู้ฝึกสอน กรุณากดปุ่ม "+ เพิ่มครูผู้ฝึกสอนใหม่"
                    </div>
                  )}
                </div>
              </div>

              {/* Student Selection Roster */}
              {currentEvent && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      4. ติ๊กเลือกนักกีฬา ({selectedStudentIds.length} / สูงสุด {currentEvent.max_players} คน)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddStudentModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มนักเรียนใหม่
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {students.map((st) => {
                      const isChecked = selectedStudentIds.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-100/70 border-blue-400 text-blue-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStudentSelection(st.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div className="text-xs">
                            <p>{st.prefix} {st.first_name} {st.last_name}</p>
                            <span className="text-[10px] text-slate-500 font-normal">
                              ชั้น {st.grade} ({st.gender === 'MALE' ? 'ชาย' : 'หญิง'})
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  บันทึกการส่งรายชื่อนักกีฬา
                </button>
              </div>
            </form>
          </div>

          {/* Registered Teams Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base font-['Kanit'] flex items-center gap-2">
                  <span>📋</span> รายการที่โรงเรียนได้ลงทะเบียนแล้ว ({registrations.length} รายการ)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  สามารถกดปุ่ม <b>"จัดการนักกีฬาและครู"</b> เพื่อเพิ่ม/ถอดรายชื่อนักเรียน หรือเพิ่ม/เปลี่ยนครูผู้ฝึกสอนในแต่ละรายการได้ตลอดเวลา
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3.5 px-4 font-bold">รายการแข่งขัน</th>
                    <th className="py-3.5 px-4 font-bold">ครูผู้ฝึกสอนที่รับผิดชอบ</th>
                    <th className="py-3.5 px-4 font-bold">นักกีฬาในทีม</th>
                    <th className="py-3.5 px-4 font-bold text-center">สถานะ</th>
                    <th className="py-3.5 px-4 font-bold text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrations.map((r) => {
                    const ev = events.find((e) => e.id === r.event_id);
                    const sp = sports.find((s) => s.id === ev?.sport_id);
                    const teamMembers = regStudents.filter((rs) => rs.registration_id === r.id);
                    const teamMemberStudents = teamMembers
                      .map((tm) => students.find((st) => st.id === tm.student_id))
                      .filter(Boolean) as Student[];

                    const regCoachIdList = r.coach_ids && r.coach_ids.length > 0
                      ? r.coach_ids
                      : [r.coach_id, r.secondary_coach_id].filter(Boolean) as string[];

                    const regCoachObjs = regCoachIdList
                      .map((cid) => coaches.find((c) => c.id === cid))
                      .filter(Boolean) as Coach[];

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xl p-2 bg-slate-100 rounded-xl shrink-0">
                              {sp?.sport_icon || '🏅'}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {formatEventRegistrationDisplay(ev?.event_name || 'รายการแข่งขัน', ev?.grade, sp?.sport_name, ev?.gender)}
                                </span>
                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono font-semibold rounded text-[10px]">
                                  {ev?.event_code}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span>{sp?.sport_name}</span>
                                <span>•</span>
                                <span>โควตาผู้เล่น: สูงสุด {ev?.max_players || '-'} คน</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {regCoachObjs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {regCoachObjs.map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold"
                                >
                                  <span>👨‍🏫</span>
                                  <span>{c.prefix}{c.first_name} {c.last_name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">ยังไม่ระบุครูผู้ฝึกสอน</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-700 text-xs px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                                🏃‍♂️ {teamMembers.length} / {ev?.max_players || '-'} คน
                              </span>
                              {ev && teamMembers.length >= ev.max_players && (
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                                  ครบจำนวน
                                </span>
                              )}
                            </div>
                            {teamMemberStudents.length > 0 && (
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                {teamMemberStudents.slice(0, 3).map((st) => `${st.prefix}${st.first_name}`).join(', ')}
                                {teamMemberStudents.length > 3 && ` และอีก ${teamMemberStudents.length - 3} คน`}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            r.registration_status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.registration_status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.registration_status === 'APPROVED'
                              ? '✓ อนุมัติแล้ว'
                              : r.registration_status === 'REJECTED'
                              ? '✕ ไม่อนุมัติ'
                              : '⏳ ส่งรายชื่อแล้ว'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenManageTeam(r)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>👥</span>
                              <span>จัดการนักกีฬา/ครู</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRegisteredTeam(r.id, ev?.event_name)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                              title="ยกเลิกการส่งแข่งขันรายการนี้"
                            >
                              <span>🗑️</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {registrations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        ยังไม่มีรายการแข่งขันที่โรงเรียนส่งรายชื่อ สามารถเลือกชนิดกีฬาและรายการแข่งขันด้านบนเพื่อเริ่มลงทะเบียน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS DATABASE */}
      {activeTab === 'STUDENTS' && (() => {
        const filteredStudents = students.filter((st) => {
          const nameMatch = `${st.prefix} ${st.first_name} ${st.last_name} ${st.student_code || ''}`.toLowerCase().includes(studentSearchTerm.toLowerCase().trim());
          if (!nameMatch) return false;

          if (studentGradeFilter === 'ALL') return true;
          if (studentGradeFilter === 'KINDERGARTEN') return (st.grade || '').startsWith('อ.');
          if (studentGradeFilter === 'PRIMARY_LOWER') return ['ป.1', 'ป.2', 'ป.3'].includes(st.grade || '');
          if (studentGradeFilter === 'PRIMARY_UPPER') return ['ป.4', 'ป.5', 'ป.6'].includes(st.grade || '');
          if (studentGradeFilter === 'SECONDARY') return ['ม.1', 'ม.2', 'ม.3'].includes(st.grade || '');
          return st.grade === studentGradeFilter;
        });

        return (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  ฐานข้อมูลนักกีฬาของโรงเรียน ({students.length} คน)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  แอดมินโรงเรียนสามารถเพิ่มรายชื่อนักเรียนได้ทันที <b>โดยไม่ต้องกรอกรหัสประจำตัวนักเรียน</b> หรือใช้วิธีวางรายชื่อหลายคนพร้อมกัน
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" /> เพิ่มนักเรียนรายบุคคล
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatchStudentModal(true)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <span>📋</span> วางรายชื่อหลายคน (Batch Add)
                </button>
              </div>
            </div>

            {studentActionMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-medium animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{studentActionMessage}</span>
              </div>
            )}

            {/* Quick Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-1 items-center w-full sm:w-auto">
                <button
                  onClick={() => setStudentGradeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    studentGradeFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({students.length})
                </button>
                <button
                  onClick={() => setStudentGradeFilter('KINDERGARTEN')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    studentGradeFilter === 'KINDERGARTEN'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  อนุบาล (อ.1-3)
                </button>
                <button
                  onClick={() => setStudentGradeFilter('PRIMARY_LOWER')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    studentGradeFilter === 'PRIMARY_LOWER'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ประถมต้น (ป.1-3)
                </button>
                <button
                  onClick={() => setStudentGradeFilter('PRIMARY_UPPER')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    studentGradeFilter === 'PRIMARY_UPPER'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ประถมปลาย (ป.4-6)
                </button>
                <button
                  onClick={() => setStudentGradeFilter('SECONDARY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    studentGradeFilter === 'SECONDARY'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  มัธยมศึกษา (ม.1-3)
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อ-นามสกุล..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3.5 px-4 font-bold">#</th>
                    <th className="py-3.5 px-4 font-bold">ชื่อ - นามสกุล</th>
                    <th className="py-3.5 px-4 font-bold">เพศ</th>
                    <th className="py-3.5 px-4 font-bold">ระดับชั้น</th>
                    <th className="py-3.5 px-4 font-bold">วันเกิด</th>
                    <th className="py-3.5 px-4 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            st.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {st.gender === 'MALE' ? '👦' : '👧'}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 text-xs">
                              {st.prefix} {st.first_name} {st.last_name}
                            </span>
                            {st.student_code && (
                              <span className="block text-[10px] text-slate-400 font-mono">
                                รหัส: {st.student_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          st.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {st.gender === 'MALE' ? 'ชาย' : 'หญิง'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[11px]">
                          {st.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatThaiDate(st.birth_date)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingStudent(st)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(st)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            🗑️ ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        {students.length === 0
                          ? 'ยังไม่มีรายชื่อนักเรียนในระบบ สามารถกดปุ่ม "เพิ่มนักเรียนรายบุคคล" หรือ "วางรายชื่อหลายคน" ด้านบน'
                          : 'ไม่พบข้อมูลนักเรียนที่ตรงกับคำค้นหาหรือระดับชั้นที่เลือก'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: COACHES */}
      {activeTab === 'COACHES' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                ทำเนียบครูผู้ฝึกสอนและผู้ควบคุมทีม ({coaches.length} คน)
              </h2>
              <p className="text-xs text-slate-500">
                รายชื่อครูผู้ฝึกสอนที่จะปรากฏในการสมัครแข่งขัน เกียรติบัตร และเอกสารสรุปผลการแข่งขัน
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setCoachModalTab('SINGLE');
                  setShowAddCoachModal(true);
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition border border-indigo-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> เพิ่มทีละคน
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoachModalTab('BATCH');
                  setShowAddCoachModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>📋</span> วางรายชื่อหลายคนพร้อมกัน
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {coaches.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 transition space-y-3 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      👨‍🏫
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm font-['Prompt']">
                      {c.prefix}{c.first_name} {c.last_name}
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-700 font-semibold pl-9">ตำแหน่ง: {c.position || 'ครูผู้ฝึกสอน'}</p>
                  <p className="text-xs text-slate-500 pl-9">📞 {c.phone || '-'}</p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`ยืนยันลบครู ${c.prefix}${c.first_name} ${c.last_name}?`)) {
                        sportsStore.deleteCoach(c.id);
                      }
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            ))}
            {coaches.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <span className="text-3xl block mb-2">👨‍🏫</span>
                <p>ยังไม่มีรายชื่อครูผู้ฝึกสอนในระบบ สามารถกดปุ่ม "เพิ่มทีละคน" หรือ "วางรายชื่อหลายคนพร้อมกัน" ด้านบน</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CERTIFICATES & RESULTS SUMMARY */}
      {activeTab === 'CERTIFICATES' && (() => {
        const medalSummaries = sportsStore.getSchoolMedalSummary();
        const schoolMedal = medalSummaries.find((m) => m.school_id === school.id);
        const schoolRank = medalSummaries.findIndex((m) => m.school_id === school.id) + 1;
        const results = sportsStore.getResults().filter((r) => r.school_id === school.id && r.status === 'CONFIRMED');

        const filteredCerts = certificates.filter((c) => {
          const matchesType =
            certTypeFilter === 'ALL' ||
            (certTypeFilter === 'STUDENT' && c.recipient_type === 'STUDENT') ||
            (certTypeFilter === 'COACH' && c.recipient_type === 'COACH');
          const matchesSearch =
            !certSearchTerm.trim() ||
            c.recipient_name.toLowerCase().includes(certSearchTerm.toLowerCase()) ||
            c.event_name.toLowerCase().includes(certSearchTerm.toLowerCase()) ||
            c.certificate_no.toLowerCase().includes(certSearchTerm.toLowerCase()) ||
            c.award.toLowerCase().includes(certSearchTerm.toLowerCase());
          return matchesType && matchesSearch;
        });

        return (
          <div className="space-y-6">
            {/* School Medals & Results Summary Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-500" />
                    สรุปผลงานเหรียญรางวัลของสถานศึกษา
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    ผลงานการแข่งขันกีฬาและกรีฑานักเรียน กลุ่มโรงเรียนสว่างสูงกระสัง
                  </p>
                </div>
                {schoolMedal && schoolRank > 0 && (
                  <div className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 bg-indigo-50 text-indigo-900 rounded-2xl border border-indigo-100">
                    <span className="text-xs text-slate-500">อันดับกลุ่มโรงเรียน:</span>
                    <span className="text-lg font-black font-['Kanit'] text-indigo-700">
                      #{schoolRank}
                    </span>
                  </div>
                )}
              </div>

              {/* Medal Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
                  <span className="text-2xl block mb-1">🥇</span>
                  <div className="text-2xl font-black font-['Kanit'] text-amber-900">
                    {schoolMedal?.gold || 0}
                  </div>
                  <div className="text-xs font-bold text-amber-800">เหรียญทอง</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-300 text-center">
                  <span className="text-2xl block mb-1">🥈</span>
                  <div className="text-2xl font-black font-['Kanit'] text-slate-800">
                    {schoolMedal?.silver || 0}
                  </div>
                  <div className="text-xs font-bold text-slate-700">เหรียญเงิน</div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-900/10 border border-amber-900/20 text-center">
                  <span className="text-2xl block mb-1">🥉</span>
                  <div className="text-2xl font-black font-['Kanit'] text-amber-950">
                    {schoolMedal?.bronze || 0}
                  </div>
                  <div className="text-xs font-bold text-amber-900">เหรียญทองแดง</div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
                  <span className="text-2xl block mb-1">🏆</span>
                  <div className="text-2xl font-black font-['Kanit'] text-indigo-950">
                    {schoolMedal?.total || 0}
                  </div>
                  <div className="text-xs font-bold text-indigo-800">รวมเหรียญรางวัล</div>
                </div>
              </div>

              {/* Winning Results Table */}
              {results.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    รายการแข่งขันที่ได้ผลการแข่งขันอย่างเป็นทางการ ({results.length} รายการ)
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">รายการแข่งขัน</th>
                          <th className="py-3 px-4">ผลการแข่งขัน</th>
                          <th className="py-3 px-4">เหรียญรางวัล</th>
                          <th className="py-3 px-4">สถิติ/คะแนน</th>
                          <th className="py-3 px-4 text-center">สถานะเกียรติบัตร</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.map((res) => {
                          const ev = events.find((e) => e.id === res.event_id);
                          const sp = sports.find((s) => s.id === ev?.sport_id);
                          return (
                            <tr key={res.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {sp?.sport_icon} {ev?.event_name}
                              </td>
                              <td className="py-3 px-4 font-bold text-indigo-700">
                                {res.rank === 1 && 'ชนะเลิศ (อันดับ 1)'}
                                {res.rank === 2 && 'รองชนะเลิศ อันดับ 1 (อันดับ 2)'}
                                {res.rank === 3 && 'รองชนะเลิศ อันดับ 2 (อันดับ 3)'}
                                {res.rank > 3 && `อันดับที่ ${res.rank}`}
                              </td>
                              <td className="py-3 px-4">
                                {res.medal === 'GOLD' && (
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                    🥇 เหรียญทอง
                                  </span>
                                )}
                                {res.medal === 'SILVER' && (
                                  <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                                    🥈 เหรียญเงิน
                                  </span>
                                )}
                                {res.medal === 'BRONZE' && (
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                                    🥉 เหรียญทองแดง
                                  </span>
                                )}
                                {res.medal === 'NONE' && (
                                  <span className="text-slate-500 font-medium">เข้าร่วมการแข่งขัน</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {res.score || res.note || '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ออกเกียรติบัตรแล้ว
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Certificate Downloads Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-600" />
                    ศูนย์ดาวน์โหลดและพิมพ์เกียรติบัตร ({certificates.length} ฉบับ)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    เกียรติบัตรพร้อม QR Code ตรวจสอบความถูกต้อง สามารถดาวน์โหลด ดูตัวอย่าง หรือสั่งพิมพ์ได้ทันที
                  </p>
                </div>

                {certificates.length > 0 && (
                  <button
                    onClick={() => {
                      if (certificates[0]) {
                        setViewingCert(certificates[0]);
                      }
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto"
                  >
                    <Printer className="w-4 h-4" /> พิมพ์ / ดาวน์โหลดเกียรติบัตรทั้งหมด
                  </button>
                )}
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setCertTypeFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      certTypeFilter === 'ALL'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด ({certificates.length})
                  </button>
                  <button
                    onClick={() => setCertTypeFilter('STUDENT')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      certTypeFilter === 'STUDENT'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    นักเรียน ({certificates.filter((c) => c.recipient_type === 'STUDENT').length})
                  </button>
                  <button
                    onClick={() => setCertTypeFilter('COACH')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      certTypeFilter === 'COACH'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ครูผู้ฝึกสอน ({certificates.filter((c) => c.recipient_type === 'COACH').length})
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={certSearchTerm}
                    onChange={(e) => setCertSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อผู้รับ, รายการ, เลขที่..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Certificate Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredCerts.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-linear-to-b from-white to-amber-50/20 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-2">
                        <span className="font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                          {cert.certificate_no}
                        </span>
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          พร้อมดาวน์โหลด
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm font-['Kanit'] group-hover:text-indigo-700 transition-colors">
                        {cert.recipient_name}
                      </h4>
                      <p className="text-xs text-amber-900 font-bold mt-1">{cert.award}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{cert.event_name}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {cert.recipient_type === 'STUDENT' ? '🎒 นักเรียน' : '👨‍🏫 ครูผู้ฝึกสอน'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingCert(cert)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5" /> ดาวน์โหลด / พิมพ์
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredCerts.length === 0 && certificates.length > 0 && (
                  <div className="col-span-full text-center py-10 text-slate-400 text-xs">
                    ไม่พบเกียรติบัตรที่ตรงกับคำค้นหา
                  </div>
                )}

                {certificates.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500 space-y-2">
                    <Award className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-medium text-sm">ยังไม่มีเกียรติบัตรที่ออกให้สำหรับโรงเรียนนี้</p>
                    <p className="text-xs text-slate-400">
                      เกียรติบัตรจะออกให้อัตโนมัติเมื่อฝ่ายจัดการแข่งขัน/กรรมการยืนยันผลการแข่งขัน
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: SCHOOL_PROFILE */}
      {activeTab === 'SCHOOL_PROFILE' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                  <SchoolIcon className="w-6 h-6 text-indigo-600" />
                  จัดการและแก้ไขข้อมูลสถานศึกษา
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ปรับปรุงข้อมูลผู้บริหารสถานศึกษา ที่อยู่ เบอร์โทรศัพท์ และโลโก้โรงเรียน เพื่อความถูกต้องในการออกเกียรติบัตรและเอกสารสรุปผล
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-mono font-medium">
                  SMIS: {school.smis_code || school.school_code}
                </span>
              </div>
            </div>

            {schoolProfileSaveMessage && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{schoolProfileSaveMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveSchoolProfile} className="mt-6 space-y-6">
              {/* Live Preview Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={schoolFormData.logo || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150'}
                  alt="ตัวอย่างโลโก้"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm bg-white shrink-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150';
                  }}
                />
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase">
                    ตัวอย่างการแสดงผล
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 font-['Kanit'] mt-1 truncate">
                    {schoolFormData.school_name || 'ชื่อโรงเรียน'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    ผู้อำนวยการ: <span className="text-slate-900">{schoolFormData.director_name || 'ยังไม่ระบุชื่อผู้อำนวยการ'}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    ที่อยู่: {schoolFormData.address || '-'} | โทร. {schoolFormData.phone || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    ชื่อเต็มสถานศึกษา <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolFormData.school_name || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, school_name: e.target.value })}
                    placeholder="เช่น โรงเรียนบ้านหนองหว้า"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">ใช้พิมพ์ในเกียรติบัตรและรายงานผล</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    ชื่อย่อสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={schoolFormData.short_name || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, short_name: e.target.value })}
                    placeholder="เช่น รร.บ้านหนองหว้า หรือ บ้านหนองหว้า"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">ใช้แสดงในตารางเหรียญรางวัลและตารางคะแนน</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    ชื่อ-นามสกุล ผู้อำนวยการโรงเรียน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolFormData.director_name || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, director_name: e.target.value })}
                    placeholder="เช่น นายสมเกียรติ สว่างวงศ์"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-medium"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">ชื่อผู้บริหารสำหรับเอกสารทางการและการลงนาม</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    เบอร์โทรศัพท์ติดต่อสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={schoolFormData.phone || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, phone: e.target.value })}
                    placeholder="เช่น 044-689123 หรือ 081-xxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    ที่อยู่ / ที่ตั้งสถานศึกษา
                  </label>
                  <textarea
                    rows={2}
                    value={schoolFormData.address || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, address: e.target.value })}
                    placeholder="เช่น หมู่ 4 ต.หนองหว้า อ.กระสัง จ.บุรีรัมย์ 31160"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    URL รูปภาพตราสัญลักษณ์ / โลโก้โรงเรียน
                  </label>
                  <input
                    type="url"
                    value={schoolFormData.logo || ''}
                    onChange={(e) => setSchoolFormData({ ...schoolFormData, logo: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] text-slate-400">เลือกโลโก้ตัวอย่าง:</span>
                    <button
                      type="button"
                      onClick={() => setSchoolFormData({ ...schoolFormData, logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150' })}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium"
                    >
                      ตรามาตรฐาน 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolFormData({ ...schoolFormData, logo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150' })}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium"
                    >
                      ตรามาตรฐาน 2
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchoolFormData({ ...schoolFormData, logo: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150' })}
                      className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium"
                    >
                      ตรามาตรฐาน 3
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> บันทึกการเปลี่ยนแปลงข้อมูลโรงเรียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Student Modal (No ID Required) */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                  <span>👦</span> เพิ่มข้อมูลนักเรียนใหม่
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{school.school_name}</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                ✓ ไม่ต้องใส่รหัสประจำตัว
              </span>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900">
              💡 <b>คำแนะนำ:</b> กรอกเฉพาะชื่อ นามสกุล และเลือกระดับชั้น ระบบจะออกรหัสประจำตัวนักกีฬาให้อัตโนมัติ
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">คำนำหน้า</label>
                  <select
                    value={newStudent.prefix}
                    onChange={(e) => setNewStudent({ ...newStudent, prefix: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="เด็กชาย">เด็กชาย</option>
                    <option value="เด็กหญิง">เด็กหญิง</option>
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-semibold block mb-1 text-slate-700">ชื่อ <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                    placeholder="เช่น ธีรดนย์"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700">นามสกุล <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newStudent.last_name}
                  onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                  placeholder="เช่น สายสืบวงษ์"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">เพศ</label>
                  <select
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as 'MALE' | 'FEMALE' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="MALE">ชาย</option>
                    <option value="FEMALE">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">ระดับชั้น <span className="text-rose-500">*</span></label>
                  <select
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
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

              <div>
                <label className="font-semibold block mb-1 text-slate-700">วันเกิด (โดยประมาณ หรือระบุวันจริง)</label>
                <input
                  type="date"
                  value={newStudent.birth_date}
                  onChange={(e) => setNewStudent({ ...newStudent, birth_date: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <span>➕</span> บันทึกข้อมูลนักเรียน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Add Students Modal */}
      {showBatchStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                  <span>📋</span> วางรายชื่อนักเรียนหลายคนพร้อมกัน (Batch Add)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{school.school_name}</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                ⚡ รวดเร็ว นำเข้าทั้งห้อง
              </span>
            </div>

            <form onSubmit={handleBatchCreateStudents} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700">ระดับชั้นของนักเรียนชุดนี้ <span className="text-rose-500">*</span></label>
                <select
                  value={batchGrade}
                  onChange={(e) => setBatchGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
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

              <div>
                <label className="font-semibold block mb-1 text-slate-700">
                  วางรายชื่อนักเรียน (บรรทัดละ 1 คน สามารถใส่หรือไม่ใส่คำนำหน้าก็ได้) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={7}
                  required
                  value={batchNamesText}
                  onChange={(e) => setBatchNamesText(e.target.value)}
                  placeholder="ตัวอย่างการวางรายชื่อ:&#10;ด.ช.ธนภัทร สุขใจ&#10;ด.ญ.กมลวรรณ บุญมี&#10;เด็กชายศุภกิจ กองแก้ว&#10;เด็กหญิงพิมพ์ชนก รัตนวงศ์&#10;วิทวัส ชัยชนะ"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchStudentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <span>⚡</span> นำเข้ารายชื่อทั้งหมดทันที
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                  <span>✏️</span> แก้ไขข้อมูลนักเรียน
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{school.school_name}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">คำนำหน้า</label>
                  <select
                    value={editingStudent.prefix}
                    onChange={(e) => setEditingStudent({ ...editingStudent, prefix: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="เด็กชาย">เด็กชาย</option>
                    <option value="เด็กหญิง">เด็กหญิง</option>
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-semibold block mb-1 text-slate-700">ชื่อ <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={editingStudent.first_name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, first_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700">นามสกุล <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editingStudent.last_name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, last_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">เพศ</label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as 'MALE' | 'FEMALE' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="MALE">ชาย</option>
                    <option value="FEMALE">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">ระดับชั้น <span className="text-rose-500">*</span></label>
                  <select
                    value={editingStudent.grade}
                    onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
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

              <div>
                <label className="font-semibold block mb-1 text-slate-700">วันเกิด</label>
                <input
                  type="date"
                  value={editingStudent.birth_date}
                  onChange={(e) => setEditingStudent({ ...editingStudent, birth_date: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <span>💾</span> บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Coach Modal (Single / Batch Add) */}
      {showAddCoachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                  <span>👨‍🏫</span> เพิ่มครูผู้ฝึกสอน / ผู้ควบคุมทีม
                </h3>
                <p className="text-[11px] text-slate-500">{school.school_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCoachModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => setCoachModalTab('SINGLE')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  coachModalTab === 'SINGLE'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>➕</span> เพิ่มรายบุคคล (เดี่ยว)
              </button>
              <button
                type="button"
                onClick={() => setCoachModalTab('BATCH')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  coachModalTab === 'BATCH'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋</span> วางรายชื่อหลายคนพร้อมกัน (Batch Add)
              </button>
            </div>

            {coachModalTab === 'SINGLE' ? (
              <form onSubmit={handleCreateCoach} className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700">คำนำหน้า</label>
                    <select
                      value={newCoach.prefix}
                      onChange={(e) => setNewCoach({ ...newCoach, prefix: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                      <option value="ว่าที่ ร.ต.หญิง">ว่าที่ ร.ต.หญิง</option>
                      <option value="ดร.">ดร.</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700">ชื่อ <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="ชื่อ"
                      value={newCoach.first_name}
                      onChange={(e) => setNewCoach({ ...newCoach, first_name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700">นามสกุล <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="นามสกุล"
                      value={newCoach.last_name}
                      onChange={(e) => setNewCoach({ ...newCoach, last_name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700">ตำแหน่ง</label>
                    <input
                      type="text"
                      value={newCoach.position}
                      onChange={(e) => setNewCoach({ ...newCoach, position: e.target.value })}
                      placeholder="เช่น ครูผู้ฝึกสอน / ผู้ควบคุมทีม"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      value={newCoach.phone}
                      onChange={(e) => setNewCoach({ ...newCoach, phone: e.target.value })}
                      placeholder="08x-xxxxxxx"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddCoachModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md">
                    ➕ บันทึกข้อมูลครูผู้ฝึกสอน
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBatchCreateCoach} className="space-y-3 text-xs">
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 text-indigo-900 text-[11px] leading-relaxed">
                  <span className="font-bold">⚡ วางรายชื่อครูผู้ฝึกสอนได้หลายคน:</span> ระบบจะตัดลำดับตัวเลข และแยกคำนำหน้าชื่อ-นามสกุลให้อัตโนมัติ (เช่น นาย, นาง, นางสาว, ว่าที่ ร.ต., ดร., อาจารย์)
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700">ตำแหน่งเริ่มต้นของครูชุดนี้</label>
                  <input
                    type="text"
                    value={batchCoachPosition}
                    onChange={(e) => setBatchCoachPosition(e.target.value)}
                    placeholder="ครูผู้ฝึกสอน"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700">
                    วางรายชื่อครูผู้ฝึกสอน (บรรทัดละ 1 คน) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={batchCoachText}
                    onChange={(e) => setBatchCoachText(e.target.value)}
                    placeholder="ตัวอย่างการวางรายชื่อ:&#10;นายสมศักดิ์ มีสุข&#10;นางสาววิภาดา รัตนวงศ์&#10;นางปราณี แสนดี&#10;ว่าที่ ร.ต. เอกชัย วงศ์ษา&#10;ดร.ธีรพงษ์ แก้วมณี"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddCoachModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5">
                    <span>⚡</span> นำเข้ารายชื่อครูทั้งหมดทันที
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {viewingCert && (
        <CertificateModal
          certificate={viewingCert}
          onClose={() => setViewingCert(null)}
        />
      )}

      {/* Manage Team (Athletes & Coaches) Modal */}
      {managingRegistration && (() => {
        const reg = managingRegistration;
        const ev = events.find((e) => e.id === reg.event_id);
        const sp = sports.find((s) => s.id === ev?.sport_id);

        const currentAthletes = manageStudentIds
          .map((sId) => students.find((st) => st.id === sId))
          .filter(Boolean) as Student[];

        // Filter available students from school DB that are not yet in this team
        const availableStudents = students.filter((st) => {
          if (manageStudentIds.includes(st.id)) return false;
          const nameMatch = `${st.prefix} ${st.first_name} ${st.last_name} ${st.student_code || ''}`
            .toLowerCase()
            .includes(manageStudentSearch.toLowerCase().trim());
          if (!nameMatch) return false;

          if (manageGradeFilter === 'ALL') return true;
          if (manageGradeFilter === 'KINDERGARTEN') return (st.grade || '').startsWith('อ.');
          if (manageGradeFilter === 'PRIMARY_LOWER') return ['ป.1', 'ป.2', 'ป.3'].includes(st.grade || '');
          if (manageGradeFilter === 'PRIMARY_UPPER') return ['ป.4', 'ป.5', 'ป.6'].includes(st.grade || '');
          if (manageGradeFilter === 'SECONDARY') return ['ม.1', 'ม.2', 'ม.3'].includes(st.grade || '');
          return st.grade === manageGradeFilter;
        });

        const maxPlayers = ev?.max_players || 999;
        const isFull = manageStudentIds.length >= maxPlayers;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-fadeIn">
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 bg-white/15 rounded-2xl shrink-0">
                    {sp?.sport_icon || '🏅'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-blue-100 mb-0.5">
                      <span className="font-semibold">{sp?.sport_name}</span>
                      <span>•</span>
                      <span className="font-mono bg-white/20 px-2 py-0.2 rounded">{ev?.event_code}</span>
                      <span>•</span>
                      <span>โควตาสูงสุด: {maxPlayers} คน</span>
                    </div>
                    <h3 className="text-lg font-bold font-['Kanit']">{formatEventRegistrationDisplay(ev?.event_name || '', ev?.grade, sp?.sport_name)}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManagingRegistration(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
                
                {/* 1. COACHES SECTION */}
                <div className="p-4 sm:p-5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm">👨‍🏫</span>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm font-['Kanit']">
                          ครูผู้ฝึกสอนที่รับผิดชอบรายการนี้ ({manageCoachIds.length} คน)
                        </h4>
                        <p className="text-[11px] text-slate-500">ติ๊กเลือกครูที่รับผิดชอบทีมนี้ สามารถเลือกได้หลายคน หรือกดเพิ่มครูใหม่ได้ทันที</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAllManageCoaches(true)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                      >
                        ✓ เลือกทุกคน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectAllManageCoaches(false)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                      >
                        ✕ ล้างการเลือก
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCoachModal(true)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> เพิ่มครูใหม่
                      </button>
                    </div>
                  </div>

                  {/* Coach Checkbox Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {coaches.map((c) => {
                      const isSelected = manageCoachIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleManageCoach(c.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                            />
                            <div>
                              <p className="text-xs">{c.prefix}{c.first_name} {c.last_name}</p>
                              <span className="text-[10px] text-slate-500 font-normal">{c.position}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-emerald-700 text-xs">✓</span>
                          )}
                        </div>
                      );
                    })}
                    {coaches.length === 0 && (
                      <div className="col-span-full py-4 text-center text-slate-400">
                        ยังไม่มีรายชื่อครูผู้ฝึกสอนในระบบ กดปุ่ม "+ เพิ่มครูใหม่" ด้านบนเพื่อเพิ่มครู
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. CURRENT ROSTER ATHLETES */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm">🏃‍♂️</span>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm font-['Kanit'] flex items-center gap-2">
                          <span>รายชื่อนักกีฬาในทีมปัจจุบัน</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isFull ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {manageStudentIds.length} / {maxPlayers} คน {isFull ? '(เต็มโควตา)' : ''}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500">สามารถกดปุ่ม "ถอดออก" เพื่อนำนักเรียนออกจากทีมนี้ได้</p>
                      </div>
                    </div>
                  </div>

                  {/* List of current team athletes */}
                  {currentAthletes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                      {currentAthletes.map((st, idx) => (
                        <div
                          key={st.id}
                          className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 text-xs">
                                {st.prefix}{st.first_name} {st.last_name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                ชั้น {st.grade} ({st.gender === 'MALE' ? 'ชาย' : 'หญิง'})
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleManageStudent(st.id)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0"
                            title="ถอดออกจากทีม"
                          >
                            ❌ ถอด
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                      ยังไม่มีนักกีฬาในทีมรายการนี้ กรุณาเลือกนักเรียนจากส่วนด้านล่างเพื่อเพิ่มเข้าทีม
                    </div>
                  )}
                </div>

                {/* 3. ADD ATHLETES TO THIS TEAM */}
                <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg text-sm">➕</span>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm font-['Kanit']">
                          เพิ่มนักเรียนจากฐานข้อมูลเข้าสู่รายการนี้
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {isFull
                            ? 'ทีมนี้มีนักกีฬาเต็มโควตาสูงสุดแล้ว หากต้องการเปลี่ยนคน กรุณากดถอดนักกีฬาคนเดิมออกก่อน'
                            : `สามารถเลือกเพิ่มได้อีก ${maxPlayers - manageStudentIds.length} คน`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddStudentModal(true)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> เพิ่มนักเรียนใหม่เข้าระบบ
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search for available students */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                      {[
                        { id: 'ALL', label: 'ทั้งหมด' },
                        { id: 'KINDERGARTEN', label: 'อนุบาล' },
                        { id: 'PRIMARY_LOWER', label: 'ป.1-3' },
                        { id: 'PRIMARY_UPPER', label: 'ป.4-6' },
                        { id: 'SECONDARY', label: 'ม.1-3' }
                      ].map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setManageGradeFilter(g.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                            manageGradeFilter === g.id
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={manageStudentSearch}
                        onChange={(e) => setManageStudentSearch(e.target.value)}
                        placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                      />
                    </div>
                  </div>

                  {/* Available Students Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                    {availableStudents.map((st) => (
                      <div
                        key={st.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 hover:border-blue-300 transition-colors shadow-2xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            {st.prefix}{st.first_name} {st.last_name}
                          </p>
                          <span className="text-[10px] text-slate-500 font-normal">
                            ชั้น {st.grade} ({st.gender === 'MALE' ? 'ชาย' : 'หญิง'})
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isFull}
                          onClick={() => handleToggleManageStudent(st.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                            isFull
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                          }`}
                        >
                          <span>➕</span> เพิ่ม
                        </button>
                      </div>
                    ))}

                    {availableStudents.length === 0 && (
                      <div className="col-span-full py-6 text-center text-slate-400">
                        {students.length === 0
                          ? 'ยังไม่มีรายชื่อนักเรียนในฐานข้อมูลโรงเรียน กรุณากดปุ่ม "+ เพิ่มนักเรียนใหม่เข้าระบบ"'
                          : 'ไม่พบนักเรียนที่ตรงกับเงื่อนไขค้นหา หรือนักเรียนทุกคนถูกเลือกเข้าทีมแล้ว'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteRegisteredTeam(reg.id, ev?.event_name)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>🗑️</span> ยกเลิกการส่งรายการนี้
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManagingRegistration(null)}
                    className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveManageTeam}
                    className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>บันทึกการเปลี่ยนแปลง</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
