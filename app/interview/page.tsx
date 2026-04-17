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
    <div className="min-h-screen bg-brand-navy flex flex-col no-select">
      <InterviewRoom />
    </div>
  )
  )
}
