"use client"

import { useEffect, useState } from "react"
import { getScoreColor } from "@/lib/constants"

export function ScoreRing({ score }: { score: number }) {
  const [mounted, setMounted] = useState(false)
  const colors = getScoreColor(score)

  useEffect(() => {
    setMounted(true)
  }, [])

  const circumference = 2 * Math.PI * 45 // radius is 45

  return (
    <div className="relative w-40 h-40 flex items-center justify-center animate-in zoom-in duration-1000">
      <svg className="w-full h-full transform -rotate-90 filter drop-shadow-sm" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/30"
        />
        {/* Progress circle */}
        {mounted && (
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={colors.border}
            strokeWidth="8"
            strokeLinecap="round"
            className="score-ring-animated"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: circumference,
              // Note: Animation handled in globals.css for smoother initial fill
              transition: "stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        )}
      </svg>
      
      <div className="absolute flex flex-col items-center justify-center group">
        <span className="text-5xl font-black tracking-tighter transition-transform group-hover:scale-110" style={{ color: colors.text }}>
          {score}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
          Index
        </span>
      </div>
    </div>

  )
}
