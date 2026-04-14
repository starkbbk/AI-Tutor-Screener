# 🚀 Deployment Guide: AI Tutor Screener

This project is built with **Next.js**, **Tailwind CSS**, and **Groq Cloud API**. The fastest way to deploy is using **Vercel**.

## 1. Prerequisites
- A **Groq Cloud** account with an API Key (https://console.groq.com/)
- A **GitHub** account
- Your code pushed to a GitHub repository

## 2. Deploy to Vercel (Recommended)
1. Go to [vercel.com](https://vercel.com/) and click **"New Project"**.
2. Import your GitHub repository.
3. In the **Environment Variables** section, add:
   - `GROQ_API_KEY`: Your gsk_... key from Groq.
4. Click **Deploy**.
5. Once deployed, Vercel will provide a production URL.

## 3. Manual Build & Deployment (Other Platforms)
If you are deploying to an AWS EC2, DigitalOcean, or your own server:
1. Clone the repo: `git clone <repo-url>`
2. Install dependencies: `npm install`
3. Create a `.env.local` file with `GROQ_API_KEY`.
4. Run the production build: `npm run build`
5. Start the server: `npm run start`

## 4. Key Configurations
- **AI Model**: The app uses `llama-3.3-70b-versatile` on Groq.
- **Rate Limits**: Groq's free tier is generous (30 RPM), which is adequate for this screening tool.

## 5. Troubleshooting
- **API Errors**: If the assessment fails, ensure your `GROQ_API_KEY` is correct in the production environment variables.
- **Node Version**: Use Node.js 18.x or 20.x for best compatibility.
