import { Globe, Compass, Info } from "lucide-react"
import { usePathname } from "next/navigation"

export function BrowserTip() {
  const pathname = usePathname();
  
  // Hide on interview page to keep it clean
  if (pathname === '/interview') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-right-6 duration-1000 hidden sm:flex">
      <div className="glass-card px-6 py-4 rounded-[1.5rem] border-brand-cyan/20 flex items-center space-x-4 shadow-2xl shadow-brand-cyan/10 group hover:border-brand-cyan/40 transition-all duration-300 transform hover:scale-[1.02]">
        <div className="flex -space-x-3">
            <Globe className="w-5 h-5 text-brand-cyan" />
            <Compass className="w-5 h-5 text-[#00AEEF] relative z-10" />
        </div>
        <div className="flex flex-col">
            <p className="text-[12px] font-black uppercase tracking-[0.15em] text-foreground/40 leading-none mb-1.5 flex items-center">
                <Info className="w-3 h-3 mr-2 text-brand-cyan" /> Pro Tip
            </p>
            <p className="text-sm font-bold text-foreground/80 italic tracking-tight">
                Use <span className="text-brand-cyan">Chrome</span> or <span className="text-[#00AEEF]">Safari</span> for the best experience
            </p>
        </div>
      </div>
    </div>
  )
}
