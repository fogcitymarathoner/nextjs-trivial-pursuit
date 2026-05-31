import { getAnswer } from "@/lib/openai_answer_helpers";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });


export default function Home() {
  return (
    <>
      <h1 className="text-5xl font-bold text-blue-600">
        If this is blue and big, Tailwind is working!
      </h1>
    </>
  );
}
