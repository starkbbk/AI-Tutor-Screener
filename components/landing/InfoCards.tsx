import { Mic, Zap, Target } from "lucide-react"

export function InfoCards() {
  const steps = [
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Audio Check",
      description: "Quick 30-sec mic & surroundings test",
      accent: "text-brand-amber text-glow"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Live Interaction",
      description: "Talk through math concepts naturally",
      accent: "text-brand-cyan text-glow-cyan"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Coach Matching",
      description: "Get assigned your elite coach tier",
      accent: "text-green-400"
    }
  ]

  return (
    <div className="mt-16 w-full max-w-5xl mx-auto space-y-6">
      <h3 className="text-center text-gray-500 font-semibold tracking-[0.2em] uppercase text-xs mb-8">
        Selection Journey
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step, i) => (
          <div 
            key={i} 
            className="group glass-card p-6 rounded-[2rem] transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1"
          >
            <div className={`mb-4 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${step.accent} transition-transform duration-500 group-hover:scale-110`}>
              {step.icon}
            </div>
            <h4 className="text-xl font-bold text-white mb-2">{step.title}</h4>
            <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

