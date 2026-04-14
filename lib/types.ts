export interface CandidateInfo {
  name: string;
  email: string;
}

export interface ConversationMessage {
  role: 'ai' | 'candidate';
  content: string;
  timestamp: string;
}

export interface DimensionScore {
  score: number;
  explanation: string;
  evidence_quote: string;
}

export interface AssessmentResult {
  overall_score: number;
  recommendation: 'Strong Recommend' | 'Recommend' | 'Maybe' | 'Not Recommended';
  summary: string;
  strengths: string[];
  areas_for_improvement: string[];
  dimensions: {
    communication_clarity: DimensionScore;
    warmth_patience: DimensionScore;
    simplification_ability: DimensionScore;
    english_fluency: DimensionScore;
    teaching_instinct: DimensionScore;
  };
}

export interface InterviewState {
  candidate: CandidateInfo | null;
  conversationHistory: ConversationMessage[];
  currentQuestionIndex: number;
  isRecording: boolean;
  isAISpeaking: boolean;
  isProcessing: boolean;
  interviewStartTime: number | null;
  interviewEndTime: number | null;
  assessment: AssessmentResult | null;
  interviewStatus: 'not_started' | 'in_progress' | 'completing' | 'completed';
  useFallbackMode: boolean;
}

export type InterviewAction =
  | { type: 'SET_CANDIDATE'; payload: CandidateInfo }
  | { type: 'ADD_MESSAGE'; payload: ConversationMessage }
  | { type: 'SET_QUESTION_INDEX'; payload: number }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_AI_SPEAKING'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'START_INTERVIEW' }
  | { type: 'COMPLETE_INTERVIEW' }
  | { type: 'SET_ASSESSMENT'; payload: AssessmentResult }
  | { type: 'SET_STATUS'; payload: InterviewState['interviewStatus'] }
  | { type: 'SET_FALLBACK_MODE'; payload: boolean }
  | { type: 'RESET' };
