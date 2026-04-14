"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Download, RefreshCw, Share2, Loader2, AlertCircle } from "lucide-react"

import { useInterview } from "@/context/InterviewContext"
import { Button } from "@/components/ui/button"
import { ScoreRing } from "@/components/report/ScoreRing"
import { RecommendationBadge } from "@/components/report/RecommendationBadge"
import { DimensionCard } from "@/components/report/DimensionCard"
import { StrengthsCard } from "@/components/report/StrengthsCard"
import { TranscriptAccordion } from "@/components/report/TranscriptAccordion"
import { formatDuration, formatDate, generatePDF } from "@/lib/utils"
import { DIMENSION_LABELS, DIMENSION_ICONS } from "@/lib/constants"
import { AssessmentResult } from "@/lib/types"

export default function ReportPage() {
  const router = useRouter()
  const { state, setAssessment, setStatus, reset } = useInterview()
  const [mounted, setMounted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)

    // Ensure we have a completed interview
    if (!state.candidate || state.interviewStatus !== 'completed') {
      router.push("/")
      return
    }

    // Generate assessment if we don't have one yet
    if (!state.assessment && !isGenerating && !error) {
      generateAssessment()
    }
  }, [state, router, isGenerating, error])

  const generateAssessment = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const duration = state.interviewStartTime && state.interviewEndTime 
        ? formatDuration(state.interviewStartTime, state.interviewEndTime)
        : "Unknown"

      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: state.conversationHistory,
          candidateName: state.candidate?.name,
          duration
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate assessment')
      }

      setAssessment(data.assessment)

      // Save to localStorage just in case they refresh
      try {
        localStorage.setItem(`cuemath_assessment_${state.candidate?.email}`, JSON.stringify({
          candidate: state.candidate,
          history: state.conversationHistory,
          assessment: data.assessment,
          date: new Date().toISOString()
        }))
      } catch (e) {
        console.error("Failed to save to localStorage", e)
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while generating the report.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      // Small delay just to ensure the UI is fully rendered without loading states
      await generatePDF('report-container', `Cuemath_Assessment_${state.candidate?.name.replace(/\\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF Generation failed', err)
      alert('Failed to generate PDF. Please try printing the page instead.')
    }
  }

  const handleStartNew = () => {
    reset()
    router.push("/")
  }

  const handleShare = () => {
    // Just a stub for UI
    alert("Share link copied to clipboard")
  }

  if (!mounted || !state.candidate || state.interviewStatus !== 'completed') return <div className="min-h-screen bg-gray-50" />

  if (isGenerating || !state.assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Analyzing Interview</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Our AI evaluator is reviewing {state.candidate.name}'s responses across 5 primary dimensions to generate a comprehensive report.
          </p>
          {error && (
            <div className="text-red-500 bg-red-50 border border-red-100 p-3 rounded-lg text-sm w-full flex items-start text-left">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const assessment = state.assessment

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Main Report Container (Target for PDF) */}
        <div id="report-container" className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-8 border-b border-gray-100 bg-white">
            <div className="flex justify-between items-start mb-6">
              <Image src="/cuemath-logo.svg" alt="Cuemath" width={140} height={40} />
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900">Tutor Assessment Report</h1>
                <p className="text-sm text-gray-500 mt-1">Generated by Cuemath AI Evaluator</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Candidate Name</p>
                <p className="font-semibold text-gray-900">{state.candidate.name}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Email Address</p>
                <p className="font-semibold text-gray-900">{state.candidate.email}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Date</p>
                <p className="font-semibold text-gray-900">{formatDate(new Date())}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Duration</p>
                <p className="font-semibold text-gray-900">
                  {state.interviewStartTime && state.interviewEndTime 
                    ? formatDuration(state.interviewStartTime, state.interviewEndTime)
                    : "~10 min"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Top row: Score + Recommendation + Summary */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-stretch mb-10">
              <div className="flex flex-col space-y-4 items-center min-w-48">
                <ScoreRing score={assessment.overall_score} />
                <RecommendationBadge recommendation={assessment.recommendation} />
              </div>
              
              <div className="flex-1 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Executive Summary</h3>
                <p className="text-gray-700 leading-relaxed text-[15px]">
                  {assessment.summary}
                </p>
              </div>
            </div>

            {/* Strengths / Areas for Improvement */}
            <div className="mb-10">
              <StrengthsCard 
                strengths={assessment.strengths} 
                areasForImprovement={assessment.areas_for_improvement} 
              />
            </div>

            {/* Dimension Breakdown */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-6">Dimension Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Object.entries(assessment.dimensions) as [string, any][]).map(([key, data]) => (
                  <DimensionCard 
                    key={key} 
                    title={DIMENSION_LABELS[key] || key} 
                    icon={DIMENSION_ICONS[key] || "⭐"} 
                    data={data} 
                  />
                ))}
              </div>
            </div>

            {/* Transcript Accordion */}
            <div className="mt-8 html2canvas-ignore">
               <TranscriptAccordion history={state.conversationHistory} />
            </div>
          </div>
        </div>

        {/* Global Action Buttons (Not printed to PDF) */}
        <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <Button variant="outline" className="text-gray-600 gap-2 font-semibold" onClick={handleStartNew}>
            <RefreshCw className="w-4 h-4" /> Start New Interview
          </Button>
          
          <div className="flex gap-3">
            <Button variant="secondary" className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold" onClick={handleShare}>
              <Share2 className="w-4 h-4" /> Share Link
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 font-semibold" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
