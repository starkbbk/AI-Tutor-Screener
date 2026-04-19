import Image from "next/image"

export function Hero() {
  return (
    <div className="text-center mb-4 sm:mb-6 mt-0 relative z-10">


      <h1 className="text-2xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 sm:mb-8 leading-[1.1] uppercase">
        AI-powered tutor screening in <br /> <span className="text-brand-amber text-nowrap">10 minutes</span>
      </h1>
      <p className="text-sm md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed px-2 md:px-0 opacity-80">
        Screen tutors instantly with AI voice interviews. <br className="hidden md:block" /> 
        No scheduling. No human interviewer. Just fast, consistent evaluation.
      </p>

    </div>
  )
}

