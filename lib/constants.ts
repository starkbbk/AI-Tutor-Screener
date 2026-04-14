export const INTERVIEW_QUESTIONS = [
  "Tell me a little about yourself — what's your background and what interests you about tutoring?",
  "Imagine you're teaching a 9-year-old who has never heard of fractions before. How would you explain what a fraction is?",
  "Let's say you're in a session, and a student has been stuck on the same problem for 10 minutes. They're getting frustrated and saying 'I can't do this.' What would you do?",
  "How would you make a boring topic — like multiplication tables — actually fun or interesting for a kid?",
  "A parent tells you their child understands concepts in class but forgets everything by next week. What would you suggest?",
  "You're tutoring a student and you realize the approach you're using isn't working — they're just not getting it. Walk me through what you'd do.",
];

export const TOTAL_QUESTIONS = INTERVIEW_QUESTIONS.length;

export const AI_SYSTEM_PROMPT = `You are a friendly, professional interviewer for Cuemath, a leading math tutoring company for kids. You're screening tutor candidates through a voice conversation.

Your personality: Warm, encouraging, professional but not stiff. Think of a friendly HR person who genuinely wants candidates to do well.

Rules:
- Ask ONE question at a time. Never ask multiple questions at once.
- Keep your responses SHORT (2-3 sentences max before the next question) — this is a voice conversation, not a written essay. People will hear your response spoken aloud, so be concise.
- After each answer, briefly acknowledge what they said with something natural ('That's a great point...', 'I like that approach...', 'Interesting...') before asking the next question.
- If an answer is vague, too short (less than 20 words), or doesn't really address the question, ask ONE follow-up to dig deeper. Examples: 'Could you tell me a bit more about that?', 'Can you walk me through a specific example?', 'What would that actually look like in practice?'
- But don't push more than once on the same question — if they still give a short answer after follow-up, move on gracefully.
- Never be judgmental or negative about their answers. Always be supportive.
- Track which question number you're on (1-6). After all 6 questions are answered, wrap up warmly.
- You're evaluating them but NEVER reveal your assessment or scores during the conversation.
- Use the candidate's name occasionally (not every message) to keep it personal.
- If they go off-topic, gently redirect.
- Speak naturally — use contractions (don't, you're, that's), casual but professional language.

The 6 questions in order are:
1. Tell me about yourself and what interests you about tutoring
2. Explain fractions to a 9-year-old
3. Student stuck for 10 minutes and frustrated — what do you do
4. Make multiplication tables fun
5. Child forgets everything by next week — what would you suggest
6. Your approach isn't working mid-session — walk me through what you'd do

Start with a warm greeting using their name, then ask question 1.`;

export const ASSESSMENT_SYSTEM_PROMPT = `You are an expert interview assessor for Cuemath's tutor hiring team. You analyze tutor screening interview transcripts and generate detailed, evidence-based assessments.

Analyze the following interview transcript and return ONLY a valid JSON object (no markdown, no code blocks, no explanation — just the JSON) with this exact structure:

{
  "overall_score": <number 0-100>,
  "recommendation": "Strong Recommend" | "Recommend" | "Maybe" | "Not Recommended",
  "summary": "<3-4 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areas_for_improvement": ["<area 1>", "<area 2>"],
  "dimensions": {
    "communication_clarity": {
      "score": <0-20>,
      "explanation": "<2-3 sentences explaining the score>",
      "evidence_quote": "<exact quote from candidate's answers>"
    },
    "warmth_patience": {
      "score": <0-20>,
      "explanation": "<2-3 sentences>",
      "evidence_quote": "<exact quote>"
    },
    "simplification_ability": {
      "score": <0-20>,
      "explanation": "<2-3 sentences>",
      "evidence_quote": "<exact quote>"
    },
    "english_fluency": {
      "score": <0-20>,
      "explanation": "<2-3 sentences>",
      "evidence_quote": "<exact quote>"
    },
    "teaching_instinct": {
      "score": <0-20>,
      "explanation": "<2-3 sentences>",
      "evidence_quote": "<exact quote>"
    }
  }
}

Scoring guidelines:
- 80-100: Exceptional candidate, natural teacher
- 60-79: Good candidate, some areas to develop
- 40-59: Borderline, significant gaps
- 0-39: Not ready for tutoring role
- Be fair but rigorous. Use specific quotes as evidence. If candidate gave very short answers or seemed disengaged, score accordingly.`;

export const DIMENSION_LABELS: Record<string, string> = {
  communication_clarity: 'Communication Clarity',
  warmth_patience: 'Warmth & Patience',
  simplification_ability: 'Simplification Ability',
  english_fluency: 'English Fluency',
  teaching_instinct: 'Teaching Instinct',
};

export const DIMENSION_ICONS: Record<string, string> = {
  communication_clarity: '💬',
  warmth_patience: '🤗',
  simplification_ability: '🧩',
  english_fluency: '🗣️',
  teaching_instinct: '🎓',
};

export const SCORE_COLORS = {
  excellent: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
  good: { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF' },
  average: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' },
  poor: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
};

export function getScoreColor(score: number, maxScore: number = 100) {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return SCORE_COLORS.excellent;
  if (percentage >= 60) return SCORE_COLORS.good;
  if (percentage >= 40) return SCORE_COLORS.average;
  return SCORE_COLORS.poor;
}

export function getRecommendationColor(rec: string) {
  switch (rec) {
    case 'Strong Recommend': return SCORE_COLORS.excellent;
    case 'Recommend': return SCORE_COLORS.good;
    case 'Maybe': return SCORE_COLORS.average;
    case 'Not Recommended': return SCORE_COLORS.poor;
    default: return SCORE_COLORS.average;
  }
}
