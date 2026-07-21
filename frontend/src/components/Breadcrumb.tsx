'use client';

import Link from 'next/link';
import { generateBreadcrumbSchema, type BreadcrumbItem } from '@/lib/seo';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items.length) return null;

  const schema = generateBreadcrumbSchema(items);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="breadcrumb" className="w-full py-3 px-4 md:px-8 bg-[#0a0a0a]/80 border-b border-white/5">
        <ol className="flex flex-wrap items-center gap-2 text-sm max-w-7xl mx-auto">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-[#555] select-none">{'>'}</span>
              )}
              {item.url ? (
                <Link
                  href={item.url}
                  className="text-[#b3b3b3] hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              ) : (
                <span className="text-white font-medium">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
