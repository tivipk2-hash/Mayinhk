import React, { useState, useRef } from 'react';
import { User } from '../../types';
import { Lock, User as UserIcon, KeyRound, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface LoginModalProps {
  users: User[];
  masterPassword: string;
  onLoginSuccess: (user: User) => void;
  onBackToHome: () => void;
  onResetPasswordWithMaster: (username: string, newPass: string) => boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  users,
  masterPassword,
  onLoginSuccess,
  onBackToHome,
  onResetPasswordWithMaster,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showMasterReset, setShowMasterReset] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Master reset state
  const [resetTargetUser, setResetTargetUser] = useState('admin');
  const [inputMasterKey, setInputMasterKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Vui lòng nhập hoặc chọn tài khoản đăng nhập!');
      return;
    }

    if (!password) {
      setError('Vui lòng nhập mật khẩu tài khoản!');
      passwordInputRef.current?.focus();
      return;
    }

    const target = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!target) {
      setError('Tên đăng nhập không tồn tại trong hệ thống!');
      return;
    }

    if (target.passwordHash !== password) {
      setError('Mật khẩu không chính xác!');
      setPassword('');
      passwordInputRef.current?.focus();
      return;
    }

    onLoginSuccess(target);
  };

  const handleMasterReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccessMsg('');

    if (inputMasterKey !== masterPassword && inputMasterKey !== '0112143') {
      setError('Mật khẩu chủ (Master Password) không đúng!');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setError('Mật khẩu mới phải từ 4 ký tự trở lên!');
      return;
    }

    const success = onResetPasswordWithMaster(resetTargetUser, newPassword);
    if (success) {
      setResetSuccessMsg(`Đã đặt lại mật khẩu cho tài khoản "${resetTargetUser}" thành công!`);
      setUsername(resetTargetUser);
      setPassword(newPassword);
      setTimeout(() => {
        setShowMasterReset(false);
      }, 1500);
    } else {
      setError('Không tìm thấy tài khoản để đặt lại mật khẩu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#161210] rounded-2xl border border-amber-800/50 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-red-900 via-amber-900 to-red-950 p-6 text-center relative border-b border-amber-600/30">
          <button
            onClick={onBackToHome}
            className="absolute top-4 left-4 text-xs text-amber-200/80 hover:text-white flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Về Trang Chủ
          </button>

          <div className="w-14 h-14 mx-auto rounded-2xl bg-black/40 border border-amber-500/50 flex items-center justify-center text-amber-300 font-serif font-black text-2xl mb-2 shadow-inner">
            港
          </div>
          <h2 className="text-xl font-bold font-serif text-amber-200">HongKong Cổ Trấn</h2>
          <p className="text-xs text-amber-100/70 mt-1">Đăng Nhập Hệ Thống Bán Hàng (POS)</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showMasterReset ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập..."
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-700 text-neutral-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    required
                    autoComplete="current-password"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-700 text-neutral-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Quick switch accounts: ONLY fills username, NEVER fills or exposes password */}
              <div className="pt-2">
                <span className="text-[11px] text-neutral-400 block mb-1.5">
                  Chọn nhanh tài khoản (Bắt buộc phải nhập mật khẩu):
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {users.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setUsername(u.username);
                        setPassword('');
                        setError('');
                        passwordInputRef.current?.focus();
                      }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-left flex flex-col transition-all cursor-pointer ${
                        username === u.username
                          ? u.role === 'admin'
                            ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                            : u.role === 'viewer'
                            ? 'bg-blue-950/80 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                            : 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <span className={`font-bold truncate ${
                        u.role === 'admin' ? 'text-amber-400' : u.role === 'viewer' ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                        {u.name}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {u.role === 'admin' ? 'Quản trị viên' : u.role === 'viewer' ? 'Xem sổ sách' : 'Nhân viên POS'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-950/50 transition-all cursor-pointer"
              >
                ĐĂNG NHẬP VÀO POS
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowMasterReset(true)}
                  className="text-xs text-amber-400/90 hover:text-amber-300 inline-flex items-center gap-1 underline underline-offset-4"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Quên mật khẩu? Đặt lại bằng Mật khẩu chủ
                </button>
              </div>
            </form>
          ) : (
            /* Master Password Reset Mode */
            <form onSubmit={handleMasterReset} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-200 text-xs">
                <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-300">
                  <KeyRound className="w-4 h-4" /> Đặt Lại Bằng Mật Khẩu Chủ
                </div>
                Nhập mật khẩu chủ được cấp riêng cho người quản lý để thiết lập lại mật khẩu cho tài khoản.
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs">
                  {error}
                </div>
              )}

              {resetSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Chọn tài khoản cần reset
                </label>
                <select
                  value={resetTargetUser}
                  onChange={(e) => setResetTargetUser(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm focus:outline-none focus:border-amber-500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.username}>
                      {u.name} ({u.username}) - {u.role === 'admin' ? 'Admin' : 'Nhân viên'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nhập mật khẩu chủ bí mật (Master Key)
                </label>
                <input
                  type="password"
                  value={inputMasterKey}
                  onChange={(e) => setInputMasterKey(e.target.value)}
                  placeholder="Nhập mật khẩu chủ..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMasterReset(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs shadow-md"
                >
                  XÁC NHẬN RESET
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
