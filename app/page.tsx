"use client"

import { useEffect } from "react"
import { Hero } from "@/components/landing/Hero"
import { CandidateForm } from "@/components/landing/CandidateForm"
import { InfoCards } from "@/components/landing/InfoCards"
import { useInterview } from "@/context/InterviewContext"

export default function LandingPage() {
  const { reset } = useInterview()

  // Reset any previous interview state when visiting the landing page
  useEffect(() => {
    reset()
  }, [reset])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50/50 to-white">
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 w-full max-w-6xl mx-auto">
        <Hero />
        
        <div className="w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <CandidateForm />
        </div>
        
        <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <InfoCards />
        </div>
      </main>
      
      <footer className="py-6 text-center text-sm text-gray-500">
        <p>Powered by Cuemath AI</p>
      </footer>
    </div>
  )
}
