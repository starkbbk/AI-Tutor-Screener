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
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto glass-card rounded-[2.5rem] shadow-2xl overflow-hidden relative border-white/10 ring-1 ring-white/5">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 glass-header z-20">
        <Image src="/cuemath-logo.svg" alt="Cuemath" width={140} height={40} className="brightness-0 invert opacity-90" />
        
        <div className="flex items-center space-x-6">
          <div className="text-sm font-bold text-brand-amber bg-brand-amber/10 px-4 py-1.5 rounded-full border border-brand-amber/20">
            Assessment • {Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
          </div>
          <div className="flex items-center text-gray-300 font-mono text-sm tracking-widest bg-white/5 px-4 py-1.5 rounded-xl border border-white/10">
            <Clock className="w-4 h-4 mr-2 text-brand-cyan" />
            {formatTime(timer)}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-8 relative scrollbar-hide">
        {/* Decorative glows inside room */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-brand-blue/5 rounded-full blur-[100px] pointer-events-none" />
        
        <VoiceAvatar />
        <TranscriptDisplay messages={state.conversationHistory} />
        
        {/* Scroll anchor */}
        <div className="h-4" />
      </div>

      {/* Bottom Controls */}
      <div className="p-8 bg-white/5 backdrop-blur-xl border-t border-white/10 relative z-20">
        
        {state.useFallbackMode ? (
          <form onSubmit={handleTextSubmit} className="flex space-x-4 max-w-3xl mx-auto">
            <Input 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Share your thoughts..."
              className="flex-1 bg-white/5 border-white/10 h-16 rounded-2xl text-lg focus:border-brand-amber/50"
              disabled={state.isProcessing || state.isAISpeaking}
            />
            <Button 
              type="submit" 
              disabled={!textInput.trim() || state.isProcessing || state.isAISpeaking} 
              className="h-16 px-8 rounded-2xl font-bold"
            >
              <Send className="w-5 h-5 mr-2" /> Submit
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
            <div className="mt-6 text-sm font-bold tracking-widest uppercase text-gray-500 h-5">
              {state.isRecording ? (
                <span className="text-red-400 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
                  Recording...
                </span>
              ) : (
                'Tap to speak'
              )}
            </div>
          </div>
        )}

        {/* Action Buttons overlay */}
        <div className="absolute bottom-8 left-10 right-10 flex justify-between pointer-events-none">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleEndEarly} 
            className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl pointer-events-auto transition-colors"
          >
            <XCircle className="w-4 h-4 mr-2" /> Exit
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSkipQuestion} 
            disabled={state.isProcessing || state.isRecording}
            className="text-gray-500 hover:text-white hover:bg-white/5 rounded-xl pointer-events-auto transition-colors"
          >
            Skip Question <SkipForward className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

