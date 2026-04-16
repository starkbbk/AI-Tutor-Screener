"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Clock, Send, SkipForward, XCircle, Loader2, MoreVertical, Mic, Volume2, AlertCircle } from "lucide-react"

import { useInterview } from "@/context/InterviewContext"
import { VoiceAvatar } from "./VoiceAvatar"
import { TranscriptDisplay } from "./TranscriptDisplay"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { formatTime, cn } from "@/lib/utils"
import { TOTAL_QUESTIONS } from "@/lib/constants"
import { speak, startListening, stopListening, stopSpeaking, SpeechRecognitionResult, preloadVoices } from "@/lib/speech"

export function InterviewRoom() {
  const router = useRouter()
  const { 
    state, setAISpeaking, setRecording, setProcessing, 
    addMessage, updateMessage, setQuestionIndex, completeInterview, setStatus,
    incrementAttempts, resetAttempts, startInterview
  } = useInterview()
  
  const [timeLeft, setTimeLeft] = useState(600)
  const isTimedOutRef = useRef(false)
  const [textInput, setTextInput] = useState("")
  const [hasStarted, setHasStarted] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [showMenu, setShowMenu] = useState(false)
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null)
  const [lastTranscriptUpdate, setLastTranscriptUpdate] = useState<number>(Date.now())
  
  const isFirstRender = useRef(true)
  const greetingSentRef = useRef(false)
  const isSkippingRef = useRef(false)
  const isProcessingQuestion = useRef(false)
  const currentQuestionIndexRef = useRef(state.currentQuestionIndex)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Keep Ref in sync with state for use in callbacks (prevents stale closures)
  useEffect(() => {
    currentQuestionIndexRef.current = state.currentQuestionIndex;
  }, [state.currentQuestionIndex]);

  useEffect(() => {
    setLastTranscriptUpdate(Date.now());
  }, [currentTranscript]);
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (hasStarted && state.interviewStatus === 'in_progress') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            isTimedOutRef.current = true;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
      stopSpeaking() 
      stopListening()
    }
  }, [hasStarted, state.interviewStatus])

  // Initial greeting
  useEffect(() => {
    if (hasStarted && isFirstRender.current && state.conversationHistory.length === 0 && !greetingSentRef.current) {
      greetingSentRef.current = true
      isFirstRender.current = false
      startInterview()
      startChatWithAI()
    }
  }, [hasStarted, state.candidate?.name, state.conversationHistory.length])
  
  useEffect(() => {
    preloadVoices()
  }, [])
  
  // Auto-scroll effect (on status changes)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [state.conversationHistory]);

  // Active-scroll during speech (AI or Candidate)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isAISpeaking || state.isRecording) {
      interval = setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [state.isAISpeaking, state.isRecording]);

  // Silence timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isRecording && !state.isProcessing && !state.isAISpeaking) {
      interval = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastTranscriptUpdate;
        
        // If silent for 3+ seconds
        if (timeSinceLastUpdate > 3000) {
           if (!currentTranscript) {
              // Trigger VISIBLE countdown if absolutely nothing heard
              setSilenceCountdown(prev => {
                const current = prev === null ? 5 : prev;
                if (current <= 1) {
                  handleSkipQuestion();
                  return null;
                }
                return current - 1;
              });
           } else if (timeSinceLastUpdate > 5000) {
              // AUTO-SUBMIT if we have text but they've stopped for 5s
              handleCandidateSpeakingFinished(currentTranscript);
           }
        } else {
           setSilenceCountdown(null);
        }
      }, 1000);
    } else {
      setSilenceCountdown(null);
    }
    return () => clearInterval(interval);
  }, [state.isRecording, currentTranscript, lastTranscriptUpdate, state.isProcessing, state.isAISpeaking]);

  const startChatWithAI = async (userMessage?: string, forcedQuestionIndex?: number) => {
    if (state.interviewStatus === 'completing' || state.interviewStatus === 'completed') return;
    if (isProcessingQuestion.current && !userMessage?.includes("__RETRY__")) return; 
    
    const isRetry = userMessage?.includes("__RETRY__");
    const actualMessage = isRetry ? userMessage?.replace("__RETRY__", "") : userMessage;

    // Use forced index if provided, otherwise fallback to the Ref's current value
    const targetQIndex = forcedQuestionIndex !== undefined 
      ? forcedQuestionIndex 
      : (state.conversationHistory.length === 0 ? 0 : currentQuestionIndexRef.current);

    console.log(`[INTERVIEW FLOW] Starting chat. Target Question Index: ${targetQIndex}`);

    try {
      isProcessingQuestion.current = true;
      setProcessing(true)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: actualMessage || "",
          history: state.conversationHistory,
          candidateName: state.candidate?.name,
          currentQuestion: targetQIndex
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Reset guard only on success (ready for next user input after AI speaks)
      // Note: We don't reset in 'finally' because AI is still speaking
      // We'll reset it once startListening is called again
      
      const aiMsgId = Date.now().toString();
      
      addMessage({
        id: aiMsgId,
        role: "ai",
        content: data.response,
        timestamp: new Date().toISOString(),
        status: 'thinking'
      })

      playAIResponse(data.response, aiMsgId)
      
    } catch (error: any) {
      console.warn('[INTERVIEW ROOM] Chat error. Auto-retrying in 5 seconds...', error.message)
      isProcessingQuestion.current = false;
      setProcessing(true)
      setTimeout(() => {
        startChatWithAI((actualMessage || "") + "__RETRY__")
      }, 5000)
    }
  }

  const playAIResponse = (text: string, msgId: string) => {
    if (state.interviewStatus === 'completing' || state.interviewStatus === 'completed') return;
    setProcessing(false)
    
    if (!state.useFallbackMode) {
      setAISpeaking(true)
      
      speak(
        text,
        (duration) => {
          // SYNC START: Transition from thinking to speaking with duration
          updateMessage(msgId, { status: 'speaking', audioDuration: duration || 0 });
        }, 
        () => {
          // SYNC END: Finalize the message
          updateMessage(msgId, { status: 'done' });
          setAISpeaking(false)
          
          // Check for completion first
          const isComplete = checkIfInterviewComplete(text)
          if (isComplete || state.interviewStatus === 'completing' || state.interviewStatus === 'completed') return;

          // Check for timeout wrap-up
          if (isTimedOutRef.current) {
            handleTimeOut();
            return;
          }

          // Force progression to next question if we just finished one
          // This ensures linear progression (1, 2, 3...)
          handleStartListening()
        }
      )
    } else {
      // Fallback mode (text only)
      updateMessage(msgId, { status: 'speaking', audioDuration: 2 }); // Brief fake duration
      setTimeout(() => {
        updateMessage(msgId, { status: 'done' });
        checkIfInterviewComplete(text)
      }, 2000) 
    }
  }

  const checkIfInterviewComplete = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    
    // Determine if we reached the end or if AI said goodbye
    const isEnding = state.currentQuestionIndex >= TOTAL_QUESTIONS || 
                     lowerText.includes("wraps up") ||
                     lowerText.includes("assessment shortly") ||
                     lowerText.includes("have a great day") ||
                     lowerText.includes("thank you") ||
                     lowerText.includes("goodbye") ||
                     lowerText.includes("no more questions");
                      
    if (isEnding || state.interviewStatus === 'completing' || state.interviewStatus === 'completed') {
      console.log("[INTERVIEW FLOW] End condition met. Finishing interview.");
      finishInterview()
      return true
    }
    return false
  }

  const handleTimeOut = () => {
    if (state.interviewStatus === 'completing') return;
    
    const timeOutMessage = "We are running out of time so let us wrap up here. Thank you for your time, you will receive your assessment shortly. Have a great day!";
    
    const aiMsgId = Date.now().toString();
    addMessage({
      id: aiMsgId,
      role: "ai",
      content: timeOutMessage,
      timestamp: new Date().toISOString(),
      status: 'thinking'
    })

    setAISpeaking(true)
    speak(
      timeOutMessage,
      (duration) => {
        updateMessage(aiMsgId, { status: 'speaking', audioDuration: duration || 0 });
      },
      () => {
        updateMessage(aiMsgId, { status: 'done' });
        setAISpeaking(false)
        finishInterview()
      }
    )
  }

  const finishInterview = () => {
    if (state.interviewStatus === 'completing' || state.interviewStatus === 'completed') return;
    
    console.log("[INTERVIEW FLOW] Triggering result calculation and navigation.");
    stopSpeaking()
    stopListening()
    
    setStatus('completing')
    completeInterview()
    
    setRecording(false)
    setAISpeaking(false)
    
    try {
      localStorage.setItem(`cuemath_session_backup_${state.candidate?.name?.replace(/\s+/g, '_')}`, JSON.stringify({
        candidate: state.candidate,
        transcript: state.conversationHistory,
        startTime: state.interviewStartTime,
        endTime: Date.now(),
        isCompleted: true
      }));
    } catch (e) {
      console.error("[INTERVIEW ROOM] Backup failed:", e);
    }

    setTimeout(() => {
      router.push("/report")
    }, 4000)
  }

  const handleStartListening = () => {
    if (state.interviewStatus === 'completing' || state.interviewStatus === 'completed' || state.isRecording) return;

    // Buffer for audio hardware to switch modes (increased to 800ms for high resilience)
    setTimeout(() => {
      stopSpeaking()
      setAISpeaking(false)
      setRecording(true)
      setCurrentTranscript("")
      setLastTranscriptUpdate(Date.now()); // Reset timer
      isProcessingQuestion.current = false
      
      startListening(
      (result: SpeechRecognitionResult) => {
        setCurrentTranscript(result.transcript)
      }, 
      (finalTranscript: string) => {
        if (isSkippingRef.current) {
          isSkippingRef.current = false;
          return;
        }
        handleCandidateSpeakingFinished(finalTranscript)
      },
      (err: string) => {
        console.error("[INTERVIEW ROOM] Mic error:", err)
        setRecording(false)
        // Auto-recovery if permitted
        if (state.interviewStatus !== 'completing') {
           setTimeout(handleStartListening, 1000);
        }
      }
      )
    }, 800);
  }

  const handleCandidateSpeakingFinished = (transcript: string) => {
    const finalTranscript = transcript.trim();
    stopListening() // CRITICAL: Reset the internal engine before processing
    setRecording(false)
    
    const currentIdx = currentQuestionIndexRef.current;

    // Handle silence/timeout on the last question
    if (!finalTranscript && currentIdx >= TOTAL_QUESTIONS - 1) {
      console.log("[INTERVIEW FLOW] Silence on last question. Finishing.");
      handleSkipQuestion(); // Reuse skip logic to wrap up
      return;
    }

    if (!finalTranscript) return;

    setCurrentTranscript("")
    
    addMessage({
      id: Date.now().toString(),
      role: "candidate",
      content: finalTranscript,
      timestamp: new Date().toISOString()
    })

    // LINEAR PROGRESSION: Move to next question immediately
    const nextIdx = currentIdx + 1;
    
    console.log(`[INTERVIEW FLOW] Candidate finished speaking. Current Index: ${currentIdx}, Moving to: ${nextIdx}`);
    
    setQuestionIndex(nextIdx);
    startChatWithAI(finalTranscript, nextIdx);
  }

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim()) return
    if (state.interviewStatus === 'completing') {
      router.push("/report");
      return;
    }
    
    const text = textInput
    setTextInput("")
    
    addMessage({
      id: Date.now().toString(),
      role: "candidate",
      content: text,
      timestamp: new Date().toISOString()
    })
    
    const currentIdx = currentQuestionIndexRef.current;
    const nextIdx = currentIdx + 1;
    
    setQuestionIndex(nextIdx);
    startChatWithAI(text, nextIdx)
  }

  const handleSkipQuestion = () => {
    isSkippingRef.current = true
    stopListening()
    stopSpeaking()
    setRecording(false)
    setAISpeaking(false)
    
    // RELAX GUARDS: Allow the skipped question to trigger a new AI response immediately
    isProcessingQuestion.current = false;
    
    addMessage({
      id: Date.now().toString(),
      role: "candidate",
      content: "[Candidate skipped the question]",
      timestamp: new Date().toISOString()
    })
    
    const currentIdx = currentQuestionIndexRef.current;
    
    if (currentIdx >= TOTAL_QUESTIONS - 1) {
      console.log("[INTERVIEW FLOW] Skip triggered on last question. Finishing.");
      const closingMsg = "Thank you! That wraps up our interview. Redirecting you to the assessment report now...";
      const aiMsgId = Date.now().toString();
      addMessage({
        id: aiMsgId,
        role: "ai",
        content: closingMsg,
        timestamp: new Date().toISOString(),
        status: 'thinking'
      });
      setAISpeaking(true);
      speak(closingMsg, (duration) => {
        updateMessage(aiMsgId, { status: 'speaking', audioDuration: duration || 0 });
      }, () => {
        updateMessage(aiMsgId, { status: 'done' });
        setAISpeaking(false);
        finishInterview();
      });
      return;
    }

    const nextIdx = currentIdx + 1;
    console.log(`[INTERVIEW FLOW] Skipping question. Current Index: ${currentIdx}, Moving to: ${nextIdx}`);
    
    setQuestionIndex(nextIdx);
    startChatWithAI("I'd like to skip this question. Please ask the next one.", nextIdx)
  }

  const handleEndEarly = () => {
    stopListening()
    stopSpeaking()
    finishInterview()
  }

  const handleManualReplay = (text: string) => {
    stopListening()
    stopSpeaking()
    setRecording(false)
    setAISpeaking(true)
    
    // For replay, we don't necessarily update the transcript status
    // since it's already visible. Just play audio.
    speak(
      text,
      () => {}, 
      () => {
        setAISpeaking(false)
        if (state.interviewStatus !== 'completing') {
          handleStartListening()
        }
      }
    )
  }


  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] sm:h-[calc(100vh-140px)] max-w-5xl mx-auto glass-card rounded-[1.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden relative ring-1 ring-border mt-2 sm:mt-4">
      
      {/* Live Indicator */}
      {hasStarted && state.interviewStatus === 'in_progress' && (
        <div className="bg-red-500/5 border-b border-red-500/10 py-1 sm:py-1.5 flex items-center justify-center space-x-2 animate-in fade-in duration-700">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 pulse-live" />
          <span className="text-[8px] sm:text-[10px] font-black tracking-[0.2em] text-red-500/80 uppercase">Interview is Live</span>
        </div>
      )}
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-2.5 sm:p-8 glass-header z-30">
        <div className="flex items-center space-x-1 sm:space-x-4">
          <Image src="/cuemath-logo.svg" alt="Cuemath" width={80} height={24} className="xs:w-[100px] sm:w-[140px] sm:h-[40px] opacity-90 transition-opacity hover:opacity-100" />
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden xs:flex items-center">
            <VoiceAvatar />
          </div>
          <div className={cn(
            "flex items-center font-mono text-[9px] sm:text-sm tracking-widest bg-muted/50 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-border whitespace-nowrap transition-all duration-500",
            timeLeft < 60 ? "text-red-500 animate-pulse-red" : timeLeft < 240 ? "text-brand-amber" : "text-muted-foreground"
          )}>
            <Clock className={cn(
              "hidden xxs:block w-2.5 h-2.5 sm:w-4 sm:h-4 mr-1 sm:mr-2",
              timeLeft < 60 ? "text-red-500" : timeLeft < 240 ? "text-brand-amber" : "text-brand-cyan"
            )} />
            {formatTime(timeLeft)}
          </div>
          <ThemeToggle />
          
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

      {/* Modern Progress Bar - Sticky below header */}
      <div className="px-3 sm:px-10 pb-4 pt-2 animate-in fade-in slide-in-from-top-4 duration-1000 sticky top-[60px] sm:top-[120px] bg-background/50 backdrop-blur-md z-20 border-b border-border/10">
        <div className="glass-card p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-border/50 bg-background/20">
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <span className="text-[9px] sm:text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-amber mr-2 animate-pulse" />
              Interview Progress
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-brand-amber uppercase tracking-tight">
              Question <span className="text-foreground">{Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS)}</span> of {TOTAL_QUESTIONS}
            </span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/20 p-[1px]">
            <div 
              className="h-full bg-[#FFBA07] rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(255,184,7,0.4)] relative overflow-hidden"
              style={{ width: `${((state.currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100}%` }}
            >
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-3 sm:p-10 relative yellow-scrollbar scroll-smooth"
      >
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-brand-cyan/5 dark:bg-brand-cyan/10 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
        
        <TranscriptDisplay 
          messages={state.conversationHistory} 
          onReplay={handleManualReplay}
        />
        
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
                onClick={() => setHasStarted(true)}
                className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-[1.2rem] font-black tracking-widest uppercase amber-button shadow-2xl shadow-brand-amber/20 text-sm sm:text-base group"
              >
                Begin Interview 
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 ml-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Real-time Status Area */}
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
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 shadow-lg shadow-red-500/5 pulse-red">
                        <Mic className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    
                    <p className="text-[11px] font-black tracking-[0.2em] uppercase mb-4 text-red-500 animate-pulse">
                      Listening... speak naturally
                    </p>
                    
                    {/* Real-time Transcription feedback */}
                    <div className="w-full min-h-[4rem] px-6 py-4 bg-muted/20 rounded-2xl border border-border/40 text-center relative overflow-hidden flex items-center justify-center">
                       {silenceCountdown !== null && silenceCountdown <= 5 ? (
                         <div className="absolute inset-0 bg-brand-amber/10 flex items-center justify-center animate-in fade-in duration-300">
                           <p className="text-brand-amber font-black tracking-widest uppercase text-xs flex items-center">
                             <AlertCircle className="w-4 h-4 mr-2 animate-pulse" />
                             No voice detected... Moving on in {silenceCountdown}
                           </p>
                         </div>
                       ) : (
                         <p className={`text-sm font-medium italic leading-relaxed ${currentTranscript.includes("Didn't catch") || currentTranscript.includes("Could you say") ? 'text-brand-amber' : 'text-foreground/80'}`}>
                           {currentTranscript || "Waiting for you to speak..."}
                         </p>
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

      {/* Bottom Controls */}
      <div className="px-4 sm:px-10 py-2 sm:py-4 bg-muted/10 backdrop-blur-2xl border-t border-border relative z-20 flex flex-col items-center">
        {(state.interviewStatus === 'completing' || state.interviewStatus === 'completed') && (
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
