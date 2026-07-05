"use client";

// components/layout/Header/navbar.tsx

import { NavLink } from '@/components/navlink';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const NavBar = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isGamesOpen, setIsGamesOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('/api/auth/verify', {
                credentials: 'include',
                cache: 'no-store',
            });
            const isAuth = response.ok;
            setIsAuthenticated(isAuth);
        } catch (error) {
            console.error('Auth check failed:', error);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Check auth status on mount and route changes
    useEffect(() => {
        checkAuthStatus();
    }, [pathname]);

    // Optional: Check auth status when tab becomes visible again
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkAuthStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsGamesOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                setIsAuthenticated(false);
                setIsGamesOpen(false); // Close dropdown on logout
                router.push('/');
                router.refresh();
            }
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const toggleGames = () => {
        // Only allow toggling if authenticated
        if (isAuthenticated) {
            setIsGamesOpen(!isGamesOpen);
        }
    };

    const navItemClass = 'px-3 py-2 rounded-md text-sm font-medium transition';
    const activeNavItemClass = 'bg-blue-900 text-white';
    const inactiveNavItemClass = 'text-blue-700 hover:text-blue-900 hover:bg-blue-100';
    const isGamesActive = pathname.startsWith('/games');

    return (
        <nav className="flex w-full flex-wrap items-center justify-between gap-2 md:gap-8">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/marc">Marc</NavLink>

            {!isLoading && isAuthenticated && (
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={toggleGames}
                        className={`${navItemClass} ${isGamesActive ? activeNavItemClass : inactiveNavItemClass} flex items-center`}
                    >
                        <span>Games</span>
                        <svg
                            className={`w-4 h-4 ml-1 transition-transform duration-200 ${isGamesOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isGamesOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 flex flex-col">
                        <NavLink
                            href="/games/game1"
                            className="block w-full px-4 py-2 hover:bg-gray-100"
                            onClick={() => setIsGamesOpen(false)}
                        >
                            Game 1
                        </NavLink>
                        <NavLink
                            href="/games/game2"
                            className="block w-full px-4 py-2 hover:bg-gray-100"
                            onClick={() => setIsGamesOpen(false)}
                        >
                            Game 2
                        </NavLink>
                    </div>
                    )}
                </div>
            )}

            {/* Login/Logout */}
            {isLoading ? (
                <div className="w-20 h-10 bg-gray-200 rounded-md animate-pulse"></div>
            ) : isLoggingOut ? (
                <span className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed">
                    Logging out...
                </span>
            ) : isAuthenticated ? (
                <button
                    onClick={handleLogout}
                    className={`${navItemClass} ${inactiveNavItemClass}`}
                >
                    Logout
                </button>
            ) : (
                <NavLink href="/login">Login</NavLink>
            )}
        </nav>
    );
};

export default NavBar;
