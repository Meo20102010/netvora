'use client';

import { motion } from 'framer-motion';
import { HiArrowPath } from 'react-icons/hi2';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const variantClasses = {
  primary:
    'bg-gradient-to-r from-[#E50914] to-[#b20710] text-white shadow-lg shadow-[#E50914]/20 hover:shadow-[#E50914]/40',
  secondary:
    'bg-gradient-to-r from-white/10 to-white/[0.06] text-white border border-white/[0.08] hover:from-white/[0.14] hover:to-white/10',
  danger:
    'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/20 hover:shadow-red-600/40',
  ghost:
    'bg-transparent text-white border border-white/[0.12] hover:bg-white/[0.06]',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5',
};

export default function GradientButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
}: GradientButtonProps) {
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.03 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 ${
        disabled || loading ? 'cursor-not-allowed opacity-50' : ''
      } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <HiArrowPath className="h-4 w-4 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
