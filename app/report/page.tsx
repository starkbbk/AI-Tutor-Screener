"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Download, RefreshCw, Share2, Loader2, AlertCircle, LayoutDashboard, XCircle } from "lucide-react"

import { useInterview } from "@/context/InterviewContext"
import { Button } from "@/components/ui/button"
import { ScoreRing } from "@/components/report/ScoreRing"
import { RecommendationBadge } from "@/components/report/RecommendationBadge"
import { DimensionCard } from "@/components/report/DimensionCard"
import { StrengthsCard } from "@/components/report/StrengthsCard"
import { TranscriptAccordion } from "@/components/report/TranscriptAccordion"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn, formatDuration, formatDate, generatePDF } from "@/lib/utils"
import { DIMENSION_LABELS, DIMENSION_ICONS } from "@/lib/constants"
import { AssessmentResult } from "@/lib/types"

export default function ReportPage() {
  const router = useRouter()
  const { state, setAssessment, setStatus, reset } = useInterview()
  const [mounted, setMounted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDownloaded, setIsDownloaded] = useState(false)

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
    setIsDownloaded(false)
    const filename = `Cuemath_Assessment_${state.candidate?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    
    try {
      // 1. Try Direct PDF Generation via html2canvas-pro + jsPDF
      await generatePDF('report-content', filename)
      setIsDownloaded(true)
      setTimeout(() => setIsDownloaded(false), 3000)
    } catch (err) {
      console.error('Direct PDF Generation failed, falling back to window.print():', err)
      
      // 2. Fallback to Browser Print-to-PDF
      // Hide buttons manually just in case media queries are slow
      const noPrintElements = document.querySelectorAll('.no-print');
      noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');
      
      window.print();
      
      // Restore elements
      setTimeout(() => {
        noPrintElements.forEach(el => (el as HTMLElement).style.display = '');
      }, 1000);
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
    <div className="min-h-screen bg-background cuemath-grid py-10 sm:py-20 px-4 sm:px-6 relative selection:bg-brand-amber selection:text-brand-navy">
      {/* Background depth glows (reduced for light mode) */}
      <div className="absolute top-[5%] left-[10%] w-[40%] h-[40%] bg-brand-amber/[0.03] dark:bg-brand-amber/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-brand-cyan/[0.03] dark:bg-brand-cyan/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 relative z-10">
        
        {/* Main Report Container */}
        <div id="report-content" className="glass-card rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl overflow-hidden border-border bg-card/40 backdrop-blur-3xl ring-1 ring-border">
          
          {/* Header */}
          <div className="p-6 sm:p-12 border-b border-border bg-muted/30">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-6 md:space-y-0 mb-8 sm:mb-12 text-center md:text-left">
              <Image src="/cuemath-logo.svg" alt="Cuemath" width={160} height={40} className="sm:w-[200px] sm:h-[60px]" />
              <div className="text-center md:text-right flex flex-col items-center md:items-end space-y-4">
                <div className="no-print flex items-center space-x-3 sm:space-x-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] sm:text-xs font-black text-muted-foreground hover:text-brand-amber hover:bg-brand-amber/5 px-2 sm:px-4 h-8 sm:h-10 rounded-lg sm:rounded-xl border border-border/50 flex items-center uppercase tracking-widest transition-all"
                    onClick={handleStartNew}
                  >
                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> 
                    <span className="hidden xs:inline">Exit</span>
                  </Button>
                  <ThemeToggle />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tighter uppercase">Coach Result</h1>
                  <p className="text-brand-amber text-[9px] sm:text-xs font-black tracking-[0.3em] uppercase mt-1 sm:mt-2 opacity-80">PRO Assessment Engine</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 p-4 sm:p-8 bg-background/50 rounded-2xl sm:rounded-[2rem] border border-border text-xs sm:text-sm shadow-inner">
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[9px] font-black opacity-60">Candidate</p>
                <p className="font-extrabold text-foreground text-base sm:text-lg tracking-tight">{state.candidate.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[9px] font-black opacity-60">Interview Mode</p>
                <p className={cn(
                  "font-black uppercase tracking-wider text-[10px] sm:text-xs px-2 py-0.5 rounded-full border inline-block",
                  state.useFallbackMode 
                    ? "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20" 
                    : "bg-brand-amber/10 text-brand-amber border-brand-amber/20"
                )}>
                  {state.useFallbackMode ? "Interactive Chat" : "Voice Mode"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[9px] font-black opacity-60">Authentication</p>
                <p className="font-extrabold text-foreground text-xs sm:text-sm truncate opacity-80">{state.candidate.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[9px] font-black opacity-60">Evaluation Date</p>
                <p className="font-extrabold text-foreground text-base sm:text-lg tracking-tight">{formatDate(new Date())}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[9px] font-black opacity-60">Interaction</p>
                <p className="font-extrabold text-brand-cyan text-base sm:text-lg tracking-tight">
                  {state.interviewStartTime && state.interviewEndTime 
                    ? formatDuration(state.interviewStartTime, state.interviewEndTime)
                    : "~10:00"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-12 space-y-12 sm:space-y-20">
            {/* Top row: Score + Recommendation + Summary */}
            <div className="flex flex-col lg:flex-row gap-8 sm:gap-16 items-center lg:items-stretch">
              <div className="flex flex-col space-y-6 sm:space-y-8 items-center lg:min-w-72">
                <ScoreRing score={assessment.overall_score} />
                <RecommendationBadge recommendation={assessment.recommendation} />
              </div>
              
              <div className="flex-1 space-y-4 sm:space-y-8 bg-muted/30 p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border border-border shadow-sm">
                <h3 className="text-[10px] sm:text-xs font-black text-foreground/40 tracking-[0.2em] sm:tracking-[0.3em] uppercase border-b border-border pb-4 sm:pb-6 flex items-center">
                  <span className="w-2.5 h-2.5 sm:w-3 h-3 rounded-full bg-brand-amber mr-3 sm:mr-4 shadow-lg shadow-brand-amber/20" />
                  Cognitive Summary
                </h3>
                <p className="text-foreground leading-relaxed text-lg sm:text-xl font-light italic">
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
            <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <h3 className="text-[10px] sm:text-xs font-black text-foreground/40 tracking-[0.2em] sm:tracking-[0.3em] uppercase border-b border-border pb-4 sm:pb-6 flex items-center">
                <span className="w-2.5 h-2.5 sm:w-3 h-3 rounded-full bg-brand-cyan mr-3 sm:mr-4 shadow-lg shadow-brand-cyan/20" />
                Dimensional Analytics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
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
            <div className="html2canvas-ignore pt-8 sm:pt-12 border-t border-border mt-6 sm:mt-10">
               <TranscriptAccordion history={state.conversationHistory} />
            </div>
          </div>
        </div>

        {/* Global Action Buttons (Not printed to PDF) */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 justify-between items-center glass-card p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border-border shadow-xl no-print">
          <Button variant="outline" className="hidden sm:flex w-full md:w-auto text-muted-foreground hover:text-foreground border-border hover:bg-muted rounded-xl sm:rounded-2xl h-12 sm:h-14 px-8 font-bold text-sm sm:text-base" onClick={handleStartNew} disabled={isDownloading}>
            <RefreshCw className="w-4 h-4 mr-3" /> New Assessment
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto rounded-xl sm:rounded-2xl h-12 sm:h-14 px-8 sm:px-10 font-bold text-sm sm:text-base" onClick={handleShare} disabled={isDownloading}>
              <Share2 className="w-4 h-4 mr-3" /> <span className="hidden xs:inline">Share Path</span> <span className="xs:hidden">Share</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto border-border hover:bg-muted rounded-xl sm:rounded-2xl h-12 sm:h-14 px-8 sm:px-10 font-bold text-sm sm:text-base" onClick={handleStartNew} disabled={isDownloading}>
              <XCircle className="w-4 h-4 mr-3" /> Exit
            </Button>
            <Button className="w-full sm:w-auto rounded-xl sm:rounded-2xl h-12 sm:h-14 px-10 sm:px-12 font-black amber-button shadow-xl shadow-brand-amber/10 text-sm sm:text-base min-w-[200px]" onClick={handleDownloadPdf} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-3 animate-spin" /> <span className="hidden xs:inline">Generating PDF...</span> <span className="xs:hidden">Wait...</span>
                </>
              ) : isDownloaded ? (
                <>
                  <Download className="w-4 h-4 mr-3" /> PDF Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-3" /> <span className="hidden xs:inline">Export PDF</span> <span className="xs:hidden">PDF</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
