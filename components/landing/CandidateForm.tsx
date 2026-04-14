"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useInterview } from "@/context/InterviewContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function CandidateForm() {
  const router = useRouter()
  const { setCandidate } = useInterview()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError("Please fill in both name and email.")
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.")
      return
    }
    
    setCandidate({ name, email })
    router.push("/mic-test")
  }

  return (
    <Card className="w-full max-w-lg mx-auto border-border bg-card/60 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-500 ease-out focus-within:scale-[1.02] focus-within:bg-card/80 focus-within:shadow-brand-amber/10 focus-within:ring-1 focus-within:ring-brand-amber/20">
      {/* Subtle internal glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-amber/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <CardHeader className="text-center px-6 sm:px-10 pt-10 sm:pt-14 pb-4 sm:pb-8">
        <CardTitle className="text-3xl sm:text-4xl font-black mb-2 text-foreground tracking-tighter uppercase">Get Started</CardTitle>
        <CardDescription className="text-muted-foreground text-xs sm:text-sm font-medium max-w-[85%] mx-auto leading-relaxed">
          Enter your details to begin your Cuemath coaching journey
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-6 sm:px-10 pb-10 sm:pb-16">
        <form onSubmit={handleSubmit} className="space-y-6 pt-2 sm:pt-4">
          <div className="relative group/field">
            <Input
              id="name"
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="peer h-16 sm:h-20 px-6 pt-6 rounded-2xl bg-background/50 border-border focus:border-brand-amber focus:ring-4 focus:ring-brand-amber/10 transition-all text-base sm:text-lg font-bold"
            />
            <label
              htmlFor="name"
              className="absolute left-6 top-3 text-[10px] font-black text-brand-amber uppercase tracking-[0.2em] transition-all transform pointer-events-none
                peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:opacity-70
                peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-brand-amber peer-focus:opacity-100"
            >
              Full Name
            </label>
          </div>

          <div className="relative group/field">
            <Input
              id="email"
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="peer h-16 sm:h-20 px-6 pt-6 rounded-2xl bg-background/50 border-border focus:border-brand-amber focus:ring-4 focus:ring-brand-amber/10 transition-all text-base sm:text-lg font-bold"
            />
            <label
              htmlFor="email"
              className="absolute left-6 top-3 text-[10px] font-black text-brand-amber uppercase tracking-[0.2em] transition-all transform pointer-events-none
                peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:opacity-70
                peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:text-brand-amber peer-focus:opacity-100"
            >
              Email Address
            </label>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 animate-in shake">
              <p className="text-sm text-red-500 font-bold text-center flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
                {error}
              </p>
            </div>
          )}
          
          <Button type="submit" size="lg" className="w-full mt-10 h-16 sm:h-20 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl tracking-tighter uppercase amber-button shadow-2xl shadow-brand-amber/20 hover:scale-[1.02] active:scale-95 transition-all">
            BEGIN AI INTERVIEW
          </Button>
        </form>
      </CardContent>
    </Card>

  )
}

