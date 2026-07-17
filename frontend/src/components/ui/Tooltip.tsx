'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses = {
  top: 'left-1/2 -translate-x-1/2 top-full border-t-[#1a1a1a] border-x-transparent border-b-transparent border-4',
  bottom: 'left-1/2 -translate-x-1/2 bottom-full border-b-[#1a1a1a] border-x-transparent border-t-transparent border-4',
  left: 'top-1/2 -translate-y-1/2 left-full border-l-[#1a1a1a] border-y-transparent border-r-transparent border-4',
  right: 'top-1/2 -translate-y-1/2 right-full border-r-[#1a1a1a] border-y-transparent border-l-transparent border-4',
};

const initial = {
  top: { opacity: 0, y: 4 },
  bottom: { opacity: 0, y: -4 },
  left: { opacity: 0, x: 4 },
  right: { opacity: 0, x: -4 },
};

const animate = {
  top: { opacity: 1, y: 0 },
  bottom: { opacity: 1, y: 0 },
  left: { opacity: 1, x: 0 },
  right: { opacity: 1, x: 0 },
};

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={initial[position]}
            animate={animate[position]}
            exit={initial[position]}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 whitespace-nowrap rounded-lg bg-[#1a1a1a] border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-white shadow-xl ${positionClasses[position]}`}
          >
            {content}
            <span className={`absolute border-4 ${arrowClasses[position]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
