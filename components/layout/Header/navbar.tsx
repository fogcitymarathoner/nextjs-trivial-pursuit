import { NavLink } from '@/components/navlink';

export const NavBar = () => (
  <nav className="hidden md:flex space-x-8">
    <NavLink href="/">Home</NavLink>
    <NavLink href="/about">About</NavLink>
    <NavLink href="/marc">Marc</NavLink>
  </nav>
);


export default NavBar;