# 🚀 Deployment Guide: AI Tutor Screener

This project is built with **Next.js**, **Tailwind CSS**, and a multi-provider AI fallback system. The fastest way to deploy is using **Vercel**.

## 1. Prerequisites
- **Groq Cloud** API Keys (Up to 3 recommended for high availability)
- **Google AI Studio** API Key (For Gemini fallback)
- Your code pushed to a GitHub repository

## 2. Deploy to Vercel (Recommended)
1. Go to [vercel.com](https://vercel.com/) and click **"New Project"**.
2. Import your GitHub repository.
3. In the **Environment Variables** section, add:
   - `GROQ_API_KEY_1`: Your primary Groq key.
   - `GROQ_API_KEY_2`: Your second backup Groq key (optional).
   - `GROQ_API_KEY_3`: Your third backup Groq key (optional).
   - `GEMINI_API_KEY`: Your Google Gemini API key (Required for final fallback).
4. Click **Deploy**.
5. Once deployed, Vercel will provide a production URL.

## 3. Key Configurations
- **AI Fallback System**: The app uses a "Sticky Key" fallback system. It tries Groq keys sequentially and falls back to **Gemini 2.0 Flash** if Groq is unavailable or rate-limited.
- **Error Handling**: Users will never see raw API errors; instead, they will see friendly, non-technical messages while the system switches providers.

## 4. Troubleshooting
- **API Errors**: Ensure all API keys are correctly added to the Vercel **Production** environment variables and that you have **re-deployed** after adding them.
- **Rate Limits**: The system is designed to handle rate limits automatically by switching keys and providers.

