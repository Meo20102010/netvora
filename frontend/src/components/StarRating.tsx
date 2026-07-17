'use client';

import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api';
import { HiStar } from 'react-icons/hi2';
import toast from 'react-hot-toast';

interface StarRatingProps {
  contentId: string;
  initialRating?: number;
  averageRating?: number;
  onRate?: (score: number) => void;
}

export default function StarRating({ contentId, initialRating, averageRating, onRate }: StarRatingProps) {
  const [userRating, setUserRating] = useState(initialRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialRating) setUserRating(initialRating);
  }, [initialRating]);

  const handleRate = async (score: number) => {
    if (loading) return;
    setLoading(true);
    try {
      if (userRating === score) {
        await userApi.removeRating(contentId);
        setUserRating(0);
        toast.success('Puan kaldırıldı');
      } else {
        const res = await userApi.rateContent(contentId, score);
        setUserRating(score);
        if (onRate) onRate(score);
        toast.success(`${score}/10 puan verildi`);
      }
    } catch {
      toast.error('Puan verilemedi');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            onClick={() => handleRate(score)}
            onMouseEnter={() => setHoverRating(score)}
            onMouseLeave={() => setHoverRating(0)}
            className={`transition-all p-0.5 ${
              loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'
            }`}
            disabled={loading}
          >
            <HiStar
              className={`w-4 h-4 md:w-5 md:h-5 ${
                score <= (hoverRating || userRating)
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-[#555] hover:text-yellow-500'
              }`}
            />
          </button>
        ))}
      </div>
      {userRating > 0 && (
        <span className="text-xs text-yellow-500 font-semibold">{userRating}/10</span>
      )}
      {averageRating !== undefined && averageRating > 0 && (
        <span className="text-xs text-[#808080]">(Ort. {averageRating.toFixed(1)})</span>
      )}
    </div>
  );
}
