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
        className="w-28 h-28 rounded-full bg-muted/50 border border-border text-brand-amber shadow-inner"
      >
        <Loader2 className="w-12 h-12 animate-spin" />
      </Button>
    )
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="icon"
      className={`
        w-28 h-28 rounded-full shadow-2xl transition-all duration-500 transform active:scale-95
        ${isRecording 
          ? 'bg-brand-cyan text-brand-navy dark:text-brand-black pulse-blue scale-110 shadow-cyan-500/20' 
          : 'bg-brand-amber text-brand-navy dark:text-brand-black hover:bg-brand-amber/90 hover:scale-105 shadow-brand-amber/20 amber-button'}
        ${disabled && !isRecording ? 'opacity-20 cursor-not-allowed' : ''}
      `}
    >
      {isRecording ? (
        <Square className="w-12 h-12 fill-current" />
      ) : (
        <Mic className="w-14 h-14" />
      )}
    </Button>
  )
}


