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
        className="w-24 h-24 rounded-full bg-brand-amber/10 border border-brand-amber/30 text-brand-amber shadow-[0_0_20px_rgba(255,184,0,0.1)]"
      >
        <Loader2 className="w-10 h-10 animate-spin" />
      </Button>
    )
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="icon"
      className={`
        w-24 h-24 rounded-full shadow-2xl transition-all duration-500 transform active:scale-95
        ${isRecording 
          ? 'bg-brand-cyan text-brand-black pulse-blue scale-110 shadow-[0_0_40px_rgba(0,209,255,0.4)] hover:bg-brand-cyan/90' 
          : 'bg-brand-amber text-brand-black hover:bg-brand-amber/90 hover:scale-105 shadow-[0_0_30px_rgba(255,184,0,0.25)]'}
        ${disabled && !isRecording ? 'opacity-30 cursor-not-allowed grayscale' : ''}
      `}
    >
      {isRecording ? (
        <Square className="w-10 h-10 fill-current" />
      ) : (
        <Mic className="w-11 h-11" />
      )}
    </Button>
  )
}

