'use client';

import { useState } from 'react';
import { PineconeDropdown } from './PineconeDropdown';
import type { PineconeIndexOption } from '@/config/pinecone/types';

interface IndexSelectorProps {
  indexes: PineconeIndexOption[];
  onIndexSelected?: (index: PineconeIndexOption) => void;
}

export const IndexSelector: React.FC<IndexSelectorProps> = ({
                                                              indexes,
                                                              onIndexSelected
                                                            }) => {
  const [selectedIndex, setSelectedIndex] = useState<PineconeIndexOption | null>(null);

  const handleSelect = (index: PineconeIndexOption) => {
    setSelectedIndex(index);
    if (onIndexSelected) {
      onIndexSelected(index);
    }
  };

  return (
    <div className="space-y-4">
      <PineconeDropdown indexes={indexes} onSelect={handleSelect} />

      {selectedIndex && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-900">Selected Index:</h3>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Label:</span> {selectedIndex.label}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Index Name:</span> {selectedIndex.indexName}
          </p>
          {selectedIndex.description && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Description:</span> {selectedIndex.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
