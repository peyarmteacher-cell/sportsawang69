import React, { useState } from 'react';
import { sportsStore } from '../services/store';
import { User, Role } from '../types';
import { LogIn, KeyRound, ShieldCheck, UserCheck, School, X, Sparkles, CheckCircle2, Lock, Check } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mustChangeUser, setMustChangeUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const users = sportsStore.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const targetUser = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!targetUser) {
      setError('ไม่พบชื่อผู้ใช้งานหรือรหัส SMIS นี้ในระบบ');
      return;
    }

    if (targetUser.status === 'INACTIVE') {
      setError('บัญชีผู้ใช้นี้ถูกระงับการใช้งาน');
      return;
    }

    // Check if user must change password
    if (targetUser.must_change_password) {
      setMustChangeUser(targetUser);
      return;
    }

    sportsStore.setCurrentUser(targetUser);
    onSuccess(targetUser);
    onClose();
  };

  const handleChangePasswordAndLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mustChangeUser) return;
    setError('');

    if (newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword === '123456') {
      setError('กรุณาอย่าใช้รหัสผ่านเริ่มต้น (123456) เพื่อความปลอดภัย');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }

    const result = sportsStore.changeUserPassword(mustChangeUser.id, newPassword);
    if (result.success) {
      const updated = sportsStore.getUsers().find(u => u.id === mustChangeUser.id);
      if (updated) {
        sportsStore.setCurrentUser(updated);
        onSuccess(updated);
        onClose();
      }
    } else {
      setError(result.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    }
  };

  const handleQuickLogin = (uname: string) => {
    const targetUser = users.find((u) => u.username === uname);
    if (targetUser) {
      if (targetUser.must_change_password) {
        setMustChangeUser(targetUser);
      } else {
        sportsStore.setCurrentUser(targetUser);
        onSuccess(targetUser);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6 relative border border-slate-100 animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {mustChangeUser ? (
          /* Must Change Password View */
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold font-['Kanit'] text-slate-900">
                กรุณาเปลี่ยนรหัสผ่านใหม่
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-['Prompt']">
                บัญชี <b>{mustChangeUser.full_name}</b> เข้าสู่ระบบด้วยรหัสเริ่มต้น เพื่อความปลอดภัย กรุณากำหนดรหัสผ่านใหม่ของคุณ
              </p>
            </div>

            <form onSubmit={handleChangePasswordAndLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium flex items-center gap-2">
                  <span className="text-rose-500">⚠️</span> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กำหนดรหัสผ่านใหม่"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่อีกครั้ง
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMustChangeUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-all"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> บันทึกและเข้าสู่ระบบ
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Standard Login View */
          <>
            {/* Header */}
            <div className="text-center">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-600/20">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold font-['Kanit'] text-slate-900">
                เข้าสู่ระบบจัดการแข่งขัน
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-['Prompt']">
                ระบบบริหารจัดการแข่งขันกีฬากลุ่มโรงเรียนสว่างสูงกระสัง
              </p>
            </div>

            {/* Standard Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium flex items-center gap-2">
                  <span className="text-rose-500">⚠️</span> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน หรือ รหัสสถานศึกษา 8 หลัก
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น superadmin หรือ 31030064"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (รหัสเริ่มต้น: 123456)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer font-['Kanit']"
              >
                <LogIn className="w-4 h-4" />
                เข้าสู่ระบบ
              </button>
            </form>

            <div className="text-center text-[11px] text-slate-500">
              กลุ่มโรงเรียนสว่างสูงกระสัง (12 โรงเรียน) | รหัสผ่านเริ่มต้นคือ <span className="font-mono font-semibold text-slate-700">123456</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
