import { UserCircle, Bot } from "lucide-react"
import { ConversationMessage } from "@/lib/types"

export function TranscriptDisplay({ messages }: { messages: ConversationMessage[] }) {
  if (messages.length === 0) return null
  
  // Show only the last two messages (one AI, one user) for the active display
  const recentMessages = messages.slice(-2)

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 flex-1 flex flex-col justify-end min-h-48 mb-8 mt-2 px-4">
      {recentMessages.map((msg, idx) => (
        <div 
          key={idx} 
          className={`flex flex-col ${msg.role === 'candidate' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
        >
          <div className="flex items-center mb-1.5 px-1 space-x-1.5 text-xs font-semibold text-gray-400">
            {msg.role === 'ai' ? (
              <><Bot className="w-3.5 h-3.5" /> <span>AI INTERVIEWER</span></>
            ) : (
              <><span>YOU</span> <UserCircle className="w-3.5 h-3.5" /></>
            )}
          </div>
          <div 
            className={`
              inline-block max-w-[85%] px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm
              ${msg.role === 'ai' 
                ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm' 
                : 'bg-blue-600 text-white rounded-tr-sm'
              }
            `}
          >
            {msg.content}
            {/* Show typewriter cursor for the latest AI message if it's the very last one */}
            {msg.role === 'ai' && idx === recentMessages.length - 1 && (
              <span className="typewriter-cursor inline-block ml-0.5"></span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
