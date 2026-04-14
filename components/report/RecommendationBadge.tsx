import { Badge } from "@/components/ui/badge"
import { getRecommendationColor } from "@/lib/constants"

export function RecommendationBadge({ recommendation }: { recommendation: string }) {
  const getBadgeStyles = (rec: string) => {
    switch (rec) {
      case 'Strong Recommend': 
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
      case 'Recommend': 
        return 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan'
      case 'Maybe': 
        return 'bg-brand-amber/10 border-brand-amber/30 text-brand-amber'
      case 'Not Recommended': 
        return 'bg-red-500/10 border-red-500/30 text-red-500'
      default: 
        return 'bg-muted border-border text-muted-foreground'
    }
  }

  const styles = getBadgeStyles(recommendation)

  return (
    <div className={`inline-flex flex-col items-center p-6 rounded-[2rem] border ${styles} shadow-sm backdrop-blur-sm transition-all hover:scale-105`}>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">
        AI DECISION
      </span>
      <div className="text-lg font-black tracking-tight px-4 py-1.5 rounded-full ring-1 ring-current/20">
        {recommendation}
      </div>
    </div>
  )
}

