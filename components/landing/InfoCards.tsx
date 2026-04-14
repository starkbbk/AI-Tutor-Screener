import { Mic, Zap, Target } from "lucide-react"
import { motion } from "framer-motion"

export function InfoCards() {
  const steps = [
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Audio Check",
      description: "We'll verify your microphone quality, background noise levels, and browser permissions to ensure a crystal-clear teaching session.",
      accent: "text-brand-amber text-glow"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Live Interaction",
      description: "A dynamic 10-minute session where you'll explain core math concepts to our AI, demonstrating your pedagogical style and rapport.",
      accent: "text-brand-cyan text-glow-cyan"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Coach Matching",
      description: "Based on your performance, you'll be instantly classified into an elite Cuemath coach tier with a personalized certification roadmap.",
      accent: "text-green-400"
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8
      }
    }
  }

  return (
    <div className="mt-8 sm:mt-16 w-full max-w-5xl mx-auto space-y-8">
      <motion.h3 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.6 }}
        viewport={{ once: true }}
        className="text-center text-muted-foreground font-black tracking-[0.25em] uppercase text-[9px] sm:text-[10px] mb-4 sm:mb-8"
      >
        Selection Journey
      </motion.h3>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {steps.map((step, i) => (
          <motion.div 
            key={i} 
            variants={itemVariants}
            className="group glass-card p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 hover:shadow-2xl hover:bg-foreground/[0.04] border border-white/5"
          >
            <div className={`mb-6 sm:mb-8 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-foreground/5 flex items-center justify-center ${step.accent.split(' ')[0]} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
              {step.icon}
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-foreground mb-3 sm:mb-4 tracking-tighter uppercase">{step.title}</h4>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium opacity-80 group-hover:opacity-100 transition-opacity">
              {step.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

