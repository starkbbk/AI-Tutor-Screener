import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ConversationMessage } from "@/lib/types"

export function TranscriptAccordion({ history }: { history: ConversationMessage[] }) {
  if (!history || history.length === 0) return null

  return (
    <Accordion className="w-full bg-white rounded-xl border border-gray-200">
      <AccordionItem value="transcript" className="border-none">
        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 rounded-xl transition-colors">
          <span className="font-semibold text-lg text-gray-900">Full Interview Transcript</span>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6 pt-2">
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {history.map((msg, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-xl ${
                  msg.role === 'ai' 
                    ? 'bg-blue-50 border border-blue-100 ml-0 mr-12' 
                    : 'bg-gray-50 border border-gray-100 mr-0 ml-12'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    msg.role === 'ai' ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {msg.role === 'ai' ? 'AI Interviewer' : 'Candidate'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
