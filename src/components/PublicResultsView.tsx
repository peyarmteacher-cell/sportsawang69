import React, { useState } from 'react';
import { sportsStore } from '../services/store';
import { Result, Event, Sport, School, Certificate } from '../types';
import { CertificateModal } from './CertificateModal';
import { Search, Trophy, Filter, Eye, Award, CheckCircle2, FileText, Users } from 'lucide-react';

export const PublicResultsView: React.FC<{ initialSchoolId?: string }> = ({ initialSchoolId }) => {
  const sports = sportsStore.getSports();
  const events = sportsStore.getEvents();
  const results = sportsStore.getResults().filter((r) => r.status === 'CONFIRMED');
  const schools = sportsStore.getSchools();
  const certificates = sportsStore.getCertificates();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('ALL');
  const [selectedSchool, setSelectedSchool] = useState(initialSchoolId || 'ALL');
  const [selectedMedal, setSelectedMedal] = useState('ALL');
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{ event: Event; result: Result } | null>(null);

  const filteredResults = results.filter((res) => {
    const ev = events.find((e) => e.id === res.event_id);
    const sp = sports.find((s) => s.id === ev?.sport_id);
    const sch = schools.find((s) => s.id === res.school_id);

    const matchesSearch =
      !searchQuery ||
      ev?.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp?.sport_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sch?.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.award.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSport = selectedSport === 'ALL' || ev?.sport_id === selectedSport;
    const matchesSchool = selectedSchool === 'ALL' || res.school_id === selectedSchool;
    const matchesMedal = selectedMedal === 'ALL' || res.medal === selectedMedal;

    return matchesSearch && matchesSport && matchesSchool && matchesMedal;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-black font-['Kanit'] text-slate-900">
          ผลการแข่งขันและการมอบรางวัล
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">
          ค้นหาผลการแข่งขันกีฬา เหรียญรางวัล และรายชื่อนักกีฬาที่ได้รับรางวัล
        </p>
      </div>

      {/* Filter Bar - Sleek Theme */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อรายการ, โรงเรียน, รางวัล..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
          >
            <option value="ALL">กีฬา: ทั้งหมด</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sport_name}
              </option>
            ))}
          </select>

          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
          >
            <option value="ALL">โรงเรียน: ทั้งหมด</option>
            {schools.map((sch) => (
              <option key={sch.id} value={sch.id}>
                {sch.school_name}
              </option>
            ))}
          </select>

          <select
            value={selectedMedal}
            onChange={(e) => setSelectedMedal(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
          >
            <option value="ALL">เหรียญ: ทั้งหมด</option>
            <option value="GOLD">🥇 เหรียญทอง</option>
            <option value="SILVER">🥈 เหรียญเงิน</option>
            <option value="BRONZE">🥉 เหรียญทองแดง</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>พบผลการแข่งขัน <strong>{filteredResults.length}</strong> รายการ</span>
          {(searchQuery || selectedSport !== 'ALL' || selectedSchool !== 'ALL' || selectedMedal !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSport('ALL');
                setSelectedSchool('ALL');
                setSelectedMedal('ALL');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Results Table - Sleek Theme */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
                <th className="py-3.5 px-4">ชนิดกีฬา / รายการ</th>
                <th className="py-3.5 px-4">โรงเรียนที่ได้รับรางวัล</th>
                <th className="py-3.5 px-4 text-center">อันดับ / รางวัล</th>
                <th className="py-3.5 px-4 text-center">เหรียญ</th>
                <th className="py-3.5 px-4">ผลการแข่งขัน / คะแนน</th>
                <th className="py-3.5 px-4 text-center">เกียรติบัตร / รายชื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredResults.map((res) => {
                const ev = events.find((e) => e.id === res.event_id);
                const sp = sports.find((s) => s.id === ev?.sport_id);
                const sch = schools.find((s) => s.id === res.school_id);
                const certs = certificates.filter(
                  (c) => c.event_id === res.event_id && c.school_id === res.school_id
                );

                return (
                  <tr key={res.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {sp?.sport_name}
                        </span>
                        <p className="font-bold text-slate-900 font-['Prompt'] mt-0.5 text-sm">
                          {ev?.event_name}
                        </p>
                        <span className="text-xs text-slate-500">
                          {ev?.age_group} ({ev?.grade})
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={sch?.logo}
                          alt={sch?.school_name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{sch?.school_name}</p>
                          <span className="text-xs text-slate-500">{sch?.short_name}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block font-bold text-slate-900 font-['Prompt'] text-sm">
                        {res.award}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {res.medal === 'GOLD' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          🥇 เหรียญทอง
                        </span>
                      )}
                      {res.medal === 'SILVER' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
                          🥈 เหรียญเงิน
                        </span>
                      )}
                      {res.medal === 'BRONZE' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100/60 text-amber-950 border border-amber-300/60">
                          🥉 เหรียญทองแดง
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>
                        {res.score ? <p className="font-bold text-slate-900">{res.score}</p> : '-'}
                        {res.note && <p className="text-slate-500 text-[11px]">{res.note}</p>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {certs.length > 0 ? (
                        <button
                          onClick={() => setViewingCert(certs[0])}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs border border-indigo-100"
                        >
                          <FileText className="w-3.5 h-3.5" /> ดูเกียรติบัตร ({certs.length})
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">ยังไม่ออกบัตร</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredResults.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-medium">ไม่พบผลการแข่งขันตามเงื่อนไขที่เลือก</p>
          </div>
        )}
      </div>

      {viewingCert && (
        <CertificateModal
          certificate={viewingCert}
          onClose={() => setViewingCert(null)}
        />
      )}
    </div>
  );
};
