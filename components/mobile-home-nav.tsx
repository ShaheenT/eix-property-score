'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const links = [
  { label: 'How it works', href: '#how' },
  { label: 'International Buyers', href: '/international-buyers' },
  { label: 'Example report', href: '#report' },
  { label: 'Score a Property', href: '#form', primary: true },
];

export function MobileHomeNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname !== '/') return null;

  return (
    <div className="fixed right-5 top-4 z-[70] md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2A2D27]/10 bg-[#FFFDF8]/95 text-[#20231F] shadow-[0_8px_30px_rgba(42,45,39,.14)] backdrop-blur-xl"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-14 w-[250px] overflow-hidden rounded-2xl border border-[#2A2D27]/10 bg-[#FFFDF8]/98 p-2 shadow-[0_20px_60px_rgba(42,45,39,.16)] backdrop-blur-xl">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className={
                link.primary
                  ? 'mt-1 flex items-center justify-center rounded-xl bg-[#0E847B] px-4 py-3 text-sm font-semibold text-white hover:bg-[#08756D]'
                  : 'flex items-center rounded-xl px-4 py-3 text-sm font-medium text-[#3E413B] hover:bg-[#F3F0E9] hover:text-[#20231F]'
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
