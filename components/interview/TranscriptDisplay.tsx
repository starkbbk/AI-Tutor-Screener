import { UserCircle, Bot } from "lucide-react"
import { ConversationMessage } from "@/lib/types"

export function TranscriptDisplay({ messages }: { messages: ConversationMessage[] }) {
  if (messages.length === 0) return null
  
  // Show only the last two messages (one AI, one user) for the active display
  const recentMessages = messages.slice(-2)

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 flex-1 flex flex-col justify-end min-h-[16rem] mb-12 mt-4 px-4 relative">
      {recentMessages.map((msg, idx) => (
        <div 
          key={idx} 
          className={`flex flex-col ${msg.role === 'candidate' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
        >
          <div className={`flex items-center mb-2 px-2 space-x-2 text-[10px] font-black tracking-[0.15em] uppercase ${msg.role === 'ai' ? 'text-brand-cyan/60' : 'text-brand-amber/60'}`}>
            {msg.role === 'ai' ? (
              <><Bot className="w-3.5 h-3.5" /> <span>AI Coach</span></>
            ) : (
              <><span>You</span> <UserCircle className="w-3.5 h-3.5" /></>
            )}
          </div>
          <div 
            className={`
              inline-block max-w-[90%] px-6 py-4 rounded-3xl text-[16px] leading-relaxed shadow-2xl backdrop-blur-xl ring-1
              ${msg.role === 'ai' 
                ? 'bg-white/5 border-white/10 text-white rounded-tl-none ring-white/5' 
                : 'bg-brand-amber text-brand-black font-medium rounded-tr-none ring-brand-amber/20'
              }
            `}
          >
            {msg.content}
            {/* Show typewriter cursor for the latest AI message */}
            {msg.role === 'ai' && idx === recentMessages.length - 1 && (
              <span className="typewriter-cursor inline-block ml-1 opacity-60"></span>
            )}
          </div>
        </div>
      ))}
    </div>

  )
}
