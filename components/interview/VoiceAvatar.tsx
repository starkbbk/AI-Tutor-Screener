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
    <div className="flex items-center space-x-2 sm:space-x-3 bg-muted/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border">
      {/* Core circle */}
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${stateClass} flex items-center justify-center relative z-10 transition-all duration-500 shadow-md border-2 border-background/20 overflow-hidden`}>
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-20">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        ) : (
          <img src="/maya.png" alt="Maya" className="w-full h-full object-cover scale-110" />
        )}
        
        {/* State-driven background image overlay for transitions */}
        {state.isAISpeaking && (
           <img src="/maya.png" alt="Maya" className="absolute inset-0 w-full h-full object-cover opacity-20 -z-10 scale-110" />
        )}
      </div>
      
      <div className="flex flex-col">
        <span className="text-[10px] sm:text-[11px] font-black text-foreground tracking-tight leading-none mb-0.5">Maya</span>
        <div className={`text-[7px] sm:text-[8px] font-bold tracking-widest uppercase transition-colors duration-300 ${state.isAISpeaking ? 'text-brand-cyan' : state.isRecording ? 'text-red-500' : 'text-muted-foreground/60'}`}>
          {state.isAISpeaking ? "Speaking" : state.isRecording ? "Listening" : state.isProcessing ? "Thinking" : "Idle"}
        </div>
      </div>
    </div>
  )
}


