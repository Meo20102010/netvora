'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useTranslation } from '@/i18n';
import toast from 'react-hot-toast';
import {
  HiCog6Tooth, HiGlobeAlt, HiCreditCard, HiServer,
  HiCheck, HiPaintBrush, HiShieldCheck,
} from 'react-icons/hi2';

type Tab = 'general' | 'appearance' | 'subscription' | 'email' | 'system';

export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [saving, setSaving] = useState<string | null>(null);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'general', label: t('admin.general'), icon: HiGlobeAlt },
    { key: 'appearance', label: t('admin.appearance'), icon: HiPaintBrush },
    { key: 'subscription', label: t('admin.subscription_settings'), icon: HiCreditCard },
    { key: 'email', label: t('admin.smtp_settings'), icon: HiServer },
    { key: 'system', label: t('admin.maintenance_mode'), icon: HiShieldCheck },
  ];

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await adminApi.getSettings();
      if (res.data.success) {
        const settingsMap: Record<string, string> = {};
        (res.data.data || []).forEach((s: any) => { settingsMap[s.key] = s.value; });
        setSettings(settingsMap);
      }
    } catch { toast.error(t('admin.settings_load_error')); }
    finally { setLoading(false); }
  };

  const updateSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      await adminApi.updateSettings({ key, value });
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success(t('admin.setting_updated'));
    } catch { toast.error(t('admin.setting_update_failed')); }
    finally { setTimeout(() => setSaving(null), 500); }
  };

  const inputClass = "w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30 transition-all";
  const labelClass = "text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-white/[0.03] rounded-lg animate-pulse" />
        <div className="h-12 bg-white/[0.03] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('admin.site_settings')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('admin.manage_settings')}</p>
      </div>

      <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/[0.04] rounded-2xl mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[#E50914] text-white shadow-lg shadow-red-900/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <HiGlobeAlt className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">{t('admin.site_info')}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('admin.site_name')}</label>
                <div className="relative">
                  <input className={inputClass} value={settings.site_name || ''} onChange={e => updateSetting('site_name', e.target.value)} />
                  {saving === 'site_name' && <div className="absolute right-3 top-1/2 -translate-y-1/2"><HiCheck className="w-4 h-4 text-green-400" /></div>}
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('admin.site_description')}</label>
                <textarea className={`${inputClass} h-24 resize-none`} value={settings.site_description || ''} onChange={e => updateSetting('site_description', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <HiPaintBrush className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">{t('admin.visual_settings')}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('admin.site_settings')} URL</label>
                <input className={inputClass} value={settings.site_logo || ''} onChange={e => updateSetting('site_logo', e.target.value)} />
                {settings.site_logo && <img src={settings.site_logo} alt="" className="mt-2 h-12 rounded-lg object-contain bg-white/[0.04] p-2" />}
              </div>
              <div>
                <label className={labelClass}>Favicon URL</label>
                <input className={inputClass} value={settings.site_favicon || ''} onChange={e => updateSetting('site_favicon', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <HiGlobeAlt className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">{t('admin.language_currency')}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('admin.default_language')}</label>
                <select className={inputClass} value={settings.default_language || 'tr'} onChange={e => updateSetting('default_language', e.target.value)}>
                  <option value="tr">Türkçe</option><option value="en">English</option><option value="ar">العربية</option>
                  <option value="de">Deutsch</option><option value="fr">Français</option><option value="es">Español</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('admin.default_currency')}</label>
                <select className={inputClass} value={settings.currency || 'TRY'} onChange={e => updateSetting('currency', e.target.value)}>
                  <option value="TRY">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                  <option value="GBP">GBP</option><option value="RUB">RUB</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6 max-w-2xl">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <HiPaintBrush className="w-4 h-4 text-pink-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">{t('admin.theme_settings')}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>{t('admin.primary_color')}</label>
              <div className="flex gap-3">
                {['#E50914', '#6366f1', '#22c55e', '#f59e0b', '#ec4899'].map(color => (
                  <button
                    key={color}
                    onClick={() => updateSetting('primary_color', color)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all ${settings.primary_color === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscription' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-green-500/10">
                <HiCreditCard className="w-4 h-4 text-green-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">{t('admin.subscription_settings')}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('admin.premium_price')}</label>
                <input className={inputClass} type="number" value={settings.subscription_price || '200'} onChange={e => updateSetting('subscription_price', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t('admin.subscription_duration')}</label>
                <input className={inputClass} type="number" value={settings.subscription_days || '30'} onChange={e => updateSetting('subscription_days', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6 max-w-2xl">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <HiServer className="w-4 h-4 text-cyan-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">{t('admin.smtp_settings')}</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('admin.smtp_host')}</label>
                <input className={inputClass} placeholder="smtp.example.com" value={settings.smtp_host || ''} onChange={e => updateSetting('smtp_host', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t('admin.smtp_port')}</label>
                <input className={inputClass} type="number" placeholder="587" value={settings.smtp_port || '587'} onChange={e => updateSetting('smtp_port', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('admin.smtp_user')}</label>
              <input className={inputClass} placeholder={t('admin.smtp_user')} value={settings.smtp_user || ''} onChange={e => updateSetting('smtp_user', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t('admin.smtp_password')}</label>
              <input className={inputClass} type="password" placeholder="******" value={settings.smtp_pass || ''} onChange={e => updateSetting('smtp_pass', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t('admin.sender_email')}</label>
              <input className={inputClass} placeholder="noreply@ornek.com" value={settings.smtp_from || ''} onChange={e => updateSetting('smtp_from', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-red-500/10">
                <HiShieldCheck className="w-4 h-4 text-red-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">{t('admin.maintenance_mode')}</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">{t('admin.toggle_maintenance')}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{t('admin.maintenance_desc')}</p>
              </div>
              <button
                onClick={() => updateSetting('maintenance_mode', settings.maintenance_mode === 'true' ? 'false' : 'true')}
                className={`relative w-12 h-6 rounded-full transition-all ${settings.maintenance_mode === 'true' ? 'bg-[#E50914]' : 'bg-white/10'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.maintenance_mode === 'true' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            {settings.maintenance_mode === 'true' && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                  <HiShieldCheck className="w-3.5 h-3.5" />
                  {t('admin.site_in_maintenance')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-700">{t('admin.auto_save')}</p>
      </div>
    </div>
  );
}
