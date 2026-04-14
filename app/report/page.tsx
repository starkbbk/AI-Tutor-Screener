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

  if (!mounted || !state.candidate || state.interviewStatus !== 'completed') return <div className="min-h-screen bg-brand-black" />

  if (isGenerating || !state.assessment) {
    return (
      <div className="min-h-screen bg-brand-black cuemath-grid flex flex-col items-center justify-center p-6">
        <div className="glass-card p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-lg w-full text-center border-white/10">
          <Loader2 className="w-16 h-16 text-brand-amber animate-spin mb-8" />
          <h2 className="text-3xl font-bold text-white mb-3">Analyzing Interview</h2>
          <p className="text-gray-400 mb-8 text-lg font-light leading-relaxed">
            Our AI evaluator is meticulously reviewing <span className="text-white font-medium">{state.candidate.name}</span>'s responses across 5 core dimensions.
          </p>
          {error && (
            <div className="text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-sm w-full flex items-start text-left">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const assessment = state.assessment

  return (
    <div className="min-h-screen bg-brand-black cuemath-grid py-20 px-4 sm:px-6 relative selection:bg-brand-amber selection:text-brand-black">
      {/* Background depth glows */}
      <div className="absolute top-[5%] left-[10%] w-[40%] h-[40%] bg-brand-amber/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
        
        {/* Main Report Container (Target for PDF) */}
        <div id="report-container" className="glass-card rounded-[3rem] shadow-2xl overflow-hidden border-white/5 ring-1 ring-white/10 bg-white/5 backdrop-blur-3xl">
          
          {/* Header */}
          <div className="p-10 border-b border-white/10 bg-white/5">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-6 md:space-y-0 mb-10">
              <Image src="/cuemath-logo.svg" alt="Cuemath" width={180} height={50} className="brightness-0 invert" />
              <div className="text-center md:text-right">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Coach Assessment</h1>
                <p className="text-brand-amber text-sm font-bold tracking-[0.2em] uppercase mt-2 opacity-80">AI EVALUATION ENGINE v2.0</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-black/40 rounded-3xl border border-white/5 text-sm">
              <div className="space-y-1">
                <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Candidate</p>
                <p className="font-semibold text-white text-base">{state.candidate.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Email</p>
                <p className="font-semibold text-white text-base truncate">{state.candidate.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Date</p>
                <p className="font-semibold text-white text-base">{formatDate(new Date())}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Duration</p>
                <p className="font-semibold text-brand-cyan text-base">
                  {state.interviewStartTime && state.interviewEndTime 
                    ? formatDuration(state.interviewStartTime, state.interviewEndTime)
                    : "~10 min"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-16">
            {/* Top row: Score + Recommendation + Summary */}
            <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-stretch">
              <div className="flex flex-col space-y-6 items-center lg:min-w-64">
                <ScoreRing score={assessment.overall_score} />
                <RecommendationBadge recommendation={assessment.recommendation} />
              </div>
              
              <div className="flex-1 space-y-6 bg-white/5 p-8 rounded-[2rem] border border-white/10 ring-1 ring-white/5">
                <h3 className="text-xl font-bold text-white tracking-wide border-b border-white/5 pb-4 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-brand-amber mr-3" />
                  Executive Summary
                </h3>
                <p className="text-gray-300 leading-relaxed text-lg font-light">
                  {assessment.summary}
                </p>
              </div>
            </div>

            {/* Strengths / Areas for Improvement */}
            <div className="">
              <StrengthsCard 
                strengths={assessment.strengths} 
                areasForImprovement={assessment.areas_for_improvement} 
              />
            </div>

            {/* Dimension Breakdown */}
            <div className="space-y-8">
              <h3 className="text-xl font-bold text-white tracking-wide border-b border-white/5 pb-4 flex items-center">
                <span className="w-2 h-2 rounded-full bg-brand-cyan mr-3" />
                Performance Dimensions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
            <div className="html2canvas-ignore pt-10 border-t border-white/5">
               <TranscriptAccordion history={state.conversationHistory} />
            </div>
          </div>
        </div>

        {/* Global Action Buttons (Not printed to PDF) */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center glass-card p-6 rounded-[2rem] border-white/5">
          <Button variant="outline" className="w-full md:w-auto text-gray-400 hover:text-white border-white/10 hover:bg-white/5 rounded-xl px-6" onClick={handleStartNew}>
            <RefreshCw className="w-4 h-4 mr-2" /> New Assessment
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto rounded-xl px-8" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" /> Share Result
            </Button>
            <Button className="w-full sm:w-auto rounded-xl px-8 font-extrabold" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" /> Download Report
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
