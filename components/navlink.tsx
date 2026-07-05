// components/navlink.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEventHandler, ReactNode } from 'react';

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export const NavLink = ({ href, children, className = '', onClick }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-sm font-medium transition ${
        isActive
          ? 'bg-blue-900 text-white'
          : 'text-blue-700 hover:text-blue-900 hover:bg-blue-100'
      } ${className}`}
    >
      {children}
    </Link>
  );
};
