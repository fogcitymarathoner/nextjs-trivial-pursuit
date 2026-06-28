import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn more about this trivia app',
};

const AboutPage = () => {
  return (
    <main className="app-page">
      <div className="app-container">
        <header className="page-heading">
          <h1 className="page-title">About This Project</h1>
          <p className="page-description">
            This trivia app helps you test your knowledge with interesting questions.
          </p>
        </header>

        <section className="surface-panel surface-panel-spacious surface-panel-compact content-stack">
          <p className="body-copy">
            <span>Deploys to </span>
            <Link href="/" className="content-link">
              GCP
            </Link>
          </p>

          <div className="surface-inner-item content-stack">
            <h2 className="section-label">Stack</h2>
            <ul className="content-list">
              <li>Node.js v24.14.0</li>
              <li>Approuter</li>
              <li>Pinecone</li>
              <li>3k vectors .5 similiarity threshold</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AboutPage;
