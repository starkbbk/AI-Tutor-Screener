"use client"

import { Chrome, Compass, Info } from "lucide-react"

export function BrowserTip() {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-right-4 duration-1000 hidden sm:flex">
      <div className="glass-card px-4 py-2.5 rounded-2xl border-brand-cyan/20 flex items-center space-x-3 shadow-2xl shadow-brand-cyan/5 group hover:border-brand-cyan/40 transition-all duration-300">
        <div className="flex -space-x-2">
            <Chrome className="w-4 h-4 text-brand-cyan" />
            <Compass className="w-4 h-4 text-[#00AEEF] relative z-10" />
        </div>
        <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 leading-none mb-1 flex items-center">
                <Info className="w-2.5 h-2.5 mr-1 text-brand-cyan" /> Pro Tip
            </p>
            <p className="text-[11px] font-bold text-foreground/70 italic">
                Use <span className="text-brand-cyan">Chrome</span> or <span className="text-[#00AEEF]">Safari</span> for the best experience
            </p>
        </div>
      </div>
    </div>
  )
}
