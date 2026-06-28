'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type { PineconeIndexOption } from '@/config/pinecone/types';
import { FallbackToGeneralKnowledgeCheckbox } from '@/components/fallback-to-general-knowledge-checkbox/FallbackToGeneralKnowledgeCheckbox';
import { PineconeDropdown } from '@/components/pinecone/PineconeDropdown';
import { SimilarityThresholdSlider } from '@/components/similarity-threshold-slider/SimilarityThresholdSlider';

type QaMatch = {
  id: string;
  score: number | null;
  metadata: {
    text?: string;
    source?: string;
    page?: string | number;
    [key: string]: unknown;
  };
};

type QaResponse = {
  answer: string | null;
  matches: QaMatch[];
  hasContext: boolean;
  needsFallbackDecision: boolean;
  message: string | null;
  error?: string;
};

type QaClientProps = {
  indexes: PineconeIndexOption[];
};

export function QaClient({ indexes }: QaClientProps) {
  const firstIndex = indexes[0];
  const [question, setQuestion] = useState('');
  const [threshold, setThreshold] = useState(0.5);
  const [fallbackToGeneralKnowledge, setFallbackToGeneralKnowledge] = useState(true);
  const [pineconeIndexLabel, setPineconeIndexLabel] = useState(firstIndex?.label ?? '');
  const [result, setResult] = useState<QaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIndexName = useMemo(
    () => indexes.find(index => index.label === pineconeIndexLabel)?.indexName ?? '',
    [indexes, pineconeIndexLabel],
  );

  const askQuestion = async (fallbackOverride?: boolean) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Enter a question first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/qa/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmedQuestion,
          similarityThreshold: threshold,
          fallbackToGeneralKnowledge: fallbackOverride ?? fallbackToGeneralKnowledge,
          pineconeIndexLabel,
        }),
      });

      const payload = (await response.json()) as QaResponse;
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to answer the question');
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to answer the question');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await askQuestion();
  };

  return (
    <main className="app-page">
      <div className="app-container">
        <header className="page-heading">
          <h1 className="page-title">Q&A</h1>
          <p className="page-description">
            Ask against a Pinecone index, inspect the retrieved context, and control when general knowledge is allowed.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="split-workspace">
          <section className="workspace-main">
            <label className="field-stack">
              <span className="field-label">Question</span>
              <textarea
                value={question}
                onChange={event => setQuestion(event.target.value)}
                rows={8}
                className="text-area"
                placeholder="What did Calvin Coolidge say about the tax policy?"
              />
            </label>

            <div className="action-row">
              <button
                type="submit"
                disabled={isLoading || indexes.length === 0}
                className="button-primary"
              >
                {isLoading ? 'Asking...' : 'Ask'}
              </button>

              {result?.needsFallbackDecision && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => askQuestion(true)}
                  className="button-warning"
                >
                  Retry With General Knowledge
                </button>
              )}
            </div>
          </section>

          <aside className="workspace-sidebar">
            <div className="surface-panel surface-panel-padded">
              <h2 className="section-label">Pinecone Index</h2>
              <PineconeDropdown
                indexes={indexes}
                defaultValue={selectedIndexName || pineconeIndexLabel}
                placeholder="Select a Pinecone index"
                onSelect={index => setPineconeIndexLabel(index.label)}
              />
            </div>

            <SimilarityThresholdSlider
              defaultValue={threshold}
              onChange={setThreshold}
              label="Similarity Threshold"
            />

            <FallbackToGeneralKnowledgeCheckbox
              defaultChecked={fallbackToGeneralKnowledge}
              onChange={setFallbackToGeneralKnowledge}
            />
          </aside>
        </form>

        {error && (
          <div className="status-message status-message-danger">
            {error}
          </div>
        )}

        {result?.needsFallbackDecision && (
          <div className="status-message status-message-warning">
            No Pinecone results were found and general knowledge is off.
          </div>
        )}

        {result?.answer && (
          <section className="surface-panel surface-panel-spacious">
            <h2 className="result-title">Answer</h2>
            <p className="body-copy preserve-lines">{result.answer}</p>
          </section>
        )}

        {result && (
          <details className="surface-panel">
            <summary className="details-summary">
              Pinecone Results ({result.matches.length})
            </summary>
            <div className="details-body">
              {result.matches.length === 0 ? (
                <p className="body-copy-muted">No matches returned.</p>
              ) : (
                <div className="inner-list">
                  {result.matches.map((match, index) => (
                    <article key={`${match.id}-${index}`} className="surface-inner-item">
                      <div className="metadata-row">
                        <span className="metadata-strong">#{index + 1}</span>
                        <span>ID: {match.id || 'Unknown'}</span>
                        <span>Score: {match.score?.toFixed(3) ?? 'n/a'}</span>
                        {match.metadata.source && <span>Source: {match.metadata.source}</span>}
                        {match.metadata.page && <span>Page: {String(match.metadata.page)}</span>}
                      </div>
                      <p className="body-copy preserve-lines">
                        {match.metadata.text || 'No text metadata returned.'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
