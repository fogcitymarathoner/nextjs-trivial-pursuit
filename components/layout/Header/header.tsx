import {NavBar} from '@/components/layout/Header/navbar';
import { ReactNode } from 'react';

const Header = (): ReactNode => {
  return (
    <header className="w-full border-b border-gray-200 bg-gray-50">
      <div className="mx-auto flex w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <NavBar />
      </div>
    </header>
  );
};

export default Header;
