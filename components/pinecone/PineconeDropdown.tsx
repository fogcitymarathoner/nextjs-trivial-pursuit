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
    const selectedValue = e.target.value;
    const selected = indexes.find(
      index => (index.indexName || index.label) === selectedValue
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
        className={`select-control ${className}`.trim()}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {indexes.map((index) => (
          <option key={`${index.label}-${index.indexName || 'unconfigured'}`} value={index.indexName || index.label}>
            {index.label}
            {index.description && ` - ${index.description}`}
          </option>
        ))}
      </select>
    </div>
  );
};
