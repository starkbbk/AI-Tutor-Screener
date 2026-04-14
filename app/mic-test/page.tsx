"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mic, AlertCircle, CheckCircle2, MicOff } from "lucide-react"
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-black cuemath-grid relative selection:bg-brand-amber selection:text-brand-black">
      {/* Background depth glows */}
      <div className="absolute top-[10%] left-[10%] w-[35%] h-[35%] bg-brand-amber/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-brand-cyan/5 rounded-full blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-lg glass-card border-white/10 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-extrabold text-white tracking-tight mb-2">Test Your Microphone</CardTitle>
          <CardDescription className="text-gray-400 text-lg font-light">
            Let's make sure we can hear you clearly before starting.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8 pt-6">
          {!supported ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-red-200 flex items-start space-x-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-lg">Voice Not Supported</h4>
                <p className="text-sm mt-1 opacity-80 leading-relaxed">
                  Your browser doesn't support the voice features needed for this interview. 
                  You can continue using the text-based fallback mode, or switch to Chrome/Edge for the best experience.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative mb-8">
                {isTesting ? (
                  <div className="absolute -inset-4 rounded-full pulse-blue bg-brand-cyan/20 blur-xl" />
                ) : null}
                <Button
                  onClick={isTesting ? handleStopTest : handleStartTest}
                  variant={isTesting ? "destructive" : "default"}
                  size="icon"
                  className={`w-28 h-28 rounded-full relative z-10 shadow-2xl transition-all duration-500 ${isTesting ? 'scale-110 active:scale-100' : 'hover:scale-105 active:scale-95'}`}
                >
                  {isTesting ? (
                    <Mic className="w-12 h-12 text-white animate-pulse" />
                  ) : (
                    <Mic className="w-12 h-12 text-brand-black" />
                  )}
                </Button>
              </div>
              
              <div className="text-center space-y-2 mb-8">
                <p className={`text-lg transition-colors duration-300 ${isTesting ? 'text-brand-cyan font-bold' : 'text-white font-medium'}`}>
                  {isTesting 
                    ? "Recording..." 
                    : "Click to start mic test"}
                </p>
                <p className="text-sm text-gray-400 font-light">
                  {isTesting ? "Say something like 'Ready to teach!'" : "Check your audio levels"}
                </p>
              </div>
              
              <div className={`w-full p-6 rounded-[2rem] border min-h-28 transition-all duration-500 flex items-center justify-center ${isTesting ? 'border-brand-cyan/30 bg-brand-cyan/5 shadow-[0_0_30px_rgba(0,163,255,0.1)]' : 'border-white/5 bg-black/40'}`}>
                {testResult ? (
                  <p className="text-white text-xl font-medium text-center tracking-tight leading-relaxed animate-in fade-in duration-300 italic">
                    "{testResult}"
                  </p>
                ) : (
                  <div className="flex flex-col items-center space-y-3 opacity-40">
                    <p className="text-gray-400 italic text-center">
                      {isTesting ? "Waiting for speech..." : "Your speech will appear here..."}
                    </p>
                    {isTesting && (
                      <div className="flex gap-1 h-4 items-end">
                        <div className="w-1 bg-brand-cyan wave-bar" />
                        <div className="w-1 bg-brand-cyan wave-bar" />
                        <div className="w-1 bg-brand-cyan wave-bar" />
                        <div className="w-1 bg-brand-cyan wave-bar" />
                        <div className="w-1 bg-brand-cyan wave-bar" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-6 text-sm text-red-400 flex items-center w-full bg-red-500/10 p-4 rounded-2xl border border-red-500/20 animate-in shake duration-500">
                  <MicOff className="w-5 h-5 mr-3 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
          
          <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 text-sm">
            <h4 className="font-bold text-white mb-3 flex items-center tracking-wide uppercase text-[11px] opacity-60">
              <AlertCircle className="w-4 h-4 mr-2" /> Troubleshooting Tips
            </h4>
            <ul className="space-y-2 text-gray-400 font-light leading-relaxed">
              <li className="flex items-start">
                <span className="w-1 h-1 rounded-full bg-brand-cyan mt-1.5 mr-3 flex-shrink-0" />
                Click "Allow" if your browser asks for microphone access
              </li>
              <li className="flex items-start">
                <span className="w-1 h-1 rounded-full bg-brand-cyan mt-1.5 mr-3 flex-shrink-0" />
                Find a quiet spot for the best AI screening results
              </li>
              <li className="flex items-start">
                <span className="w-1 h-1 rounded-full bg-brand-cyan mt-1.5 mr-3 flex-shrink-0" />
                Chrome or Edge are recommended for voice reliability
              </li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex-col gap-4 pb-10">
          <Button 
            size="lg"
            className="w-full text-lg h-14 rounded-2xl font-extrabold tracking-tight" 
            onClick={handleContinue}
            disabled={!supported ? false : (!hasTested && !error)}
          >
            {hasTested ? (
              <span className="flex items-center"><CheckCircle2 className="mr-2 w-5 h-5 text-brand-black" /> Begin Assessment</span>
            ) : "Start Interview"}
          </Button>
          
          {(!hasTested || error) && supported && (
             <Button variant="ghost" className="w-full text-xs text-gray-500 hover:text-white transition-colors" onClick={handleContinueWithoutMic}>
               Having trouble? Continue with text mode instead
             </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

