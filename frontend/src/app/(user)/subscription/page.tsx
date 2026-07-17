'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { ibanPaymentApi, userApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { PageTransition, GlassCard, Badge, GradientButton, ProgressBar } from '@/components/ui';
import {
  HiCheck, HiArrowLeft, HiTrophy, HiSparkles, HiCreditCard,
  HiArrowUpTray, HiClock, HiClipboardDocumentCheck,
  HiCheckCircle, HiDocumentText, HiBanknotes, HiShieldCheck,
  HiExclamationTriangle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Plan { name: string; price: number; duration: number; key: string; popular?: boolean; }
interface IbanInfo { iban: string; bankName: string; ownerName: string; }

const plans: Plan[] = [
  { name: 'Aylik', price: 200, duration: 30, key: 'monthly' },
  { name: '3 Aylik', price: 500, duration: 90, key: 'quarterly', popular: true },
  { name: 'Yillik', price: 1500, duration: 365, key: 'yearly' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

const timelineSteps = ['timeline_created', 'timeline_receipt', 'timeline_review', 'timeline_approved'] as const;

type SubmissionStep = 'SELECT_PLAN' | 'FILL_INFO' | 'SUBMITTING' | 'DONE';

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [ibanInfo, setIbanInfo] = useState<IbanInfo | null>(null);

  const [activePayment, setActivePayment] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('NONE');

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState<SubmissionStep>('SELECT_PLAN');
  const [countdown, setCountdown] = useState(1800);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/'); return; }
    loadData();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [isAuthenticated, router]);

  // Poll for status changes every 10 seconds
  useEffect(() => {
    if (!activePayment) return;
    if (paymentStatus !== 'PENDING' && paymentStatus !== 'RECEIVED') return;
    const interval = setInterval(() => {
      loadMyPayments();
    }, 10000);
    return () => clearInterval(interval);
  }, [activePayment?.id, paymentStatus]);

  const loadData = async () => {
    try {
      const [subRes] = await Promise.allSettled([
        userApi.getSubscription(),
        loadIbanInfo(),
        loadMyPayments(),
      ]);
      if (subRes.status === 'fulfilled' && subRes.value.data.success && subRes.value.data.data?.status === 'ACTIVE') {
        setHasSubscription(true);
        setSubscriptionEnd(subRes.value.data.data.endDate);
      }
    } catch {}
    setLoading(false);
  };

  const loadIbanInfo = async () => {
    try {
      const res = await ibanPaymentApi.getIbanInfo();
      if (res.data.success) setIbanInfo(res.data.data);
    } catch {}
  };

  const loadMyPayments = async () => {
    try {
      const res = await ibanPaymentApi.getMyPayments();
      if (res.data.success) {
        const payments = res.data.data?.payments || res.data.data || [];
        const latest = payments[0];
        if (latest) {
          setActivePayment(latest);
          setPaymentStatus(latest.status);
          const plan = plans.find(p => p.price === latest.amount);
          if (plan) setSelectedPlan(plan);

          if (latest.status === 'PENDING' || latest.status === 'RECEIVED') {
            setStep('DONE');
            startCountdown();
          } else if (latest.status === 'APPROVED' || latest.status === 'REJECTED') {
            setStep('DONE');
            if (countdownRef.current) clearInterval(countdownRef.current);
          } else {
            setStep('DONE');
          }
        }
      }
    } catch {}
  };

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(1800);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSelectPlan = (plan: Plan) => {
    if (paymentStatus === 'PENDING' || paymentStatus === 'RECEIVED') {
      toast.error('Zaten bekleyen bir odemeniz var');
      return;
    }
    setSelectedPlan(plan);
    setStep('FILL_INFO');
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setActivePayment(null);
    setPaymentStatus('NONE');
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!ibanInfo) loadIbanInfo();
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(t('payment.iban_copied'));
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Gorsel veya PDF dosyasi secin');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dosya boyutu 10MB dan kucuk olmali');
      return;
    }
    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
    } else {
      setReceiptPreviewUrl(null);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedPlan || !receiptFile) return;
    setSubmitting(true);
    try {
      const createRes = await ibanPaymentApi.createPayment({
        amount: selectedPlan.price,
        packageName: selectedPlan.name,
        duration: selectedPlan.duration,
        currency: 'TRY',
      });
      if (!createRes.data.success) {
        toast.error(createRes.data.message || 'Odeme talebi olusturulamadi');
        return;
      }
      const paymentId = createRes.data.data.id;
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(receiptFile);
      });
      const uploadRes = await ibanPaymentApi.uploadReceipt(paymentId, {
        receiptData: base64,
        receiptMime: receiptFile.type,
        receiptFilename: receiptFile.name,
      });
      if (!uploadRes.data.success) {
        toast.error('Dekont yuklenemedi');
        return;
      }
      setActivePayment(createRes.data.data);
      setPaymentStatus('RECEIVED');
      setStep('DONE');
      startCountdown();
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      toast.success('Dekontunuz basariyla gonderildi! Admin incelemesinde.');
    } catch {
      toast.error('Bir hata olustu, lutfen tekrar deneyin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectNewPlan = () => {
    setSelectedPlan(null);
    setActivePayment(null);
    setPaymentStatus('NONE');
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setStep('SELECT_PLAN');
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getTimelineIndex = () => {
    switch (paymentStatus) {
      case 'NONE': return -1;
      case 'PENDING': return 0;
      case 'RECEIVED': return 1;
      case 'APPROVED': return 3;
      case 'REJECTED': return 1;
      default: return 0;
    }
  };
  const timelineIndex = getTimelineIndex();

  const daysLeft = hasSubscription && subscriptionEnd
    ? Math.max(0, Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const totalDays = 30;
  const trialPercent = Math.min(Math.max((daysLeft / totalDays) * 100, 0), 100);

  if (!isAuthenticated) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <main className="pt-24 pb-16 px-6 md:px-12 max-w-5xl mx-auto">
          <Link href="/browse" className="flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors mb-6 w-fit">
            <HiArrowLeft className="w-5 h-5" /> {t('common.back')}
          </Link>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <motion.div animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
              <HiTrophy className="w-12 h-12 text-[#E50914] mx-auto mb-4" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{t('subscription.title')}</h1>
            <p className="text-[#808080] max-w-lg mx-auto">Sinirsiz film ve dizi keyfi icin premium paketlerimizi kesfedin.</p>
          </motion.div>

          {/* Active Subscription */}
          <AnimatePresence>
            {hasSubscription && subscriptionEnd && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-md mx-auto mb-8">
                <GlassCard hover={false} className="p-6 text-center bg-green-500/5 border-green-500/20">
                  <HiCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-semibold">Premium uyeliginiz aktif</p>
                  <p className="text-sm text-[#808080] mb-4">Bitis: {new Date(subscriptionEnd).toLocaleDateString('tr-TR')}</p>
                  <ProgressBar value={trialPercent} showLabel color="linear-gradient(90deg, #22c55e 0%, #16a34a 100%)" />
                  <p className="text-xs text-[#808080] mt-2">{daysLeft} {t('subscription.days_left')}</p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════ */}
          {/* ADIM 1: Paket Sec                       */}
          {/* ═══════════════════════════════════════ */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <HiCreditCard className="w-5 h-5 text-[#E50914]" />
              {t('subscription.select_package')}
            </h2>
            <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map(plan => (
                <motion.div key={plan.key} variants={fadeUp} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}>
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={paymentStatus === 'PENDING' || paymentStatus === 'RECEIVED'}
                    className={`w-full text-left relative overflow-hidden rounded-xl border backdrop-blur-xl transition-all duration-300 p-6 ${
                      selectedPlan?.key === plan.key && step !== 'SELECT_PLAN'
                        ? 'bg-white/[0.06] border-[#E50914]/50 shadow-lg shadow-[#E50914]/10'
                        : plan.popular
                          ? 'bg-white/[0.03] border-[#E50914]/20 shadow-[0_0_30px_rgba(229,9,20,0.08)]'
                          : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                    } ${(paymentStatus === 'PENDING' || paymentStatus === 'RECEIVED') ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {plan.popular && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E50914] to-transparent" />
                        <Badge variant="danger" size="sm" className="absolute top-3 right-3">
                          <HiSparkles className="w-3 h-3" /> {t('subscription.popular')}
                        </Badge>
                      </>
                    )}
                    <p className="text-sm text-[#808080] mb-1">{t(`subscription.${plan.key}`)}</p>
                    <div className="mb-4">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      <span className="text-[#808080] text-sm ml-1">TL</span>
                    </div>
                    <ul className="space-y-2 mb-5">
                      <li className="flex items-center gap-2 text-sm text-[#b3b3b3]">
                        <HiCheck className="w-4 h-4 text-[#E50914] shrink-0" /> {t('subscription.features_unlimited')}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-[#b3b3b3]">
                        <HiCheck className="w-4 h-4 text-[#E50914] shrink-0" /> {t('subscription.features_hd')}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-[#b3b3b3]">
                        <HiCheck className="w-4 h-4 text-[#E50914] shrink-0" /> {t('subscription.features_no_ads')}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-[#b3b3b3]">
                        <HiCheck className="w-4 h-4 text-[#E50914] shrink-0" /> {t('subscription.features_offline')}
                      </li>
                      <li className="flex items-center gap-2 text-sm text-[#b3b3b3]">
                        <HiCheck className="w-4 h-4 text-[#E50914] shrink-0" /> {t('subscription.features_all_devices')}
                      </li>
                    </ul>
                    <div className={`w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-all ${
                      selectedPlan?.key === plan.key && step !== 'SELECT_PLAN'
                        ? 'bg-[#E50914] text-white'
                        : plan.popular
                          ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                          : 'bg-white/[0.06] text-white border border-white/[0.08]'
                    }`}>
                      {selectedPlan?.key === plan.key && step !== 'SELECT_PLAN' ? 'Secildi' : 'Sec'}
                    </div>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ═══════════════════════════════════════ */}
          {/* ADIM 2+3: IBAN + QR + Dekont (henuz submit edilmedi) */}
          {/* ═══════════════════════════════════════ */}
          <AnimatePresence>
            {selectedPlan && step === 'FILL_INFO' && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 mb-10"
              >
                {/* Ozet bant */}
                <div className="flex items-center justify-between bg-[#E50914]/10 border border-[#E50914]/20 rounded-xl px-5 py-3">
                  <div className="flex items-center gap-3">
                    <HiCreditCard className="w-5 h-5 text-[#E50914]" />
                    <div>
                      <p className="text-white font-semibold">{selectedPlan.name}</p>
                      <p className="text-xs text-[#808080]">{selectedPlan.duration} gun</p>
                    </div>
                  </div>
                  <p className="text-white font-black text-xl">{selectedPlan.price} <span className="text-sm font-normal text-[#808080]">TL</span></p>
                </div>

                {/* IBAN Bilgisi */}
                <GlassCard hover={false} className="p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <HiBanknotes className="w-5 h-5 text-[#E50914]" />
                    {t('payment.iban_info')}
                  </h2>
                  <div className="space-y-3">
                    {[
                      { label: 'IBAN', value: ibanInfo?.iban || 'Yukleniyor...' },
                      { label: 'Banka', value: ibanInfo?.bankName || 'Yukleniyor...' },
                      { label: 'Hesap Sahibi', value: ibanInfo?.ownerName || 'Yukleniyor...' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
                        <div>
                          <p className="text-xs text-[#555] mb-0.5">{item.label}</p>
                          <p className="text-sm font-mono text-white">{item.value}</p>
                        </div>
                        <button
                          onClick={() => handleCopy(item.value, item.label)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] text-[#808080] hover:text-white hover:bg-white/[0.1] transition-colors"
                        >
                          {copiedField === item.label ? t('payment.iban_copied') : t('payment.copy_iban')}
                        </button>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* QR Kod */}
                <GlassCard hover={false} className="p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <HiClipboardDocumentCheck className="w-5 h-5 text-[#E50914]" />
                    QR Kod
                  </h2>
                  <div className="flex flex-col items-center">
                    <div className="bg-white rounded-xl p-3 border border-white/[0.06] shadow-lg shadow-[#E50914]/5">
                      <img
                        src={`/images/qr/${selectedPlan.price}.jpeg`}
                        alt={`${selectedPlan.price} TL QR Kod`}
                        className="w-52 h-52 object-contain rounded-lg"
                      />
                    </div>
                    <p className="text-sm text-[#808080] mt-3 font-medium">{selectedPlan.price} TL - {selectedPlan.name}</p>
                    <p className="text-xs text-[#555] mt-1">Kodu telefonunuzla okutarak odeme yapabilirsiniz</p>
                  </div>
                </GlassCard>

                {/* Aciklama */}
                <GlassCard hover={false} className="p-6">
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <HiDocumentText className="w-5 h-5 text-[#E50914]" />
                    {t('payment.transfer_description')}
                  </h2>
                  <p className="text-sm text-[#808080] mb-3">Havale/EFT isleminde asagidaki aciklamayi yaziniz:</p>
                  <div className="flex items-center justify-center bg-white/[0.04] border-2 border-dashed border-[#E50914]/30 rounded-xl px-6 py-5">
                    <span className="text-lg md:text-xl font-bold font-mono text-[#E50914] tracking-wider select-all">
                      NETVORA {selectedPlan.name.toUpperCase()} {selectedPlan.price}TL
                    </span>
                  </div>
                </GlassCard>

                {/* Dekont Yukle + Gonder */}
                <GlassCard hover={false} className="p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <HiArrowUpTray className="w-5 h-5 text-[#E50914]" />
                    {t('payment.upload_receipt')}
                  </h2>
                  <p className="text-sm text-[#808080] mb-4">
                    Odemenizi yaptiktan sonra dekontunuzu (islem detayi ekran goruntusu) yukleyin.
                  </p>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      dragOver
                        ? 'border-[#E50914] bg-[#E50914]/5'
                        : receiptFile
                          ? 'border-green-500/40 bg-green-500/5'
                          : 'border-white/[0.1] hover:border-[#E50914]/40 bg-white/[0.02] hover:bg-white/[0.03]'
                    }`}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
                    {receiptPreviewUrl ? (
                      <div className="space-y-3">
                        <img src={receiptPreviewUrl} alt="Dekont" className="max-h-48 mx-auto rounded-lg object-contain" />
                        <p className="text-sm text-green-400 font-medium">{receiptFile?.name}</p>
                        <p className="text-xs text-[#555]">Degistirmek icin tiklayin</p>
                      </div>
                    ) : receiptFile ? (
                      <div className="space-y-3">
                        <HiCheckCircle className="w-10 h-10 text-green-400 mx-auto" />
                        <p className="text-sm text-green-400 font-medium">{receiptFile.name}</p>
                        <p className="text-xs text-[#555]">Degistirmek icin tiklayin</p>
                      </div>
                    ) : (
                      <>
                        <HiArrowUpTray className="w-10 h-10 text-[#555] mx-auto mb-3" />
                        <p className="text-sm text-[#808080]">{t('payment.drag_drop')}</p>
                        <p className="text-xs text-[#555] mt-1">JPG, PNG, PDF - Max 10MB</p>
                      </>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                      onClick={handleSelectNewPlan}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#808080] hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      Baska paket sec
                    </button>
                    <GradientButton
                      variant="primary"
                      size="md"
                      loading={submitting}
                      disabled={!receiptFile}
                      onClick={handleSubmitPayment}
                    >
                      {!receiptFile ? 'Once dekont yukleyin' : 'Dekontu Gonder'}
                    </GradientButton>
                  </div>
                </GlassCard>

                {/* Uyari */}
                <GlassCard hover={false} className="p-4 bg-amber-500/5 border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <HiExclamationTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-400 font-medium">Onemli</p>
                      <p className="text-xs text-[#808080] mt-1">
                        Odemenizi yaptiktan sonra dekontunuzu yukleyin. Dekontsuz yapilan odemeler islenmez.
                        Dekont yukledikten sonra admin incelemesi ortalama 5-15 dakika surer.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.section>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════ */}
          {/* DONE: Timeline + Countdown + Durum       */}
          {/* ═══════════════════════════════════════ */}
          <AnimatePresence>
            {step === 'DONE' && activePayment && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 mb-10"
              >
                {/* Paket ozet */}
                <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-3">
                  <div className="flex items-center gap-3">
                    <HiCreditCard className="w-5 h-5 text-[#E50914]" />
                    <div>
                      <p className="text-white font-semibold">{activePayment.packageName}</p>
                      <p className="text-xs text-[#808080]">Kod: {activePayment.paymentCode}</p>
                    </div>
                  </div>
                  <p className="text-white font-black text-xl">{activePayment.amount} <span className="text-sm font-normal text-[#808080]">TL</span></p>
                </div>

                {/* Countdown */}
                {(paymentStatus === 'PENDING' || paymentStatus === 'RECEIVED') && countdown > 0 && (
                  <GlassCard hover={false} className="p-5">
                    <div className="flex items-center justify-center gap-3">
                      <HiClock className={`w-5 h-5 ${countdown < 300 ? 'text-red-400 animate-pulse' : 'text-[#E50914]'}`} />
                      <div className="text-center">
                        <p className="text-xs text-[#555] mb-0.5">{t('payment.countdown')}</p>
                        <p className={`text-2xl font-black font-mono ${countdown < 300 ? 'text-red-400' : 'text-white'}`}>
                          {formatCountdown(countdown)}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Receipt uploaded */}
                {paymentStatus === 'RECEIVED' && (
                  <GlassCard hover={false} className="p-5 bg-blue-500/5 border-blue-500/20 text-center">
                    <HiCheckCircle className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-blue-400 font-semibold">{t('payment.payment_received')}</p>
                    <p className="text-sm text-[#808080] mt-1">Dekontunuz admin incelemesinde. Lutfen bekleyin.</p>
                  </GlassCard>
                )}

                {/* Rejected */}
                {paymentStatus === 'REJECTED' && (
                  <GlassCard hover={false} className="p-5 bg-red-500/5 border-red-500/20 text-center">
                    <HiExclamationTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-red-400 font-semibold">{t('payment.payment_rejected')}</p>
                    {activePayment?.adminNote && (
                      <p className="text-sm text-[#808080] mt-1">Neden: {activePayment.adminNote}</p>
                    )}
                    <button
                      onClick={handleSelectNewPlan}
                      className="mt-4 px-5 py-2 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#b2070f] transition-colors"
                    >
                      Tekrar Dene
                    </button>
                  </GlassCard>
                )}

                {/* Approved */}
                {paymentStatus === 'APPROVED' && (
                  <GlassCard hover={false} className="p-6 bg-green-500/5 border-green-500/20 text-center">
                    <HiCheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-bold text-lg">{t('payment.payment_approved')}</p>
                    <p className="text-sm text-[#808080] mt-1">Premium uyeligiz aktive edildi!</p>
                  </GlassCard>
                )}

                {/* Timeline */}
                <GlassCard hover={false} className="p-6">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <HiClock className="w-5 h-5 text-[#E50914]" />
                    {t('payment.payment_pending')}
                  </h2>
                  <div className="flex items-center justify-between max-w-lg mx-auto">
                    {timelineSteps.map((stepKey, i) => {
                      const isActive = i <= timelineIndex;
                      const isCurrent = i === timelineIndex;
                      const isRejectedStep = paymentStatus === 'REJECTED' && i === 1;
                      return (
                        <div key={stepKey} className="flex flex-col items-center flex-1">
                          <div className="flex items-center w-full">
                            <div className="relative flex items-center justify-center">
                              <motion.div
                                initial={false}
                                animate={{
                                  scale: isCurrent ? [1, 1.2, 1] : 1,
                                  backgroundColor: isRejectedStep ? '#ef4444' : isActive ? '#E50914' : '#333',
                                }}
                                transition={{ duration: 0.4 }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                                  isActive ? 'shadow-lg shadow-[#E50914]/20' : ''
                                }`}
                              >
                                {isActive ? (
                                  <HiCheckCircle className="w-4 h-4 text-white" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-[#555]" />
                                )}
                              </motion.div>
                            </div>
                            {i < timelineSteps.length - 1 && (
                              <div className="flex-1 h-[2px] mx-1">
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                  i < timelineIndex
                                    ? isRejectedStep ? 'bg-red-500' : 'bg-[#E50914]'
                                    : 'bg-[#333]'
                                }`} />
                              </div>
                            )}
                          </div>
                          <p className={`text-[11px] mt-2 text-center ${isActive ? 'text-white font-medium' : 'text-[#555]'}`}>
                            {t(`payment.${stepKey}`)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* Baska paket sec butonu (sadece reject veya approved durumunda) */}
                {(paymentStatus === 'APPROVED' || paymentStatus === 'REJECTED') && (
                  <div className="text-center">
                    <button
                      onClick={handleSelectNewPlan}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#808080] hover:text-white hover:bg-white/[0.06] transition-colors border border-white/[0.08]"
                    >
                      Yeni paket sec
                    </button>
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Security footer */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8">
            <GlassCard hover={false} className="p-5 text-center max-w-md mx-auto">
              <HiShieldCheck className="w-6 h-6 text-[#808080] mx-auto mb-2" />
              <p className="text-sm text-[#808080]">Odemeler guvenli altyapi ile islenir.</p>
            </GlassCard>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
