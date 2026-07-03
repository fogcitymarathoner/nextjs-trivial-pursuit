// app/signup/page.test.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Create session
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full space-y-8">
    <div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
      Create your account
  </h2>
  </div>
  <form className="mt-8 space-y-6" onSubmit={handleSignup}>
  <div className="rounded-md shadow-sm -space-y-px">
  <div>
    <input
      type="email"
  required
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
  placeholder="Email address"
  />
  </div>
  <div>
  <input
    type="password"
  required
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
  placeholder="Password"
  />
  </div>
  <div>
  <input
    type="password"
  required
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
  placeholder="Confirm password"
    />
    </div>
    </div>

  {error && (
    <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded">
      {error}
      </div>
  )}

  <div>
    <button
      type="submit"
  disabled={loading}
  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
    {loading ? 'Creating account...' : 'Sign up'}
    </button>
    </div>

    <div className="text-sm text-center">
  <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
    Already have an account? Sign in
    </a>
    </div>
    </form>
    </div>
    </div>
);
}
