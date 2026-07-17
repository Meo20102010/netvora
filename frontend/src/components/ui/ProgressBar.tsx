'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  color,
  height = 6,
  showLabel = false,
  animated = true,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-gray-400">Progress</span>
          <span className="text-xs font-medium text-white">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className="w-full overflow-hidden rounded-full bg-white/[0.06]"
        style={{ height: `${height}px` }}
      >
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="h-full rounded-full"
          style={{
            background:
              color ||
              'linear-gradient(90deg, #E50914 0%, #b20710 100%)',
          }}
        />
      </div>
    </div>
  );
}
