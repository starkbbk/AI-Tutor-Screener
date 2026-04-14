"use client"

import { Mic, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MicButtonProps {
  isRecording: boolean
  isProcessing: boolean
  disabled: boolean
  onClick: () => void
}

export function MicButton({ isRecording, isProcessing, disabled, onClick }: MicButtonProps) {
  if (isProcessing) {
    return (
      <Button 
        size="icon" 
        disabled
        className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 border border-amber-200"
      >
        <Loader2 className="w-8 h-8 animate-spin" />
      </Button>
    )
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={isRecording ? "destructive" : "default"}
      size="icon"
      className={`
        w-20 h-20 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95
        ${isRecording ? 'pulse-red scale-105' : 'bg-blue-600 hover:bg-blue-700'}
        ${disabled && !isRecording ? 'opacity-50 cursor-not-allowed bg-gray-300' : ''}
      `}
    >
      {isRecording ? (
        <Square className="w-8 h-8 fill-current" />
      ) : (
        <Mic className="w-9 h-9" />
      )}
    </Button>
  )
}
