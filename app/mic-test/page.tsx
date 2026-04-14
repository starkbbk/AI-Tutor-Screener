"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mic, AlertCircle, CheckCircle2, MicOff, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useInterview } from "@/context/InterviewContext"
import { isSpeechRecognitionSupported, startListening, stopListening, SpeechRecognitionResult } from "@/lib/speech"

export default function MicTestPage() {
  const router = useRouter()
  const { state, setFallbackMode } = useInterview()
  
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [hasTested, setHasTested] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    // Redirect if no candidate info
    if (!state.candidate) {
      router.push("/")
    }
    
    if (!isSpeechRecognitionSupported()) {
      setSupported(false)
      setFallbackMode(true)
    }
    
    return () => stopListening()
  }, [state.candidate, router, setFallbackMode])

  const handleStartTest = () => {
    setIsTesting(true)
    setTestResult("")
    setError(null)
    
    startListening(
      (result: SpeechRecognitionResult) => {
        setTestResult(result.transcript)
        if (result.isFinal) {
          setIsTesting(false)
          setHasTested(true)
          stopListening()
        }
      },
      () => {
        setIsTesting(false)
        if (testResult.length > 0) setHasTested(true)
      },
      (err: string) => {
        setIsTesting(false)
        setError(err)
      }
    )
  }

  const handleStopTest = () => {
    stopListening()
    setIsTesting(false)
  }

  const handleContinue = () => {
    stopListening()
    router.push("/interview")
  }

  const handleContinueWithoutMic = () => {
    setFallbackMode(true)
    router.push("/interview")
  }

  if (!state.candidate) return null // Will redirect

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background cuemath-grid relative selection:bg-brand-amber selection:text-brand-navy">
      {/* Background depth glows (reduced for light mode) */}
      <div className="absolute top-[10%] left-[10%] w-[35%] h-[35%] bg-brand-amber/[0.03] dark:bg-brand-amber/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-brand-cyan/[0.03] dark:bg-brand-cyan/5 rounded-full blur-[70px] sm:blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-lg glass-card shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700 overflow-hidden">
        <CardHeader className="text-center pb-2 px-4 sm:px-6">
          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-foreground">Test Your Microphone</CardTitle>
          <CardDescription className="text-muted-foreground text-base sm:text-lg font-light italic">
            "Let's make sure we can hear you clearly"
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 sm:space-y-8 pt-4 sm:pt-6 px-4 sm:px-6">
          {!supported ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 sm:p-6 text-red-600 dark:text-red-400 flex items-start space-x-3 sm:space-x-4">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 text-red-500" />
              <div>
                <h4 className="font-bold text-base sm:text-lg">Voice Not Supported</h4>
                <p className="text-xs sm:text-sm mt-1 opacity-80 leading-relaxed">
                  Your browser doesn't support the voice features needed for this interview. 
                  Please use Chrome or Edge for the best experience.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 sm:py-4">
              <div className="relative mb-6 sm:mb-10">
                {isTesting ? (
                  <div className="absolute -inset-4 sm:-inset-6 rounded-full pulse-blue bg-brand-cyan/20 blur-xl transition-all duration-500" />
                ) : null}
                <Button
                  onClick={isTesting ? handleStopTest : handleStartTest}
                  variant={isTesting ? "destructive" : "default"}
                  size="icon"
                  className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full relative z-10 shadow-2xl transition-all duration-500 amber-button ${isTesting ? 'scale-110' : 'hover:scale-105'}`}
                >
                  {isTesting ? (
                    <Mic className="w-10 h-10 sm:w-14 sm:h-14 text-white animate-pulse" />
                  ) : (
                    <Mic className="w-10 h-10 sm:w-14 sm:h-14" />
                  )}
                </Button>
              </div>
              
              <div className="text-center space-y-1 sm:space-y-2 mb-6 sm:mb-10">
                <p className={`text-lg sm:text-xl transition-colors duration-300 font-bold tracking-tight ${isTesting ? 'text-brand-cyan' : 'text-foreground hover:text-brand-navy'}`}>
                  {isTesting ? "Recording..." : "Ready to test?"}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground font-light px-4 sm:px-10">
                  {isTesting ? "Say something like 'Ready to teach!'" : "Check your audio levels before the session"}
                </p>
              </div>
              
              <div className={`w-full p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border min-h-24 sm:min-h-32 transition-all duration-500 flex items-center justify-center relative overflow-hidden ${isTesting ? 'border-brand-cyan/30 bg-brand-cyan/5' : 'border-border bg-muted/30'}`}>
                {testResult ? (
                  <p className="text-foreground text-lg sm:text-xl font-medium text-center tracking-tight leading-relaxed animate-in fade-in duration-300 italic px-2 sm:px-4">
                    "{testResult}"
                  </p>
                ) : (
                  <div className="flex flex-col items-center space-y-3 sm:space-y-4 opacity-40">
                    <p className="text-muted-foreground italic text-center text-xs sm:text-sm">
                      {isTesting ? "Waiting for speech..." : "Your speech will appear here..."}
                    </p>
                    {isTesting && (
                      <div className="flex gap-1 h-4 sm:h-6 items-end">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} className="w-1 sm:w-1.5 bg-brand-cyan wave-bar rounded-full" style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-6 sm:mt-8 flex flex-col space-y-4 w-full">
                  <div className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start animate-in shake duration-500 shadow-sm">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-base sm:text-lg">Connection Issue</p>
                      <p className="text-xs sm:text-sm opacity-90 leading-relaxed">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-muted/50 border border-border rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-xs sm:text-sm group">
            <h4 className="font-black text-foreground/40 mb-3 sm:mb-4 flex items-center tracking-[0.2em] uppercase text-[9px] sm:text-[10px] group-hover:text-brand-amber transition-colors">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" /> Troubleshooting
            </h4>
            <ul className="space-y-2 sm:space-y-3 text-muted-foreground font-light leading-relaxed">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-1.5 mr-3 sm:mr-4 flex-shrink-0" />
                Click "Allow" if asked for mic access
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-1.5 mr-3 sm:mr-4 flex-shrink-0" />
                Find a quiet spot for the AI assessment
              </li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex-col gap-4 sm:gap-5 pb-8 sm:pb-10 px-4 sm:px-6">
          <Button 
            size="lg"
            className="w-full text-base sm:text-lg h-14 sm:h-16 rounded-[1.5rem] sm:rounded-[2rem] font-black tracking-tight amber-button shadow-xl shadow-brand-amber/10" 
            onClick={handleContinue}
            disabled={!supported ? false : (!hasTested && !error)}
          >
            {hasTested ? (
              <span className="flex items-center"><CheckCircle2 className="mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6" /> I'm Ready — Start</span>
            ) : "Confirm & Start"}
          </Button>
          
          {(!hasTested || error) && supported && (
             <Button variant="ghost" className="w-full text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors h-8 sm:h-10" onClick={handleContinueWithoutMic}>
               Having trouble? Continue with text mode
             </Button>
          )}
        </CardFooter>
      </Card>
    </div>

  )
}

