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
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: colors.border }} />
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{icon}</span>
            <h4 className="font-semibold text-gray-900">{title}</h4>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold" style={{ color: colors.text }}>{data.score}</span>
            <span className="text-xs text-gray-500 font-medium">/ 20</span>
          </div>
        </div>
        
        <Progress 
          value={percentage} 
          className="h-2 mb-4" 
          indicatorClassName={`transition-all duration-1000 ${
            percentage >= 80 ? "bg-emerald-500" :
            percentage >= 60 ? "bg-blue-500" :
            percentage >= 40 ? "bg-amber-500" : "bg-red-500"
          }`}
        />
        
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {data.explanation}
        </p>
        
        {data.evidence_quote && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 pt-4 relative mt-2">
            <Quote className="w-4 h-4 text-gray-300 absolute top-2 left-2 rotate-180" />
            <p className="text-sm italic text-gray-600 pl-4">{data.evidence_quote}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
