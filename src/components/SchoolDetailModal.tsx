import React, { useState } from 'react';
import { sportsStore } from '../services/store';
import { School, Result, Event, Sport, Certificate, Student, Coach } from '../types';
import { CertificateModal } from './CertificateModal';
import {
  X,
  Trophy,
  Medal,
  Award,
  Users,
  School as SchoolIcon,
  Phone,
  MapPin,
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface SchoolDetailModalProps {
  schoolId: string;
  onClose: () => void;
}

export const SchoolDetailModal: React.FC<SchoolDetailModalProps> = ({ schoolId, onClose }) => {
  const school = sportsStore.getSchools().find((s) => s.id === schoolId);
  const medalSummaries = sportsStore.getSchoolMedalSummary();
  const schoolMedal = medalSummaries.find((m) => m.school_id === schoolId);
  
  const allSports = sportsStore.getSports();
  const allEvents = sportsStore.getEvents();
  const allResults = sportsStore.getResults().filter((r) => r.school_id === schoolId && r.status === 'CONFIRMED');
  const allCertificates = sportsStore.getCertificates().filter((c) => c.school_id === schoolId);
  const allStudents = sportsStore.getStudents().filter((s) => s.school_id === schoolId);
  const allCoaches = sportsStore.getCoaches().filter((c) => c.school_id === schoolId);
  const registrations = sportsStore.getRegistrations().filter((r) => r.school_id === schoolId);
  const regStudents = sportsStore.getRegistrationStudents();

  const [selectedSportFilter, setSelectedSportFilter] = useState('ALL');
  const [selectedMedalFilter, setSelectedMedalFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);

  if (!school) return null;

  // Filtered results
  const filteredResults = allResults.filter((res) => {
    const ev = allEvents.find((e) => e.id === res.event_id);
    const sp = allSports.find((s) => s.id === ev?.sport_id);

    const matchesSport = selectedSportFilter === 'ALL' || ev?.sport_id === selectedSportFilter;
    const matchesMedal = selectedMedalFilter === 'ALL' || res.medal === selectedMedalFilter;
    const matchesSearch =
      !searchQuery ||
      ev?.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp?.sport_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.award.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.score.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSport && matchesMedal && matchesSearch;
  });

  const goldCount = schoolMedal?.gold || 0;
  const silverCount = schoolMedal?.silver || 0;
  const bronzeCount = schoolMedal?.bronze || 0;
  const totalCount = schoolMedal?.total || 0;
  const rankNumber = schoolMedal?.rank || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 md:p-8 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <img
              src={school.logo}
              alt={school.school_name}
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-white/30 bg-white p-1 shadow-lg shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 rounded-md font-mono text-xs font-black">
                  SMIS: {school.smis_code || school.school_code}
                </span>
                <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-md text-xs font-semibold">
                  อันดับรวมที่ {rankNumber}
                </span>
              </div>

              <h2 className="text-xl md:text-3xl font-black font-['Kanit'] text-white truncate">
                {school.school_name}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-200 font-['Prompt']">
                {school.director_name && (
                  <span className="flex items-center gap-1">
                    <span>ผอ.สถานศึกษา:</span>
                    <strong className="text-white font-medium">{school.director_name}</strong>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{school.address}</span>
                </span>
                {school.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{school.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Medals & Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-4 md:p-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-amber-500/10 border border-amber-300/80 rounded-2xl p-3 text-center">
            <span className="text-xl md:text-2xl font-black font-['Kanit'] text-amber-800 block">
              {goldCount}
            </span>
            <span className="text-[11px] font-bold text-amber-900">🥇 เหรียญทอง</span>
          </div>

          <div className="bg-slate-200/60 border border-slate-300 rounded-2xl p-3 text-center">
            <span className="text-xl md:text-2xl font-black font-['Kanit'] text-slate-800 block">
              {silverCount}
            </span>
            <span className="text-[11px] font-bold text-slate-800">🥈 เหรียญเงิน</span>
          </div>

          <div className="bg-amber-800/10 border border-amber-700/40 rounded-2xl p-3 text-center">
            <span className="text-xl md:text-2xl font-black font-['Kanit'] text-amber-900 block">
              {bronzeCount}
            </span>
            <span className="text-[11px] font-bold text-amber-900">🥉 เหรียญทองแดง</span>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-center">
            <span className="text-xl md:text-2xl font-black font-['Kanit'] text-indigo-900 block">
              {totalCount}
            </span>
            <span className="text-[11px] font-bold text-indigo-800">🏆 รวมเหรียญ</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
            <span className="text-xl md:text-2xl font-black font-['Kanit'] text-emerald-800 block">
              {allCertificates.length}
            </span>
            <span className="text-[11px] font-bold text-emerald-800">📜 เกียรติบัตร</span>
          </div>
        </div>

        {/* Content Body: Awards Breakdown & Participants */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Controls & Search Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold font-['Kanit'] text-slate-900 text-base">
                สรุปผลงานและรางวัลที่ได้รับ ({allResults.length} รายการ)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหารายการ..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white transition"
                />
              </div>

              <select
                value={selectedMedalFilter}
                onChange={(e) => setSelectedMedalFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="ALL">ทุกเหรียญ</option>
                <option value="GOLD">🥇 ทอง</option>
                <option value="SILVER">🥈 เงิน</option>
                <option value="BRONZE">🥉 ทองแดง</option>
              </select>

              <select
                value={selectedSportFilter}
                onChange={(e) => setSelectedSportFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
              >
                <option value="ALL">ทุกชนิดกีฬา</option>
                {allSports.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sport_icon} {s.sport_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Awards List */}
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
              <Award className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs text-slate-600 font-medium">
                {allResults.length === 0
                  ? 'ยังไม่มีการประกาศผลรางวัลของโรงเรียนนี้ หรืออยู่ระหว่างดำเนินการแข่งขัน'
                  : 'ไม่พบรายการที่ตรงกับเงื่อนไขตัวกรอง'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((res) => {
                const ev = allEvents.find((e) => e.id === res.event_id);
                const sp = allSports.find((s) => s.id === ev?.sport_id);
                const reg = registrations.find((r) => r.event_id === res.event_id);
                
                // Find athletes & coach for this registration
                const regStuds = reg ? regStudents.filter((rs) => rs.registration_id === reg.id) : [];
                const studs = regStuds.map((rs) => allStudents.find((s) => s.id === rs.student_id)).filter(Boolean) as Student[];
                const coach = allCoaches.find((c) => c.id === reg?.coach_id);
                const secCoach = allCoaches.find((c) => c.id === reg?.secondary_coach_id);

                // Certificates for this event
                const certs = allCertificates.filter((c) => c.event_id === res.event_id);

                return (
                  <div
                    key={res.id}
                    className={`p-4 md:p-5 rounded-2xl border transition-all ${
                      res.medal === 'GOLD'
                        ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-400'
                        : res.medal === 'SILVER'
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-400'
                        : res.medal === 'BRONZE'
                        ? 'bg-amber-900/5 border-amber-300/60 hover:border-amber-500'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {sp?.sport_icon} {sp?.sport_name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            รหัส: {ev?.event_code}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm md:text-base font-['Kanit']">
                          {ev?.event_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          ระดับ: {ev?.grade} | รุ่นอายุ: {ev?.age_group} | ประเภท: {ev?.competition_type === 'TEAM' ? 'ทีม' : 'เดี่ยว'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {res.medal === 'GOLD' && (
                          <span className="px-3 py-1.5 bg-amber-400 text-amber-950 font-black rounded-xl text-xs shadow-xs border border-amber-500/30 flex items-center gap-1.5">
                            🥇 ชนะเลิศ (เหรียญทอง)
                          </span>
                        )}
                        {res.medal === 'SILVER' && (
                          <span className="px-3 py-1.5 bg-slate-300 text-slate-900 font-black rounded-xl text-xs shadow-xs border border-slate-400/40 flex items-center gap-1.5">
                            🥈 รองชนะเลิศอันดับ 1 (เหรียญเงิน)
                          </span>
                        )}
                        {res.medal === 'BRONZE' && (
                          <span className="px-3 py-1.5 bg-amber-700 text-white font-black rounded-xl text-xs shadow-xs border border-amber-800 flex items-center gap-1.5">
                            🥉 รองชนะเลิศอันดับ 2 (เหรียญทองแดง)
                          </span>
                        )}
                        {res.medal === 'NONE' && (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
                            {res.award || 'รางวัลชมเชย'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Match Score & Athletes List */}
                    <div className="mt-3 pt-1 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                      <div className="md:col-span-8 space-y-2">
                        {res.score && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">ผลการแข่งขัน/คะแนน:</span>
                            <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {res.score}
                            </span>
                            {res.note && <span className="text-slate-500">({res.note})</span>}
                          </div>
                        )}

                        {studs.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                              <Users className="w-3.5 h-3.5 text-blue-600" /> นักกีฬาตัวแทนโรงเรียน ({studs.length} คน):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {studs.map((st) => (
                                <span
                                  key={st.id}
                                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-[11px] flex items-center gap-1"
                                >
                                  <span>👤 {st.prefix}{st.first_name} {st.last_name}</span>
                                  <span className="text-slate-400">({st.grade})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(coach || secCoach) && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> ครูผู้ฝึกสอน:
                            </span>
                            {coach && (
                              <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                                {coach.prefix}{coach.first_name} {coach.last_name} ({coach.position})
                              </span>
                            )}
                            {secCoach && (
                              <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                                {secCoach.prefix}{secCoach.first_name} {secCoach.last_name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Certificate Actions */}
                      <div className="md:col-span-4 flex flex-col justify-end items-start md:items-end gap-1.5">
                        {certs.length > 0 ? (
                          <div className="space-y-1 w-full md:w-auto">
                            <span className="text-[10px] text-slate-500 font-semibold block text-left md:text-right">
                              เกียรติบัตรอิเล็กทรอนิกส์ ({certs.length} ใบ)
                            </span>
                            <div className="flex flex-wrap md:justify-end gap-1">
                              {certs.slice(0, 3).map((ct) => (
                                <button
                                  key={ct.id}
                                  onClick={() => setViewingCert(ct)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                                >
                                  <FileCheck className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{ct.recipient_name}</span>
                                </button>
                              ))}
                              {certs.length > 3 && (
                                <button
                                  onClick={() => setViewingCert(certs[0])}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                                >
                                  +{certs.length - 3}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            รอการออกเกียรติบัตร
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            สถานศึกษาในกลุ่มโรงเรียนสว่างสูงกระสัง ประจำปีการศึกษา 2569
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Certificate Viewer Modal */}
      {viewingCert && (
        <CertificateModal
          certificate={viewingCert}
          onClose={() => setViewingCert(null)}
        />
      )}
    </div>
  );
};
