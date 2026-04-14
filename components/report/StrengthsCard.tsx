import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, TrendingUp } from "lucide-react"

export function StrengthsCard({ strengths, areasForImprovement }: { strengths: string[], areasForImprovement: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="border-emerald-500/10 shadow-xl bg-emerald-500/[0.03] dark:bg-emerald-500/5 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pb-5 border-b border-emerald-500/10 bg-emerald-500/[0.03]">
          <CardTitle className="text-emerald-600 dark:text-emerald-400 flex items-center text-xl font-black uppercase tracking-widest">
            <CheckCircle2 className="w-6 h-6 mr-3 text-emerald-500" /> Strengths
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 p-8">
          <ul className="space-y-4">
            {strengths.map((strength, i) => (
              <li key={i} className="flex items-start group">
                <span className="text-emerald-500 mr-4 mt-1 transition-transform group-hover:scale-125">✦</span>
                <span className="text-[17px] text-foreground font-light leading-relaxed">{strength}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-brand-amber/10 shadow-xl bg-brand-amber/[0.03] dark:bg-brand-amber/5 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pb-5 border-b border-brand-amber/10 bg-brand-amber/[0.03]">
          <CardTitle className="text-brand-amber flex items-center text-xl font-black uppercase tracking-widest">
            <TrendingUp className="w-6 h-6 mr-3 text-brand-amber" /> Improvements
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 p-8">
          <ul className="space-y-4">
            {areasForImprovement.map((area, i) => (
              <li key={i} className="flex items-start group">
                <span className="text-brand-amber mr-4 mt-1 transition-transform group-hover:scale-125">✦</span>
                <span className="text-[17px] text-foreground font-light leading-relaxed">{area}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>

  )
}
