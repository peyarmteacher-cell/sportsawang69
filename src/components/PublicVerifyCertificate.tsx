import React, { useState, useEffect } from 'react';
import { sportsStore } from '../services/store';
import { Certificate } from '../types';
import { CertificateModal } from './CertificateModal';
import { Search, ShieldCheck, CheckCircle2, XCircle, FileText, School, Calendar, Award, QrCode } from 'lucide-react';
import { formatThaiDate } from '../utils/thaiFormatter';

interface PublicVerifyCertificateProps {
  initialToken?: string;
}

export const PublicVerifyCertificate: React.FC<PublicVerifyCertificateProps> = ({ initialToken }) => {
  const [query, setQuery] = useState(initialToken || '');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [searched, setSearched] = useState(false);
  const [viewingModalCert, setViewingModalCert] = useState<Certificate | null>(null);

  const certificates = sportsStore.getCertificates();

  useEffect(() => {
    if (initialToken) {
      handleSearchWith(initialToken);
    }
  }, [initialToken]);

  const handleSearchWith = (searchText: string) => {
    const clean = searchText.trim().toLowerCase();
    if (!clean) {
      setSelectedCert(null);
      setSearched(false);
      return;
    }

    const found = certificates.find((c) => {
      const matchNo = c.certificate_no.toLowerCase().includes(clean);
      const matchToken = c.qr_token.toLowerCase() === clean;
      const matchName = c.recipient_name.toLowerCase().includes(clean);
      const matchPlainNo = c.certificate_no.replace(/[^0-9]/g, '').includes(clean);
      return matchNo || matchToken || matchName || matchPlainNo;
    });

    setSelectedCert(found || null);
    setSearched(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchWith(query);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-indigo-50 text-indigo-700 rounded-2xl mb-3 border border-indigo-100 shadow-2xs">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black font-['Kanit'] text-slate-900">
          ตรวจสอบเกียรติบัตรออนไลน์ (E-Certificate Verification)
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1 max-w-xl mx-auto">
          ระบบตรวจสอบความถูกต้องของเกียรติบัตร การแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง ประจำปี 2569
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 mb-8">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="กรอกเลขที่เกียรติบัตร (เช่น สสก.2569-00001), QR Token หรือชื่อผู้ได้รับ..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            ตรวจสอบข้อมูล
          </button>
        </form>

        {/* Quick sample chips */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">ตัวอย่างทดสอบ:</span>
          {certificates.slice(0, 4).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setQuery(c.certificate_no);
                handleSearchWith(c.certificate_no);
              }}
              className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-transparent rounded-full transition-colors font-mono text-[11px] font-medium"
            >
              {c.certificate_no} ({c.recipient_name.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* Result Card */}
      {searched && (
        <div>
          {selectedCert ? (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-500/80 overflow-hidden animate-fadeIn">
              {/* Status Banner */}
              <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-100" />
                  <div>
                    <h3 className="font-bold text-base md:text-lg">✅ เกียรติบัตรฉบับนี้ถูกต้องและได้รับการรับรอง</h3>
                    <p className="text-xs text-emerald-100 font-mono">
                      Verification Token: {selectedCert.qr_token}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-3 py-1 bg-emerald-700/80 rounded-full font-bold border border-emerald-400/40">
                  ISSUED / มีผลบังคับใช้
                </span>
              </div>

              {/* Certificate Details */}
              <div className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">เลขที่เกียรติบัตร</span>
                        <p className="text-base font-bold text-slate-900 font-mono">
                          {selectedCert.certificate_no}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อผู้ได้รับเกียรติบัตร</span>
                        <p className="text-lg font-bold text-indigo-950 font-['Kanit']">
                          {selectedCert.recipient_name}
                        </p>
                        <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                          {selectedCert.recipient_type === 'STUDENT' ? 'นักเรียน / นักกีฬา' : 'ครูผู้ฝึกสอน'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <School className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">สถานศึกษา / สังกัด</span>
                        <p className="text-base font-bold text-slate-900 font-['Prompt']">
                          {selectedCert.school_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">รางวัลที่ได้รับ</span>
                        <p className="text-base font-bold text-amber-800">
                          {selectedCert.award}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">รายการแข่งขัน / ชนิดกีฬา</span>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedCert.event_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          ชนิดกีฬา: {selectedCert.sport_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่ออกเกียรติบัตร</span>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatThaiDate(selectedCert.issue_date, false)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    หน่วยงานผู้ออก: <strong>กลุ่มโรงเรียนสว่างสูงกระสัง สพป.บุรีรัมย์ เขต ๓ (สพป.บร.3)</strong>
                  </div>
                  <button
                    onClick={() => setViewingModalCert(selectedCert)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    ดูฉบับเต็ม / ดาวน์โหลด PDF
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border-2 border-rose-300 p-8 text-center animate-fadeIn">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-rose-900 font-['Kanit']">
                ❌ ไม่พบข้อมูลเกียรติบัตรในระบบ
              </h3>
              <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
                โปรดตรวจสอบความถูกต้องของเลขที่เกียรติบัตรหรือ QR Token อีกครั้ง
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {viewingModalCert && (
        <CertificateModal
          certificate={viewingModalCert}
          onClose={() => setViewingModalCert(null)}
        />
      )}
    </div>
  );
};
