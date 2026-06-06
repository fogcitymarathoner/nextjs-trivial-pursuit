// components/navlink.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition ${
        isActive
          ? 'bg-blue-900 text-white'
          : 'text-blue-700 hover:text-blue-900 hover:bg-blue-100'
      }`}
    >
      {children}
    </Link>
  );
};