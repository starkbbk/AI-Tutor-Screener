import { Badge } from "@/components/ui/badge"
import { getRecommendationColor } from "@/lib/constants"

export function RecommendationBadge({ recommendation }: { recommendation: string }) {
  const getBadgeVariant = (rec: string) => {
    switch (rec) {
      case 'Strong Recommend': return 'success'
      case 'Recommend': return 'default'
      case 'Maybe': return 'warning'
      case 'Not Recommended': return 'destructive'
      default: return 'secondary'
    }
  }

  const colors = getRecommendationColor(recommendation)

  return (
    <div 
      className="inline-flex flex-col items-center p-4 rounded-xl border-2" 
      style={{ 
        backgroundColor: colors.bg, 
        borderColor: colors.border 
      }}
    >
      <span className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: colors.text }}>
        Decision
      </span>
      <Badge variant={getBadgeVariant(recommendation)} className="text-sm px-3 py-1 shadow-sm">
        {recommendation}
      </Badge>
    </div>
  )
}
