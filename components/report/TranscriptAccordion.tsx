import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ConversationMessage } from "@/lib/types"

export function TranscriptAccordion({ history }: { history: ConversationMessage[] }) {
  if (!history || history.length === 0) return null

  return (
    <Accordion className="w-full bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-border shadow-lg overflow-hidden">
      <AccordionItem value="transcript" className="border-none">
        <AccordionTrigger className="px-10 py-6 hover:no-underline hover:bg-muted/50 transition-all group">
          <span className="font-extrabold text-xl text-foreground tracking-tight group-hover:text-brand-amber transition-colors">
            Full Interview Transcript
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-10 pb-10 pt-4">
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {history.map((msg, idx) => (
              <div 
                key={idx}
                className={`p-6 rounded-[2rem] transition-all duration-300 hover:shadow-md ${
                  msg.role === 'ai' 
                    ? 'bg-brand-cyan/[0.03] border border-brand-cyan/20 ml-0 mr-12' 
                    : 'bg-muted/50 border border-border mr-0 ml-12'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                    msg.role === 'ai' ? 'text-brand-cyan' : 'text-muted-foreground'
                  }`}>
                    {msg.role === 'ai' ? 'AI Intelligence' : 'Candidate'}
                  </span>
                  <span className="text-[10px] text-muted-foreground opacity-60 font-black">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[16px] text-foreground/80 whitespace-pre-wrap leading-relaxed font-light">
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
