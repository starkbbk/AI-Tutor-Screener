import { Mic, Zap, Target, User } from "lucide-react"
import { motion } from "framer-motion"

export function InfoCards() {
  const steps = [
    {
      icon: <User className="h-6 w-6" />,
      title: "Application",
      description: "Tell us about your background in under 2 minutes. No long forms. Just the essentials.",
      accent: "text-[#FFB800]"
    },
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Audio Check",
      description: "Quick mic test to ensure crystal-clear audio. No setup headaches.",
      accent: "text-[#00D1FF]"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Live Interaction",
      description: "A real-time AI interview. Voice-first experience with optional text fallback.",
      accent: "text-brand-cyan text-glow-cyan"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Coach Matching",
      description: "Get an instant, evidence-based evaluation. No bias. Just data.",
      accent: "text-green-400"
    }
  ]

  return (
    <div className="mt-8 sm:mt-16 w-full max-w-[85rem] mx-auto space-y-8 px-4">
      <h3 
        className="text-center text-muted-foreground font-black tracking-[0.25em] uppercase text-[9px] sm:text-[10px] mb-4 sm:mb-6 opacity-60"
      >
        Selection Journey
      </h3>
      
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {steps.map((step, i) => (
          <motion.div 
            key={i} 
            whileHover={{ 
              scale: 1.02,
              translateY: -5,
              boxShadow: "0 25px 50px -12px rgba(255,184,0,0.12), 0 15px 30px -15px rgba(0,0,0,0.3)"
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="group relative glass-card p-7 rounded-[2.5rem] overflow-hidden transition-all duration-500 border border-white/5 cursor-default min-h-[220px] flex flex-col justify-start"
          >
            {/* Glass Shine sweep effect */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="absolute -inset-[100%] group-hover:animate-shine bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent skew-x-12 transition-all duration-1000" />
            </div>

            {/* Animated border glow */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FFB800]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FFB800]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-[#FFB800]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-[#FFB800]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <div className={`mb-5 w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center ${step.accent.split(' ')[0]} transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-[#FFB800]/10`}>
                {step.icon}
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-foreground mb-3 tracking-tighter uppercase leading-tight">{step.title}</h4>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

