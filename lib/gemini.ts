import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_SYSTEM_PROMPT, ASSESSMENT_SYSTEM_PROMPT } from './constants';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export function getChatModel() {
  return genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: { role: 'system', parts: [{ text: AI_SYSTEM_PROMPT }] }
  });
}

export function getAssessmentModel() {
  return genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: { role: 'system', parts: [{ text: ASSESSMENT_SYSTEM_PROMPT }] }
  });
}
