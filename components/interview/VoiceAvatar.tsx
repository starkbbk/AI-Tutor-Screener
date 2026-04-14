"use client"

import { useInterview } from "@/context/InterviewContext"

export function VoiceAvatar() {
  const { state } = useInterview()
  
  let stateClass = "bg-white/10"
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
    <div className="flex flex-col items-center justify-center my-12 h-56">
      <div className="relative flex items-center justify-center">
        {/* Pulsing rings */}
        <div className={`absolute w-36 h-36 rounded-full ${pulsingClass} opacity-20 blur-2xl transition-all duration-700`} />
        <div className={`absolute w-32 h-32 rounded-full border border-white/5 transition-all duration-300`} />
        
        {/* Core circle */}
        <div className={`w-36 h-36 rounded-full ${stateClass} flex items-center justify-center relative z-10 transition-all duration-500 shadow-2xl border-4 border-black/20`}>
          {state.isAISpeaking ? (
            <div className="flex items-center space-x-1.5 px-6 w-full justify-center">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-2 bg-brand-black/40 rounded-full wave-bar" />
              ))}
            </div>
          ) : state.isRecording ? (
            <div className="flex items-center space-x-2 px-6 w-full justify-center">
               {[1, 2, 3].map((i) => (
                 <div key={i} className={`w-4 h-4 rounded-full bg-white/80 wave-bar`} style={{ animationDuration: '0.6s' }} />
               ))}
            </div>
          ) : state.isProcessing ? (
            <Loader2 className="w-12 h-12 text-brand-black animate-spin" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 animate-pulse" />
          )}
        </div>
      </div>
      
      <div className="mt-8 flex flex-col items-center space-y-2">
        <div className={`text-xs font-black tracking-[0.2em] uppercase transition-colors duration-300 ${state.isAISpeaking ? 'text-brand-cyan' : state.isRecording ? 'text-red-400' : 'text-gray-500'}`}>
          {state.isAISpeaking ? "AI Speaking" : state.isRecording ? "Listening" : state.isProcessing ? "Processing" : "Ready"}
        </div>
        {!state.isProcessing && !state.isAISpeaking && !state.isRecording && (
          <div className="w-1 h-1 rounded-full bg-brand-amber animate-ping" />
        )}
      </div>
    </div>
  )
}

