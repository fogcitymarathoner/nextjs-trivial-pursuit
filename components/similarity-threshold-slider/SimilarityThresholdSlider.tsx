'use client';

import { useState, useEffect, type ChangeEvent, type FC } from 'react';

interface SimilarityThresholdSliderProps {
  onChange?: (value: number) => void;
  defaultValue?: number;
  label?: string;
  step?: number;
  showPresets?: boolean;
  showDescription?: boolean;
}

const DEFAULT_THRESHOLD = 0.5;

const sanitizeThreshold = (value: number): number | null => {
  if (!Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
};

const resolveThreshold = (defaultValue?: number): number => {
  if (defaultValue !== undefined) {
    return sanitizeThreshold(Number(defaultValue)) ?? DEFAULT_THRESHOLD;
  }

  if (process.env.DEFAULT_THRESHOLD) {
    return sanitizeThreshold(Number.parseFloat(process.env.DEFAULT_THRESHOLD)) ?? DEFAULT_THRESHOLD;
  }

  return DEFAULT_THRESHOLD;
};

export const SimilarityThresholdSlider: FC<SimilarityThresholdSliderProps> = ({
  onChange,
  defaultValue,
  label = 'Similarity Threshold',
  step = 0.01,
  showPresets = true,
  showDescription = true,
}) => {
  const [threshold, setThreshold] = useState<number>(() => resolveThreshold(defaultValue));

  useEffect(() => {
    setThreshold(resolveThreshold(defaultValue));
  }, [defaultValue]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeThreshold(Number.parseFloat(e.target.value)) ?? DEFAULT_THRESHOLD;
    setThreshold(value);
    onChange?.(value);
  };

  const handlePresetClick = (value: number) => {
    setThreshold(value);
    onChange?.(value);
  };

  const percentage = Math.round(threshold * 100);

  const getThresholdInfo = () => {
    if (threshold < 0.3) return { color: 'red', label: 'Low Precision', icon: '⚠️' };
    if (threshold < 0.5) return { color: 'yellow', label: 'Low-Moderate', icon: '📊' };
    if (threshold === 0.5) return { color: 'blue', label: 'Default (Balanced)', icon: '⭐' };
    if (threshold < 0.7) return { color: 'blue', label: 'High Precision', icon: '🎯' };
    return { color: 'green', label: 'Very High Precision', icon: '✅' };
  };

  const thresholdInfo = getThresholdInfo();

  return (
    <div className="w-full space-y-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </h3>
          {showDescription && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Minimum similarity score for matches
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {threshold.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
            ({percentage}%)
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative pt-2">
        <input
          type="range"
          min="0"
          max="1"
          step={step}
          value={threshold}
          onChange={handleChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            background: `linear-gradient(to right, 
              #3b82f6 ${percentage}%, 
              #e5e7eb ${percentage}%)`,
          }}
        />

        {/* Tick marks with default indicator */}
        <div className="flex justify-between px-1 mt-1">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <div
              key={tick}
              className="relative"
              style={{ left: `${tick * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className={`w-px h-2 ${tick === 0.5 ? 'bg-blue-500 h-3' : 'bg-gray-400 dark:bg-gray-600'}`} />
              <div className={`text-xs mt-1 ${tick === 0.5 ? 'text-blue-600 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                {tick === 0 ? '0' : tick === 0.5 ? 'Default' : tick === 1 ? '1' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preset buttons */}
      {showPresets && (
        <div className="flex gap-2">
          {[
            { value: 0.3, label: 'Relaxed' },
            { value: 0.5, label: 'Balanced (Default)', isDefault: true },
            { value: 0.7, label: 'Strict' },
            { value: 0.9, label: 'Very Strict' },
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              className={`
                flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${threshold === preset.value
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : preset.isDefault && threshold !== preset.value
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
              `}
            >
              {preset.label}
              <span className="block text-xs opacity-75">
                {preset.value}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Status indicator */}
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        ${thresholdInfo.color === 'red' ? 'bg-red-50 dark:bg-red-900/20' : ''}
        ${thresholdInfo.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
        ${thresholdInfo.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
        ${thresholdInfo.color === 'green' ? 'bg-green-50 dark:bg-green-900/20' : ''}
      `}>
        <span className="text-lg">{thresholdInfo.icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {thresholdInfo.label}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {threshold === 0.5 && 'Default balanced setting - good for most use cases'}
            {threshold !== 0.5 && threshold < 0.3 && 'Lower threshold means more results, even if less relevant'}
            {threshold !== 0.5 && threshold >= 0.3 && threshold < 0.5 && 'More results with reasonable accuracy'}
            {threshold !== 0.5 && threshold >= 0.5 && threshold < 0.7 && 'Higher threshold ensures better quality matches'}
            {threshold !== 0.5 && threshold >= 0.7 && 'Maximum accuracy, may miss some valid matches'}
          </p>
        </div>
      </div>
    </div>
  );
};
