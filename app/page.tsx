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
    <div className="min-h-screen flex flex-col bg-background cuemath-grid selection:bg-brand-amber selection:text-foreground">
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 w-full max-w-7xl mx-auto py-20 relative">
        {/* Abstract background glows */}
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-brand-amber/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[25%] h-[25%] bg-brand-cyan/5 rounded-full blur-[100px] pointer-events-none" />
        
        <Hero />
        
        <div className="w-full relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <CandidateForm />
        </div>
        
        <div className="w-full animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 fill-mode-both">
          <InfoCards />
        </div>
      </main>
      
      <footer className="py-10 text-center text-sm text-gray-500 border-t border-white/5 mt-20">
        <div className="flex justify-center items-center space-x-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-400 font-medium">AI Screening Engine Online</span>
        </div>
        <p>&copy; 2024 Cuemath Tutor Hiring. All rights reserved.</p>
      </footer>
    </div>
  )
}

