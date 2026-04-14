import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export function getChatModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

export function getAssessmentModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}
