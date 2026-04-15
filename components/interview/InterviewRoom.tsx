"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Clock, Send, SkipForward, XCircle, Loader2, MoreVertical, Mic, Volume2 } from "lucide-react"

import { useInterview } from "@/context/InterviewContext"
import { VoiceAvatar } from "./VoiceAvatar"
import { TranscriptDisplay } from "./TranscriptDisplay"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { formatTime } from "@/lib/utils"
import { TOTAL_QUESTIONS } from "@/lib/constants"
import { speak, startListening, stopListening, stopSpeaking, SpeechRecognitionResult, preloadVoices, unlockMic } from "@/lib/speech"

export function InterviewRoom() {
  const router = useRouter()
  const { 
    state, setAISpeaking, setRecording, setProcessing, 
    addMessage, setQuestionIndex, completeInterview, setStatus 
  } = useInterview()
  
  const [timer, setTimer] = useState(0)
  const [textInput, setTextInput] = useState("")
  const [hasStarted, setHasStarted] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [inactivityTimer, setInactivityTimer] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  
  const isFirstRender = useRef(true)
  const greetingSentRef = useRef(false)
  const inactivityIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1)
    }, 1000)
    return () => {
      clearInterval(interval)
      stopSpeaking() // Ensure speech stops when navigating away
    }
  }, [])

  // Initial greeting
  useEffect(() => {
    if (hasStarted && isFirstRender.current && state.conversationHistory.length === 0 && !greetingSentRef.current) {
      greetingSentRef.current = true
      isFirstRender.current = false
      startChatWithAI()
    }
  }, [hasStarted, state.candidate?.name, state.conversationHistory.length])
  
  useEffect(() => {
    preloadVoices()
  }, [])

  // Inactivity tracking
  useEffect(() => {
    if (state.isRecording) {
      inactivityIntervalRef.current = setInterval(() => {
        setInactivityTimer(prev => prev + 1)
      }, 1000)
    } else {
      if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current)
      setInactivityTimer(0)
    }
    return () => {
      if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current)
    }
  }, [state.isRecording])

  // Reset inactivity on transcript change
  useEffect(() => {
    setInactivityTimer(0)
  }, [currentTranscript])

  const startChatWithAI = async (userMessage?: string) => {
    if (state.isProcessing && !userMessage?.includes("__RETRY__")) return; 
    
    // If it's a retry, we don't want to block ourselves
    const isRetry = userMessage?.includes("__RETRY__");
    const actualMessage = isRetry ? userMessage?.replace("__RETRY__", "") : userMessage;

    try {
      setProcessing(true)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: actualMessage || "",
          history: state.conversationHistory,
          candidateName: state.candidate?.name
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Sync counter perfectly with AI state
      if (data.questionNumber) {
        if (data.questionNumber === 'DONE') {
          finishInterview();
        } else {
          setQuestionIndex(Math.min(data.questionNumber - 1, TOTAL_QUESTIONS - 1))
        }
      }

      addMessage({
        role: "ai",
        content: data.response,
        timestamp: new Date().toISOString()
      })

      playAIResponse(data.response)
      
    } catch (error: any) {
      console.warn('[INTERVIEW ROOM] Chat error. Auto-retrying in 5 seconds...', error.message)
      
      // Keep processing state active
      setProcessing(true)
      
      // Temporary "friendly message" in logs/UI if needed
      // We don't want to permanently add an error message to history if we're retrying
      // Instead, we wait and try again.
      
      setTimeout(() => {
        startChatWithAI((actualMessage || "") + "__RETRY__")
      }, 5000)
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
          const isComplete = checkIfInterviewComplete(text)
          
          if (!isComplete && !state.useFallbackMode) {
            // HANDS-FREE: Automatically start listening after AI finishes
            handleStartListening()
          }
        }
      )
    } else {
      setTimeout(() => {
        checkIfInterviewComplete(text)
      }, 2000) // Brief delay in text mode before checking complete
    }
  }

  const checkIfInterviewComplete = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    const isEnding = state.currentQuestionIndex >= TOTAL_QUESTIONS - 1 && (
                     lowerText.includes("wraps up") ||
                     lowerText.includes("assessment shortly") ||
                     lowerText.includes("have a great day") ||
                     lowerText.includes("thank you") ||
                     lowerText.includes("goodbye")
    );
                      
    if (isEnding || state.interviewStatus === 'completing') {
      finishInterview()
      return true
    }
    return false
  }

  const finishInterview = () => {
    // 1. Set flag and prevent any further interactions
    if (state.interviewStatus === 'completing') return;
    
    // STOP SPEECH IMMEDIATELY
    stopSpeaking()
    stopListening()
    
    console.log('[INTERVIEW ROOM] finishInterview called. Initiating final sequence...');
    setStatus('completing')
    completeInterview()
    
    // 2. Clear any active state
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

    // 4. Auto-redirect after 4 seconds
    setTimeout(() => {
      console.log('[INTERVIEW ROOM] Redirecting to report...');
      router.push("/report")
    }, 4000)
  }

  const handleStartListening = () => {
    // Prevent mic usage if interview is ending
    if (state.interviewStatus === 'completing') return;

    stopSpeaking()
    setAISpeaking(false)
    setRecording(true)
    setCurrentTranscript("")
    
    startListening(
      (result: SpeechRecognitionResult) => {
        setCurrentTranscript(result.transcript)
      },
      (finalTranscript: string, audioBlob?: Blob | null) => {
        setRecording(false)
        handleCandidateSpeakingFinished(finalTranscript, audioBlob)
      },
      (err: string) => {
        console.error("[INTERVIEW ROOM] Mic error:", err)
        setRecording(false)
      }
    )
  }

  // Helper for manual toggle (if needed via settings) but mostly unused now
  const handleMicToggle = () => {
    if (state.isRecording) {
      stopListening()
    } else {
      handleStartListening()
    }
  }

  const handleCandidateSpeakingFinished = async (transcript: string, audioBlob?: Blob | null) => {
    setCurrentTranscript("")
    
    let finalTranscript = transcript.trim();
    
    // FALLBACK TRIGGER: If native speech failed but we have raw audio
    if (!finalTranscript && audioBlob && audioBlob.size > 2000) { // > 2KB to ignore tap noises
      console.log("[INTERVIEW ROOM] Native speech failed. Triggering Whisper Fallback...");
      setProcessing(true);
      
      try {
        const formData = new FormData();
        formData.append('file', audioBlob);
        
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (data.text) {
          finalTranscript = data.text;
          console.log("[INTERVIEW ROOM] Whisper Fallback Success:", finalTranscript);
        }
      } catch (err) {
        console.error("[INTERVIEW ROOM] Whisper Fallback Failed:", err);
      } finally {
        setProcessing(false);
      }
    }

    if (!finalTranscript) {
      console.log("[INTERVIEW ROOM] No transcript after both methods. Restarting...");
      if (!state.isAISpeaking && !state.isProcessing) {
        setTimeout(handleStartListening, 1500);
      }
      return;
    }

    // Prevent API calls if interview is ending
    if (state.interviewStatus === 'completing') {
      router.push("/report");
      return;
    }
    
    // Noise filtering (relaxed since Whisper is high quality)
    if (finalTranscript.length < 5 && !audioBlob) {
      console.log("[INTERVIEW ROOM] Filtered out short noisy transcript:", finalTranscript);
      if (!state.isAISpeaking && !state.isProcessing) {
        setTimeout(handleStartListening, 1000);
      }
      return;
    }
    
    setRecording(false)
    addMessage({
      role: "candidate",
      content: finalTranscript,
      timestamp: new Date().toISOString()
    })
    
    startChatWithAI(finalTranscript)
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
    
    startChatWithAI(text)
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
    startChatWithAI("I'd like to skip this question. Please ask the next one.")
  }

  const handleEndEarly = () => {
    stopListening()
    stopSpeaking()
    finishInterview()
  }
  const handleManualReplay = (text: string) => {
    // 1. Force stop everything current
    stopListening()
    stopSpeaking()
    setRecording(false)
    setAISpeaking(true)
    
    // 2. Play the requested text
    speak(
      text,
      () => {}, // onStart
      () => {
        // 3. Cleanup and auto-resume listening
        setAISpeaking(false)
        if (state.interviewStatus !== 'completing') {
          handleStartListening()
        }
      }
    )
  }


  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] sm:h-[calc(100vh-140px)] max-w-5xl mx-auto glass-card rounded-[1.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden relative ring-1 ring-border mt-2 sm:mt-4">
      
      {/* Live Indicator (Mobile focus) */}
      {hasStarted && state.interviewStatus === 'in_progress' && (
        <div className="bg-red-500/5 border-b border-red-500/10 py-1 sm:py-1.5 flex items-center justify-center space-x-2 animate-in fade-in duration-700">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 pulse-live" />
          <span className="text-[8px] sm:text-[10px] font-black tracking-[0.2em] text-red-500/80 uppercase">Interview is Live</span>
        </div>
      )}
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-3 sm:p-8 glass-header z-20">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Image src="/cuemath-logo.svg" alt="Cuemath" width={80} height={24} className="xs:w-[100px] sm:w-[140px] sm:h-[40px] opacity-90 transition-opacity hover:opacity-100" />
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden xs:flex items-center">
            <VoiceAvatar />
          </div>
          <div className="text-[8px] sm:text-xs font-black text-brand-amber bg-brand-amber/10 px-2 sm:px-4 py-1 sm:py-2 rounded-full border border-brand-amber/20 uppercase tracking-widest whitespace-nowrap">
            {Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
          </div>
          <div className="flex items-center text-muted-foreground font-mono text-[9px] sm:text-sm tracking-widest bg-muted/50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-border whitespace-nowrap">
            <Clock className="hidden xxs:block w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-brand-cyan" />
            {formatTime(timer)}
          </div>
          <ThemeToggle />
          
          {/* Settings Menu Icon */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                <button 
                  onClick={() => { setShowMenu(false); handleSkipQuestion(); }}
                  className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-muted flex items-center"
                >
                  <SkipForward className="w-4 h-4 mr-3" /> Skip Question
                </button>
                <div className="border-t border-border/50" />
                <button 
                  onClick={() => { setShowMenu(false); handleEndEarly(); }}
                  className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-3" /> Exit Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-3 sm:p-10 relative scrollbar-hide">
        {/* Decorative theme-aware glows */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-brand-cyan/5 dark:bg-brand-cyan/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
        
        <TranscriptDisplay 
          messages={state.conversationHistory} 
          onReplay={handleManualReplay}
        />
        
        {/* Hands-Free Instructions (shown before start) */}
        {!hasStarted && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-10 bg-background/40 backdrop-blur-md animate-in fade-in duration-500">
            <div className="glass-card max-w-md w-full p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border-brand-amber/20 flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-cyan/10 rounded-full flex items-center justify-center mb-6 border border-brand-cyan/20">
                <Volume2 className="w-8 h-8 sm:w-10 sm:h-10 text-brand-cyan" />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-4 uppercase">Phone Call Mode</h2>
              <p className="text-sm sm:text-base text-muted-foreground font-medium mb-8 leading-relaxed">
                This interview works like a real call. The AI will speak, and you just talk back naturally. No buttons to press.
              </p>
              
              <div className="w-full space-y-3 mb-10">
                <div className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 p-3 rounded-xl border border-border">
                  <div className="w-2 h-2 rounded-full bg-brand-cyan mr-3 animate-pulse" />
                  AI speaks first
                </div>
                <div className="flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 p-3 rounded-xl border border-border">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-3 animate-pulse" />
                  You speak next
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  unlockMic();
                  setHasStarted(true);
                }}
                className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-[1.2rem] font-black tracking-widest uppercase amber-button shadow-2xl shadow-brand-amber/20 text-sm sm:text-base group"
              >
                Begin Interview 
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 ml-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Real-time Status Area (Hands-free replacement for mic button) */}
        {hasStarted && state.interviewStatus !== 'completing' && (
          <div className="mt-auto pt-10 pb-2 flex flex-col items-center animate-in fade-in slide-in-from-bottom-5 duration-500">
             {state.isAISpeaking ? (
                <div className="flex flex-col items-center">
                   <div className="flex items-center space-x-1.5 h-10 mb-2">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="w-1.5 bg-brand-cyan rounded-full animate-wave" style={{ height: '100%', animationDelay: `${i * 0.1}s` }} />
                      ))}
                   </div>
                   <p className="text-[10px] font-black tracking-[0.2em] uppercase text-brand-cyan flex items-center">
                     <Volume2 className="w-3 h-3 mr-2" /> AI is speaking...
                   </p>
                </div>
             ) : state.isRecording ? (
                <div className="flex flex-col items-center w-full max-w-lg">
                   <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 pulse-red">
                      <Mic className="w-8 h-8 text-red-500 animate-pulse" />
                   </div>
                   <p className="text-[11px] font-black tracking-[0.2em] uppercase text-red-500 mb-4 animate-pulse">
                     Listening... speak your answer
                   </p>
                   
                   {/* Real-time Transcription Display */}
                   <div className="w-full min-h-[4rem] px-6 py-4 bg-muted/20 rounded-2xl border border-border/40 text-center relative overflow-hidden">
                      <p className="text-sm font-medium text-foreground/80 italic leading-relaxed">
                        {currentTranscript || "Waiting for you to speak..."}
                      </p>
                      {inactivityTimer > 15 && !currentTranscript && (
                        <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in">
                          <div className="flex items-center space-x-2 mb-2">
                             <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                             <p className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.2em]">Secure Capture Active</p>
                          </div>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                            Continue speaking... we are recording your response safely.
                          </p>
                        </div>
                      )}
                   </div>
                </div>
             ) : state.isProcessing ? (
                <div className="flex flex-col items-center">
                   <Loader2 className="w-12 h-12 text-brand-amber animate-spin mb-4" />
                   <p className="text-[11px] font-black tracking-[0.2em] uppercase text-brand-amber">
                     Processing your response...
                   </p>
                </div>
             ) : null}
          </div>
        )}
      </div>

      {/* Bottom Controls - Hands-free Minimal Mode */}
      <div className="px-4 sm:px-10 py-2 sm:py-4 bg-muted/10 backdrop-blur-2xl border-t border-border relative z-20 flex flex-col items-center">
        {state.interviewStatus === 'completing' && (
          <div className="w-full py-4 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
            <Loader2 className="w-8 h-8 text-brand-amber animate-spin mb-4" />
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-2">Interview Complete!</h3>
            <p className="text-sm text-muted-foreground font-medium">Generating your assessment...</p>
          </div>
        )}
        
        {state.interviewStatus !== 'completing' && state.useFallbackMode && (
           <form onSubmit={handleTextSubmit} className="flex space-x-2 sm:space-x-4 max-w-3xl w-full mx-auto my-4">
              <Input 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your response..."
                className="flex-1 bg-background border-border h-12 sm:h-16 rounded-xl sm:rounded-[1.5rem] text-base sm:text-lg px-4 sm:px-8 focus:ring-2 focus:ring-brand-amber/30 transition-all font-light"
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
      </div>
    </div>

  )
}

