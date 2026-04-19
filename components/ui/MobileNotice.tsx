"use client"

import { useEffect, useState } from "react"
import { Monitor, Laptop, X, Layout } from "lucide-react"

export function MobileNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const checkViewport = () => {
      const isDismissed = sessionStorage.getItem("mobile-notice-dismissed")
      const isMobile = window.innerWidth < 1024
      
      if (isMobile && !isDismissed) {
        setShow(true)
      } else {
        setShow(false)
      }
    }

    checkViewport()
    window.addEventListener("resize", checkViewport)
    return () => window.removeEventListener("resize", checkViewport)
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem("mobile-notice-dismissed", "true")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[10000] bg-background/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full glass-card p-8 sm:p-10 text-center relative overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-foreground/40 hover:text-foreground transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-brand-amber/10 rounded-2xl flex items-center justify-center rotate-3">
              <Laptop className="w-10 h-10 text-brand-amber -rotate-3" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-cyan rounded-full flex items-center justify-center border-4 border-background scale-110 shadow-lg">
                <Monitor className="w-4 h-4 text-brand-navy" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-black tracking-tight mb-3 text-foreground uppercase italic">
          Better on Laptop
        </h2>
        
        <p className="text-muted-foreground leading-relaxed mb-8 font-light italic">
          "For the most stable and comfortable interview experience, switching to a laptop or desktop is highly recommended."
        </p>

        <div className="space-y-3 mb-8">
           <button 
             onClick={handleDismiss}
             className="w-full py-4 bg-brand-amber text-brand-navy rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-amber/20"
           >
             Continue on Mobile
           </button>
           <p className="text-[10px] text-foreground/30 uppercase tracking-widest font-bold">
             Or open link on your computer
           </p>
        </div>
        
        <div className="flex items-center justify-center space-x-2 text-[10px] uppercase tracking-[0.2em] font-black text-foreground/20">
          <Layout className="w-3 h-3" />
          <span>Cuemath Hiring</span>
        </div>
      </div>
    </div>
  )
}
