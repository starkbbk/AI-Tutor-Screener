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
    <div className="flex flex-col items-center justify-center my-10 h-64">
      <div className="relative flex items-center justify-center">
        {/* Pulsing rings */}
        <div className={`absolute w-40 h-40 rounded-full ${pulsingClass} opacity-20 blur-2xl transition-all duration-700`} />
        <div className={`absolute w-36 h-36 rounded-full border border-border transition-all duration-300`} />
        
        {/* Core circle */}
        <div className={`w-40 h-40 rounded-full ${stateClass} flex items-center justify-center relative z-10 transition-all duration-500 shadow-2xl border-4 border-background/20`}>
          {state.isAISpeaking ? (
            <div className="flex items-center space-x-1.5 px-6 w-full justify-center">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-2.5 bg-background/40 rounded-full wave-bar" />
              ))}
            </div>
          ) : state.isRecording ? (
            <div className="flex items-end justify-center space-x-1.5 h-10 px-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full bg-foreground/80 wave-bar`} style={{ animationDuration: '0.6s' }} />
              ))}
            </div>
          ) : state.isProcessing ? (
            <Loader2 className="w-14 h-14 text-brand-navy dark:text-brand-black animate-spin" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted border border-border animate-pulse shadow-inner" />
          )}
        </div>
      </div>
      
      <div className="mt-10 flex flex-col items-center space-y-3">
        <div className={`text-[10px] font-black tracking-[0.4em] uppercase transition-colors duration-300 ${state.isAISpeaking ? 'text-brand-cyan' : state.isRecording ? 'text-red-500' : 'text-muted-foreground/60'}`}>
          {state.isAISpeaking ? "AI Speaking" : state.isRecording ? "Listening" : state.isProcessing ? "Processing" : "Idle"}
        </div>
        {!state.isProcessing && !state.isAISpeaking && !state.isRecording && (
          <div className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-ping" />
        )}
      </div>
    </div>
  )
}


