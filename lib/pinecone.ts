import { Pinecone, Index } from "@pinecone-database/pinecone";
import dotenv from 'dotenv'
import OpenAI from "openai";
dotenv.config({ path: '.env.local' })
const PINECONE_API_TOKEN = process.env.PINECONE_API_TOKEN;
if (!PINECONE_API_TOKEN) throw new Error("PINECONE_API_TOKEN is not set");
const PINECONE_INDEX_DEV = process.env.PINECONE_INDEX_DEV;
if (!PINECONE_INDEX_DEV) throw new Error("PINECONE_INDEX_DEV is not set");


const pc = new Pinecone({ apiKey: PINECONE_API_TOKEN! });


let index:  Index | null = null;

export function getPineconeIndex():  Index {
  if (!index) {
    index = pc.index({ name: PINECONE_INDEX_DEV!});
  }
  return index;
}