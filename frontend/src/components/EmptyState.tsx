'use client';

import Link from 'next/link';
import { HiPlay } from 'react-icons/hi2';

interface EmptyStateProps {
  icon?: any;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  const IconComponent = Icon || (() => null);

  return (
    <div className="text-center py-20">
      {Icon && <IconComponent className="w-16 h-16 text-[#333] mx-auto mb-4" />}
      <h3 className="text-lg font-semibold text-[#b3b3b3] mb-2">{title}</h3>
      <p className="text-sm text-[#555] mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#f40612] text-white px-6 py-2.5 rounded font-semibold text-sm transition-all"
        >
          <HiPlay className="w-4 h-4" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
