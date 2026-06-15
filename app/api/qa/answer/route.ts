import { getAnswer, getResultsFromVectorDB } from '@/lib/openai_answer_helpers';
import { PINECONE_INDEXES, getIndexNameByLabel } from '@/config/pinecone/pinecone_indexes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type QaAnswerRequest = {
  question?: unknown;
  similarityThreshold?: unknown;
  fallbackToGeneralKnowledge?: unknown;
  pineconeIndexLabel?: unknown;
};

type MatchMetadata = {
  text?: string;
  source?: string;
  page?: string | number;
  [key: string]: unknown;
};

type SerializedMatch = {
  id: string;
  score: number | null;
  metadata: MatchMetadata;
};

const DEFAULT_THRESHOLD = 0.5;

const parseThreshold = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_THRESHOLD;
  return Math.min(1, Math.max(0, value));
};

const serializeMatches = (queryResult: any | null): SerializedMatch[] => {
  if (!queryResult?.matches?.length) return [];

  return queryResult.matches.map((match: any) => ({
    id: String(match.id ?? ''),
    score: typeof match.score === 'number' ? match.score : null,
    metadata: {
      ...(match.metadata ?? {}),
      text: typeof match.metadata?.text === 'string' ? match.metadata.text : String(match.metadata?.text ?? ''),
      source: typeof match.metadata?.source === 'string' ? match.metadata.source : undefined,
      page: match.metadata?.page,
    },
  }));
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QaAnswerRequest;
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const fallbackToGeneralKnowledge = body.fallbackToGeneralKnowledge !== false;
    const similarityThreshold = parseThreshold(body.similarityThreshold);
    const requestedLabel = typeof body.pineconeIndexLabel === 'string' ? body.pineconeIndexLabel : undefined;
    const pineconeIndexLabel = requestedLabel || PINECONE_INDEXES[0]?.label;

    if (!question) {
      return Response.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!pineconeIndexLabel) {
      return Response.json({ error: 'No Pinecone indexes are configured' }, { status: 500 });
    }

    const pineconeIndexName = getIndexNameByLabel(pineconeIndexLabel);
    if (!pineconeIndexName) {
      return Response.json(
        { error: `No Pinecone index configured for label "${pineconeIndexLabel}"` },
        { status: 400 },
      );
    }

    const queryResult = await getResultsFromVectorDB(
      question,
      similarityThreshold,
      pineconeIndexName,
    );
    const matches = serializeMatches(queryResult);

    if (matches.length === 0 && !fallbackToGeneralKnowledge) {
      return Response.json({
        answer: null,
        matches,
        hasContext: false,
        needsFallbackDecision: true,
        message: 'No Pinecone results were found at this threshold.',
      });
    }

    const answer = await getAnswer(
      question,
      similarityThreshold,
      fallbackToGeneralKnowledge,
      pineconeIndexLabel,
      queryResult,
    );

    return Response.json({
      answer,
      matches,
      hasContext: matches.length > 0,
      needsFallbackDecision: false,
      message: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to answer the question';
    return Response.json({ error: message }, { status: 500 });
  }
}
