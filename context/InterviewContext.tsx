'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { InterviewState, InterviewAction, CandidateInfo, ConversationMessage, AssessmentResult } from '@/lib/types';

const initialState: InterviewState = {
  candidate: null,
  conversationHistory: [],
  currentQuestionIndex: 0,
  isRecording: false,
  isAISpeaking: false,
  isProcessing: false,
  interviewStartTime: null,
  interviewEndTime: null,
  assessment: null,
  interviewStatus: 'not_started',
  useFallbackMode: false,
  attemptsOnCurrentQuestion: 0,
};

function interviewReducer(state: InterviewState, action: InterviewAction): InterviewState {
  switch (action.type) {
    case 'SET_CANDIDATE':
      return { ...state, candidate: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, conversationHistory: [...state.conversationHistory, action.payload] };
    case 'UPDATE_MESSAGE':
      const newHistory = state.conversationHistory.map(msg => 
        msg.id === action.payload.id 
          ? { ...msg, ...action.payload.updates } 
          : msg
      );
      return { ...state, conversationHistory: newHistory };
    case 'SET_QUESTION_INDEX':
      return { ...state, currentQuestionIndex: action.payload };
    case 'SET_RECORDING':
      return { ...state, isRecording: action.payload };
    case 'SET_AI_SPEAKING':
      return { ...state, isAISpeaking: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'START_INTERVIEW':
      return { ...state, interviewStartTime: Date.now(), interviewStatus: 'in_progress' };
    case 'COMPLETE_INTERVIEW':
      return { ...state, interviewEndTime: Date.now(), interviewStatus: 'completed' };
    case 'SET_ASSESSMENT':
      return { ...state, assessment: action.payload };
    case 'SET_STATUS':
      return { ...state, interviewStatus: action.payload };
    case 'SET_FALLBACK_MODE':
      return { ...state, useFallbackMode: action.payload };
    case 'INCREMENT_ATTEMPTS':
      return { ...state, attemptsOnCurrentQuestion: state.attemptsOnCurrentQuestion + 1 };
    case 'RESET_ATTEMPTS':
      return { ...state, attemptsOnCurrentQuestion: 0 };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface InterviewContextType {
  state: InterviewState;
  setCandidate: (info: CandidateInfo) => void;
  addMessage: (msg: ConversationMessage) => void;
  updateMessage: (id: string, updates: Partial<ConversationMessage>) => void;
  setQuestionIndex: (idx: number) => void;
  setRecording: (val: boolean) => void;
  setAISpeaking: (val: boolean) => void;
  setProcessing: (val: boolean) => void;
  startInterview: () => void;
  completeInterview: () => void;
  setAssessment: (result: AssessmentResult) => void;
  setStatus: (status: InterviewState['interviewStatus']) => void;
  setFallbackMode: (val: boolean) => void;
  incrementAttempts: () => void;
  resetAttempts: () => void;
  reset: () => void;
}

const InterviewContext = createContext<InterviewContextType | null>(null);

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  const setCandidate = useCallback((info: CandidateInfo) => dispatch({ type: 'SET_CANDIDATE', payload: info }), []);
  const addMessage = useCallback((msg: ConversationMessage) => dispatch({ type: 'ADD_MESSAGE', payload: msg }), []);
  const updateMessage = useCallback((id: string, updates: Partial<ConversationMessage>) => dispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } }), []);
  const setQuestionIndex = useCallback((idx: number) => dispatch({ type: 'SET_QUESTION_INDEX', payload: idx }), []);
  const setRecording = useCallback((val: boolean) => dispatch({ type: 'SET_RECORDING', payload: val }), []);
  const setAISpeaking = useCallback((val: boolean) => dispatch({ type: 'SET_AI_SPEAKING', payload: val }), []);
  const setProcessing = useCallback((val: boolean) => dispatch({ type: 'SET_PROCESSING', payload: val }), []);
  const startInterview = useCallback(() => dispatch({ type: 'START_INTERVIEW' }), []);
  const completeInterview = useCallback(() => dispatch({ type: 'COMPLETE_INTERVIEW' }), []);
  const setAssessment = useCallback((result: AssessmentResult) => dispatch({ type: 'SET_ASSESSMENT', payload: result }), []);
  const setStatus = useCallback((status: InterviewState['interviewStatus']) => dispatch({ type: 'SET_STATUS', payload: status }), []);
  const setFallbackMode = useCallback((val: boolean) => dispatch({ type: 'SET_FALLBACK_MODE', payload: val }), []);
  const incrementAttempts = useCallback(() => dispatch({ type: 'INCREMENT_ATTEMPTS' }), []);
  const resetAttempts = useCallback(() => dispatch({ type: 'RESET_ATTEMPTS' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <InterviewContext.Provider value={{
      state, setCandidate, addMessage, updateMessage, setQuestionIndex, setRecording,
      setAISpeaking, setProcessing, startInterview, completeInterview,
      setAssessment, setStatus, setFallbackMode, incrementAttempts, resetAttempts, reset,
    }}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
}

// © 2025 Shivanand Verma (starkbbk)

