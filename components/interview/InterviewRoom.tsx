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
import { speak, startListening, stopListening, stopSpeaking, SpeechRecognitionResult, preloadVoices, setInterviewActive, unlockMic } from "@/lib/speech-adapter"
import { unlockAudio } from "@/lib/elevenlabs-speech"

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
  
  // Mobile-specific local recognition engine state
  const mobileRecognitionRef = useRef<any>(null);
  const mobileRetryCountRef = useRef(0);
  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
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
      if (isMobile) {
         if (mobileRecognitionRef.current) {
            mobileRecognitionRef.current.onend = null;
            mobileRecognitionRef.current.onerror = null;
            mobileRecognitionRef.current.abort();
            mobileRecognitionRef.current = null;
         }
      } else {
         stopListening()
      }
    }
  }, [hasStarted, state.interviewStatus, isMobile])

  // Initial greeting
  useEffect(() => {
    if (hasStarted && isFirstRender.current && state.conversationHistory.length === 0 && !greetingSentRef.current) {
      greetingSentRef.current = true
      isFirstRender.current = false
      setInterviewActive(true) // Enable mobile always-on mic
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
    // CRITICAL: Disable silence timer in fallback/text mode
    if (state.isRecording && !state.isProcessing && !state.isAISpeaking && !state.useFallbackMode) {
      interval = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastTranscriptUpdate;
        
        if (currentTranscript) {
          // AUTO-SUBMIT: If we have text, submit after 5s of silence
          if (timeSinceLastUpdate > 5000) {
            handleCandidateSpeakingFinished(currentTranscript);
          }
        } else {
          // INACTIVITY: If silent for 5s, start a 5-second countdown
          if (timeSinceLastUpdate > 5000) {
            setSilenceCountdown(prev => {
              const current = prev === null ? 5 : prev;
              if (current <= 1) {
                handleSkipQuestion();
                return null;
              }
              return current - 1;
            });
          } else {
            setSilenceCountdown(null);
          }
        }
      }, 1000);
    } else {
      setSilenceCountdown(null);
    }
    return () => clearInterval(interval);
  }, [state.isRecording, currentTranscript, lastTranscriptUpdate, state.isProcessing, state.isAISpeaking, state.useFallbackMode]);

  // SAFETY NET: Auto-revive mic if handoff was missed
  useEffect(() => {
    if (hasStarted && state.interviewStatus === 'in_progress' && 
        !state.isAISpeaking && !state.isProcessing && !state.isRecording) {
      
      const timer = setTimeout(() => {
        // Re-check conditions after a delay to avoid false positives during normal transitions
        if (state.interviewStatus === 'in_progress' && 
            !state.isAISpeaking && !state.isProcessing && !state.isRecording) {
            console.log("[SAFETY NET] Detected hang. Reviving microphone...");
            handleStartListening();
        }
      }, 2500); // 2.5s safety window
      
      return () => clearTimeout(timer);
    }
  }, [state.isAISpeaking, state.isProcessing, state.isRecording, hasStarted, state.interviewStatus]);

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
        (duration?: number) => {
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
        isProcessingQuestion.current = false; // CRITICAL: Reset guard for next question
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
      (duration?: number) => {
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
    setInterviewActive(false) // Disable mobile always-on mic so it can finally stop
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

  const startLocalMobileRecognition = async () => {
    if (state.interviewStatus === 'completing' || state.interviewStatus === 'completed') return;
    
    console.log("[MOBILE_MIC] Initializing autonomous fresh instance...");
    
    // Cleanup previous if exists
    if (mobileRecognitionRef.current) {
        try {
            mobileRecognitionRef.current.onend = null;
            mobileRecognitionRef.current.onerror = null;
            mobileRecognitionRef.current.abort();
        } catch(e) {}
    }

    // Step 1: Fresh permission/stream check
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        await new Promise(r => setTimeout(r, 400));
    } catch(e) {
        console.warn("[MOBILE_MIC] getUserMedia pre-check failed:", e);
    }

    // Step 2: Create BRAND NEW Instance
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
        console.error("[MOBILE_MIC] SpeechRecognition not supported on this device.");
        return;
    }

    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
        console.log("[MOBILE_MIC] Instance LIVE.");
        setRecording(true);
        mobileRetryCountRef.current = 0;
    };

    rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        if (transcript) {
            setCurrentTranscript(prev => (prev + " " + transcript).trim());
            setLastTranscriptUpdate(Date.now());
        }
    };

    rec.onerror = (event: any) => {
        console.warn("[MOBILE_MIC] Error:", event.error);
        if (event.error === 'not-allowed') return;
        
        if (mobileRetryCountRef.current < 5) {
            mobileRetryCountRef.current++;
            console.log(`[MOBILE_MIC] Retrying (${mobileRetryCountRef.current}/5) in 300ms...`);
            setTimeout(startLocalMobileRecognition, 300);
        }
    };

    rec.onend = () => {
        console.log("[MOBILE_MIC] Instance ENDED.");
        // If interview is still active and Mayo isn't speaking, restart immediately
        if (state.interviewStatus === 'in_progress') {
            const restartDelay = 500; // Increased for extra mobile stability
            console.log(`[MOBILE_MIC] Auto-restarting in ${restartDelay}ms...`);
            setTimeout(startLocalMobileRecognition, restartDelay);
        } else {
            setRecording(false);
        }
    };

    mobileRecognitionRef.current = rec;
    try {
        rec.start();
    } catch(e) {
        console.error("[MOBILE_MIC] Fatal start error:", e);
    }
  };

  const handleStartListening = async () => {
    if (state.interviewStatus === 'completing' || state.interviewStatus === 'completed' || state.isRecording) return;
    if (state.useFallbackMode) return;

    if (isMobile) {
      startLocalMobileRecognition();
      stopSpeaking();
      setAISpeaking(false);
      isProcessingQuestion.current = false;
      return;
    }

    // Desktop Path (Original)
    stopSpeaking()
    setAISpeaking(false)
    setRecording(true)
    setCurrentTranscript("")
    setLastTranscriptUpdate(Date.now()); 
    isProcessingQuestion.current = false
    
    setTimeout(() => {
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
        if (state.interviewStatus !== 'completing') {
           setTimeout(handleStartListening, 1000);
        }
      }
      )
    }, 0);
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
    if (isMobile) {
      if (mobileRecognitionRef.current) {
          mobileRecognitionRef.current.onend = null;
          mobileRecognitionRef.current.abort();
      }
    } else {
      stopListening()
    }
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
      speak(closingMsg, (duration?: number) => {
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
    <div className="flex flex-col h-[calc(100dvh-12px)] w-[calc(100vw-8px)] sm:w-[calc(100vw-80px)] max-w-7xl mx-auto glass-card rounded-[1rem] sm:rounded-[2rem] shadow-2xl overflow-hidden relative ring-1 ring-border mt-0">
      
      {/* Live Indicator */}
      {hasStarted && state.interviewStatus === 'in_progress' && (
        <div className="bg-red-500/5 border-b border-red-500/10 py-1 sm:py-1.5 flex items-center justify-center space-x-2 animate-in fade-in duration-700">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 pulse-live" />
          <span className="text-[8px] sm:text-[10px] font-black tracking-[0.2em] text-red-500/80 uppercase">Interview is Live</span>
        </div>
      )}
      
      {/* Top Header */}
      <div className="flex flex-col glass-header z-[60]">
        <div className="flex items-center justify-between p-2.5 sm:p-6 space-x-2 sm:space-x-4">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Image src="/cuemath-logo.svg" alt="Cuemath" width={80} height={24} className="w-[70px] xs:w-[80px] sm:w-[120px] sm:h-[32px] opacity-90" />
          </div>
          
          {/* Middle: Integrated Progress Bar (Hidden on Mobile, shown on SM+) */}
          {hasStarted && (
            <div className="hidden md:flex flex-1 flex-col items-center px-4 sm:px-8 max-w-xl mx-auto animate-in slide-in-from-top-2 duration-700">
              <div className="flex justify-between w-full mb-1 sm:mb-2 items-end px-0.5">
                <span className="text-[7px] sm:text-[9px] font-black text-foreground uppercase tracking-[0.2em] opacity-30">Interview Progress</span>
                <span className="text-[8px] sm:text-[11px] font-black text-brand-amber uppercase tracking-wider">
                  {`Stage ${Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS)} / ${TOTAL_QUESTIONS}`}
                </span>
              </div>
              <div className="w-full h-1 sm:h-1.5 bg-muted/30 rounded-full overflow-hidden border border-border/40 relative">
                <div 
                  className="h-full bg-brand-amber transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(255,184,0,0.4)] relative z-10"
                  style={{ width: `${Math.min(((state.currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100, 100)}%` }}
                />
                <div className="absolute inset-0 bg-brand-amber/5 animate-pulse" />
              </div>
            </div>
          )}

          {/* Right: Tools */}
          <div className="flex items-center space-x-1.5 sm:space-x-4 flex-shrink-0">
            {/* Mobile-only Progress Badge */}
            {hasStarted && (
              <div className="md:hidden flex items-center bg-brand-amber/10 border border-brand-amber/20 px-2 py-1.5 rounded-lg">
                <span className="text-[9px] font-black text-brand-amber whitespace-nowrap">
                  Q{Math.min(state.currentQuestionIndex + 1, TOTAL_QUESTIONS)}/{TOTAL_QUESTIONS}
                </span>
              </div>
            )}
            
            <div className="hidden xs:flex items-center">
              <VoiceAvatar />
            </div>

            {/* Timer */}
            <div className={cn(
              "flex items-center font-mono text-[9px] sm:text-sm tracking-widest bg-muted/50 px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-border whitespace-nowrap",
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
                className="p-1.5 sm:p-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Menu"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in duration-200">
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

        {/* Mobile Progress Bar Row (Shown only on small screens) */}
        {hasStarted && (
          <div className="md:hidden px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-500">
             <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden border border-border/40 relative">
                <div 
                  className="h-full bg-brand-amber transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,184,0,0.3)] relative z-10"
                  style={{ width: `${Math.min(((state.currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100, 100)}%` }}
                />
             </div>
          </div>
        )}
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
          <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-10 bg-background/40 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto">
            <div className="glass-card max-w-md w-full p-6 sm:p-12 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border-brand-amber/20 flex flex-col items-center text-center">
              <div className="w-12 h-12 sm:w-20 sm:h-20 bg-brand-cyan/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 border border-brand-cyan/20">
                {state.useFallbackMode ? (
                  <Send className="w-6 h-6 sm:w-10 sm:h-10 text-brand-cyan" />
                ) : (
                  <Volume2 className="w-6 h-6 sm:w-10 sm:h-10 text-brand-cyan" />
                )}
              </div>
              
              <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tight mb-2 sm:mb-4 uppercase">
                {state.useFallbackMode ? "Interactive Chat" : "Phone Call Mode"}
              </h2>
              <p className="text-[11px] sm:text-base text-muted-foreground font-medium mb-6 sm:mb-8 leading-relaxed max-w-[280px] sm:max-w-none px-2">
                {state.useFallbackMode 
                  ? "This interview works like a real-time chat. The AI will send questions, and you can type your responses naturally."
                  : "This interview works like a real call. The AI will speak, and you just talk back naturally. Answers submit after 2s of silence. If you stay silent for 5s, the system move to the next question."
                }
              </p>
              
              <div className="w-full space-y-2 sm:space-y-3 mb-8 sm:mb-10">
                <div className="flex items-center text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-border">
                  <div className="w-2 h-2 rounded-full bg-brand-cyan mr-2.5 sm:mr-3 animate-pulse" />
                  AI sends questions
                </div>
                <div className="flex items-center text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-border">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2.5 sm:mr-3 animate-pulse" />
                  You respond {state.useFallbackMode ? "via text" : "next"}
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  unlockAudio();
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

        {/* Real-time Status Area */}
        {hasStarted && state.interviewStatus !== 'completing' && !state.useFallbackMode && (
          <div className="mt-auto pt-4 sm:pt-10 pb-2 flex flex-col items-center animate-in fade-in slide-in-from-bottom-5 duration-500">
             {state.isAISpeaking ? (
                <div className="flex flex-col items-center">
                   <div className="flex items-center space-x-1 h-6 sm:h-10 mb-2">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="w-1 sm:w-1.5 bg-brand-cyan rounded-full animate-wave" style={{ height: '100%', animationDelay: `${i * 0.1}s` }} />
                      ))}
                   </div>
                   <p className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase text-brand-cyan flex items-center">
                     <Volume2 className="w-3 h-3 mr-1.5 sm:mr-2" /> AI is speaking...
                   </p>
                </div>
              ) : state.isRecording ? (
                 <div className="flex flex-col items-center w-full max-w-lg">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-3 sm:mb-4 border border-red-500/20 shadow-lg shadow-red-500/5 pulse-red">
                        <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 animate-pulse" />
                    </div>
                    
                    <p className="text-[9px] sm:text-[11px] font-black tracking-[0.2em] uppercase mb-3 sm:mb-4 text-red-500 animate-pulse">
                      Listening... speak naturally
                    </p>
                    
                    {/* Real-time Transcription feedback */}
                    <div className="w-full min-h-[3.5rem] sm:min-h-[4rem] px-4 sm:px-6 py-3 sm:py-4 bg-muted/20 rounded-xl sm:rounded-2xl border border-border/40 text-center relative overflow-hidden flex items-center justify-center">
                    {/* Show countdown only if there's no active speech detected */}
                    {silenceCountdown !== null && silenceCountdown <= 5 && !currentTranscript ? (
                         <div className="absolute inset-0 bg-brand-amber/10 flex items-center justify-center animate-in fade-in duration-300">
                           <p className="text-brand-amber font-black tracking-widest uppercase text-[9px] sm:text-xs flex items-center px-2">
                             <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-pulse" />
                             No voice detected... Moving on in {silenceCountdown}
                           </p>
                         </div>
                       ) : (
                         <p className={`text-xs sm:text-sm font-medium italic leading-relaxed ${currentTranscript.includes("Didn't catch") || currentTranscript.includes("Could you say") ? 'text-brand-amber' : 'text-foreground/80'}`}>
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
        
        {state.interviewStatus === 'in_progress' && state.useFallbackMode && hasStarted && (
           <form onSubmit={handleTextSubmit} className="flex space-x-2 sm:space-x-4 max-w-3xl w-full mx-auto my-4">
              <Input 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your response..."
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
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

// © 2025 Shivanand Verma (starkbbk)

