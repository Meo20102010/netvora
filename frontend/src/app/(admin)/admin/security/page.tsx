'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import PageTransition from '@/components/ui/PageTransition';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  HiShieldCheck, HiKey, HiClock, HiDevicePhoneMobile, HiComputerDesktop,
  HiGlobeAlt, HiNoSymbol, HiTrash, HiCheckCircle, HiExclamationTriangle,
  HiArrowPath, HiEyeSlash, HiLockClosed,
} from 'react-icons/hi2';

export default function SecurityPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('2fa');
  const [loading, setLoading] = useState(true);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAInput, setTwoFAInput] = useState('');
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [histRes, devRes, ipRes] = await Promise.allSettled([
        api.get('/security/login-history'),
        api.get('/security/devices'),
        api.get('/security/blocked-ips'),
      ]);

      if (histRes.status === 'fulfilled' && histRes.value.data.success) {
        setLoginHistory(histRes.value.data.data);
      }
      if (devRes.status === 'fulfilled' && devRes.value.data.success) {
        setDevices(devRes.value.data.data);
      }
      if (ipRes.status === 'fulfilled' && ipRes.value.data.success) {
        setBlockedIps(ipRes.value.data.data);
      }
    } catch {}
    setLoading(false);
  };

  const handleEnable2FA = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/security/2fa/enable');
      if (res.data.success) {
        setTwoFACode(res.data.data.code);
        toast.success('2FA secret generated. Enter the code to verify.');
      }
    } catch { toast.error('Failed to enable 2FA'); }
    setActionLoading(false);
  };

  const handleVerify2FA = async () => {
    if (!twoFAInput) { toast.error('Enter the verification code'); return; }
    setActionLoading(true);
    try {
      const res = await api.post('/security/2fa/verify', { code: twoFAInput });
      if (res.data.success) {
        setTwoFAEnabled(true);
        setTwoFACode('');
        setTwoFAInput('');
        toast.success('2FA enabled successfully');
      }
    } catch { toast.error('Invalid code'); }
    setActionLoading(false);
  };

  const handleDisable2FA = async () => {
    if (!twoFAInput) { toast.error('Enter your code to disable 2FA'); return; }
    setActionLoading(true);
    try {
      const res = await api.post('/security/2fa/disable', { code: twoFAInput });
      if (res.data.success) {
        setTwoFAEnabled(false);
        setTwoFAInput('');
        toast.success('2FA disabled');
      }
    } catch { toast.error('Invalid code'); }
    setActionLoading(false);
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      const res = await api.delete(`/security/devices/${id}`);
      if (res.data.success) {
        setDevices(devices.filter(d => d.id !== id));
        toast.success('Session revoked');
      }
    } catch { toast.error('Failed to revoke session'); }
  };

  const handleBlockIp = async () => {
    if (!ipInput) { toast.error('Enter an IP address'); return; }
    setActionLoading(true);
    try {
      const res = await api.post('/security/block-ip', { ip: ipInput });
      if (res.data.success) {
        setBlockedIps(res.data.data.blockedIps);
        setIpInput('');
        toast.success('IP blocked');
      }
    } catch { toast.error('Failed to block IP'); }
    setActionLoading(false);
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      const res = await api.delete(`/security/blocked-ips/${encodeURIComponent(ip)}`);
      if (res.data.success) {
        setBlockedIps(res.data.data.blockedIps);
        toast.success('IP unblocked');
      }
    } catch { toast.error('Failed to unblock IP'); }
  };

  const tabs = [
    { id: '2fa', label: t('security.two_factor'), icon: <HiKey className="w-4 h-4" /> },
    { id: 'history', label: t('security.login_history'), icon: <HiClock className="w-4 h-4" />, count: loginHistory.length },
    { id: 'devices', label: t('security.devices'), icon: <HiDevicePhoneMobile className="w-4 h-4" />, count: devices.length },
    { id: 'ips', label: t('security.ip_blocking'), icon: <HiGlobeAlt className="w-4 h-4" />, count: blockedIps.length },
  ];

  return (
    <PageTransition className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-red-500/10">
          <HiShieldCheck className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('security.session_management')}</h1>
          <p className="text-sm text-gray-600 mt-0.5">{t('security.two_factor')} &bull; {t('security.devices')}</p>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === '2fa' && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <HiLockClosed className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">{t('security.two_factor')}</h3>
            <Badge variant={twoFAEnabled ? 'success' : 'warning'} dot>{twoFAEnabled ? t('admin.active') : t('admin.inactive')}</Badge>
          </div>

          {!twoFAEnabled ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Two-factor authentication adds an extra layer of security to your account.</p>

              {!twoFACode ? (
                <button
                  onClick={handleEnable2FA}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-[#E50914] hover:bg-[#f40612] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? '...' : t('security.2fa_enable')}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <p className="text-xs text-gray-500 mb-1">Verification Code</p>
                    <p className="text-lg font-mono font-bold text-white tracking-widest">{twoFACode}</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={twoFAInput}
                      onChange={(e) => setTwoFAInput(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]"
                      maxLength={6}
                    />
                    <button
                      onClick={handleVerify2FA}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {t('security.2fa_verify')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <HiCheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <p className="text-sm text-green-400">Two-factor authentication is active</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={twoFAInput}
                  onChange={(e) => setTwoFAInput(e.target.value)}
                  placeholder="Enter code to disable"
                  className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]"
                  maxLength={6}
                />
                <button
                  onClick={handleDisable2FA}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {t('security.2fa_disable')}
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === 'history' && (
        <GlassCard className="overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.04]">
            <h3 className="text-sm font-semibold text-white">{t('security.login_history')}</h3>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} height="40px" />)}
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="p-8 text-center">
              <HiClock className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No login history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Device</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {loginHistory.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 text-sm text-white font-mono">{entry.ipAddress || 'N/A'}</td>
                      <td className="px-6 py-3 text-sm text-gray-400 max-w-[200px] truncate">{entry.userAgent || 'Unknown'}</td>
                      <td className="px-6 py-3">
                        <Badge variant={entry.success ? 'success' : 'danger'} dot size="sm">
                          {entry.success ? 'Success' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {new Date(entry.createdAt).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === 'devices' && (
        <GlassCard className="overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.04]">
            <h3 className="text-sm font-semibold text-white">{t('security.session_management')}</h3>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} height="60px" />)}
            </div>
          ) : devices.length === 0 ? (
            <div className="p-8 text-center">
              <HiDevicePhoneMobile className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No active sessions</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="p-2.5 rounded-xl bg-white/[0.04]">
                    <HiComputerDesktop className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{device.userAgent || 'Unknown Device'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 font-mono">{device.ipAddress || 'N/A'}</span>
                      <span className="text-xs text-gray-600">
                        {new Date(device.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeDevice(device.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <HiTrash className="w-3.5 h-3.5" />
                    {t('security.revoke_device')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === 'ips' && (
        <div className="space-y-4">
          <GlassCard className="p-6">
            <h3 className="text-sm font-semibold text-white mb-4">{t('security.block_ip')}</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="192.168.1.1"
                className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]"
              />
              <button
                onClick={handleBlockIp}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <HiNoSymbol className="w-4 h-4" />
                {t('security.block_ip')}
              </button>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-white">{t('security.blocked_ips')}</h3>
            </div>
            {blockedIps.length === 0 ? (
              <div className="p-8 text-center">
                <HiGlobeAlt className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No blocked IPs</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {blockedIps.map((ip) => (
                  <div key={ip} className="flex items-center gap-4 px-6 py-3 hover:bg-white/[0.02] transition-colors">
                    <HiNoSymbol className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm text-white font-mono flex-1">{ip}</span>
                    <button
                      onClick={() => handleUnblockIp(ip)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
                    >
                      <HiArrowPath className="w-3.5 h-3.5" />
                      {t('security.unblock_ip')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <HiExclamationTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">{t('security.rate_limiting')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <p className="text-xs text-gray-500">General API</p>
                <p className="text-sm font-medium text-white">100 req/min</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <p className="text-xs text-gray-500">Auth API</p>
                <p className="text-sm font-medium text-white">10 req/min</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <p className="text-xs text-gray-500">Upload API</p>
                <p className="text-sm font-medium text-white">5 req/min</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </PageTransition>
  );
}
