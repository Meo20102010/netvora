'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineFire,
  HiOutlineFilm,
  HiOutlineTv,
  HiOutlineMoon,
  HiOutlineGlobeAlt,
  HiOutlineUserGroup,
  HiOutlineCheckBadge,
} from 'react-icons/hi2';
import { useTranslation } from '@/i18n';

interface AchievementBadgeProps {
  type: string;
  earned: boolean;
  earnedAt?: string;
}

const BADGE_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  labelKey: string;
  descriptionKey: string;
}> = {
  first_watch: {
    icon: HiOutlineCheckBadge,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    labelKey: 'profile.badge_first_watch',
    descriptionKey: 'profile.badge_first_watch_desc',
  },
  movie_buff: {
    icon: HiOutlineFilm,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    labelKey: 'profile.badge_movie_buff',
    descriptionKey: 'profile.badge_movie_buff_desc',
  },
  series_addict: {
    icon: HiOutlineTv,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    labelKey: 'profile.badge_series_addict',
    descriptionKey: 'profile.badge_series_addict_desc',
  },
  night_owl: {
    icon: HiOutlineMoon,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    labelKey: 'profile.badge_night_owl',
    descriptionKey: 'profile.badge_night_owl_desc',
  },
  genre_explorer: {
    icon: HiOutlineGlobeAlt,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    labelKey: 'profile.badge_genre_explorer',
    descriptionKey: 'profile.badge_genre_explorer_desc',
  },
  social_butterfly: {
    icon: HiOutlineUserGroup,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    labelKey: 'profile.badge_social_butterfly',
    descriptionKey: 'profile.badge_social_butterfly_desc',
  },
};

export default function AchievementBadge({ type, earned, earnedAt }: AchievementBadgeProps) {
  const { t } = useTranslation();
  const config = BADGE_CONFIG[type] || {
    icon: HiOutlineCheckBadge,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/30',
    labelKey: 'profile.badge',
    descriptionKey: 'profile.badge_desc',
  };

  const Icon = config.icon;

  return (
    <motion.div
      initial={earned ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={earned ? { type: 'spring', stiffness: 200, damping: 15 } : { duration: 0 }}
      whileHover={{ scale: 1.05 }}
      className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition ${
        earned
          ? `${config.bgColor} ${config.borderColor}`
          : 'bg-zinc-900/50 border-zinc-800 opacity-40 grayscale'
      }`}
    >
      {earned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="absolute -top-1 -right-1"
        >
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </motion.div>
      )}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${earned ? config.bgColor : 'bg-zinc-800'}`}>
        <Icon className={`w-6 h-6 ${earned ? config.color : 'text-zinc-600'}`} />
      </div>
      <h4 className={`text-sm font-semibold mb-0.5 ${earned ? 'text-white' : 'text-zinc-500'}`}>
        {t(config.labelKey)}
      </h4>
      <p className={`text-xs ${earned ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {t(config.descriptionKey)}
      </p>
      {earned && earnedAt && (
        <span className="text-[10px] text-zinc-600 mt-1">
          {new Date(earnedAt).toLocaleDateString('tr-TR')}
        </span>
      )}
    </motion.div>
  );
}
