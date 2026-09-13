import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Certificate } from '../types';
import { sportsStore } from '../services/store';
import { formatThaiDate, toThaiNumerals, formatSportNameWithPrefix, normalizeEducationLevel, formatEventRegistrationDisplay } from '../utils/thaiFormatter';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Share2, Cloud, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CertificateModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  autoDownload?: boolean;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose, autoDownload = false }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const hasAutoDownloadedRef = useRef(false);

  useEffect(() => {
    hasAutoDownloadedRef.current = false;
  }, [certificate?.id]);

  useEffect(() => {
    if (certificate) {
      const verifyUrl = `${window.location.origin}/?verify=${encodeURIComponent(certificate.qr_token)}`;
      QRCode.toDataURL(verifyUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#1e3a8a',
          light: '#ffffff'
        }
      })
        .then((url) => {
          setQrDataUrl(url);
          if (autoDownload && !hasAutoDownloadedRef.current) {
            hasAutoDownloadedRef.current = true;
            setTimeout(() => {
              handleDownloadPdf();
            }, 500);
          }
        })
        .catch(console.error);
    }
  }, [certificate, autoDownload]);

  if (!certificate) return null;

  const comp = sportsStore.getCurrentCompetition();
  const isStudent = certificate.recipient_type === 'STUDENT';
  const studentSlideId = comp.google_slide_template_student_id || comp.google_slide_template_id || '';
  const coachSlideId = comp.google_slide_template_coach_id || comp.google_slide_template_id || '';
  const activeSlideTemplateId = certificate.google_slide_template_id || (isStudent ? studentSlideId : coachSlideId);

  const thaiCertNo = toThaiNumerals(certificate.certificate_no);
  const thaiIssueDate = formatThaiDate(certificate.issue_date, true);

  const evObj = sportsStore.getEvents().find((e) => e.id === certificate.event_id);
  const sportObj = sportsStore.getSports().find((s) => s.id === evObj?.sport_id || s.sport_name === certificate.sport_name);
  const formattedSport = formatSportNameWithPrefix(certificate.sport_name || sportObj?.sport_name || 'กีฬา');
  const formattedLevel = normalizeEducationLevel(evObj?.grade || certificate.event_name);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!certRef.current) {
      return;
    }
    try {
      setIsGeneratingPdf(true);
      const element = certRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const fileName = `${certificate.certificate_no}_${certificate.recipient_name.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSyncToDrive = async () => {
    const endpoint = comp.google_apps_script_url?.trim();
    const folderId = comp.google_drive_folder_id?.trim();
    const templateId = activeSlideTemplateId?.trim();

    if (!endpoint || !folderId || !templateId) {
      setSyncSuccess(false);
      alert('กรุณาตั้งค่า Google Apps Script URL, Google Drive Folder ID และ Google Slides Template ID ที่เมนู “เชื่อมต่อ Cloud/GAS” ก่อนออกเกียรติบัตร');
      return;
    }

    setIsSyncingDrive(true);
    setSyncSuccess(false);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'GENERATE_CERTIFICATE',
          folder_id: folderId,
          template_id: templateId,
          recipient_type: certificate.recipient_type,
          certificate_no: certificate.certificate_no,
          recipient_name: certificate.recipient_name,
          school_name: certificate.school_name,
          award: certificate.award,
          event_name: certificate.event_name,
          sport_name: certificate.sport_name,
          academic_year: comp.academic_year || comp.year?.toString() || '',
          issue_date: certificate.issue_date,
          president_name: comp.president_name || '',
          director_name: comp.director_name || '',
          verify_url: `${window.location.origin}/?verify=${encodeURIComponent(certificate.qr_token)}`
        })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result || result.status !== 'SUCCESS' || !result.drive_file_id || !result.pdf_url) {
        throw new Error(result?.message || 'Google Apps Script ไม่สามารถสร้างไฟล์ PDF ได้');
      }

      sportsStore.updateCertificate(certificate.id, {
        drive_file_id: result.drive_file_id,
        drive_url: result.pdf_url,
        google_slide_template_id: templateId,
        slide_url: `https://docs.google.com/presentation/d/${templateId}/edit`
      });
      setSyncSuccess(true);
    } catch (error) {
      console.error('Google Drive certificate sync failed:', error);
      alert(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อ Google Apps Script ได้');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header Action Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-lg font-['Kanit']">เกียรติบัตรออนไลน์ (E-Certificate)</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isStudent
                    ? 'bg-blue-950 text-blue-300 border border-blue-600/50'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                }`}>
                  {isStudent ? '🎓 เกียรติบัตรนักเรียน' : '👨‍🏫 เกียรติบัตรครูผู้ฝึกสอน'}
                </span>
                {activeSlideTemplateId && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                    แม่แบบ ID: {activeSlideTemplateId.substring(0, 12)}...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                เลขที่: {certificate.certificate_no} | {certificate.recipient_name} ({formattedSport} • {formattedLevel})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {certificate.drive_url && (
              <a
                href={certificate.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-xs md:text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                title="ดาวน์โหลดไฟล์ PDF จาก Google Drive"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                PDF (Google Drive)
              </a>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 text-xs md:text-sm font-bold bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="ดาวน์โหลดเกียรติบัตรเป็นไฟล์ PDF ทันที"
            >
              <Download className="w-4 h-4" />
              {isGeneratingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs md:text-sm font-bold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="พิมพ์ หรือ บันทึกเป็นไฟล์ PDF"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / สั่งพิมพ์ PDF
            </button>

            <button
              onClick={handleSyncToDrive}
              disabled={isSyncingDrive}
              className="px-3 py-2 text-xs md:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-700 disabled:opacity-50 cursor-pointer"
              title="ส่งคำขอให้ Google Apps Script บันทึก PDF ลงโฟลเดอร์ Google Drive"
            >
              <Cloud className="w-4 h-4 text-sky-400" />
              {isSyncingDrive ? 'กำลังส่ง...' : syncSuccess ? 'บันทึกสำเร็จ!' : 'ซิงค์ลง Drive'}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Display Canvas View */}
        <div className="p-4 md:p-8 bg-slate-100 overflow-x-auto flex justify-center items-center flex-1">
          <div
            ref={certRef}
            id="certificate-print-canvas"
            className="w-[880px] h-[620px] bg-gradient-to-br from-amber-50/70 via-white to-amber-50/50 p-8 relative flex flex-col justify-between shadow-lg border-[10px] border-double border-amber-600/80 rounded-sm text-slate-900 select-none shrink-0"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(254, 252, 232, 0.7) 100%)`
            }}
          >
              {/* Thai Royal / Educational Ornate Borders */}
              <div className="absolute inset-2 border-2 border-amber-700/60 pointer-events-none" />
              <div className="absolute inset-3 border border-amber-500/40 pointer-events-none" />

              {/* Corner Ornaments */}
              <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-700 pointer-events-none" />
              <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-700 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-700 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-700 pointer-events-none" />

              {/* Header: Logo and Title */}
              <div className="text-center pt-2 relative z-10">
                <div className="flex justify-center items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-600 flex items-center justify-center shadow-inner overflow-hidden">
                    <span className="text-3xl">🏆</span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold font-['Kanit'] text-slate-900 tracking-wide">
                  {sportsStore.getCurrentCompetition().competition_name}
                </h2>
                <p className="text-sm font-medium text-slate-700">
                  {sportsStore.getCurrentCompetition().host_org}
                </p>

                <div className="mt-3 flex items-center justify-center gap-4">
                  <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-700 to-transparent" />
                  <p className="text-base font-bold text-amber-900 font-['Sarabun'] tracking-wide">
                    ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า
                  </p>
                  <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-700 to-transparent" />
                </div>
              </div>

              {/* Recipient and Achievement Details */}
              <div className="text-center py-2 relative z-10 my-auto">
                <h1 className="text-3xl md:text-4xl font-bold text-blue-950 font-['Sarabun'] mb-2 drop-shadow-sm">
                  {certificate.recipient_name}
                </h1>
                <p className="text-lg font-semibold text-slate-800 font-['Prompt']">
                  {certificate.school_name}
                </p>

                <div className="my-3 max-w-2xl mx-auto py-2.5 px-6 bg-amber-100/50 rounded-xl border border-amber-300/60 shadow-xs">
                  <p className="text-xl font-bold text-amber-950 font-['Sarabun']">
                    {certificate.award}
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-1 font-['Prompt']">
                    ประเภท : <span className="text-blue-900 font-extrabold">{formattedSport}</span> • ระดับชั้น : <span className="text-blue-900 font-extrabold">{formattedLevel}</span>
                  </p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    รายการแข่งขัน : {formatEventRegistrationDisplay(certificate.event_name, evObj?.grade, certificate.sport_name || sportObj?.sport_name)}
                  </p>
                </div>

                <p className="text-sm text-slate-700 font-['Prompt']">
                  {sportsStore.getCurrentCompetition().competition_name}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  ให้ไว้ ณ วันที่ {thaiIssueDate}
                </p>
              </div>

              {/* Bottom Row: Signatures, Seal & QR Verification */}
              <div className="pt-2 relative z-10 flex items-end justify-between border-t border-amber-200/60 px-4">
                {/* Left Signatory */}
                <div className="text-center flex-1 max-w-[240px]">
                  <div className="h-10 flex items-end justify-center">
                    <span className="font-['Kanit'] text-lg text-blue-900 italic font-semibold border-b border-dotted border-slate-500 pb-1 px-4">
                      {sportsStore.getCurrentCompetition().president_name || 'สมเกียรติ สว่างวงศ์'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    ({sportsStore.getCurrentCompetition().president_name || 'นายสมเกียรติ สว่างวงศ์'})
                  </p>
                  <p className="text-[11px] text-slate-600">ประธานคณะกรรมการจัดการแข่งขัน</p>
                </div>

                {/* Center: QR Code & Official No */}
                <div className="flex flex-col items-center justify-center px-4">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Certificate QR Verification"
                      className="w-16 h-16 p-1 bg-white border border-amber-300 rounded shadow-xs mb-1"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 animate-pulse rounded" />
                  )}
                  <span className="text-[10px] font-mono text-slate-600 font-semibold tracking-tight">
                    เลขที่ {thaiCertNo}
                  </span>
                  <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> ตรวจสอบได้
                  </span>
                  {activeSlideTemplateId && (
                    <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                      Slide Tpl: {activeSlideTemplateId.substring(0, 10)}...
                    </span>
                  )}
                </div>

                {/* Right Signatory */}
                <div className="text-center flex-1 max-w-[240px]">
                  <div className="h-10 flex items-end justify-center">
                    <span className="font-['Kanit'] text-lg text-blue-900 italic font-semibold border-b border-dotted border-slate-500 pb-1 px-4">
                      {sportsStore.getCurrentCompetition().director_name || 'ผู้อำนวยการเขตพื้นที่ฯ'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    ({sportsStore.getCurrentCompetition().director_name || 'ผู้อำนวยการเขตพื้นที่การศึกษา'})
                  </p>
                  <p className="text-[11px] text-slate-600">{sportsStore.getCurrentCompetition().host_org}</p>
                </div>
              </div>
            </div>
          </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500">QR Token: {certificate.qr_token}</span>
            {activeSlideTemplateId && (
              <span className="font-mono text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300 text-[11px]">
                📄 แม่แบบ ID: {activeSlideTemplateId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>สถานะ: <strong className="text-emerald-600">ออกเกียรติบัตรแล้ว (ISSUED)</strong></span>
            {certificate.drive_file_id && (
              <span className="text-sky-600 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5" /> ซิงค์ Google Drive แล้ว
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
