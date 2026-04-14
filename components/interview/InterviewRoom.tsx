"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Clock, Send, SkipForward, XCircle, Loader2 } from "lucide-react"

import { useInterview } from "@/context/InterviewContext"
import { VoiceAvatar } from "./VoiceAvatar"
import { MicButton } from "./MicButton"
import { TranscriptDisplay } from "./TranscriptDisplay"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { formatTime } from "@/lib/utils"
import { TOTAL_QUESTIONS } from "@/lib/constants"
import { speak, startListening, stopListening, stopSpeaking, SpeechRecognitionResult, preloadVoices } from "@/lib/speech"

export function InterviewRoom() {
  const router = useRouter()
  const { 
    state, setAISpeaking, setRecording, setProcessing, 
    addMessage, setQuestionIndex, completeInterview, setStatus 
  } = useInterview()
  
  const [timer, setTimer] = useState(0)
  const [textInput, setTextInput] = useState("")
  const isFirstRender = useRef(true)
  
  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Initial greeting
  useEffect(() => {
    console.log('[INTERVIEW ROOM] Initial greeting useEffect triggered. isFirstRender:', isFirstRender.current, 'candidateName:', state.candidate?.name, 'historyLength:', state.conversationHistory.length);
    if (isFirstRender.current && state.conversationHistory.length === 0) {
      console.log('[INTERVIEW ROOM] Firing initial startChatWithGemini...');
      isFirstRender.current = false
      startChatWithGemini()
    }
  }, [state.candidate?.name, state.conversationHistory.length])
  
  useEffect(() => {
    preloadVoices()
  }, [])

  const startChatWithGemini = async (userMessage?: string) => {
    try {
      console.log('[INTERVIEW ROOM] startChatWithGemini called. message:', userMessage);
      setProcessing(true)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage || "",
          history: state.conversationHistory,
          candidateName: state.candidate?.name
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      addMessage({
        role: "ai",
        content: data.response,
        timestamp: new Date().toISOString()
      })

      playAIResponse(data.response)
      
    } catch (error: any) {
      console.error('[INTERVIEW ROOM] Exception in startChatWithGemini:', error)
      setProcessing(false)
      
      // Show actual error message to help debugging
      const errorMsg = `API Error: ${error.message || 'Unknown error'}`
      
      addMessage({
        role: "ai",
        content: errorMsg,
        timestamp: new Date().toISOString()
      })
      
      playAIResponse(errorMsg)
    }
  }

  const playAIResponse = (text: string) => {
    setProcessing(false)
    
    // Only use speech synthesis if not in fallback mode
    if (!state.useFallbackMode) {
      setAISpeaking(true)
      speak(
        text,
        () => {}, // onStart
        () => {
          setAISpeaking(false)
          // Look for signs that the interview is over wrapped up by AI
          checkIfInterviewComplete(text)
        }
      )
    } else {
      setTimeout(() => {
        checkIfInterviewComplete(text)
      }, 2000) // Brief delay in text mode before checking complete
    }
  }

  const checkIfInterviewComplete = (text: string) => {
    // A somewhat hacky but effective way: if we are past total questions, 
    // or the AI is giving a concluding remark (e.g., "thank you", "that's all")
    // For now we rely on the state keeping track of question index.
    // The prompt says "After all 6 questions are answered, wrap up warmly."
    const isEnding = state.currentQuestionIndex >= TOTAL_QUESTIONS || 
                     text.toLowerCase().includes("wraps up our interview") ||
                     text.toLowerCase().includes("have a great day");
                     
    if (isEnding && state.currentQuestionIndex >= TOTAL_QUESTIONS - 1) {
      finishInterview()
    } else if (state.currentQuestionIndex < TOTAL_QUESTIONS) {
      // Just step increment for UI tracking. Gemini actually asks the questions.
      // We'll increment every time candidate answers.
    }
  }

  const finishInterview = () => {
    // 1. Set flag and prevent any further interactions
    if (state.interviewStatus === 'completing') return;
    
    console.log('[INTERVIEW ROOM] finishInterview called. Initiating final sequence...');
    setStatus('completing')
    completeInterview()
    
    // 2. Clear any active speech/listening
    stopListening()
    stopSpeaking()
    setRecording(false)
    setAISpeaking(false)
    
    // 3. Save full transcript and session data to localStorage
    try {
      localStorage.setItem(`cuemath_session_backup_${state.candidate?.name?.replace(/\s+/g, '_')}`, JSON.stringify({
        candidate: state.candidate,
        transcript: state.conversationHistory,
        startTime: state.interviewStartTime,
        endTime: Date.now(),
        isCompleted: true
      }));
      console.log("[INTERVIEW ROOM] Final session backup saved.");
    } catch (e) {
      console.error("[INTERVIEW ROOM] Backup failed:", e);
    }

    // 4. Auto-redirect after 3 seconds
    setTimeout(() => {
      console.log('[INTERVIEW ROOM] Redirecting to report...');
      router.push("/report")
    }, 3000)
  }

  const handleMicToggle = () => {
    // Prevent mic usage if interview is ending
    if (state.interviewStatus === 'completing') {
      router.push("/report");
      return;
    }

    if (state.isRecording) {
      stopListening()
      setRecording(false)
    } else {
      stopSpeaking()
      setAISpeaking(false)
      setRecording(true)
      startListening(
        (result: SpeechRecognitionResult) => {
          if (result.isFinal) {
            handleCandidateSpeakingFinished(result.transcript)
          }
        },
        () => {
          if (state.isRecording) setRecording(false)
        },
        (err: string) => {
          console.error(err)
          setRecording(false)
        }
      )
    }
  }

  const handleCandidateSpeakingFinished = (transcript: string) => {
    if (!transcript.trim()) return
    // Prevent API calls if interview is ending
    if (state.interviewStatus === 'completing') {
      router.push("/report");
      return;
    }
    
    setRecording(false)
    addMessage({
      role: "candidate",
      content: transcript,
      timestamp: new Date().toISOString()
    })
    
    setQuestionIndex(Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS))
    startChatWithGemini(transcript)
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim()) return
    // Prevent API calls if interview is ending
    if (state.interviewStatus === 'completing') {
      router.push("/report");
      return;
    }
    
    const text = textInput
    setTextInput("")
    
    addMessage({
      role: "candidate",
      content: text,
      timestamp: new Date().toISOString()
    })
    
    setQuestionIndex(Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS))
    startChatWithGemini(text)
  }

  const handleSkipQuestion = () => {
    // Prevent skip if interview is ending
    if (state.interviewStatus === 'completing') {
      router.push("/report");
      return;
    }

    stopListening()
    stopSpeaking()
    setRecording(false)
    setAISpeaking(false)
    addMessage({
      role: "candidate",
      content: "[Candidate skipped the question]",
      timestamp: new Date().toISOString()
    })
    setQuestionIndex(Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS))
    startChatWithGemini("I'd like to skip this question. Please ask the next one.")
  }

  const handleEndEarly = () => {
    stopListening()
    stopSpeaking()
    finishInterview()
  }

  if (state.interviewStatus === 'completing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500 bg-background/80 backdrop-blur-md rounded-[3rem] p-10 text-center">
        <Loader2 className="w-16 h-16 text-brand-amber animate-spin mb-8" />
        <h2 className="text-4xl font-extrabold text-foreground mb-4 tracking-tight">INTERVIEW COMPLETE</h2>
        <p className="text-xl text-muted-foreground font-light max-w-md">
          Generating your assessment report... <br/> Please stay on this page.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto glass-card rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden relative ring-1 ring-border mt-2 sm:mt-4">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 sm:p-8 glass-header z-20">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Image src="/cuemath-logo.svg" alt="Cuemath" width={100} height={30} className="sm:w-[140px] sm:h-[40px] opacity-90 transition-opacity hover:opacity-100" />
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden xs:flex items-center">
            <VoiceAvatar />
          </div>
          <div className="text-[9px] sm:text-xs font-black text-brand-amber bg-brand-amber/10 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full border border-brand-amber/20 uppercase tracking-widest">
            {Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
          </div>
          <div className="flex items-center text-muted-foreground font-mono text-[10px] sm:text-sm tracking-widest bg-muted/50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-border">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:2 text-brand-cyan" />
            {formatTime(timer)}
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-10 relative scrollbar-hide">
        {/* Decorative theme-aware glows */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-brand-cyan/5 dark:bg-brand-cyan/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
        
        <TranscriptDisplay messages={state.conversationHistory} />
        
        {/* Scroll anchor */}
        <div className="h-4 sm:h-6" />
      </div>

      {/* Bottom Controls */}
      <div className="px-4 sm:px-10 py-4 sm:py-6 bg-muted/30 backdrop-blur-2xl border-t border-border relative z-20 flex flex-col items-center">
        
        {state.useFallbackMode && (
          <form onSubmit={handleTextSubmit} className="flex space-x-2 sm:space-x-4 max-w-3xl w-full mx-auto mb-4 sm:mb-6">
            <Input 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your response..."
              className="flex-1 bg-background border-border h-12 sm:h-16 rounded-xl sm:rounded-[1.5rem] text-sm sm:text-lg px-4 sm:px-8 focus:ring-2 focus:ring-brand-amber/30 transition-all font-light"
              disabled={state.isProcessing || state.isAISpeaking}
            />
            <Button 
              type="submit" 
              disabled={!textInput.trim() || state.isProcessing || state.isAISpeaking} 
              className="h-12 sm:h-16 px-4 sm:px-10 rounded-xl sm:rounded-[1.5rem] font-bold amber-button shadow-xl shadow-brand-amber/10 transition-all active:scale-95"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-3" /> <span className="hidden xs:inline">Submit</span>
            </Button>
          </form>
        )}

        {/* Action Buttons row integrated into flex layout */}
        <div className={`flex justify-between items-center w-full max-w-4xl mx-auto ${state.useFallbackMode ? 'border-t border-border/40 pt-3 sm:pt-4' : ''}`}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleEndEarly} 
            className="text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg sm:rounded-xl transition-all text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] px-2 sm:px-4 flex-1 sm:flex-none justify-start sm:justify-center"
          >
            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> <span className="hidden sm:inline">Exit Session</span> <span className="sm:hidden">Exit</span>
          </Button>

          {!state.useFallbackMode && (
            <div className="flex flex-col items-center justify-center flex-1">
              <MicButton 
                isRecording={state.isRecording}
                isProcessing={state.isProcessing}
                disabled={state.isAISpeaking}
                onClick={handleMicToggle}
              />
              <div className="mt-2 text-[8px] sm:text-[11px] font-black tracking-[0.1em] sm:tracking-[0.3em] uppercase text-muted-foreground/60 h-4 sm:h-6">
                {state.isRecording ? (
                  <span className="text-red-500 flex items-center">
                    <span className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 mr-1.5 sm:mr-2 animate-pulse" />
                    Rec...
                  </span>
                ) : (
                  'Tap to speak'
                )}
              </div>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSkipQuestion} 
            disabled={state.isProcessing || state.isRecording}
            className="text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-lg sm:rounded-xl transition-all text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] px-2 sm:px-4 flex-1 sm:flex-none justify-end sm:justify-center"
          >
            <span className="hidden sm:inline">Skip Question</span> <span className="sm:hidden">Skip</span> <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
          </Button>
        </div>
      </div>
    </div>

  )
}

