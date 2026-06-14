'use client';

import {SimilarityThresholdSlider} from '@/components/similarity-threshold-slider/SimilarityThresholdSlider';
import {useState} from 'react';


export default function SearchPage() {
  const [threshold, setThreshold] = useState(0.5); // Default matches component

  return (
    <div className="max-w-md mx-auto p-6">
      <SimilarityThresholdSlider
        onChange={setThreshold}
        defaultValue={0.5} // Optional, defaults to 0.5 if not provided
        label="Similarity Threshold"
        step={0.01}
      />

      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <p>Current threshold: {threshold}</p>
        <p>Will match results with similarity &gt;= {threshold}</p>
        <p className="text-sm text-gray-500 mt-2">
          Default: 0.5 (from environment or hardcoded)
        </p>
      </div>
    </div>
  );
}