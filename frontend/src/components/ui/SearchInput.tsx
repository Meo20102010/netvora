'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { HiMagnifyingGlass, HiXMark, HiArrowPath } from 'react-icons/hi2';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  loading?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  loading = false,
  autoFocus = false,
  className = '',
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  return (
    <motion.div
      animate={{ width: '100%' }}
      className={`relative ${className}`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
        {loading ? (
          <HiArrowPath className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <HiMagnifyingGlass className="h-4 w-4 text-gray-400" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 outline-none transition-all duration-200 focus:border-[#E50914]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#E50914]/30"
      />

      {value && (
        <button
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 transition-colors hover:text-white"
        >
          <HiXMark className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}
