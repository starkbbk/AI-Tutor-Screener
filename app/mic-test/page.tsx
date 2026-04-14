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
    <div className="min-h-screen flex items-center justify-center p-6 bg-background cuemath-grid relative selection:bg-brand-amber selection:text-brand-navy">
      {/* Background depth glows (reduced for light mode) */}
      <div className="absolute top-[10%] left-[10%] w-[35%] h-[35%] bg-brand-amber/[0.03] dark:bg-brand-amber/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-brand-cyan/[0.03] dark:bg-brand-cyan/5 rounded-full blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-lg glass-card shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700 overflow-hidden">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-extrabold tracking-tight mb-2 text-foreground">Test Your Microphone</CardTitle>
          <CardDescription className="text-muted-foreground text-lg font-light italic">
            "Let's make sure we can hear you clearly"
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-6">
          {!supported ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-600 dark:text-red-400 flex items-start space-x-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-500" />
              <div>
                <h4 className="font-bold text-lg">Voice Not Supported</h4>
                <p className="text-sm mt-1 opacity-80 leading-relaxed">
                  Your browser doesn't support the voice features needed for this interview. 
                  Please use Chrome or Edge for the best experience.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative mb-10">
                {isTesting ? (
                  <div className="absolute -inset-6 rounded-full pulse-blue bg-brand-cyan/20 blur-xl transition-all duration-500" />
                ) : null}
                <Button
                  onClick={isTesting ? handleStopTest : handleStartTest}
                  variant={isTesting ? "destructive" : "default"}
                  size="icon"
                  className={`w-32 h-32 rounded-full relative z-10 shadow-2xl transition-all duration-500 amber-button ${isTesting ? 'scale-110' : 'hover:scale-105'}`}
                >
                  {isTesting ? (
                    <Mic className="w-14 h-14 text-white animate-pulse" />
                  ) : (
                    <Mic className="w-14 h-14" />
                  )}
                </Button>
              </div>
              
              <div className="text-center space-y-2 mb-10">
                <p className={`text-xl transition-colors duration-300 font-bold tracking-tight ${isTesting ? 'text-brand-cyan' : 'text-foreground hover:text-brand-navy'}`}>
                  {isTesting ? "Recording..." : "Ready to test?"}
                </p>
                <p className="text-sm text-muted-foreground font-light px-10">
                  {isTesting ? "Say something like 'Ready to teach!'" : "Check your audio levels before the session"}
                </p>
              </div>
              
              <div className={`w-full p-8 rounded-[2.5rem] border min-h-32 transition-all duration-500 flex items-center justify-center relative overflow-hidden ${isTesting ? 'border-brand-cyan/30 bg-brand-cyan/5' : 'border-border bg-muted/30'}`}>
                {testResult ? (
                  <p className="text-foreground text-xl font-medium text-center tracking-tight leading-relaxed animate-in fade-in duration-300 italic px-4">
                    "{testResult}"
                  </p>
                ) : (
                  <div className="flex flex-col items-center space-y-4 opacity-40">
                    <p className="text-muted-foreground italic text-center text-sm">
                      {isTesting ? "Waiting for speech..." : "Your speech will appear here..."}
                    </p>
                    {isTesting && (
                      <div className="flex gap-1.5 h-6 items-end">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} className="w-1.5 bg-brand-cyan wave-bar rounded-full" style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-8 flex flex-col space-y-4 w-full">
                  <div className="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start animate-in shake duration-500 shadow-sm">
                    <AlertCircle className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-lg">Connection Issue</p>
                      <p className="text-sm opacity-90 leading-relaxed">{error}</p>
                    </div>
                  </div>
                  
                  {error.toLowerCase().includes('network') && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
                      className="border-border hover:bg-muted text-xs text-muted-foreground h-10 rounded-xl"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh Service
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="bg-muted/50 border border-border rounded-[2.5rem] p-8 text-sm group">
            <h4 className="font-black text-foreground/40 mb-4 flex items-center tracking-[0.2em] uppercase text-[10px] group-hover:text-brand-amber transition-colors">
              <AlertCircle className="w-4 h-4 mr-2" /> Troubleshooting Tips
            </h4>
            <ul className="space-y-3 text-muted-foreground font-light leading-relaxed">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-1.5 mr-4 flex-shrink-0" />
                Click "Allow" if your browser asks for microphone access
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-1.5 mr-4 flex-shrink-0" />
                Find a quiet spot for the best AI screening results
              </li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex-col gap-5 pb-10">
          <Button 
            size="lg"
            className="w-full text-lg h-16 rounded-[2rem] font-black tracking-tight amber-button shadow-xl shadow-brand-amber/10" 
            onClick={handleContinue}
            disabled={!supported ? false : (!hasTested && !error)}
          >
            {hasTested ? (
              <span className="flex items-center"><CheckCircle2 className="mr-3 w-6 h-6" /> I'm Ready — Start Session</span>
            ) : "Confirm & Start"}
          </Button>
          
          {(!hasTested || error) && supported && (
             <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors h-10" onClick={handleContinueWithoutMic}>
               Having trouble? Continue with text mode instead
             </Button>
          )}
        </CardFooter>
      </Card>
    </div>

  )
}

