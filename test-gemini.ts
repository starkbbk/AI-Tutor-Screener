import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') });

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
  console.log("Key starting with:", process.env.GOOGLE_GEMINI_API_KEY?.substring(0, 10));
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessage("Hi, what is 2+2?");
    console.log("Response:", result.response.text());
  } catch (err: any) {
    console.error("Error calling Gemini:", err.message);
  }
}

test();
