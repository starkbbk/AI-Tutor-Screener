"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex items-center bg-muted/30 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 shadow-inner group transition-all duration-500 hover:border-brand-amber/30">
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 relative z-10 ${
          resolvedTheme === "light" 
            ? "text-brand-navy shadow-lg" 
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {resolvedTheme === "light" && (
          <div className="absolute inset-0 bg-white dark:bg-brand-amber rounded-xl -z-10 animate-in fade-in zoom-in duration-300 shadow-sm" />
        )}
        <Sun className={`h-4 w-4 transition-transform duration-500 ${resolvedTheme === "light" ? "rotate-0 scale-110" : "-rotate-90 scale-100"}`} />
        <span className="text-[10px] font-black uppercase tracking-[0.15em]">Light</span>
      </button>

      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 relative z-10 ${
          resolvedTheme === "dark" 
            ? "text-white shadow-lg" 
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {resolvedTheme === "dark" && (
          <div className="absolute inset-0 bg-brand-navy rounded-xl -z-10 animate-in fade-in zoom-in duration-300 shadow-sm" />
        )}
        <Moon className={`h-4 w-4 transition-transform duration-500 ${resolvedTheme === "dark" ? "rotate-0 scale-110" : "rotate-90 scale-100"}`} />
        <span className="text-[10px] font-black uppercase tracking-[0.15em]">Dark</span>
      </button>
    </div>
  )
}
