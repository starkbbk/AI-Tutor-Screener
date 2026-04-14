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
    <Card className="w-full max-w-lg mx-auto border-white/5">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-extrabold mb-2">Get Started</CardTitle>
        <CardDescription>
          Enter your details to begin your MathFit coaching journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 p-2">
          <div className="space-y-3">
            <label htmlFor="name" className="text-sm font-semibold text-gray-300 ml-1">
              Full Name
            </label>
            <Input
              id="name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5"
            />
          </div>
          <div className="space-y-3">
            <label htmlFor="email" className="text-sm font-semibold text-gray-300 ml-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5"
            />
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-sm text-red-500 font-semibold text-center">{error}</p>
            </div>
          )}
          
          <Button type="submit" size="lg" className="w-full mt-4 font-bold tracking-wide">
            Begin Assessment
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

