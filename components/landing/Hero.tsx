import Image from "next/image"

export function Hero() {
  return (
    <div className="text-center mb-10 mt-8">
      <div className="flex justify-center mb-8">
        <Image 
          src="/cuemath-logo.svg" 
          alt="Cuemath Logo" 
          width={180} 
          height={48} 
          priority
        />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
        Cuemath Tutor Screening
      </h1>
      <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
        Complete your interview in under 10 minutes. Just talk naturally — our AI interviewer will guide you through.
      </p>
    </div>
  )
}
