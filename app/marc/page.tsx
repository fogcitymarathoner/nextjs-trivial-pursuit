// app\marc\page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marc',
  description: 'Learn about Marc',
  openGraph: {
    title: 'Marc',
    description: 'Learn about Marc',
  },
};

const MarcPage = () => {
  return (
    <main className="app-page">
      <div className="app-container">
        <header className="page-heading">
          <h1 className="page-title">About Marc</h1>
          <p className="page-description">
            This page is dedicated to Marc.
          </p>
        </header>
      </div>
    </main>
  );
}

export default MarcPage;
