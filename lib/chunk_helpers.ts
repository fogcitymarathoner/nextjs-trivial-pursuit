export interface ChunkMetadata {
  text: string;
  title: string;
  pageUrl: string;
  namespace: string;
  customerUid: string;
  scrapeVersion: string;
  chunkIndex: number;
  links: string[];
  pageNumbers: number[] | null;
}

export const generateChunkId = (chunkText: string): string =>
  Buffer.from(chunkText.substring(0, 100)).toString("base64");


export const processChunkMetadata = (
  chunkText: string,
  title: string,
  pageUrl: string,
  namespace: string,
  customerUid: string,
  scrapeVersion: string,
  chunkIndex: number,
  links: string[],
  pageNumbers: number[] | null
): ChunkMetadata => ({
  text: chunkText,
  title,
  pageUrl,
  namespace,
  customerUid,
  scrapeVersion,
  chunkIndex,
  links,
  pageNumbers,
});