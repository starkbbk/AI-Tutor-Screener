"use client"

import { useInterview } from "@/context/InterviewContext"

export function VoiceAvatar() {
  const { state } = useInterview()
  
  let stateClass = "bg-gray-200"
  let pulsingClass = ""
  
  if (state.isAISpeaking) {
    stateClass = "bg-blue-600"
    pulsingClass = "pulse-blue"
  } else if (state.isRecording) {
    stateClass = "bg-red-500"
    pulsingClass = "pulse-red"
  } else if (state.isProcessing) {
    stateClass = "bg-amber-400"
    pulsingClass = "pulse-gentle"
  }

  return (
    <div className="flex flex-col items-center justify-center my-8 h-48">
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring */}
        <div className={`absolute w-32 h-32 rounded-full ${pulsingClass} transition-all duration-300`} />
        
        {/* Core circle */}
        <div className={`w-32 h-32 rounded-full ${stateClass} flex items-center justify-center relative z-10 transition-colors duration-500 shadow-lg`}>
          {state.isAISpeaking ? (
            <div className="flex items-center space-x-1 px-4 w-full justify-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-1.5 bg-white/80 rounded-full wave-bar" />
              ))}
            </div>
          ) : state.isRecording ? (
            <div className="flex items-center space-x-1.5 px-4 w-full justify-center">
               {[1, 2, 3].map((i) => (
                 <div key={i} className={`w-3 h-3 rounded-full bg-white/80 wave-bar`} style={{ animationDuration: '0.6s' }} />
               ))}
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/20" />
          )}
        </div>
      </div>
      
      <div className="mt-6 text-sm font-medium tracking-wide text-gray-500 uppercase">
        {state.isAISpeaking ? "AI is speaking..." : state.isRecording ? "Listening..." : "Ready"}
      </div>
    </div>
  )
}
