import Image from "next/image"

export function Hero() {
  return (
    <div className="text-center mb-12 mt-4 relative z-10">
      <div className="flex justify-center mb-10 transition-transform duration-500 hover:scale-105">
        <Image 
          src="/cuemath-logo.svg" 
          alt="Cuemath Logo" 
          width={180} 
          height={60} 

          className="opacity-100" // Removed the filters that turned it into a white blob
          priority
        />
      </div>

      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
        Shape the <span className="text-brand-amber text-glow">Future</span> of Math
      </h1>
      <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
        Join our elite community of Math coaches. Complete your AI-powered screening in <span className="text-white font-medium">10 minutes</span>.
      </p>
    </div>
  )
}

