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
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
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
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: circumference - (score / 100) * circumference,
              transition: "stroke-dashoffset 1.5s ease-out",
            }}
          />
        )}
      </svg>
      
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: colors.text }}>
          {score}
        </span>
        <span className="text-xs font-medium text-gray-500">/ 100</span>
      </div>
    </div>
  )
}
