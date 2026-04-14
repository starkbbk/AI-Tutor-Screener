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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Test Your Microphone</CardTitle>
          <CardDescription>
            Let's make sure we can hear you clearly before starting.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!supported ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Voice Not Supported</h4>
                <p className="text-sm mt-1">
                  Your browser doesn't support the voice features needed for this interview. 
                  You can continue using the text-based fallback mode, or switch to Chrome/Edge for the best experience.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative mb-6">
                {isTesting ? (
                  <div className="absolute inset-0 rounded-full pulse-red" />
                ) : null}
                <Button
                  onClick={isTesting ? handleStopTest : handleStartTest}
                  variant={isTesting ? "destructive" : "default"}
                  size="icon"
                  className="w-24 h-24 rounded-full relative z-10 shadow-md"
                >
                  {isTesting ? (
                    <Mic className="w-10 h-10 animate-pulse text-white" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </Button>
              </div>
              
              <p className="font-medium text-gray-700 text-center mb-2">
                {isTesting 
                  ? "Listening... Say something like 'Hello, testing my microphone.'"
                  : "Click the microphone and say a test sentence."}
              </p>
              
              <div className={`w-full p-4 rounded-xl border min-h-24 ${isTesting ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-gray-50'} transition-colors`}>
                {testResult ? (
                  <p className="text-gray-900">{testResult}</p>
                ) : (
                  <p className="text-gray-400 italic text-center text-sm pt-4">
                    {isTesting ? "Waiting for speech..." : "Your speech will appear here..."}
                  </p>
                )}
              </div>
              
              {error && (
                <div className="mt-4 text-sm text-red-600 flex items-center w-full bg-red-50 p-3 rounded-lg border border-red-100">
                  <MicOff className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
          
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
            <h4 className="font-semibold mb-1 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1.5" /> Troubleshooting Tips
            </h4>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-blue-700/80">
              <li>Ensure you've clicked "Allow" when the browser asked for microphone permissions.</li>
              <li>Use a quiet environment for the best recognition.</li>
              <li>Use Google Chrome or Microsoft Edge for optimal voice support.</li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex-col gap-3">
          <Button 
            className="w-full text-lg h-12" 
            onClick={handleContinue}
            disabled={!supported ? false : (!hasTested && !error)}
          >
            {hasTested ? (
              <span className="flex items-center"><CheckCircle2 className="mr-2" /> My mic works — Start Interview</span>
            ) : "Start Interview"}
          </Button>
          
          {(!hasTested || error) && supported && (
             <Button variant="ghost" className="w-full text-sm text-gray-500" onClick={handleContinueWithoutMic}>
               Having trouble? Continue with text mode instead
             </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
