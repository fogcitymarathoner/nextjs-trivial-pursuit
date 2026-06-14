'use client';

import type { PineconeIndexOption } from '@/config/pinecone/types';

interface PineconeDropdownProps {
  indexes: PineconeIndexOption[];
  onSelect?: (selected: PineconeIndexOption) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export const PineconeDropdown: React.FC<PineconeDropdownProps> = ({
                                                                    indexes,
                                                                    onSelect,
                                                                    defaultValue,
                                                                    placeholder = "Select a Pinecone index...",
                                                                    className = ""
                                                                  }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndexName = e.target.value;
    const selected = indexes.find(
      index => index.indexName === selectedIndexName
    );

    if (selected && onSelect) {
      onSelect(selected);
    }
  };

  return (
    <div className="w-full">
      <select
        onChange={handleChange}
        defaultValue={defaultValue || ""}
        className={`
          w-full px-4 py-2 border border-gray-300 rounded-md 
          focus:outline-none focus:ring-2 focus:ring-blue-500 
          focus:border-blue-500 bg-white
          ${className}
        `}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {indexes.map((index) => (
          <option key={index.indexName} value={index.indexName}>
            {index.label}
            {index.description && ` - ${index.description}`}
          </option>
        ))}
      </select>
    </div>
  );
};
