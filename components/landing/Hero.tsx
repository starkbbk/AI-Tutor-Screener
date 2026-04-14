import Image from "next/image"

export function Hero() {
  return (
    <div className="text-center mb-12 mt-4 relative z-10">


      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
        Shape the <span className="text-brand-amber">Future</span> of Math
      </h1>
      <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
        Join our elite community of Math coaches. Complete your AI-powered screening in <span className="font-semibold text-green-600 dark:text-green-400">10 minutes</span>.
      </p>

    </div>
  )
}

