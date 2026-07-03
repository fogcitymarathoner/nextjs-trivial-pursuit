"use client";

// components/layout/Header/navbar.tsx

import { NavLink } from '@/components/navlink';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export const NavBar = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('/api/auth/verify', {
                credentials: 'include',
                cache: 'no-store',
            });
            setIsAuthenticated(response.ok);
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

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                setIsAuthenticated(false);
                router.push('/');
                router.refresh();
            }
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <nav className="hidden md:flex space-x-8 items-center">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/marc">Marc</NavLink>

            <div className="ml-4">
                {isLoading ? (
                    <div className="w-20 h-10 bg-gray-200 rounded-md animate-pulse"></div>
                ) : isLoggingOut ? (
                    <span className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed">
                        Logging out...
                    </span>
                ) : isAuthenticated ? (
                    <button
                        onClick={handleLogout}
                        className="px-3 py-2 rounded-md text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-100 transition"
                    >
                        Logout
                    </button>
                ) : (
                    <NavLink href="/login">Login</NavLink>
                )}
            </div>
        </nav>
    );
};

export default NavBar;