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
import { formatTime } from "@/lib/utils"
import { TOTAL_QUESTIONS } from "@/lib/constants"
import { speak, startListening, stopListening, stopSpeaking, SpeechRecognitionResult } from "@/lib/speech"

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
    if (isFirstRender.current && state.candidate && state.conversationHistory.length === 0) {
      isFirstRender.current = false
      startChatWithGemini()
    }
  }, [state.candidate, state.conversationHistory.length])

  const startChatWithGemini = async (userMessage?: string) => {
    try {
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
      
    } catch (error) {
      console.error(error)
      // Fallback or retry logic
      setProcessing(false)
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
                     text.toLowerCase().includes("that concludes our interview") ||
                     text.toLowerCase().includes("thank you for your time today");
                     
    if (isEnding && state.currentQuestionIndex >= TOTAL_QUESTIONS - 1) {
      finishInterview()
    } else if (state.currentQuestionIndex < TOTAL_QUESTIONS) {
      // Just step increment for UI tracking. Gemini actually asks the questions.
      // We'll increment every time candidate answers.
    }
  }

  const finishInterview = () => {
    setStatus('completing')
    completeInterview()
    setTimeout(() => {
      router.push("/report")
    }, 3000)
  }

  const handleMicToggle = () => {
    if (state.isRecording) {
      stopListening()
      setRecording(false)
    } else {
      stopSpeaking()
      setAISpeaking(false)
      setRecording(true)
      startListening(
        (result: SpeechRecognitionResult) => {
          // Just waiting for the final result
          if (result.isFinal) {
            handleCandidateSpeakingFinished(result.transcript)
          }
        },
        () => {
          // Fallback if stopped manually or timeout
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
        <Loader2 className="w-16 h-16 text-brand-amber animate-spin mb-6" />
        <h2 className="text-3xl font-bold text-white mb-2">Analyzing Responses</h2>
        <p className="text-gray-400">Crafting your professional coach assessment...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto glass-card rounded-[3rem] shadow-2xl overflow-hidden relative ring-1 ring-border mt-4">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-8 glass-header z-20">
        <Image src="/cuemath-logo.svg" alt="Cuemath" width={140} height={40} className="opacity-90 dark:brightness-0 dark:invert" />
        
        <div className="flex items-center space-x-6">
          <div className="text-xs font-black text-brand-amber bg-brand-amber/10 px-4 py-2 rounded-full border border-brand-amber/20 uppercase tracking-widest">
            Session • {Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
          </div>
          <div className="flex items-center text-muted-foreground font-mono text-sm tracking-widest bg-muted/50 px-4 py-2 rounded-xl border border-border">
            <Clock className="w-4 h-4 mr-2 text-brand-cyan" />
            {formatTime(timer)}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-10 relative scrollbar-hide">
        {/* Decorative theme-aware glows */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-brand-cyan/5 dark:bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none" />
        
        <VoiceAvatar />
        <TranscriptDisplay messages={state.conversationHistory} />
        
        {/* Scroll anchor */}
        <div className="h-6" />
      </div>

      {/* Bottom Controls */}
      <div className="p-10 bg-muted/30 backdrop-blur-2xl border-t border-border relative z-20">
        
        {state.useFallbackMode ? (
          <form onSubmit={handleTextSubmit} className="flex space-x-4 max-w-3xl mx-auto">
            <Input 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your response here..."
              className="flex-1 bg-background border-border h-16 rounded-[1.5rem] text-lg px-8 focus:ring-2 focus:ring-brand-amber/30 transition-all font-light"
              disabled={state.isProcessing || state.isAISpeaking}
            />
            <Button 
              type="submit" 
              disabled={!textInput.trim() || state.isProcessing || state.isAISpeaking} 
              className="h-16 px-10 rounded-[1.5rem] font-bold amber-button shadow-xl shadow-brand-amber/10 transition-all active:scale-95"
            >
              <Send className="w-5 h-5 mr-3" /> Submit
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center">
            <MicButton 
              isRecording={state.isRecording}
              isProcessing={state.isProcessing}
              disabled={state.isAISpeaking}
              onClick={handleMicToggle}
            />
            <div className="mt-8 text-[11px] font-black tracking-[0.3em] uppercase text-muted-foreground/60 h-6">
              {state.isRecording ? (
                <span className="text-red-500 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2.5 animate-pulse" />
                  Recording...
                </span>
              ) : (
                'Tap to speak'
              )}
            </div>
          </div>
        )}

        {/* Action Buttons row integrated into flex layout */}
        <div className="flex justify-between items-center mt-10 w-full max-w-3xl mx-auto border-t border-border/40 pt-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleEndEarly} 
            className="text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em] px-4"
          >
            <XCircle className="w-4 h-4 mr-2.5" /> Exit Session
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSkipQuestion} 
            disabled={state.isProcessing || state.isRecording}
            className="text-muted-foreground/40 hover:text-foreground hover:bg-muted rounded-xl transition-all text-[10px] font-black uppercase tracking-[0.2em] px-4"
          >
            Skip Question <SkipForward className="w-4 h-4 ml-2.5" />
          </Button>
        </div>
      </div>
    </div>

  )
}

