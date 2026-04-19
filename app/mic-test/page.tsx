"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// The mic test is now embedded in the landing page wizard.
// Direct navigation to /mic-test redirects back to the start.
export default function MicTestPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/")
  }, [router])
  return null
}
