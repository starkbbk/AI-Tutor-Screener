"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-6 right-6 w-12 h-12 rounded-full glass-card border-border shadow-2xl z-[100] hover:scale-110 active:scale-95 transition-all duration-300"
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
    >
      {resolvedTheme === "light" ? (
        <Moon className="h-5 w-5 text-brand-navy" />
      ) : (
        <Sun className="h-5 w-5 text-brand-amber" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

