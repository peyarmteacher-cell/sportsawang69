import React, { useState } from 'react';
import { sportsStore } from '../services/store';
import { Sport, Event, Result } from '../types';
import { Trophy, Users, Award, ChevronRight, CheckCircle2, Clock, Settings, Plus, Cloud, Shield } from 'lucide-react';
import { SchoolDetailModal } from './SchoolDetailModal';
import { sortEventsList } from '../utils/thaiFormatter';

interface PublicSportsProps {
  onNavigateToAdminSports?: (tab?: 'SPORTS' | 'GOOGLE_GAS') => void;
}

export const PublicSports: React.FC<PublicSportsProps> = ({ onNavigateToAdminSports }) => {
  const currentUser = sportsStore.getCurrentUser();
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  const sports = sportsStore.getSports();
  const events = sportsStore.getEvents();
  const results = sportsStore.getResults();
  const schools = sportsStore.getSchools();
  const [selectedSportId, setSelectedSportId] = useState<string>(sports[0]?.id || '');

  const activeSport = sports.find((s) => s.id === selectedSportId) || sports[0];
  const sportEvents = sortEventsList(events.filter((e) => e.sport_id === activeSport?.id));

  return (
    <div className="space-y-6 pb-12">
      {/* Super Admin / Admin Quick Management Banner */}
      {isAdmin && onNavigateToAdminSports && (
        <div className="p-4 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-400/30 rounded-xl flex items-center justify-center shrink-0 text-amber-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm font-['Kanit'] text-white">
                  แผงควบคุมผู้ดูแลระบบ ({currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'})
                </span>
                <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold rounded-full">
                  มีสิทธิ์แก้ไข
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                คุณสามารถเพิ่ม/แก้ไขรายการแข่งขัน จัดการประเภทกีฬา และตั้งค่า Google Apps Script ได้
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onNavigateToAdminSports('SPORTS')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              จัดการกีฬา & รายการแข่งขัน
            </button>
            <button
              onClick={() => onNavigateToAdminSports('GOOGLE_GAS')}
              className="px-3.5 py-2 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 text-xs font-semibold rounded-xl border border-indigo-600/50 transition flex items-center gap-1.5 shrink-0"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-300" />
              ตั้งค่า Google Drive & GAS
            </button>
          </div>
        </div>
      )}

      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-bold font-['Kanit'] text-slate-900">
          ประเภทกีฬาและรายการแข่งขัน
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          สำรวจรายการแข่งขัน กฎกติกา และสถานะการแข่งขันในแต่ละประเภทกีฬา
        </p>
      </div>

      {/* Sport Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {sports.map((sp) => {
          const isSelected = sp.id === activeSport?.id;
          const evCount = events.filter((e) => e.sport_id === sp.id).length;
          return (
            <button
              key={sp.id}
              onClick={() => setSelectedSportId(sp.id)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-base">{sp.sport_icon}</span>
              <span>{sp.sport_name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {evCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Sport Detail Card */}
      {activeSport && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-blue-50 text-3xl rounded-2xl flex items-center justify-center border border-blue-100 shadow-xs">
                {activeSport.sport_icon}
              </div>
              <div>
                <h2 className="text-xl font-bold font-['Kanit'] text-slate-900">
                  {activeSport.sport_name}
                </h2>
                <p className="text-slate-600 text-xs md:text-sm mt-0.5">
                  {activeSport.description || 'การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>หมวดหมู่: <strong>{activeSport.category}</strong></span>
              <span>สถานะ: <strong className="text-emerald-600">เปิดการแข่งขัน (ACTIVE)</strong></span>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 font-['Kanit'] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> รายการแข่งขันทั้งหมด ({sportEvents.length} รายการ)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sportEvents.map((ev) => {
                const evResults = results.filter((r) => r.event_id === ev.id && r.status === 'CONFIRMED');
                const isDone = ev.status === 'COMPLETED';

                const goldRes = evResults.find((r) => r.medal === 'GOLD' || r.rank === 1);
                const goldSchool = schools.find((s) => s.id === goldRes?.school_id);

                return (
                  <div
                    key={ev.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {ev.event_code}
                        </span>
                        {isDone ? (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> แข่งขันเสร็จสิ้น
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> รอการแข่งขัน
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm md:text-base font-['Kanit']">
                        {ev.event_name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        เพศ: <strong>{ev.gender === 'MALE' ? 'ชาย' : ev.gender === 'FEMALE' ? 'หญิง' : 'ผสม'}</strong> | ระดับ: <strong>{ev.grade}</strong> ({ev.age_group})
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ประเภท: {ev.competition_type === 'TEAM' ? `ทีม (${ev.min_players}-${ev.max_players} คน)` : 'บุคคล'}
                      </p>
                    </div>

                    {isDone && goldSchool ? (
                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <span className="font-semibold text-amber-900 flex items-center gap-1">
                          🥇 ชนะเลิศ:
                        </span>
                        <strong className="text-amber-950 font-['Prompt']">
                          {goldSchool.school_name}
                        </strong>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-500">
                        รางวัล: {ev.award_type}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PublicSchools: React.FC<{ onSelectSchool?: (id: string) => void }> = ({ onSelectSchool }) => {
  const schools = sportsStore.getSchools();
  const students = sportsStore.getStudents();
  const coaches = sportsStore.getCoaches();
  const medalSummaries = sportsStore.getSchoolMedalSummary();
  const results = sportsStore.getResults();
  const [viewingSchoolId, setViewingSchoolId] = useState<string | null>(null);

  const handleOpenDetail = (schoolId: string) => {
    if (onSelectSchool) {
      onSelectSchool(schoolId);
    }
    setViewingSchoolId(schoolId);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-bold font-['Kanit'] text-slate-900">
          โรงเรียนและสถานศึกษาในกลุ่ม
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          ทำเนียบสถานศึกษาที่เข้าร่วมการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปี 2569
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools.map((sch) => {
          const medal = medalSummaries.find((m) => m.school_id === sch.id);
          const studentCount = students.filter((s) => s.school_id === sch.id).length;
          const coachCount = coaches.filter((c) => c.school_id === sch.id).length;

          return (
            <div
              key={sch.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                      รหัส SMIS: {sch.school_code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-lg font-['Kanit'] mt-1.5 leading-snug">
                      {sch.school_name}
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      ชื่อย่อ: {sch.short_name}
                    </p>
                    {sch.director_name && (
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-['Prompt']">
                        <span>ผอ. {sch.director_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 mb-4">
                  <p className="line-clamp-2">📍 {sch.address}</p>
                  <p>📞 {sch.phone || '-'}</p>
                </div>

                {/* Medals Tally Bar */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs mb-4">
                  <div className="text-center flex-1">
                    <span className="block font-bold text-amber-600 text-sm font-['Kanit']">
                      {medal?.gold || 0}
                    </span>
                    <span className="text-slate-500 text-[10px]">🥇 ทอง</span>
                  </div>
                  <div className="w-[1px] h-6 bg-slate-200" />
                  <div className="text-center flex-1">
                    <span className="block font-bold text-slate-600 text-sm font-['Kanit']">
                      {medal?.silver || 0}
                    </span>
                    <span className="text-slate-500 text-[10px]">🥈 เงิน</span>
                  </div>
                  <div className="w-[1px] h-6 bg-slate-200" />
                  <div className="text-center flex-1">
                    <span className="block font-bold text-amber-800 text-sm font-['Kanit']">
                      {medal?.bronze || 0}
                    </span>
                    <span className="text-slate-500 text-[10px]">🥉 ทองแดง</span>
                  </div>
                  <div className="w-[1px] h-6 bg-slate-200" />
                  <div className="text-center flex-1">
                    <span className="block font-bold text-blue-900 text-sm font-['Kanit']">
                      {medal?.total || 0}
                    </span>
                    <span className="text-slate-500 text-[10px]">รวม</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>นักกีฬา: <strong>{studentCount} คน</strong></span>
                  <span>ครูผู้ฝึกสอน: <strong>{coachCount} คน</strong></span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">
                  อันดับที่ {medal?.rank || '-'}
                </span>
                <button
                  onClick={() => handleOpenDetail(sch.id)}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-xs"
                >
                  ดูรายละเอียดผลงาน <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* School Detail Modal */}
      {viewingSchoolId && (
        <SchoolDetailModal
          schoolId={viewingSchoolId}
          onClose={() => setViewingSchoolId(null)}
        />
      )}
    </div>
  );
};
