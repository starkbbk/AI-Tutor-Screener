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
    <Card className="w-full max-w-lg mx-auto border-border bg-card/50 backdrop-blur-xl">
      <CardHeader className="text-center px-4 sm:px-6">
        <CardTitle className="text-2xl sm:text-3xl font-extrabold mb-1 text-foreground">Get Started</CardTitle>
        <CardDescription className="text-muted-foreground text-xs sm:text-sm">
          Enter your details to begin your Cuemath coaching journey
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-5 pt-2 sm:pt-4">
          <div className="space-y-3">
            <label htmlFor="name" className="text-sm font-bold text-foreground/70 ml-1 uppercase tracking-wider">
              Full Name
            </label>
            <Input
              id="name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-2xl bg-background border-border"
            />
          </div>
          <div className="space-y-3">
            <label htmlFor="email" className="text-sm font-bold text-foreground/70 ml-1 uppercase tracking-wider">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl bg-background border-border"
            />
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 animate-in shake">
              <p className="text-sm text-red-500 font-bold text-center">{error}</p>
            </div>
          )}
          
          <Button type="submit" size="lg" className="w-full mt-6 h-14 rounded-2xl font-black tracking-tight amber-button">
            Begin Assessment
          </Button>
        </form>
      </CardContent>
    </Card>

  )
}

