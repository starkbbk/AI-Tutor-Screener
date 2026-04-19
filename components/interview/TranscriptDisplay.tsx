import { useState, useEffect, useRef } from "react"
import { Volume2, UserCircle, Bot } from "lucide-react"
import { ConversationMessage } from "@/lib/types"

/**
 * Animated Thinking Dots
 */
function ThinkingDots() {
  return (
    <div className="flex space-x-1.5 py-2 px-1">
      <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-bounce" />
    </div>
  )
}

/**
 * Typewriter effect synced with audio duration
 */
function Typewriter({ text, duration, onComplete }: { text: string; duration: number; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("")
  
  useEffect(() => {
    if (!text) return
    
    // Safety check: if no duration, show instantly
    if (!duration || duration <= 0) {
      setDisplayedText(text)
      onComplete?.()
      return
    }

    let currentText = ""
    const words = text.split(" ")
    const totalWords = words.length
    
    // Calculate interval to match the spoken duration
    // We reveal word by word for better "natural" reading speed sync
    const intervalTime = (duration * 1000) / totalWords
    
    let wordIdx = 0
    const timer = setInterval(() => {
      if (wordIdx < totalWords) {
        currentText += (wordIdx === 0 ? "" : " ") + words[wordIdx]
        setDisplayedText(currentText)
        wordIdx++
      } else {
        clearInterval(timer)
        onComplete?.()
      }
    }, intervalTime)

    return () => clearInterval(timer)
  }, [text, duration])

  return (
    <>
      {displayedText}
      {displayedText.length < text.length && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-brand-cyan/40 animate-pulse align-middle" />
      )}
    </>
  )
}

export function TranscriptDisplay({ 
  messages, 
  onReplay 
}: { 
  messages: ConversationMessage[], 
  onReplay?: (text: string) => void 
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleReplayClick = (text: string) => {
    if (onReplay) onReplay(text);
  }

  if (messages.length === 0) return null
  
  return (
    <div className="w-full space-y-5 sm:space-y-8 flex-1 flex flex-col justify-end min-h-[16rem] mb-12 mt-4 relative">
      {messages.map((msg, idx) => (
        <div 
          key={msg.id} 
          className={`flex flex-col w-full ${msg.role === 'candidate' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
        >
          <div className={`flex items-center mb-3 px-2 sm:px-3 space-x-2.5 sm:space-x-3 text-[10px] font-black tracking-[0.2em] uppercase ${msg.role === 'ai' ? 'text-brand-cyan' : 'text-brand-amber font-bold'}`}>
            {msg.role === 'ai' ? (
              <>
                <div className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-brand-cyan/20 bg-muted/50 shrink-0 shadow-sm">
                  <img src="/maya.png" alt="Maya" className="w-full h-full object-cover scale-110" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                  <span className="text-[11px] sm:text-[13px] tracking-tight">Maya</span>
                  <span className="text-[7px] sm:text-[8px] opacity-50 lowercase tracking-normal font-medium hidden xxs:inline">AI Interviewer</span>
                </div>
                {msg.status === 'done' && (
                  <button 
                    onClick={() => handleReplayClick(msg.content)}
                    className="ml-auto hover:bg-brand-cyan/20 p-1 rounded-full transition-colors cursor-pointer"
                    title="Replay message"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] sm:text-[11px] tracking-tight">Respondent</span>
                   <span className="text-[7px] opacity-50 lowercase tracking-normal font-medium hidden xxs:inline">Candidate</span>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-brand-amber/10 flex items-center justify-center border-2 border-brand-amber/20 shrink-0">
                  <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-brand-amber" />
                </div>
              </>
            )}
          </div>
          <div 
            className={`
              inline-block max-w-[92%] sm:max-w-[70%] px-5 sm:px-8 py-3.5 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] text-sm sm:text-base lg:text-[17px] leading-relaxed shadow-xl relative
              ${msg.role === 'ai' 
                ? 'bg-card border border-border text-foreground rounded-tl-none' 
                : 'bg-brand-amber text-brand-navy font-bold rounded-tr-none shadow-brand-amber/10'
              }
            `}
          >
            {msg.role === 'ai' && msg.status === 'thinking' ? (
              <ThinkingDots />
            ) : msg.role === 'ai' && msg.status === 'speaking' ? (
              <Typewriter 
                text={msg.content} 
                duration={msg.audioDuration && msg.audioDuration > 0 ? msg.audioDuration : (msg.content.split(/\s+/).length / 150) * 60} 
              />
            ) : (
              msg.content
            )}
            
            {/* Show typewriter cursor for the latest AI message if completed but latest */}
            {msg.role === 'ai' && msg.status === 'done' && idx === messages.length - 1 && (
               <span className="typewriter-cursor inline-block ml-1 opacity-60"></span>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} className="h-4" />
    </div>
  )
}
