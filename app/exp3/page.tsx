'use client';

import { useState } from 'react';
import { FallbackToGeneralKnowledgeCheckbox } from '@/components/fallback-to-general-knowledge-checkbox/FallbackToGeneralKnowledgeCheckbox';

export default function SettingsPage() {
  const [useFallback, setUseFallback] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Search Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure how your AI assistant handles document search
        </p>

        <FallbackToGeneralKnowledgeCheckbox
          onChange={setUseFallback}
          defaultChecked={false}
          label="Allow AI to use general knowledge"
          description="When document search returns no results, the AI will answer using its training data"
          tooltipText="This is useful for general questions but may not reflect your specific document content. Use with caution for factual queries."
          warningTitle="⚠️ General Knowledge Mode Active"
          warningMessage="The AI will now provide answers based on its general training data when specific information isn't found in your documents. This may lead to responses that are not accurate for your specific use case."
          size="lg"
          showTooltip={true}
          showWarning={true}
        />

        {useFallback && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Behavior:
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>First searches your Pinecone index for relevant documents</li>
              <li>If no results above threshold, falls back to GPT general knowledge</li>
              <li>Responses may not reference your specific documents</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}