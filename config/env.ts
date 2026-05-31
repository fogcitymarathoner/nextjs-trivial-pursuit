// Removes need for dotenv-cli -e .env.local -- in
// npx dotenv-cli -e .env.local -- tsx scripts/tst.ts
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })


export const DEBUG = process.env.DEBUG;
if (!DEBUG) throw new Error("DEBUG is not set");

export const CHAT_MODEL = process.env.CHAT_MODEL;
if (!CHAT_MODEL) throw new Error("CHAT_MODEL is not set");

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;
if (!EMBEDDING_MODEL) throw new Error("EMBEDDING_MODEL is not set");

export const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
if (!PINECONE_API_KEY) throw new Error("PINECONE_API_KEY is not set");

export const PINECONE_INDEX_DEV = process.env.PINECONE_INDEX_DEV;
if (!PINECONE_INDEX_DEV) throw new Error("PINECONE_INDEX_DEV is not set");

export const CLIENT_SECRET_FILE = process.env.CLIENT_SECRET_FILE_FOGCITYMARATHONER_LIST_FILES_2;
if (!CLIENT_SECRET_FILE) throw new Error("CLIENT_SECRET_FILE_FOGCITYMARATHONER_LIST_FILES_2 is not set");

export const VECTOR_SIZE = process.env.VECTOR_SIZE;
if (!VECTOR_SIZE) throw new Error("VECTOR_SIZE is not set");

