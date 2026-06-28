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
    <main className="app-page">
      <div className="app-container">
        <header className="page-heading">
          <h1 className="page-title">Pinecone Index Selector</h1>
          <p className="page-description">
            Select a configured Pinecone index for experimentation.
          </p>
        </header>

        <section className="surface-panel surface-panel-spacious surface-panel-compact">
          <IndexSelector indexes={PINECONE_INDEXES} onIndexSelected={handleIndexSelected} />
        </section>
      </div>
    </main>
  );
}
