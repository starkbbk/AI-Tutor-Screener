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
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Responses</h2>
        <p className="text-gray-500">Generating your assessment report...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white/80 backdrop-blur-sm z-10">
        <Image src="/cuemath-logo.svg" alt="Cuemath" width={110} height={30} />
        
        <div className="flex items-center space-x-6">
          <div className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Question {Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS)} of {TOTAL_QUESTIONS}
          </div>
          <div className="flex items-center text-gray-500 font-mono text-sm tracking-wide bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
            <Clock className="w-4 h-4 mr-1.5" />
            {formatTime(timer)}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-6 relative">
        <VoiceAvatar />
        <TranscriptDisplay messages={state.conversationHistory} />
        
        {/* Scroll anchor */}
        <div className="h-4" />
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-gray-50 border-t border-gray-100 relative z-10">
        
        {state.useFallbackMode ? (
          <form onSubmit={handleTextSubmit} className="flex space-x-3 max-w-2xl mx-auto">
            <Input 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your answer here..."
              className="flex-1 bg-white border-gray-300 h-14 rounded-xl text-base"
              disabled={state.isProcessing || state.isAISpeaking}
            />
            <Button 
              type="submit" 
              disabled={!textInput.trim() || state.isProcessing || state.isAISpeaking} 
              className="h-14 px-6 rounded-xl"
            >
              <Send className="w-5 h-5 mr-2" /> Send
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
            <div className="mt-4 text-sm font-medium text-gray-500 h-5">
              {state.isRecording ? 'Click to stop recording' : 'Click to speak'}
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-6 right-6 flex justify-between px-2 pt-2 pointer-events-none">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleEndEarly} 
            className="text-gray-400 hover:text-red-600 hover:bg-red-50 pointer-events-auto"
          >
            <XCircle className="w-4 h-4 mr-2" /> End Early
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSkipQuestion} 
            disabled={state.isProcessing || state.isRecording}
            className="text-gray-400 hover:text-gray-800 hover:bg-gray-200 pointer-events-auto"
          >
            Skip <SkipForward className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
