'use client';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'offline';
  ring?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-xl',
};

const statusColors = {
  online: 'bg-emerald-400',
  away: 'bg-amber-400',
  offline: 'bg-gray-500',
};

const statusSizes = {
  sm: 'h-2 w-2 border',
  md: 'h-2.5 w-2.5 border-[1.5px]',
  lg: 'h-3.5 w-3.5 border-2',
  xl: 'h-4 w-4 border-2',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const gradients = [
  'from-rose-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-indigo-600',
  'from-pink-500 to-fuchsia-600',
];

export default function Avatar({
  src,
  name,
  size = 'md',
  status,
  ring = false,
  className = '',
}: AvatarProps) {
  const initials = name ? getInitials(name) : '?';
  const gradientIndex = name ? hashString(name) % gradients.length : 0;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-full font-semibold text-white ${
          ring ? 'ring-2 ring-[#E50914] ring-offset-2 ring-offset-[#141414]' : ''
        } ${sizeClasses[size]}`}
      >
        {src ? (
          <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradients[gradientIndex]}`}
          >
            {initials}
          </div>
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-[#141414] ${statusColors[status]} ${statusSizes[size]}`}
        />
      )}
    </div>
  );
}
