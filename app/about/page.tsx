import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn more about this trivia app',
};

const AboutPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">About This Project</h1>
      <p className="text-gray-600">
        This trivia app helps you test your knowledge with interesting questions.
      </p>
      <div className="flex flex-col gap-y-4 md:gap-y-8">
        <p className="text-gray-600"><span>Deploys to </span>
          <Link href="/">
            GCP
          </Link>
        </p>
        <h2>Stack</h2>
        <ul>
          <li>Node.js v24.14.0</li>
          <li>Approuter</li>
          <li>Pinecone</li>
          <li>3k vectors .5 similiarity threshold</li>
        </ul>
      </div>
    </div>
  );
}

export default AboutPage;