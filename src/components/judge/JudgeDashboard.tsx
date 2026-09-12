import React, { useState } from 'react';
import { sportsStore } from '../../services/store';
import { Event, Sport, School, Result, MatchReport } from '../../types';
import confetti from 'canvas-confetti';
import {
  Trophy,
  CheckCircle2,
  Clock,
  Save,
  AlertCircle,
  Sparkles,
  Smartphone,
  ChevronRight,
  Medal,
  Users,
  Send,
  Trash2,
  Calendar,
  Radio,
  Flame,
  Activity
} from 'lucide-react';
import { sortEventsList } from '../../utils/thaiFormatter';

export const JudgeDashboard: React.FC = () => {
  const sports = sportsStore.getSports();
  const events = sportsStore.getEvents();
  const schools = sportsStore.getSchools();
  const results = sportsStore.getResults();
  const registrations = sportsStore.getRegistrations();
  const [matchReports, setMatchReports] = useState<MatchReport[]>(sportsStore.getMatchReports());

  // Active Main Tab: 'MATCH_REPORT' vs 'OFFICIAL_MEDAL'
  const [activeConsoleTab, setActiveConsoleTab] = useState<'MATCH_REPORT' | 'OFFICIAL_MEDAL'>('MATCH_REPORT');

  // --- 1. State for Daily Match Report ---
  const [reportSportId, setReportSportId] = useState(sports[0]?.id || '');
  const [reportEventName, setReportEventName] = useState('ฟุตบอล 7 คน ชาย');
  const [winnerSchoolId, setWinnerSchoolId] = useState('');
  const [loserSchoolId, setLoserSchoolId] = useState('');
  const [winnerScore, setWinnerScore] = useState<number | ''>(3);
  const [loserScore, setLoserScore] = useState<number | ''>(0);
  const [matchRound, setMatchRound] = useState('รอบแรก');
  const [matchStatus, setMatchStatus] = useState<'COMPLETED' | 'LIVE'>('COMPLETED');
  const [reporterName, setReporterName] = useState('เจ้าหน้าที่รายงานผล / กรรมการตัดสิน');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');

  // --- 2. State for Official Medal Placement ---
  const [selectedSportId, setSelectedSportId] = useState(sports[0]?.id || '');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [rank1SchoolId, setRank1SchoolId] = useState('');
  const [rank2SchoolId, setRank2SchoolId] = useState('');
  const [rank3SchoolId, setRank3SchoolId] = useState('');
  const [scoreText, setScoreText] = useState('');
  const [matchNote, setMatchNote] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [medalError, setMedalError] = useState('');

  const currentSport = sports.find((s) => s.id === selectedSportId);
  const filteredEvents = sortEventsList(events.filter((e) => e.sport_id === selectedSportId));
  const currentEvent = events.find((e) => e.id === selectedEventId);

  // Participating schools in selected medal event
  const registeredSchoolIds = registrations
    .filter((r) => r.event_id === selectedEventId && r.registration_status === 'APPROVED')
    .map((r) => r.school_id);
  const candidateSchools = schools.filter((s) => registeredSchoolIds.includes(s.id));

  // --- Handlers for Match Report ---
  const handleAddMatchReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportError('');

    if (!winnerSchoolId) {
      setReportError('กรุณาเลือกฝ่ายชนะ (โรงเรียนที่ 1)');
      return;
    }
    if (!loserSchoolId) {
      setReportError('กรุณาเลือกฝ่ายแพ้ (โรงเรียนที่ 2)');
      return;
    }
    if (winnerSchoolId === loserSchoolId) {
      setReportError('ฝ่ายชนะและฝ่ายแพ้ต้องไม่ใช่โรงเรียนเดียวกัน');
      return;
    }
    if (winnerScore === '' || loserScore === '') {
      setReportError('กรุณาระบุผลสกอร์ของทั้งสองฝ่าย');
      return;
    }

    const winnerSchool = schools.find((s) => s.id === winnerSchoolId);
    const loserSchool = schools.find((s) => s.id === loserSchoolId);
    const selectedSport = sports.find((s) => s.id === reportSportId);

    const isDraw = Number(winnerScore) === Number(loserScore);
    const summary = isDraw
      ? `${winnerSchool?.school_name} เสมอ ${loserSchool?.school_name} ${winnerScore} ต่อ ${loserScore}`
      : `${winnerSchool?.school_name} ชนะ ${loserSchool?.school_name} ${winnerScore} ต่อ ${loserScore}`;

    const newReport: MatchReport = {
      id: 'mr_' + Date.now(),
      competition_id: 'comp_2026_001',
      sport_id: reportSportId,
      sport_name: selectedSport?.sport_name || 'กีฬา',
      event_name: reportEventName || selectedSport?.sport_name || 'การแข่งขัน',
      team_1_school_id: winnerSchoolId,
      team_1_school_name: winnerSchool?.school_name || '',
      team_1_score: Number(winnerScore),
      team_2_school_id: loserSchoolId,
      team_2_school_name: loserSchool?.school_name || '',
      team_2_score: Number(loserScore),
      winner_school_id: isDraw ? undefined : winnerSchoolId,
      match_date: new Date().toISOString().split('T')[0],
      match_time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      round_name: matchRound,
      summary_text: summary,
      reporter_name: reporterName,
      status: matchStatus,
      created_at: new Date().toISOString()
    };

    sportsStore.addMatchReport(newReport);
    setMatchReports(sportsStore.getMatchReports());

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 }
    });

    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 4000);
  };

  const handleDeleteMatchReport = (id: string) => {
    if (window.confirm('ยืนยันลบการรายงานผลการแข่งขันนี้?')) {
      sportsStore.deleteMatchReport(id);
      setMatchReports(sportsStore.getMatchReports());
    }
  };

  // --- Handlers for Official Medal Placement ---
  const handleSelectEvent = (ev: Event) => {
    setSelectedEventId(ev.id);
    setMedalError('');
    setSaveSuccess(false);

    const existing = results.filter((r) => r.event_id === ev.id);
    const r1 = existing.find((r) => r.rank === 1);
    const r2 = existing.find((r) => r.rank === 2);
    const r3 = existing.find((r) => r.rank === 3);

    setRank1SchoolId(r1?.school_id || '');
    setRank2SchoolId(r2?.school_id || '');
    setRank3SchoolId(r3?.school_id || '');
    setScoreText(r1?.score || '');
    setMatchNote(r1?.note || '');
  };

  const handleSaveMedals = (e: React.FormEvent) => {
    e.preventDefault();
    setMedalError('');

    if (!selectedEventId) {
      setMedalError('กรุณาเลือกรายการแข่งขัน');
      return;
    }
    if (!rank1SchoolId) {
      setMedalError('กรุณาเลือกโรงเรียนผู้ชนะเลิศ (เหรียญทอง 🥇)');
      return;
    }
    if (
      rank1SchoolId === rank2SchoolId ||
      (rank3SchoolId && (rank1SchoolId === rank3SchoolId || rank2SchoolId === rank3SchoolId))
    ) {
      setMedalError('โรงเรียนที่ได้รับรางวัลแต่ละอันดับต้องไม่ซ้ำกัน');
      return;
    }

    const placements: Array<{
      school_id: string;
      rank: 1 | 2 | 3 | 4;
      award: string;
      medal: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';
      score?: string;
      note?: string;
    }> = [
      {
        school_id: rank1SchoolId,
        rank: 1,
        award: 'ชนะเลิศ',
        medal: 'GOLD',
        score: scoreText,
        note: matchNote
      }
    ];

    if (rank2SchoolId) {
      placements.push({
        school_id: rank2SchoolId,
        rank: 2,
        award: 'รองชนะเลิศอันดับ 1',
        medal: 'SILVER',
        score: scoreText,
        note: matchNote
      });
    }

    if (rank3SchoolId) {
      placements.push({
        school_id: rank3SchoolId,
        rank: 3,
        award: 'รองชนะเลิศอันดับ 2',
        medal: 'BRONZE',
        score: scoreText,
        note: matchNote
      });
    }

    sportsStore.recordEventResult(selectedEventId, placements);

    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 }
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-linear-to-r from-purple-950 via-indigo-900 to-purple-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-400/30">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-['Kanit']">
              ระบบรายงานผลการแข่งขันและกรรมการตัดสิน (Referee & Live Score Console)
            </h1>
            <p className="text-xs md:text-sm text-purple-200 mt-0.5">
              รายงานผลการแข่งขันรายวันแบบ Real-time ให้ประชาชนทั่วไปทราบ และบันทึกสรุปเหรียญรางวัลทางการ
            </p>
          </div>
        </div>
      </div>

      {/* Main Console Tab Bar */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveConsoleTab('MATCH_REPORT')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeConsoleTab === 'MATCH_REPORT'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>รายงานผลการแข่งขันประจำวัน (Live Match Scores)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveConsoleTab('OFFICIAL_MEDAL')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeConsoleTab === 'OFFICIAL_MEDAL'
              ? 'bg-indigo-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>บันทึกสรุปเหรียญรางวัลทางการ (Medals & Certs)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: DAILY MATCH REPORT (FAST 2-SCORE SIMPLE FORM) */}
      {/* ======================================================== */}
      {activeConsoleTab === 'MATCH_REPORT' && (
        <div className="space-y-6">
          {/* Match Report Input Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                ป้อนข้อมูลรายงานผลการแข่งขัน (ใช้งานง่าย เลือกโรงเรียนและใส่คะแนน)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                เช่น วันนี้ ฟุตบอล: โรงเรียนบ้านสว่าง ชนะ โรงเรียนบ้านหนองหว้า 3 ต่อ 0 (จะแสดงบนหน้าแรกของเว็บไซต์ทันที)
              </p>
            </div>

            {reportError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{reportError}</span>
              </div>
            )}

            {reportSuccess && (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-2xl border border-emerald-300 font-medium flex items-center gap-3 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">✅ รายงานผลการแข่งขันสำเร็จ!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    ข้อมูลผลการแข่งขันถูกเผยแพร่ไปยังหน้าแรกของเว็บไซต์สำหรับบุคคลทั่วไปเรียบร้อยแล้ว
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleAddMatchReport} className="space-y-5 text-xs">
              {/* Row 1: Sport & Event */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ชนิดกีฬา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={reportSportId}
                    onChange={(e) => {
                      setReportSportId(e.target.value);
                      const sp = sports.find((s) => s.id === e.target.value);
                      if (sp) {
                        setReportEventName(sp.sport_name);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {sports.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.sport_icon} {sp.sport_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รายการแข่งขัน / รุ่นอายุ / รอบ
                  </label>
                  <input
                    type="text"
                    value={reportEventName}
                    onChange={(e) => setReportEventName(e.target.value)}
                    placeholder="เช่น ฟุตบอล 7 คน ชาย (ป.1-6) รอบแรก"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Match Scores (Team 1 Winner vs Team 2 Loser) */}
              <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4">
                <div className="flex items-center justify-between text-xs text-purple-900 font-bold">
                  <span>⚽ คู่การแข่งขันและสกอร์คะแนน</span>
                  <span className="text-[11px] font-normal text-purple-700">
                    ฝ่ายที่ 1 (ชนะ/ได้) VS ฝ่ายที่ 2 (แพ้/เสีย)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Team 1 (Winner/Team A) */}
                  <div className="md:col-span-5 space-y-1">
                    <label className="block font-bold text-slate-800 text-[11px]">
                      🏆 ฝ่ายที่ 1 (ฝ่ายชนะ / ฝ่ายที่ได้) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={winnerSchoolId}
                      onChange={(e) => setWinnerSchoolId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">-- เลือกโรงเรียนฝ่ายที่ 1 --</option>
                      {schools.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.school_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Score 1 */}
                  <div className="md:col-span-2 space-y-1 text-center">
                    <label className="block font-bold text-slate-800 text-[11px]">สกอร์ฝ่ายที่ 1</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={winnerScore}
                      onChange={(e) => setWinnerScore(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2.5 bg-white border-2 border-purple-400 rounded-xl text-center text-base font-black text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  {/* Score 2 */}
                  <div className="md:col-span-2 space-y-1 text-center">
                    <label className="block font-bold text-slate-800 text-[11px]">สกอร์ฝ่ายที่ 2</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={loserScore}
                      onChange={(e) => setLoserScore(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-xl text-center text-base font-black text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  {/* Team 2 (Loser/Team B) */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="block font-bold text-slate-800 text-[11px]">
                      ฝ่ายที่ 2 (ฝ่ายแพ้ / คู่แข่ง) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={loserSchoolId}
                      onChange={(e) => setLoserSchoolId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">-- เลือกโรงเรียนฝ่ายที่ 2 --</option>
                      {schools.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.school_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Real-time Preview Text */}
                {winnerSchoolId && loserSchoolId && (
                  <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs text-purple-950 font-bold flex items-center gap-2">
                    <span>📢 สรุปข้อความรายงาน:</span>
                    <span className="text-purple-700">
                      {schools.find((s) => s.id === winnerSchoolId)?.school_name}{' '}
                      {Number(winnerScore) === Number(loserScore) ? 'เสมอ' : 'ชนะ'}{' '}
                      {schools.find((s) => s.id === loserSchoolId)?.school_name} {winnerScore} ต่อ {loserScore}
                    </span>
                  </div>
                )}
              </div>

              {/* Row 3: Status & Reporter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รอบการแข่งขัน</label>
                  <select
                    value={matchRound}
                    onChange={(e) => setMatchRound(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="รอบแรก">รอบแรก</option>
                    <option value="รอบแบ่งกลุ่ม">รอบแบ่งกลุ่ม</option>
                    <option value="รอบ 8 ทีม">รอบ 8 ทีม</option>
                    <option value="รอบรองชนะเลิศ">รอบรองชนะเลิศ</option>
                    <option value="ชิงชนะเลิศ">รอบชิงชนะเลิศ (Final)</option>
                    <option value="ชิงอันดับ 3">รอบชิงอันดับ 3</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">สถานะการแข่งขัน</label>
                  <select
                    value={matchStatus}
                    onChange={(e) => setMatchStatus(e.target.value as 'COMPLETED' | 'LIVE')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="COMPLETED">🏁 จบการแข่งขัน (Full Time)</option>
                    <option value="LIVE">🔴 กำลังแข่งขัน (Live Match)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">เจ้าหน้าที่ผู้รายงานผล</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="ชื่อกรรมการ/ผู้รายงาน"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-8 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> บันทึกและเผยแพร่รายงานผลการแข่งขัน
                </button>
              </div>
            </form>
          </div>

          {/* History / Current Reports Feed List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold font-['Kanit'] text-slate-900 text-base flex items-center gap-2">
                  <span>📋</span> รายการรายงานผลการแข่งขันล่าสุด ({matchReports.length} รายการ)
                </h3>
                <p className="text-xs text-slate-500">ผลการแข่งขันทั้งหมดที่แสดงอยู่บนหน้าหลักของระบบ</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {matchReports.map((mr) => (
                <div key={mr.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] mb-1">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                        {mr.sport_name}
                      </span>
                      <span className="text-slate-500 font-medium">{mr.event_name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{mr.round_name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-400">{mr.match_time || mr.match_date}</span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">
                      {mr.summary_text}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5">
                      ผู้รายงาน: {mr.reporter_name}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        mr.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}
                    >
                      {mr.status === 'COMPLETED' ? '🏁 จบการแข่งขัน' : '🔴 กำลังแข่งขัน'}
                    </span>
                    <button
                      onClick={() => handleDeleteMatchReport(mr.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="ลบรายงานนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {matchReports.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ยังไม่มีการรายงานผลการแข่งขันในวันนี้
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: OFFICIAL MEDALS PLACEMENTS & CERTIFICATES     */}
      {/* ======================================================== */}
      {activeConsoleTab === 'OFFICIAL_MEDAL' && (
        <div className="space-y-6">
          {/* Step 1: Select Sport */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                1
              </span>
              เลือกชนิดกีฬา
            </h2>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {sports.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => {
                    setSelectedSportId(sp.id);
                    setSelectedEventId('');
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 border ${
                    selectedSportId === sp.id
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <span>{sp.sport_icon}</span>
                  <span>{sp.sport_name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Event */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                2
              </span>
              เลือกรายการแข่งขัน
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredEvents.map((ev) => {
                const isSelected = ev.id === selectedEventId;
                const isDone = ev.status === 'COMPLETED';
                return (
                  <button
                    key={ev.id}
                    onClick={() => handleSelectEvent(ev)}
                    className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/30'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-mono text-slate-500 font-semibold">{ev.event_code}</span>
                        {isDone ? (
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> มีผลแล้ว
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> รอดำเนินการ
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm font-['Prompt'] line-clamp-2">
                        {ev.event_name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {ev.grade} ({ev.age_group})
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Record Placements & Scores */}
          {currentEvent && (
            <form onSubmit={handleSaveMedals} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    บันทึกผลการแข่งขัน: {currentEvent.event_name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เลือกโรงเรียนที่ชนะเลิศและรองชนะเลิศ ระบบจะคำนวณเหรียญและเตรียมรายชื่อเกียรติบัตรทันที
                  </p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-indigo-100 text-indigo-900 rounded-full">
                  {currentSport?.sport_name}
                </span>
              </div>

              {medalError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{medalError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-300 font-medium flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">✅ บันทึกผลการแข่งขันเรียบร้อยแล้ว!</p>
                    <p className="text-xs text-emerald-700">
                      ระบบได้อัปเดตตารางเหรียญรางวัลและผูกรายชื่อนักกีฬากับเกียรติบัตรอัตโนมัติแล้ว
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Rank 1: Gold */}
                <div className="p-4 rounded-xl bg-amber-50/80 border-2 border-amber-300 space-y-2">
                  <label className="block text-xs font-bold text-amber-950 flex items-center gap-2">
                    <span className="text-lg">🥇</span> ชนะเลิศ (เหรียญทอง) *
                  </label>
                  <select
                    required
                    value={rank1SchoolId}
                    onChange={(e) => setRank1SchoolId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="">-- เลือกโรงเรียนชนะเลิศ --</option>
                    {candidateSchools.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.school_name} ({sch.short_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rank 2: Silver */}
                <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-lg">🥈</span> รองชนะเลิศอันดับ 1 (เหรียญเงิน)
                  </label>
                  <select
                    value={rank2SchoolId}
                    onChange={(e) => setRank2SchoolId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">-- เลือกโรงเรียนรองชนะเลิศอันดับ 1 --</option>
                    {candidateSchools.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.school_name} ({sch.short_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rank 3: Bronze */}
                <div className="p-4 rounded-xl bg-amber-100/40 border-2 border-amber-400/50 space-y-2">
                  <label className="block text-xs font-bold text-amber-900 flex items-center gap-2">
                    <span className="text-lg">🥉</span> รองชนะเลิศอันดับ 2 (เหรียญทองแดง)
                  </label>
                  <select
                    value={rank3SchoolId}
                    onChange={(e) => setRank3SchoolId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300/80 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="">-- เลือกโรงเรียนรองชนะเลิศอันดับ 2 --</option>
                    {candidateSchools.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.school_name} ({sch.short_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Score & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ผลคะแนน / เวลา / เซต (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      value={scoreText}
                      onChange={(e) => setScoreText(e.target.value)}
                      placeholder="เช่น 3 - 1, 12.45 วินาที, 2 - 0 เซต"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      หมายเหตุ / บันทึกการแข่งขัน
                    </label>
                    <input
                      type="text"
                      value={matchNote}
                      onChange={(e) => setMatchNote(e.target.value)}
                      placeholder="เช่น รอบชิงชนะเลิศ, ทำลายสถิติกลุ่มโรงเรียน"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  * ข้อมูลจะถูกนำไปออกเกียรติบัตรและคำนวณเหรียญอัตโนมัติ
                </span>
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  บันทึกผลการแข่งขัน
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
