import React, { useState } from 'react';
import { sportsStore } from '../services/store';
import { SchoolMedalSummary, Result, Event, Sport, School, Certificate } from '../types';
import { DashboardCharts } from './DashboardCharts';
import { CertificateModal } from './CertificateModal';
import { SchoolDetailModal } from './SchoolDetailModal';
import { formatThaiDateRange } from '../utils/thaiFormatter';
import {
  Trophy,
  Medal,
  Users,
  School as SchoolIcon,
  Search,
  ChevronRight,
  Sparkles,
  Calendar,
  MapPin,
  Flame,
  Award,
  Filter,
  Eye,
  CheckCircle2,
  FileCheck,
  Activity,
  Radio,
  ArrowRight
} from 'lucide-react';

interface PublicDashboardProps {
  onNavigateTab?: (tab: string) => void;
  onSelectSchool?: (schoolId: string) => void;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({
  onNavigateTab,
  onSelectSchool
}) => {
  const comp = sportsStore.getCurrentCompetition();
  const schools = sportsStore.getSchools();
  const sports = sportsStore.getSports();
  const events = sportsStore.getEvents();
  const students = sportsStore.getStudents();
  const coaches = sportsStore.getCoaches();
  const results = sportsStore.getResults();
  const certificates = sportsStore.getCertificates();
  const medalSummaries = sportsStore.getSchoolMedalSummary();
  const matchReports = sportsStore.getMatchReports();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSportFilter, setSelectedSportFilter] = useState('ALL');
  const [activeResultDetail, setActiveResultDetail] = useState<{
    event: Event;
    results: Result[];
  } | null>(null);
  const [viewCert, setViewCert] = useState<Certificate | null>(null);
  const [selectedSchoolIdForModal, setSelectedSchoolIdForModal] = useState<string | null>(null);

  // Aggregates
  const totalGold = medalSummaries.reduce((s, m) => s + m.gold, 0);
  const totalSilver = medalSummaries.reduce((s, m) => s + m.silver, 0);
  const totalBronze = medalSummaries.reduce((s, m) => s + m.bronze, 0);

  // Filtered Results for Live stream
  const completedEvents = events.filter((e) => e.status === 'COMPLETED');

  // Filter for Search Box
  const filteredEvents = completedEvents.filter((ev) => {
    const sp = sports.find((s) => s.id === ev.sport_id);
    const evResults = results.filter((r) => r.event_id === ev.id);
    const schoolNames = evResults
      .map((r) => schools.find((s) => s.id === r.school_id)?.school_name || '')
      .join(' ');

    const matchQuery =
      !searchQuery ||
      ev.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp?.sport_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schoolNames.toLowerCase().includes(searchQuery.toLowerCase());

    const matchSport = selectedSportFilter === 'ALL' || ev.sport_id === selectedSportFilter;

    return matchQuery && matchSport;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section - Sleek Interface Theme with Custom Header Image Support */}
      <div
        className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl p-6 md:p-8 border border-indigo-800/40 bg-cover bg-center"
        style={
          comp.header_bg_image
            ? {
                backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.92), rgba(30, 27, 75, 0.85)), url('${comp.header_bg_image}')`
              }
            : undefined
        }
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-amber-950 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 shadow-xs">
            <Flame className="w-3.5 h-3.5 text-amber-950 animate-pulse" />
            LIVE SPORT EVENT 2026 • ประจำปี ๒๕๖๙
          </div>

          <h1 className="text-2xl md:text-4xl font-black font-['Kanit'] tracking-tight text-white leading-tight">
            {comp.competition_name}
          </h1>

          <p className="text-slate-200 text-xs md:text-sm mt-1.5 font-['Prompt']">
            {comp.host_org}
          </p>

          <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-5 pt-4 border-t border-slate-700/80 text-xs md:text-sm text-slate-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="font-medium">
                {comp.start_date && comp.end_date
                  ? formatThaiDateRange(comp.start_date, comp.end_date)
                  : '15 พฤศจิกายน 2569 ถึง 20 พฤศจิกายน 2569'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>{comp.venue}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-bold uppercase tracking-wider text-xs">
                กำลังดำเนินการแข่งขัน (LIVE)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Key Stat Cards - Sleek Interface */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Card 1: Schools */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">โรงเรียนเข้าร่วม</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <SchoolIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black font-['Kanit'] text-slate-800">{schools.length}</span>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              สถานศึกษา
            </span>
          </div>
        </div>

        {/* Card 2: Events */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">รายการแข่งขัน</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black font-['Kanit'] text-slate-800">{events.length}</span>
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              รายการ
            </span>
          </div>
        </div>

        {/* Card 3: Athletes */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">นักกีฬาลงทะเบียน</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black font-['Kanit'] text-slate-800">{students.length}</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              คน
            </span>
          </div>
        </div>

        {/* Card 4: Gold */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl md:rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">เหรียญทอง 🥇</span>
            <span className="text-lg">🥇</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black font-['Kanit']">{totalGold}</span>
            <span className="text-[10px] bg-amber-400/30 text-amber-100 font-bold px-2 py-0.5 rounded">
              เหรียญ
            </span>
          </div>
        </div>

        {/* Card 5: Silver */}
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 text-white rounded-xl md:rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">เหรียญเงิน 🥈</span>
            <span className="text-lg">🥈</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black font-['Kanit']">{totalSilver}</span>
            <span className="text-[10px] bg-slate-500/40 text-slate-200 font-bold px-2 py-0.5 rounded">
              เหรียญ
            </span>
          </div>
        </div>

        {/* Card 6: Bronze */}
        <div className="bg-gradient-to-br from-amber-800 to-amber-900 text-white rounded-xl md:rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">เหรียญทองแดง 🥉</span>
            <span className="text-lg">🥉</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black font-['Kanit']">{totalBronze}</span>
            <span className="text-[10px] bg-amber-700/40 text-amber-200 font-bold px-2 py-0.5 rounded">
              เหรียญ
            </span>
          </div>
        </div>
      </div>

      {/* Daily Match Scores & Live Feed Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Activity className="w-5 h-5 text-purple-600" />
              </span>
              <div>
                <h2 className="text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
                  รายงานผลการแข่งขันประจำวัน (Daily Match Results Feed)
                </h2>
                <p className="text-xs text-slate-500">
                  อัปเดตผลคะแนนการแข่งขันรายคู่สดจากสนามแข่งขัน
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold">
              <Radio className="w-3.5 h-3.5 text-purple-600 animate-pulse" /> ผลการแข่งขันล่าสุด
            </span>
          </div>
        </div>

        {/* Match Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchReports.slice(0, 6).map((mr) => {
            const isCompleted = mr.status === 'COMPLETED';
            return (
              <div
                key={mr.id}
                className="p-4 rounded-2xl border border-slate-200 bg-linear-to-b from-slate-50/60 to-white hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                      {mr.sport_name}
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}
                    >
                      {isCompleted ? '🏁 จบการแข่งขัน' : '🔴 กำลังแข่งขัน'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-medium mb-2 flex items-center gap-1.5">
                    <span>{mr.event_name}</span>
                    <span>•</span>
                    <span className="text-slate-400">{mr.round_name}</span>
                  </div>

                  {/* Match Score Board */}
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2">
                    {/* Team 1 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                        {mr.team_1_school_name}
                      </span>
                      <span
                        className={`text-base font-black font-mono px-2 py-0.5 rounded ${
                          mr.team_1_score > mr.team_2_score
                            ? 'text-purple-700 bg-purple-50'
                            : 'text-slate-700'
                        }`}
                      >
                        {mr.team_1_score}
                      </span>
                    </div>

                    <div className="border-t border-slate-100" />

                    {/* Team 2 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                        {mr.team_2_school_name}
                      </span>
                      <span
                        className={`text-base font-black font-mono px-2 py-0.5 rounded ${
                          mr.team_2_score > mr.team_1_score
                            ? 'text-purple-700 bg-purple-50'
                            : 'text-slate-700'
                        }`}
                      >
                        {mr.team_2_score}
                      </span>
                    </div>
                  </div>

                  {/* Text statement */}
                  <p className="text-xs font-bold text-purple-950 mt-2 line-clamp-2">
                    📢 {mr.summary_text}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>ผู้รายงาน: {mr.reporter_name}</span>
                  <span>{mr.match_time || mr.match_date}</span>
                </div>
              </div>
            );
          })}

          {matchReports.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs">
              ยังไม่มีรายงานผลการแข่งขันประจำวัน
            </div>
          )}
        </div>
      </div>

      {/* Medal Table Ranking - Sleek Interface Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div>
            <h2 className="text-base md:text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-500" />
              ตารางสรุปเหรียญรางวัลรวม (Medal Standings)
            </h2>
            <p className="text-xs text-slate-500">
              จัดอันดับตามเกณฑ์เหรียญทอง ➔ เหรียญเงิน ➔ เหรียญทองแดง ➔ เหรียญรวม
            </p>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full self-start sm:self-auto uppercase tracking-wider">
            Real-time Update
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
                <th className="py-3.5 px-4 text-center w-16">อันดับ</th>
                <th className="py-3.5 px-4">โรงเรียน / สถานศึกษา</th>
                <th className="py-3.5 px-3 text-center bg-amber-50/60 text-amber-900 w-24">
                  🥇 ทอง
                </th>
                <th className="py-3.5 px-3 text-center bg-slate-100/60 text-slate-800 w-24">
                  🥈 เงิน
                </th>
                <th className="py-3.5 px-3 text-center bg-amber-100/40 text-amber-950 w-24">
                  🥉 ทองแดง
                </th>
                <th className="py-3.5 px-4 text-center font-bold text-slate-900 w-24">
                  รวม
                </th>
                <th className="py-3.5 px-4 text-center w-28">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {medalSummaries.map((item, index) => {
                const rankDisplay = item.rank < 10 ? `0${item.rank}` : item.rank;
                const isTop1 = index === 0;
                const isTop2 = index === 1;
                const isTop3 = index === 2;

                return (
                  <tr
                    key={item.school_id}
                    className={`hover:bg-indigo-50/30 transition-colors ${
                      isTop1 ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black font-['Kanit'] ${
                          isTop1
                            ? 'bg-amber-400 text-amber-950 shadow-xs'
                            : isTop2
                            ? 'bg-slate-300 text-slate-900 shadow-xs'
                            : isTop3
                            ? 'bg-amber-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rankDisplay}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900 font-['Prompt'] text-sm">
                          {item.school_name}
                        </p>
                        <span className="text-xs text-slate-500">
                          {item.short_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-700 bg-amber-50/20 font-['Kanit'] text-base">
                      {item.gold}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-slate-700 bg-slate-100/20 font-['Kanit'] text-base">
                      {item.silver}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-900 bg-amber-100/10 font-['Kanit'] text-base">
                      {item.bronze}
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-indigo-900 font-['Kanit'] text-lg">
                      {item.total}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          if (onSelectSchool) {
                            onSelectSchool(item.school_id);
                          }
                          setSelectedSchoolIdForModal(item.school_id);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-600 hover:text-white rounded-lg transition-all inline-flex items-center gap-1 shadow-xs"
                      >
                        ดูรายละเอียด <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 Real-time Chart.js Dashboard Charts */}
      <DashboardCharts
        medalSummaries={medalSummaries}
        results={results}
        sports={sports}
        events={events}
      />

      {/* Latest Match Results & Filter Section - Sleek Interface */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base md:text-lg font-bold font-['Kanit'] text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              ผลการแข่งขันล่าสุด (Latest Match Results)
            </h2>
            <p className="text-xs text-slate-500">
              ผลการแข่งขันที่ได้รับการยืนยันและออกเหรียญรางวัลแล้ว
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อรายการ, โรงเรียน..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <select
              value={selectedSportFilter}
              onChange={(e) => setSelectedSportFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
            >
              <option value="ALL">กีฬา: ทั้งหมด</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sport_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => {
            const evResults = results.filter((r) => r.event_id === ev.id);
            const sport = sports.find((s) => s.id === ev.sport_id);

            const goldRes = evResults.find((r) => r.medal === 'GOLD' || r.rank === 1);
            const silverRes = evResults.find((r) => r.medal === 'SILVER' || r.rank === 2);
            const bronzeRes = evResults.find((r) => r.medal === 'BRONZE' || r.rank === 3);

            const goldSchool = schools.find((s) => s.id === goldRes?.school_id);
            const silverSchool = schools.find((s) => s.id === silverRes?.school_id);
            const bronzeSchool = schools.find((s) => s.id === bronzeRes?.school_id);

            return (
              <div
                key={ev.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                      {sport?.sport_icon} {sport?.sport_name}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" /> จบการแข่งขัน
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm md:text-base font-['Kanit'] line-clamp-1">
                    {ev.event_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รุ่น: {ev.age_group} ({ev.grade}) | ประเภท: {ev.competition_type === 'TEAM' ? 'ทีม' : 'เดี่ยว'}
                  </p>

                  {/* Placements */}
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                    {goldSchool && (
                      <div className="flex items-center justify-between text-xs bg-amber-50/80 p-2 rounded-xl border border-amber-200/60">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                          <span>🥇 ชนะเลิศ</span>
                        </span>
                        <strong className="text-amber-950 font-['Prompt'] font-bold text-xs">
                          {goldSchool.short_name || goldSchool.school_name}
                        </strong>
                      </div>
                    )}

                    {silverSchool && (
                      <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-[11px]">
                          <span>🥈 รองชนะเลิศ 1</span>
                        </span>
                        <span className="text-slate-900 font-['Prompt'] font-semibold text-xs">
                          {silverSchool.short_name || silverSchool.school_name}
                        </span>
                      </div>
                    )}

                    {bronzeSchool && (
                      <div className="flex items-center justify-between text-xs bg-amber-100/30 p-2 rounded-xl border border-amber-200/40">
                        <span className="font-semibold text-amber-900 flex items-center gap-1.5 text-[11px]">
                          <span>🥉 รองชนะเลิศ 2</span>
                        </span>
                        <span className="text-slate-900 font-['Prompt'] font-semibold text-xs">
                          {bronzeSchool.short_name || bronzeSchool.school_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {evResults[0]?.score ? `ผลคะแนน: ${evResults[0].score}` : 'ยืนยันผลแล้ว'}
                  </span>
                  <button
                    onClick={() => setActiveResultDetail({ event: ev, results: evResults })}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> รายชื่อนักกีฬา/ครู
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            <p>ไม่พบรายการแข่งขันที่ตรงกับเงื่อนไขการค้นหา</p>
          </div>
        )}
      </div>

      {/* Roster & Detail Modal */}
      {activeResultDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                  {sports.find((s) => s.id === activeResultDetail.event.sport_id)?.sport_name}
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-['Kanit'] mt-1">
                  {activeResultDetail.event.event_name}
                </h3>
                <p className="text-xs text-slate-500">
                  รุ่น {activeResultDetail.event.age_group} ({activeResultDetail.event.grade})
                </p>
              </div>
              <button
                onClick={() => setActiveResultDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Results by School */}
            <div className="space-y-4">
              {activeResultDetail.results.map((res) => {
                const school = schools.find((s) => s.id === res.school_id);
                const reg = sportsStore
                  .getRegistrations()
                  .find((r) => r.event_id === activeResultDetail.event.id && r.school_id === res.school_id);
                const regStudents = sportsStore.getRegistrationStudents();
                const allStudents = sportsStore.getStudents();
                const allCoaches = sportsStore.getCoaches();

                const teamStudents = reg
                  ? regStudents
                      .filter((rs) => rs.registration_id === reg.id)
                      .map((rs) => allStudents.find((s) => s.id === rs.student_id))
                      .filter(Boolean)
                  : [];

                const coach = allCoaches.find((c) => c.id === reg?.coach_id);

                // Find certificates generated for these students
                const certs = certificates.filter(
                  (c) => c.event_id === activeResultDetail.event.id && c.school_id === res.school_id
                );

                return (
                  <div
                    key={res.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {res.medal === 'GOLD' ? '🥇' : res.medal === 'SILVER' ? '🥈' : '🥉'}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 font-['Prompt']">
                            {res.award} : {school?.school_name}
                          </h4>
                          <p className="text-xs text-slate-500">{res.note || res.score}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-white rounded-md border border-slate-200 shadow-2xs">
                        {res.medal === 'GOLD' ? 'เหรียญทอง' : res.medal === 'SILVER' ? 'เหรียญเงิน' : 'เหรียญทองแดง'}
                      </span>
                    </div>

                    {/* Student List */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                      <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-600" /> นักกีฬาผู้เข้าร่วม:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {teamStudents.map((st) => {
                          const studentCert = certs.find((c) => c.recipient_id === st?.id);
                          return (
                            <div
                              key={st?.id}
                              className="px-2.5 py-1 bg-slate-100 rounded-md flex items-center gap-1.5"
                            >
                              <span>
                                {st?.prefix} {st?.first_name} {st?.last_name}
                              </span>
                              {studentCert && (
                                <button
                                  onClick={() => setViewCert(studentCert)}
                                  className="text-blue-600 hover:text-blue-800 underline font-medium text-[11px] ml-1"
                                >
                                  เกียรติบัตร
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {coach && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-600">
                          <span>
                            ครูผู้ฝึกสอน: <strong>{coach.prefix}{coach.first_name} {coach.last_name}</strong> ({coach.position})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={() => setActiveResultDetail(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-sm font-medium transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {viewCert && (
        <CertificateModal
          certificate={viewCert}
          onClose={() => setViewCert(null)}
        />
      )}

      {/* School Detail Modal */}
      {selectedSchoolIdForModal && (
        <SchoolDetailModal
          schoolId={selectedSchoolIdForModal}
          onClose={() => setSelectedSchoolIdForModal(null)}
        />
      )}
    </div>
  );
};
