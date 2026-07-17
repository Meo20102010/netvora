'use client';

import { useEffect, useRef } from 'react';
import { useInView, animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function AnimatedCounter({
  value,
  duration = 1.5,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current || !ref.current) return;
    hasAnimated.current = true;

    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut' as const,
      onUpdate(v) {
        if (node) {
          node.textContent = `${prefix}${Math.round(v).toLocaleString()}${suffix}`;
        }
      },
    });

    return () => controls.stop();
  }, [isInView, value, duration, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
