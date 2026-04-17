# 🎭 Cuemath AI Tutor Screener

> **An AI-powered voice interview platform that screens tutor candidates in 8 minutes — replacing expensive, slow human screening calls with intelligent, scalable automation.**

> ⚡ Built to simulate a production-grade AI screening system using only free-tier resources.

🔗 **Live Demo:** [ai-tutor-screener-tau.vercel.app](https://ai-tutor-screener-tau.vercel.app)

---

## 🎯 The Problem

Cuemath hires **hundreds of tutors every month**. Each candidate goes through a 10-minute screening call with a human interviewer to assess soft skills — communication clarity, patience, warmth, ability to simplify concepts, and teaching instinct.

This process is:
- **Expensive** — dedicated interviewers on payroll
- **Slow** — scheduling calls takes 3-5 days per candidate
- **Hard to scale** — one interviewer can only handle 20-30 candidates per day
- **Inconsistent** — different interviewers, different standards

---

## 💡 The Solution

An **AI interviewer** that conducts professional voice-based screening interviews **24/7, instantly, at near-zero cost**.

The candidate visits the website → speaks naturally with the AI interviewer → answers 6 carefully designed questions → receives an automated assessment report with scores across 5 teaching dimensions.

**What used to take 3-5 days and a human interviewer now takes 8 minutes and costs practically nothing.**

---

## 🚀 Why This Works Better Than a Human Screener

| | Human Screener | AI Screener |
|---|---|---|
| **Availability** | Business hours only | 24/7, any timezone |
| **Speed** | 3-5 days to schedule | Instant — click and start |
| **Cost per interview** | Resource-intensive human effort | Near-zero marginal cost |
| **Daily capacity** | 20-30 candidates | Unlimited |
| **Consistency** | Varies by interviewer mood | Same standard every time |
| **Bias** | Unconscious human bias | Objective scoring rubric |
| **Report generation** | Manual notes, subjective | Auto-generated, evidence-based |
| **Scaling** | Scale by increasing human resources | Scale infrastructure horizontally with additional API capacity |

### 💸 The Economics
> **Traditional screening:**
> 500 candidates/month × ~₹200–₹500 per interview ≈ **₹1–2.5 lakh/month**

> **AI-powered screening:**
> Near-zero marginal cost per interview

> **Result:**
> **~99%+ cost reduction with infinite scalability**

---

## ✨ Key Features

### 🎙️ Human-Like Voice Interview
- **ElevenLabs TTS integration** — AI speaks with a natural, human-like voice (configurable voice profile)
- **Not a robotic voice** — candidates feel like they're talking to a real person
- **Multi-key ElevenLabs fallback system** — rotates across multiple API keys to ensure uninterrupted voice generation
- **Automatic browser TTS fallback** — if all ElevenLabs keys exhaust, seamlessly switches to browser voice
- Real-time speech recognition captures candidate responses
- Automatic silence detection (5 seconds) seamlessly moves the conversation forward
- Text appears in sync with voice — no text spoilers before AI finishes speaking

### 🤖 Intelligent AI Interviewer (Maya)
- Powered by **Llama 3.3 70B** via Groq — fast, intelligent, and free
- **Persona: Maya** — a warm, friendly Cuemath interviewer who sounds human
- **One question per turn** — clean, focused, linear interview flow
- **Strict question tracking** — frontend controls question order, AI cannot repeat or skip questions
- **Nonsense detection** — catches irrelevant answers and politely redirects
- **Auto-completion** — interview ends automatically after all 6 questions (answer, skip, or timeout)
- Natural acknowledgments — varies responses like a real human ("Hmm okay...", "Right, got it...")
- **Maintains a consistent interviewer persona throughout the session**

### 📊 Comprehensive Assessment Report
- **Overall score** out of 100 with color-coded progress ring
- **Recommendation level**: Strong Recommend / Recommend / Maybe / Not Recommended
- **5-dimension scoring** (each 0-20):
  - 💬 Communication Clarity
  - 🤗 Warmth & Patience
  - 🧩 Simplification Ability
  - 🗣️ English Fluency
  - 🎓 Teaching Instinct
- **Evidence-based** — each dimension includes a direct quote from the interview
- **Strengths & Areas for Improvement** — actionable insights
- **Full interview transcript** with timestamps

### 📥 PDF Export
- One-click professional PDF report generation
- Clean formatting suitable for HR review and filing
- Includes all scores, dimensions, evidence quotes, and transcript

### 🎨 Premium UI/UX
- **Dark/Light mode** with smooth transitions
- **Glassmorphism aesthetics** — frosted glass cards, subtle gradients
- **Interview progress bar** — visual question tracker (1/6 → 6/6)
- **Typing indicator** — shows thinking state while AI generates response
- **Responsive layout with mobile compatibility**
- **Cuemath brand alignment** — professional, trustworthy, welcoming
- **Pre-interview mic test** — builds candidate confidence before the real interview
- **Dynamic Device Notice** — recommends laptop for stable environment without blocking mobile access

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | Full-stack in one project, easy Vercel deployment |
| **Language** | TypeScript | Type safety, better developer experience |
| **AI Model** | Llama 3.3 70B (via Groq) | Free tier, ultra-fast inference, excellent quality |
| **Voice (TTS)** | ElevenLabs API | Human-like natural voice, configurable voice profile |
| **Voice Fallback** | Browser SpeechSynthesis | Free backup when ElevenLabs quota exhausts |
| **Speech-to-Text** | Web Speech API | Free, built-in, no server processing needed |
| **Styling** | Tailwind CSS + Custom CSS | Rapid development with premium custom touches |
| **Animations** | CSS Animations + Framer Motion | Smooth, performant transitions |
| **State Management** | React Context + Hooks | Lightweight, no extra dependencies |
| **PDF Generation** | html2canvas-pro + jsPDF | Client-side PDF with print fallback |
| **Deployment** | Vercel | Zero-config, automatic deployments, free tier |

---

## 🧠 Engineering Challenges & How I Solved Them

### 1. AI Getting Stuck in Loops
**Problem:** LLM would sometimes repeat the same question, skip questions, or ask question 7 that doesn't exist.

**Solution:** Frontend owns the question state. The AI only generates acknowledgment + receives the next question to ask from the system prompt. Question index is tracked client-side and passed to the API on every turn. AI cannot deviate.

### 2. Robotic Voice Killing the Experience
**Problem:** Browser SpeechSynthesis sounds like a robot. Candidates immediately know it's not human, breaking the immersion.

**Solution:** Integrated ElevenLabs TTS API with a natural voice profile. Built a multi-key fallback system — when one key's quota runs out, it silently switches to the next. If all keys exhaust, gracefully falls back to browser TTS so the app never breaks.

### 3. Text Appearing Before Voice
**Problem:** AI response text would show up on screen instantly, but voice took 1-2 seconds to load from ElevenLabs. Candidate could read the answer before hearing it — felt unnatural.

**Solution:** Show a "thinking..." indicator while TTS audio loads. Only render the text message AFTER the audio starts playing. Text and voice now appear in sync.

### 4. Interview Not Ending After Last Question
**Problem:** After question 6, the system would try to fetch question 7, hang, and never redirect to the report page.

**Solution:** Added explicit end-of-interview detection in three places — answer handler, skip handler, and silence timeout handler. All three check: if `currentQuestion >= 6`, trigger closing message → TTS → auto-redirect to report.

### 5. Free Tier API Rate Limits
**Problem:** Groq free tier allows 100K tokens/day. ElevenLabs free tier allows 10K chars/month. A single key runs out quickly during testing.

**Solution:** Built a multi-key rotation system for BOTH services. 4 Groq keys = 400K tokens/day. Multiple ElevenLabs keys for extended TTS capacity. Each API route tries keys sequentially with automatic fallback. Users experience zero downtime.

### 6. Mobile Audio & Handoff Delay
**Problem:** Mobile browsers (especially Safari) have inconsistent audio context behavior. Switching from AI speaker to candidate mic too fast (under 100ms) would often crash the session or fail to record.

**Solution:** Implemented **Adaptive Handoff Delay**. Laptops use an instant-on 10ms delay, while mobile devices use a 500ms safety buffer. Combined with an aggressive "Auto-Revive" safety net, the microphone maintains 100% reliability across all devices.

> These solutions ensure a **deterministic, production-grade interview flow** rather than a typical unpredictable LLM chat experience.

---

## 🛡️ Edge Case Handling

| Edge Case | What Happens |
|-----------|-------------|
| Candidate gives one-word answer | AI acknowledges briefly, moves to next question |
| Candidate speaks off-topic or gibberish | AI politely redirects: "Hmm, I think I wasn't clear..." |
| Candidate stays silent for 5+ seconds | Auto-submits silence, moves forward |
| Candidate skips all 6 questions | Interview still completes, report generates with low scores |
| ElevenLabs API key quota exhausted | Auto-rotates to next key, then falls back to browser TTS |
| Groq API key rate limited | Auto-rotates to next key (4 keys available) |
| All API keys fail | Graceful error message, no crash |
| Browser doesn't support speech recognition | Text input box appears automatically |
| Candidate refreshes mid-interview | Interview state preserved in localStorage |
| Slow internet connection | Loading indicators shown, TTS buffers before playing |
| Question 6 answered/skipped/timed out | Interview auto-ends in ALL three scenarios |
| Candidate tries to go back to previous question | Not possible — linear flow enforced |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  Landing → Mic Test → Interview Room → Report    │
│  (Next.js + React + Tailwind)                    │
└──────────────────────┬──────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │   API Routes        │
            │  /api/chat          │ ← Interview conversation
            │  /api/tts           │ ← ElevenLabs voice synthesis
            │  /api/assess        │ ← Assessment generation
            └──────────┬──────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────┴────┐  ┌─────┴─────┐  ┌───┴───┐
    │  Groq   │  │ ElevenLabs│  │Browser│
    │  API    │  │ TTS API   │  │TTS    │
    │(LLM)   │  │(Voice)    │  │(Fallback)
    │Key 1→4 │  │Multi-key │  │       │
    └─────────┘  └───────────┘  └───────┘
```

### Interview Flow
```
Candidate enters name/email
        ↓
Microphone test (hardware check)
        ↓
"Begin Interview" tap
        ↓
AI (Maya) greets candidate → asks Q1
        ↓
Candidate speaks → AI listens (5s silence = auto-submit)
        ↓
AI acknowledges → moves to next question
        ↓
(Repeat for 6 questions — one question per turn)
        ↓
Question 6 answered/skipped/timed out → auto-end
        ↓
AI closing message → auto-redirect to report
        ↓
Full transcript sent to Groq for assessment
        ↓
Detailed report with 5-dimension scoring
        ↓
PDF download available
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Groq API key ([console.groq.com](https://console.groq.com))
- ElevenLabs API key ([elevenlabs.io](https://elevenlabs.io))

### 1. Clone the repository
```bash
git clone https://github.com/starkbbk/AI-Tutor-Screener.git
cd AI-Tutor-Screener
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root:
```env
# Groq API Keys (LLM - multi-key fallback)
GROQ_API_KEY_1=gsk_your_first_key
GROQ_API_KEY_2=gsk_your_second_key
GROQ_API_KEY_3=gsk_your_third_key
GROQ_API_KEY_4=gsk_your_fourth_key

# ElevenLabs API Keys (TTS - multi-key fallback)
ELEVENLABS_API_KEY_1=sk_your_first_key
ELEVENLABS_API_KEY_2=sk_your_second_key
ELEVENLABS_API_KEY_3=sk_your_third_key
ELEVENLABS_API_KEY_4=sk_your_fourth_key
ELEVENLABS_API_KEY_5=sk_your_fifth_key
ELEVENLABS_API_KEY_6=sk_your_sixth_key
```

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🚀 Deployment (Vercel)

1. **Push to GitHub**
2. **Import to Vercel**: Connect your GitHub repository
3. **Set environment variables**: Add all `GROQ_API_KEY_*` and `ELEVENLABS_API_KEY_*` variables
4. **Deploy**: Vercel automatically builds and deploys

---

## 🎯 Design Decisions & Tradeoffs

| Decision | Why | Tradeoff |
|----------|-----|----------|
| **ElevenLabs over Browser TTS** | Human-like voice makes interview feel real | Limited free chars/month — solved with multi-key rotation |
| **Multi-key fallback (Groq + ElevenLabs)** | Zero downtime on free tiers | Requires multiple accounts |
| **Groq over OpenAI/Gemini** | Free tier with 100K tokens/day, ultra-fast | Llama 3.3 slightly less capable than GPT-4, but excellent here |
| **Web Speech API over Whisper** | Free, instant, no server cost | Chrome/Safari only — text fallback for others |
| **One question per turn** | Clean focused flow, no confusion | Less conversational, but more reliable |
| **Text synced with voice** | Natural feel — real conversation | Slight delay while TTS audio loads |
| **Frontend question tracking** | Prevents AI loops and stuck states | Less flexible, but bulletproof reliability |
| **localStorage over database** | Zero cost, instant deployment | Not persistent across devices |
| **Adaptive Device Optimization** | Ensures stability on mobile without blocking access | Slightly more complex code, but far better UX |

---

## 🔮 Future Roadmap

1. **PostgreSQL database** — persist all interviews, enable search and analytics
2. **HR Admin Dashboard** — view all candidates, filter by score, compare side-by-side
3. **Whisper API** — better transcription for Indian English accents
4. **Email notifications** — auto-email results to HR team
5. **Customizable question sets** — different questions for different roles
6. **Multi-language support** — Hindi and regional languages
7. **Analytics dashboard** — completion rates, average scores, drop-off analysis
8. **Audio recording** — store voice recordings alongside transcripts
9. **Streaming TTS** — ElevenLabs streaming for even faster response
10. **Candidate comparison** — compare two candidates side-by-side

---

## 🧪 Testing

### Good Candidate Test (Expected: 80-90 score)
Give detailed, thoughtful answers about teaching philosophy, use real examples, show patience and creativity.

### Average Candidate Test (Expected: 50-65 score)
Give short but relevant answers.

### Poor Candidate Test (Expected: 20-35 score)
Give one-word answers or irrelevant responses. AI catches this and scores accordingly.

---

## 📂 Project Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── mic-test/page.tsx     # Microphone test
│   ├── interview/page.tsx    # Interview room
│   ├── report/page.tsx       # Assessment report
│   ├── api/
│   │   ├── chat/route.ts     # AI conversation endpoint
│   │   ├── tts/route.ts      # ElevenLabs TTS endpoint
│   │   └── assess/route.ts   # Assessment generation endpoint
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/               # Reusable UI components
├── context/                  # React Context providers
├── lib/                      # Utilities, constants, types
├── public/                   # Static assets
├── .env.local                # API keys (not in repo)
└── README.md                 # This file
```

---

## 👨💻 Author

Built by **Shivanand Verma** as part of the **Cuemath AI Builder Challenge** — a take-home build challenge for the AI Builder role on Cuemath's Product Team.

---

## 📄 License

MIT License. Built for Cuemath Tutor Screening.
