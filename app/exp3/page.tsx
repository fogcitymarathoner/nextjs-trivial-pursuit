'use client';

import { useState } from 'react';
import { FallbackToGeneralKnowledgeCheckbox } from '@/components/fallback-to-general-knowledge-checkbox/FallbackToGeneralKnowledgeCheckbox';

export default function SettingsPage() {
  const [useFallback, setUseFallback] = useState(false);

  return (
    <main className="app-page">
      <div className="app-container">
        <header className="page-heading">
          <h1 className="page-title">Search Settings</h1>
          <p className="page-description">
            Configure how your AI assistant handles document search.
          </p>
        </header>

        <section className="surface-panel surface-panel-spacious surface-panel-compact content-stack">
          <FallbackToGeneralKnowledgeCheckbox
            onChange={setUseFallback}
            defaultChecked={false}
            label="Allow AI to use general knowledge"
            description="When document search returns no results, the AI will answer using its training data"
            tooltipText="This is useful for general questions but may not reflect your specific document content. Use with caution for factual queries."
            warningTitle="General Knowledge Mode Active"
            warningMessage="The AI will now provide answers based on its general training data when specific information isn't found in your documents. This may lead to responses that are not accurate for your specific use case."
            size="lg"
            showTooltip={true}
            showWarning={true}
          />

          {useFallback && (
            <div className="surface-inner-item">
              <h3 className="section-label">Current Behavior:</h3>
              <ul className="content-list">
                <li>First searches your Pinecone index for relevant documents</li>
                <li>If no results above threshold, falls back to GPT general knowledge</li>
                <li>Responses may not reference your specific documents</li>
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
