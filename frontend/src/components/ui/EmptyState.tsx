'use client';

import { motion } from 'framer-motion';
import GradientButton from './GradientButton';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex flex-col items-center justify-center py-16 text-center ${className}`}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-[#E50914]/10 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-gray-400">
          {icon}
        </div>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-400">{description}</p>

      {action && (
        <GradientButton onClick={action.onClick} variant="primary" size="md">
          {action.label}
        </GradientButton>
      )}
    </motion.div>
  );
}
