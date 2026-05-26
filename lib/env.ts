
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
export const DEBUG = process.env.DEBUG;
if (!DEBUG) throw new Error("DEBUG is not set");

export const CHAT_MODEL = process.env.CHAT_MODEL;
if (!CHAT_MODEL) throw new Error("CHAT_MODEL is not set");

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;
if (!EMBEDDING_MODEL) throw new Error("EMBEDDING_MODEL is not set");

export const PINECONE_API_TOKEN = process.env.PINECONE_API_TOKEN;
if (!PINECONE_API_TOKEN) throw new Error("PINECONE_API_TOKEN is not set");

export const PINECONE_INDEX_DEV = process.env.PINECONE_INDEX_DEV;
if (!PINECONE_INDEX_DEV) throw new Error("PINECONE_INDEX_DEV is not set");


export const CLIENT_SECRET_FILE = process.env.CLIENT_SECRET_FILE_FOGCITYMARATHONER_LIST_FILES_2;
if (!CLIENT_SECRET_FILE) throw new Error("CLIENT_SECRET_FILE_FOGCITYMARATHONER_LIST_FILES_2 is not set");
