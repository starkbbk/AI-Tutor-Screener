"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { InterviewRoom } from "@/components/interview/InterviewRoom"
import { useInterview } from "@/context/InterviewContext"

export default function InterviewPage() {
  const router = useRouter()
  const { state, startInterview } = useInterview()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    if (!state.candidate) {
      router.push("/")
      return
    }

    if (state.interviewStatus === 'not_started') {
      startInterview()
    }
  }, [state.candidate, state.interviewStatus, router, startInterview])

  if (!mounted || !state.candidate) return null

  return (
    <div className="min-h-screen bg-background cuemath-grid p-1.5 sm:p-2 flex items-center justify-center no-select overflow-hidden">
      <div className="w-full h-full flex items-center justify-center relative">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-brand-cyan/5 rounded-full blur-[150px] pointer-events-none" />

        <InterviewRoom />
      </div>
    </div>
  )
}

// © 2026 Shivanand Verma (starkbbk)

