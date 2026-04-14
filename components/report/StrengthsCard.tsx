import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, TrendingUp } from "lucide-react"

export function StrengthsCard({ strengths, areasForImprovement }: { strengths: string[], areasForImprovement: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-emerald-100 shadow-sm bg-emerald-50/30">
        <CardHeader className="pb-3 border-b border-emerald-100/50 bg-emerald-50/50">
          <CardTitle className="text-emerald-800 flex items-center text-lg">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" /> Key Strengths
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="space-y-3">
            {strengths.map((strength, i) => (
              <li key={i} className="flex items-start">
                <span className="text-emerald-500 mr-2 mt-0.5">•</span>
                <span className="text-sm text-gray-700 leading-snug">{strength}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-100 shadow-sm bg-amber-50/30">
        <CardHeader className="pb-3 border-b border-amber-100/50 bg-amber-50/50">
          <CardTitle className="text-amber-800 flex items-center text-lg">
            <TrendingUp className="w-5 h-5 mr-2 text-amber-600" /> Areas for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="space-y-3">
            {areasForImprovement.map((area, i) => (
              <li key={i} className="flex items-start">
                <span className="text-amber-500 mr-2 mt-0.5">•</span>
                <span className="text-sm text-gray-700 leading-snug">{area}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
