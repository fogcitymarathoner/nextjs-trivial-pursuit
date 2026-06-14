'use client';

import { useState, useEffect } from 'react';
import { InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface FallbackToGeneralKnowledgeCheckboxProps {
  onChange?: (checked: boolean) => void;
  defaultChecked?: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  showTooltip?: boolean;
  tooltipText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showWarning?: boolean;
  warningTitle?: string;
  warningMessage?: string;
}

export const FallbackToGeneralKnowledgeCheckbox: React.FC<FallbackToGeneralKnowledgeCheckboxProps> = ({
                                                                                                        onChange,
                                                                                                        defaultChecked,
                                                                                                        label = 'Fallback to General Knowledge',
                                                                                                        description = 'When enabled, the system will use general knowledge if no specific matches are found in the index',
                                                                                                        disabled = false,
                                                                                                        showTooltip = true,
                                                                                                        tooltipText = 'Enable this to allow the AI to answer based on general knowledge when no relevant information is found in your documents',
                                                                                                        size = 'md',
                                                                                                        className = '',
                                                                                                        showWarning = true,
                                                                                                        warningTitle = 'General Knowledge Fallback Enabled',
                                                                                                        warningMessage = 'The AI may provide answers based on its training data when specific information isn\'t found. This could result in less accurate or out-of-date information.',
                                                                                                      }) => {
  const [checked, setChecked] = useState<boolean>(() => {
    if (defaultChecked !== undefined) return defaultChecked;
    return false;
  });
  const [showTooltipContent, setShowTooltipContent] = useState(false);

  useEffect(() => {
    if (defaultChecked !== undefined) {
      setChecked(defaultChecked);
    }
  }, [defaultChecked]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setChecked(isChecked);
    onChange?.(isChecked);
  };

  const sizes = {
    sm: {
      checkbox: 'w-3.5 h-3.5',
      label: 'text-sm',
      description: 'text-xs',
      icon: 'w-3.5 h-3.5',
      padding: 'p-2',
    },
    md: {
      checkbox: 'w-4 h-4',
      label: 'text-sm',
      description: 'text-xs',
      icon: 'w-4 h-4',
      padding: 'p-3',
    },
    lg: {
      checkbox: 'w-5 h-5',
      label: 'text-base',
      description: 'text-sm',
      icon: 'w-5 h-5',
      padding: 'p-4',
    },
  };

  const currentSize = sizes[size];

  return (
    <div className={`w-full ${className}`}>
      <div className="relative flex items-start">
        <div className="flex items-center h-6">
          <input
            id="fallback-to-general-knowledge"
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className={`
              ${currentSize.checkbox}
              text-blue-600 
              bg-white border-gray-300 
              rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              dark:bg-gray-800 dark:border-gray-600 dark:checked:bg-blue-600
              transition-all duration-200
            `}
          />
        </div>

        <div className="ml-3 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <label
              htmlFor="fallback-to-general-knowledge"
              className={`
                ${currentSize.label}
                font-medium 
                ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}
                cursor-pointer
              `}
            >
              {label}
            </label>

            <span className={`
              text-xs px-2 py-0.5 rounded-full font-medium
              ${checked
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }
              transition-all duration-200
            `}>
              {checked ? 'ENABLED' : 'DISABLED'}
            </span>

            {showTooltip && !disabled && (
              <div className="relative inline-flex">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltipContent(true)}
                  onMouseLeave={() => setShowTooltipContent(false)}
                  onFocus={() => setShowTooltipContent(true)}
                  onBlur={() => setShowTooltipContent(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  aria-label="More information"
                >
                  <InformationCircleIcon className={currentSize.icon} />
                </button>

                {showTooltipContent && (
                  <div className="absolute z-10 left-0 bottom-full mb-2 w-72 p-3 text-xs text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-xl border border-gray-700">
                    <div className="font-medium mb-1">About General Knowledge Fallback</div>
                    <div className="text-gray-300">{tooltipText}</div>
                    <div className="absolute left-3 top-full w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45 border-r border-b border-gray-700" />
                  </div>
                )}
              </div>
            )}
          </div>

          {description && (
            <p className={`
              ${currentSize.description}
              ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}
              mt-1
            `}>
              {description}
            </p>
          )}
        </div>
      </div>

      {showWarning && checked && !disabled && (
        <div className={`
          mt-4 ${currentSize.padding} 
          bg-yellow-50 dark:bg-yellow-900/20 
          border border-yellow-200 dark:border-yellow-800 
          rounded-lg
          animate-in fade-in slide-in-from-top-2 duration-200
        `}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                {warningTitle}
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                {warningMessage}
              </p>

              <div className="mt-2 flex gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                  <span>⚠️</span> May be less accurate
                </span>
                <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                  <span>📅</span> Could be out-of-date
                </span>
                <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                  <span>🔍</span> Not from your data
                </span>
              </div>
            </div>
            <button
              onClick={() => setChecked(false)}
              className="text-xs text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 underline"
            >
              Disable
            </button>
          </div>
        </div>
      )}

      {!checked && !disabled && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 text-sm">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Strict Mode: Only answering from your documents
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Enable fallback to allow general knowledge responses when no matches are found
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};