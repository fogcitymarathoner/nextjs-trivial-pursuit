import type { Metadata } from 'next';
import AboutPage from "@/app/about/page";

export const metadata: Metadata = {
  title: 'Marc',
  description: 'Learn about Marc',
};

const MarcPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">About Marc</h1>
      <p className="text-gray-600">
        This page is dedicated to Marc.
      </p>
    </div>
  );
}

export default MarcPage;