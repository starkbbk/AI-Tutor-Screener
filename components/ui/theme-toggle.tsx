"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (newTheme: string, e: React.MouseEvent) => {
    if (newTheme === resolvedTheme) return

    // Fallback for browsers that don't support View Transitions
    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setTheme(newTheme)
      return
    }

    const isReverse = newTheme === "light"
    if (isReverse) {
      document.documentElement.classList.add("theme-transition-reverse")
    }

    const { clientX: x, clientY: y } = e
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme)
      })
    })

    transition.ready.then(() => {
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      document.documentElement.animate(
        {
          clipPath: isReverse
            ? [
                `circle(${radius}px at ${x}px ${y}px)`,
                `circle(0px at ${x}px ${y}px)`,
              ]
            : [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
        },
        {
          duration: 700,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: isReverse
            ? "::view-transition-old(root)"
            : "::view-transition-new(root)",
        }
      )
    })

    transition.finished.finally(() => {
      document.documentElement.classList.remove("theme-transition-reverse")
    })
  }

  if (!mounted) return null

  return (
    <div className="flex items-center bg-muted/90 p-1 rounded-xl border border-border/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-all duration-500">
      <button
        onClick={(e) => handleThemeChange("light", e)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 relative z-10 ${
          resolvedTheme === "light" 
            ? "text-brand-navy" 
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {resolvedTheme === "light" && (
          <div className="absolute inset-0 bg-white dark:bg-brand-amber rounded-lg -z-10 animate-in fade-in duration-300 shadow-md ring-1 ring-black/5" />
        )}
        <Sun className={`h-4 w-4 transition-transform duration-500 ${resolvedTheme === "light" ? "rotate-0 scale-110" : "-rotate-90 scale-100"}`} />
        <span className="text-[10px] font-black uppercase tracking-[0.15em]">Light</span>
      </button>

      <button
        onClick={(e) => handleThemeChange("dark", e)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 relative z-10 ${
          resolvedTheme === "dark" 
            ? "text-white" 
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {resolvedTheme === "dark" && (
          <div className="absolute inset-0 bg-brand-navy rounded-lg -z-10 animate-in fade-in duration-300 shadow-md ring-1 ring-white/10" />
        )}
        <Moon className={`h-4 w-4 transition-transform duration-500 ${resolvedTheme === "dark" ? "rotate-0 scale-110" : "rotate-90 scale-100"}`} />
        <span className="text-[10px] font-black uppercase tracking-[0.15em]">Dark</span>
      </button>
    </div>
  )
}
