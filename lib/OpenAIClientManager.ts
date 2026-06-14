import OpenAI from "openai";
import { EMBEDDING_MODEL } from "@/config/env.server";

class OpenAIClientManager {
  private static instance: OpenAIClientManager | null = null;
  private client: OpenAI | null = null;

  private constructor() {}

  public static getInstance(): OpenAIClientManager {
    if (!OpenAIClientManager.instance) {
      OpenAIClientManager.instance = new OpenAIClientManager();
    }
    return OpenAIClientManager.instance;
  }

  public getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.client;
  }

  public async getEmbedding(question: string): Promise<number[]> {
    const response = await this.getClient().embeddings.create({
      model: EMBEDDING_MODEL!,
      input: question,
    });
    return response.data[0].embedding;
  }

  public async embed(text: string): Promise<number[]> {
    const openai = this.getClient();
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL!,
      input: text,
    });
    return response.data[0].embedding;
  }

  public async warmupChatCompletion(): Promise<any> {
    return this.getClient().chat.completions.create({
      model: process.env.CHAT_MODEL!,
      messages: [{ role: "user", content: "warmup" }],
    });
  }

  public setClient(client: OpenAI | null) {
    this.client = client;
  }
}

// Export both the class and the default instance
export { OpenAIClientManager };
export default OpenAIClientManager.getInstance();