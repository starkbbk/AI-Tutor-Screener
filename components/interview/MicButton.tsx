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


  return (
    <Button
      onClick={onClick}
      disabled={disabled || isProcessing}
      size="icon"
      className={`
        w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-2xl transition-all duration-500 transform active:scale-95
        ${isRecording 
          ? 'bg-brand-cyan text-brand-navy dark:text-brand-black pulse-blue scale-110 shadow-cyan-500/20' 
          : 'bg-brand-amber text-brand-navy dark:text-brand-black hover:bg-brand-amber/90 hover:scale-105 shadow-brand-amber/20 amber-button'}
        ${(disabled || isProcessing) && !isRecording ? 'opacity-20 cursor-not-allowed' : ''}
      `}
    >
      {isRecording ? (
        <Square className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
      ) : (
        <Mic className="w-8 h-8 sm:w-10 sm:h-10" />
      )}
    </Button>
  )
}


