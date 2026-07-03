// app/dashboard/page.test.tsx
import { getAuthTokens } from '@/lib/auth/tokens';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const tokens = await getAuthTokens();
  const decodedToken = tokens?.decodedToken;

  if (!decodedToken) {
    redirect('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to your Dashboard!
          </h1>
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600">Signed in as:</p>
              <p className="text-lg font-semibold text-gray-900">
                {decodedToken.email || decodedToken.uid}
              </p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-gray-600">User ID:</p>
              <p className="text-sm font-mono text-gray-700">{decodedToken.uid}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email verified:</p>
              <p className="text-sm font-semibold">
                {decodedToken.email_verified ? '✅ Yes' : '❌ No'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
