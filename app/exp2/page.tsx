'use client';
// test harness for similarity threshold selection slider
import {SimilarityThresholdSlider} from '@/components/similarity-threshold-slider/SimilarityThresholdSlider';
import {useState} from 'react';


export default function SearchPage() {
  const [threshold, setThreshold] = useState(0.5); // Default matches component

  return (
    <main className="app-page">
      <div className="app-container">
        <header className="page-heading">
          <h1 className="page-title">Similarity Threshold</h1>
          <p className="page-description">
            Tune the minimum score required for document matches.
          </p>
        </header>

        <section className="surface-panel surface-panel-spacious surface-panel-compact content-stack">
          <SimilarityThresholdSlider
            onChange={setThreshold}
            defaultValue={0.5} // Optional, defaults to 0.5 if not provided
            label="Similarity Threshold"
            step={0.01}
          />

          <div className="surface-inner-item">
            <p className="body-copy">Current threshold: {threshold}</p>
            <p className="body-copy">Will match results with similarity &gt;= {threshold}</p>
            <p className="body-copy-muted">
              Default: 0.5 (from environment or hardcoded)
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
