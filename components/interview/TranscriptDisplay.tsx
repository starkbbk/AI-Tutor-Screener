import { useEffect, useRef } from "react"
import { UserCircle, Bot } from "lucide-react"
import { ConversationMessage } from "@/lib/types"

export function TranscriptDisplay({ messages }: { messages: ConversationMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  if (messages.length === 0) return null
  
  return (
    <div className="w-full space-y-8 flex-1 flex flex-col justify-end min-h-[16rem] mb-12 mt-4 relative">
      {messages.map((msg, idx) => (
        <div 
          key={idx} 
          className={`flex flex-col w-full ${msg.role === 'candidate' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
        >
          <div className={`flex items-center mb-3 px-3 space-x-2 text-[10px] font-black tracking-[0.2em] uppercase ${msg.role === 'ai' ? 'text-brand-cyan' : 'text-brand-amber'}`}>
            {msg.role === 'ai' ? (
              <><Bot className="w-3.5 h-3.5" /> <span>AI Intelligence</span></>
            ) : (
              <><span>Respondent</span> <UserCircle className="w-3.5 h-3.5" /></>
            )}
          </div>
          <div 
            className={`
              inline-block max-w-[85%] sm:max-w-[70%] px-8 py-5 rounded-[2rem] text-[17px] leading-relaxed shadow-xl relative
              ${msg.role === 'ai' 
                ? 'bg-card border border-border text-foreground rounded-tl-none' 
                : 'bg-brand-amber text-brand-navy font-bold rounded-tr-none shadow-brand-amber/10'
              }
            `}
          >
            {msg.content}
            {/* Show typewriter cursor for the latest AI message */}
            {msg.role === 'ai' && idx === messages.length - 1 && (
              <span className="typewriter-cursor inline-block ml-1 opacity-60"></span>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} className="h-4" />
    </div>
  )
}
