import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Quote } from "lucide-react"
import { getScoreColor } from "@/lib/constants"
import { DimensionScore } from "@/lib/types"

interface DimensionCardProps {
  title: string
  icon: string
  data: DimensionScore
}

export function DimensionCard({ title, icon, data }: DimensionCardProps) {
  const percentage = (data.score / 20) * 100
  const colors = getScoreColor(percentage)

  return (
    <Card className="overflow-hidden bg-card/40 backdrop-blur-xl border-border hover:shadow-lg transition-all duration-300">
      <div className="h-1.5 w-full" style={{ backgroundColor: colors.border }} />
      <CardContent className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl shadow-sm">{icon}</span>
            <h4 className="font-extrabold text-foreground tracking-tight">{title}</h4>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-black tracking-tighter" style={{ color: colors.text }}>{data.score}</span>
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">/ 20 Units</span>
          </div>
        </div>
        
        <Progress 
          value={percentage} 
          className="h-2.5 mb-6 rounded-full bg-muted shadow-inner" 
          indicatorClassName={`transition-all duration-1000 ${
            percentage >= 80 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" :
            percentage >= 60 ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" :
            percentage >= 40 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : 
            "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
          }`}
        />
        
        <p className="text-base text-foreground/80 leading-relaxed mb-6 font-light">
          {data.explanation}
        </p>
        
        {data.evidence_quote && (
          <div className="bg-muted/50 border border-border rounded-2xl p-5 pt-7 relative mt-2 group hover:bg-muted/80 transition-colors">
            <Quote className="w-5 h-5 text-brand-cyan/30 absolute top-3 left-3 rotate-180 transition-transform group-hover:scale-110" />
            <p className="text-[15px] italic text-muted-foreground pl-6 font-light leading-snug">
              "{data.evidence_quote}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>

  )
}
