interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

const baseClass = 'animate-pulse rounded bg-white/[0.06]';

function getVariantClasses(variant: string): string {
  switch (variant) {
    case 'circular':
      return `${baseClass} rounded-full`;
    case 'text':
      return `${baseClass} rounded`;
    case 'card':
      return `${baseClass} rounded-xl`;
    case 'rectangular':
    default:
      return `${baseClass} rounded-lg`;
  }
}

function getVariantStyles(
  variant: string,
  width?: string | number,
  height?: string | number
): React.CSSProperties {
  const styles: React.CSSProperties = {};
  if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
  if (height) styles.height = typeof height === 'number' ? `${height}px` : height;

  if (!width && !height) {
    switch (variant) {
      case 'circular':
        styles.width = '40px';
        styles.height = '40px';
        break;
      case 'text':
        styles.width = '100%';
        styles.height = '16px';
        break;
      case 'card':
        styles.width = '100%';
        styles.height = '200px';
        break;
      case 'rectangular':
      default:
        styles.width = '100%';
        styles.height = '120px';
        break;
    }
  }

  return styles;
}

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const variantClasses = getVariantClasses(variant);
  const variantStyles = getVariantStyles(variant, width, height);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={variantClasses} style={variantStyles} />
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 ${className}`}>
      <Skeleton variant="rectangular" className="mb-3 aspect-video rounded-lg" />
      <Skeleton variant="text" height="14px" className="mb-2 w-3/4" />
      <Skeleton variant="text" height="12px" className="w-1/2" />
    </div>
  );
}

export function ListSkeleton({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width="40px" height="40px" />
          <div className="flex-1">
            <Skeleton variant="text" height="14px" className="mb-2 w-3/4" />
            <Skeleton variant="text" height="12px" className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
