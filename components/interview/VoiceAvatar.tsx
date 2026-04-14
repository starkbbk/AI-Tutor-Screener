"use client"

import { useInterview } from "@/context/InterviewContext"
import { Loader2 } from "lucide-react"

export function VoiceAvatar() {
  const { state } = useInterview()
  
  let stateClass = "bg-muted/30 dark:bg-white/5"
  let pulsingClass = ""
  
  if (state.isAISpeaking) {
    stateClass = "bg-brand-cyan"
    pulsingClass = "pulse-blue"
  } else if (state.isRecording) {
    stateClass = "bg-red-500"
    pulsingClass = "pulse-red"
  } else if (state.isProcessing) {
    stateClass = "bg-brand-amber"
    pulsingClass = "pulse-gentle"
  }

  return (
    <div className="flex items-center space-x-3 bg-muted/20 px-4 py-2 rounded-full border border-border">
      {/* Core circle */}
      <div className={`w-10 h-10 rounded-full ${stateClass} flex items-center justify-center relative z-10 transition-all duration-500 shadow-md border-2 border-background/20`}>
        {state.isAISpeaking ? (
          <div className="flex items-center space-x-0.5 px-2 w-full justify-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1 bg-background/60 rounded-full wave-bar" />
            ))}
          </div>
        ) : state.isRecording ? (
          <div className="flex items-end justify-center space-x-0.5 h-4 px-1">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full bg-foreground/80 wave-bar`} style={{ animationDuration: '0.6s' }} />
            ))}
          </div>
        ) : state.isProcessing ? (
          <Loader2 className="w-5 h-5 text-brand-navy dark:text-brand-black animate-spin" />
        ) : (
          <div className="w-4 h-4 rounded-full bg-muted border border-border animate-pulse shadow-inner" />
        )}
      </div>
      
      <div className={`text-[10px] font-bold tracking-widest uppercase transition-colors duration-300 ${state.isAISpeaking ? 'text-brand-cyan' : state.isRecording ? 'text-red-500' : 'text-muted-foreground/80'}`}>
        {state.isAISpeaking ? "AI Speaking" : state.isRecording ? "Listening" : state.isProcessing ? "Processing" : "Idle"}
      </div>
    </div>
  )
}


