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
import { ThemeToggle } from "@/components/ui/theme-toggle"
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

  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    try {
      // Small delay just to ensure the UI is fully rendered without loading states
      await generatePDF('report-container', `Cuemath_Assessment_${state.candidate?.name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF Generation failed', err)
      alert('Failed to generate PDF. Please try printing the page instead.')
    } finally {
      setIsDownloading(false)
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

  if (!mounted || !state.candidate || state.interviewStatus !== 'completed') return <div className="min-h-screen bg-background" />

  if (isGenerating || !state.assessment) {
    return (
      <div className="min-h-screen bg-background cuemath-grid flex flex-col items-center justify-center p-6">
        <div className="glass-card p-12 rounded-[3rem] shadow-2xl flex flex-col items-center max-w-lg w-full text-center">
          <Loader2 className="w-16 h-16 text-brand-amber animate-spin mb-10" />
          <h2 className="text-4xl font-extrabold text-foreground mb-4 tracking-tight">ANALYZING YOUR INTERVIEW...</h2>
          <p className="text-muted-foreground mb-10 text-lg font-light leading-relaxed">
            Please wait while we review <span className="text-brand-navy dark:text-white font-bold">{state.candidate.name}</span>'s assessment across all teaching dimensions.
          </p>
          {error && (
            <div className="text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-sm w-full flex items-start text-left animate-in shake">
              <AlertCircle className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const assessment = state.assessment

  return (
    <div className="min-h-screen bg-background cuemath-grid py-20 px-4 sm:px-6 relative selection:bg-brand-amber selection:text-brand-navy">
      {/* Background depth glows (reduced for light mode) */}
      <div className="absolute top-[5%] left-[10%] w-[40%] h-[40%] bg-brand-amber/[0.03] dark:bg-brand-amber/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-brand-cyan/[0.03] dark:bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 relative z-10">
        
        {/* Main Report Container (Target for PDF) */}
        <div id="report-container" className="glass-card rounded-[3.5rem] shadow-2xl overflow-hidden border-border bg-card/40 backdrop-blur-3xl ring-1 ring-border">
          
          {/* Header */}
          <div className="p-12 border-b border-border bg-muted/30">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-8 md:space-y-0 mb-12">
              <Image src="/cuemath-logo.svg" alt="Cuemath" width={200} height={60} />
              <div className="text-center md:text-right flex flex-col items-center md:items-end space-y-4">
                <ThemeToggle />
                <div>
                  <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">Coach Result</h1>
                  <p className="text-brand-amber text-xs font-black tracking-[0.3em] uppercase mt-2 opacity-80">PRO Assessment Engine</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 p-8 bg-background/50 rounded-[2rem] border border-border text-sm shadow-inner">
              <div className="space-y-1.5">
                <p className="text-muted-foreground uppercase tracking-widest text-[9px] font-black opacity-60">Candidate</p>
                <p className="font-extrabold text-foreground text-lg tracking-tight">{state.candidate.name}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-muted-foreground uppercase tracking-widest text-[9px] font-black opacity-60">Authentication</p>
                <p className="font-extrabold text-foreground text-sm truncate opacity-80">{state.candidate.email}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-muted-foreground uppercase tracking-widest text-[9px] font-black opacity-60">Evaluation Date</p>
                <p className="font-extrabold text-foreground text-lg tracking-tight">{formatDate(new Date())}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-muted-foreground uppercase tracking-widest text-[9px] font-black opacity-60">Interaction</p>
                <p className="font-extrabold text-brand-cyan text-lg tracking-tight">
                  {state.interviewStartTime && state.interviewEndTime 
                    ? formatDuration(state.interviewStartTime, state.interviewEndTime)
                    : "~10:00"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-12 space-y-20">
            {/* Top row: Score + Recommendation + Summary */}
            <div className="flex flex-col lg:flex-row gap-16 items-center lg:items-stretch">
              <div className="flex flex-col space-y-8 items-center lg:min-w-72">
                <ScoreRing score={assessment.overall_score} />
                <RecommendationBadge recommendation={assessment.recommendation} />
              </div>
              
              <div className="flex-1 space-y-8 bg-muted/30 p-10 rounded-[2.5rem] border border-border shadow-sm">
                <h3 className="text-xs font-black text-foreground/40 tracking-[0.3em] uppercase border-b border-border pb-6 flex items-center">
                  <span className="w-3 h-3 rounded-full bg-brand-amber mr-4 shadow-lg shadow-brand-amber/20" />
                  Cognitive Summary
                </h3>
                <p className="text-foreground leading-relaxed text-xl font-light italic">
                  "{assessment.summary}"
                </p>
              </div>
            </div>

            {/* Strengths / Areas for Improvement */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <StrengthsCard 
                strengths={assessment.strengths} 
                areasForImprovement={assessment.areas_for_improvement} 
              />
            </div>

            {/* Dimension Breakdown */}
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <h3 className="text-xs font-black text-foreground/40 tracking-[0.3em] uppercase border-b border-border pb-6 flex items-center">
                <span className="w-3 h-3 rounded-full bg-brand-cyan mr-4 shadow-lg shadow-brand-cyan/20" />
                Dimensional Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
            <div className="html2canvas-ignore pt-12 border-t border-border mt-10">
               <TranscriptAccordion history={state.conversationHistory} />
            </div>
          </div>
        </div>

        {/* Global Action Buttons (Not printed to PDF) */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center glass-card p-8 rounded-[2.5rem] border-border shadow-xl">
          <Button variant="outline" className="w-full md:w-auto text-muted-foreground hover:text-foreground border-border hover:bg-muted rounded-2xl h-14 px-8 font-bold" onClick={handleStartNew} disabled={isDownloading}>
            <RefreshCw className="w-4 h-4 mr-3" /> New Assessment
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto rounded-2xl h-14 px-10 font-bold" onClick={handleShare} disabled={isDownloading}>
              <Share2 className="w-4 h-4 mr-3" /> Share Path
            </Button>
            <Button className="w-full sm:w-auto rounded-2xl h-14 px-12 font-black amber-button shadow-xl shadow-brand-amber/10" onClick={handleDownloadPdf} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-3 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-3" /> Export PDF
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
