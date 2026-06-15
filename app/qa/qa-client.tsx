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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-5">
          <h1 className="text-3xl font-semibold tracking-normal">Q&A</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Ask against a Pinecone index, inspect the retrieved context, and control when general knowledge is allowed.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-800">Question</span>
              <textarea
                value={question}
                onChange={event => setQuestion(event.target.value)}
                rows={8}
                className="min-h-48 resize-y rounded-md border border-slate-300 bg-white px-4 py-3 text-base leading-7 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="What did Calvin Coolidge say about the tax policy?"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isLoading || indexes.length === 0}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isLoading ? 'Asking...' : 'Ask'}
              </button>

              {result?.needsFallbackDecision && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => askQuestion(true)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Retry With General Knowledge
                </button>
              )}
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">Pinecone Index</h2>
              <PineconeDropdown
                indexes={indexes}
                defaultValue={selectedIndexName}
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
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {result?.needsFallbackDecision && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No Pinecone results were found and general knowledge is off.
          </div>
        )}

        {result?.answer && (
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Answer</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{result.answer}</p>
          </section>
        )}

        {result && (
          <details className="rounded-md border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-900">
              Pinecone Results ({result.matches.length})
            </summary>
            <div className="border-t border-slate-200 p-5">
              {result.matches.length === 0 ? (
                <p className="text-sm text-slate-600">No matches returned.</p>
              ) : (
                <div className="grid gap-3">
                  {result.matches.map((match, index) => (
                    <article key={`${match.id}-${index}`} className="rounded-md border border-slate-200 p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">#{index + 1}</span>
                        <span>ID: {match.id || 'Unknown'}</span>
                        <span>Score: {match.score?.toFixed(3) ?? 'n/a'}</span>
                        {match.metadata.source && <span>Source: {match.metadata.source}</span>}
                        {match.metadata.page && <span>Page: {String(match.metadata.page)}</span>}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
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
