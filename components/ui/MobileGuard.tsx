"use client"

import { useEffect, useState } from "react"
import { Monitor, Laptop, ArrowRight, ShieldAlert } from "lucide-react"

export function MobileGuard() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkViewport = () => {
      // Typically 1024px is the cutoff for tablets/desktops
      setIsMobile(window.innerWidth < 1024)
    }

    checkViewport()
    window.addEventListener("resize", checkViewport)
    return () => window.removeEventListener("resize", checkViewport)
  }, [])

  if (!isMobile) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-brand-navy flex items-center justify-center p-6 selection:bg-brand-amber text-foreground">
      {/* Background elements to match the theme */}
      <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-brand-amber/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-brand-cyan/10 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="max-w-md w-full glass-card p-8 sm:p-12 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-700">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-brand-amber/10 rounded-3xl flex items-center justify-center rotate-3 animate-pulse">
              <Monitor className="w-12 h-12 text-brand-amber -rotate-3" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-brand-cyan rounded-full flex items-center justify-center border-4 border-brand-navy scale-110 shadow-lg">
                <ShieldAlert className="w-5 h-5 text-brand-navy" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight mb-4 text-white uppercase italic">
          Laptop Only
        </h1>
        
        <p className="text-muted-foreground leading-relaxed mb-8 font-light italic text-lg">
          "This AI assessment requires a stable desktop environment for the best experience."
        </p>

        <div className="space-y-4 mb-10 text-left bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center space-x-4">
             <div className="w-8 h-8 rounded-full bg-brand-amber/20 flex items-center justify-center flex-shrink-0">
                <Laptop className="w-4 h-4 text-brand-amber" />
             </div>
             <p className="text-sm font-medium text-gray-300">Please switch to a Laptop or PC</p>
          </div>
          <div className="flex items-center space-x-4">
             <div className="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-brand-cyan" />
             </div>
             <p className="text-sm font-medium text-gray-300 font-bold italic text-xs">Copy & paste link to your desktop browser</p>
          </div>
        </div>

        <div className="py-4 px-6 bg-brand-amber text-brand-navy rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-amber/20">
          Device Restricted
        </div>
        
        <p className="mt-8 text-[10px] uppercase tracking-[0.3em] font-black text-white/20">
          Cuemath AI Assessment Engine
        </p>
      </div>
    </div>
  )
}
