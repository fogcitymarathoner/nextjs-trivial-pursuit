import { IndexSelector } from '@/components/pinecone/IndexSelector';
import { PINECONE_INDEXES } from '@/config/pinecone/pinecone_indexes';

export default function HomePage() {
  const handleIndexSelected = async (index: any) => {
    'use server';

    // This runs on the server
    console.log(`Selected index: ${index.indexName}`);

    // You can use the index with Pinecone client here
    // const results = await pineconeClient.query(index.indexName, queryVector);
  };

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Pinecone Index Selector</h1>
      <IndexSelector indexes={PINECONE_INDEXES} onIndexSelected={handleIndexSelected} />
    </main>
  );
}
