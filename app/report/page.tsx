"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Download, RefreshCw, Share2, Loader2, AlertCircle, XCircle, User, MapPin, GraduationCap, Clock, BookOpen, Globe, ClipboardList } from "lucide-react"

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
import { AssessmentResult, CandidateInfo } from "@/lib/types"

export default function ReportPage() {
  const router = useRouter()
  const { state, setAssessment, setStatus, reset } = useInterview()
  
  // Type-safe convenience variables (defined at component root for scope)
  const assessment = state.assessment as AssessmentResult
  const candidate = state.candidate as CandidateInfo
  const [activeTab, setActiveTab] = useState<'report' | 'profile'>('report')
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
    const filename = `Cuemath_Assessment_${candidate.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    
    try {
      // Point to our specialized PDF export container which has Profile first and no transcript
      await generatePDF('pdf-export-container', filename)
      setIsDownloaded(true)
      setTimeout(() => setIsDownloaded(false), 3000)
    } catch (err) {
      console.error('PDF Generation failed:', err)
      // Fallback to print
      window.print();
    } finally {
      setIsDownloading(false)
    }
  }

  const handleStartNew = () => {
    reset()
    router.push("/")
  }

  const handleShare = () => {
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


  // ── SUB-COMPONENTS FOR REUSE ───────────────────────────────────────────

  const ProfileHeader = () => (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 pb-10 border-b border-border">
      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-amber/40 shadow-lg shadow-brand-amber/10 flex-shrink-0">
        {candidate?.gender ? (
          <Image
            src={candidate.gender === 'male' ? '/avatar-male.png' : '/avatar-female.png'}
            alt={candidate.gender}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-amber/30 to-brand-amber/10 flex items-center justify-center">
            <span className="text-3xl font-black text-brand-amber">
              {candidate?.name?.charAt(0).toUpperCase() || "C"}
            </span>
          </div>
        )}
      </div>
      <div className="text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{candidate?.name}</h2>
        <p className="text-muted-foreground text-sm font-medium mt-1">{candidate?.email}</p>
        <span className="inline-block mt-3 text-[9px] font-black tracking-widest uppercase bg-brand-amber/10 text-brand-amber border border-brand-amber/20 px-3 py-1 rounded-full">
          Application Complete
        </span>
      </div>
    </div>
  )

  const ProfileDetails = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* India Residency */}
      <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          <MapPin className="w-3 h-3" /> Location
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-brand-amber/10 flex items-center justify-center flex-shrink-0">
            <Globe className="w-3.5 h-3.5 text-brand-amber" />
          </div>
          <p className="font-bold text-foreground">
            {candidate?.residesInIndia ? "Currently in India" : "Outside India"}
          </p>
        </div>
      </div>

      {/* Commitment */}
      <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          <Clock className="w-3 h-3" /> Weekly Commitment
        </div>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-brand-amber/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-brand-amber" />
          </div>
          <p className="font-bold text-foreground">
            {candidate?.canCommit24hrs ? "Available (24+ hrs/week)" : "Limited Availability"}
          </p>
        </div>
      </div>

      {/* Graduation */}
      <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          <GraduationCap className="w-3 h-3" /> Graduation Status
        </div>
        <p className="font-bold text-foreground">
          {candidate?.graduationStatus === 'graduate' ? 'Already a Graduate' : 'Pursuing Graduation'}
        </p>
      </div>

      {/* Degree */}
      <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          <BookOpen className="w-3 h-3" /> Education
        </div>
        <p className="font-bold text-foreground">{candidate?.degree || '—'}</p>
        {candidate?.fieldOfStudy && (
          <p className="text-xs text-muted-foreground">{candidate.fieldOfStudy}</p>
        )}
        {candidate?.mathDegreeType && (
          <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-brand-amber/10 text-brand-amber border border-brand-amber/20 px-2 py-0.5 rounded-full">
            {candidate.mathDegreeType}
          </span>
        )}
      </div>

      {/* Grade Preference */}
      <div className="bg-muted/30 border border-border rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          <User className="w-3 h-3" /> Grade Preference
        </div>
        <p className="font-bold text-foreground">{candidate?.gradePreference || '—'}</p>
      </div>

      {/* Region */}
      {candidate?.regionPreference && (
        <div className="bg-gradient-to-br from-brand-amber/10 to-transparent border border-brand-amber/30 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-amber/70">
            <Globe className="w-3 h-3" /> Teaching Region
          </div>
          <p className="font-black text-brand-amber text-base">{candidate.regionPreference}</p>
        </div>
      )}
    </div>
  )

  const AssessmentSummary = () => (
    <div className="flex flex-col md:flex-row gap-8 sm:gap-16 items-center md:items-stretch text-center md:text-left">
      <div className="flex flex-col space-y-6 sm:space-y-8 items-center md:min-w-64">
        <ScoreRing score={assessment.overall_score} />
        <RecommendationBadge recommendation={assessment.recommendation} />
      </div>
      
      <div className="flex-1 space-y-4 sm:space-y-8 bg-muted/30 p-5 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border border-border shadow-sm w-full">
        <h3 className="text-[10px] sm:text-xs font-black text-foreground/40 tracking-[0.2em] sm:tracking-[0.3em] uppercase border-b border-border pb-4 sm:pb-6 flex items-center justify-center md:justify-start">
          <span className="w-2.5 h-2.5 sm:w-3 h-3 rounded-full bg-brand-amber mr-3 sm:mr-4 shadow-lg shadow-brand-amber/20" />
          Cognitive Summary
        </h3>
        <p className="text-foreground leading-relaxed text-base sm:text-xl font-light italic">
          “{assessment.summary}”
        </p>
      </div>
    </div>
  )

  const DimensionalAnalytics = () => (
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
  )

  return (
    <div className="min-h-screen bg-background cuemath-grid py-10 sm:py-20 px-4 sm:px-6 relative selection:bg-brand-amber selection:text-brand-navy">
      {/* Background depth glows */}
      <div className="absolute top-[5%] left-[10%] w-[40%] h-[40%] bg-brand-amber/[0.03] dark:bg-brand-amber/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-brand-cyan/[0.03] dark:bg-brand-cyan/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 relative z-10">
        
        {/* Main Report Container */}
        <div id="report-content" className="glass-card rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl overflow-hidden border-border bg-card/40 backdrop-blur-3xl ring-1 ring-border">
          
          {/* Header */}
          <div className="p-4 sm:p-12 border-b border-border bg-muted/30">
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
                  <h1 className="text-xl sm:text-4xl font-black text-foreground tracking-tighter uppercase">Coach Result</h1>
                  <p className="text-brand-amber text-[8px] sm:text-xs font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase mt-1 sm:mt-2 opacity-80">PRO Assessment Engine</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-6 gap-x-4 sm:gap-6 p-5 sm:p-8 bg-background/50 rounded-2xl sm:rounded-[2rem] border border-border text-xs sm:text-sm shadow-inner">
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase tracking-widest text-[8px] sm:text-[9px] font-black opacity-60">Candidate</p>
                <p className="font-extrabold text-foreground text-sm sm:text-lg tracking-tight truncate">{candidate.name}</p>
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
                <p className="font-extrabold text-foreground text-xs sm:text-sm truncate opacity-80">{candidate.email}</p>
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

          {/* Tab Switcher */}
          <div className="px-6 sm:px-12 pt-6 border-b border-border no-print">
            <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('report')}
                className={cn(
                  "px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200",
                  activeTab === 'report'
                    ? "bg-background text-brand-amber shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Assessment
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2",
                  activeTab === 'profile'
                    ? "bg-background text-brand-amber shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Candidate Profile
              </button>
            </div>
          </div>

          {/* ── ASSESSMENT TAB ─────────────────────────────────────── */}
          {activeTab === 'report' && (
          <div className="p-4 sm:p-12 space-y-10 sm:space-y-20 no-print">
            <AssessmentSummary />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <StrengthsCard 
                strengths={assessment.strengths} 
                areasForImprovement={assessment.areas_for_improvement} 
              />
            </div>

            <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <h3 className="text-[10px] sm:text-xs font-black text-foreground/40 tracking-[0.2em] sm:tracking-[0.3em] uppercase border-b border-border pb-4 sm:pb-6 flex items-center">
                <span className="w-2.5 h-2.5 sm:w-3 h-3 rounded-full bg-brand-cyan mr-3 sm:mr-4 shadow-lg shadow-brand-cyan/20" />
                Dimensional Analytics
              </h3>
              <DimensionalAnalytics />
            </div>

            <div className="pt-8 sm:pt-12 border-t border-border mt-6 sm:mt-10">
               <TranscriptAccordion history={state.conversationHistory} />
            </div>
          </div>
          )}

          {/* ── CANDIDATE PROFILE TAB ──────────────────────────────── */}
          {activeTab === 'profile' && (
          <div className="p-4 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500 no-print">
            <ProfileHeader />
            <ProfileDetails />
          </div>
          )}

        </div>

        {/* ── PDF EXPORT TEMPLATE (HIDDEN ON SCREEN) ────────────────── */}
        <div 
          id="pdf-export-container" 
          className="absolute top-[-10000px] left-[-10000px] w-[1000px] bg-white text-[#0A0A0A] p-20 space-y-12"
          aria-hidden="true"
        >
          {/* Page 1 Header */}
          <div data-pdf-section className="flex justify-between items-start border-b-4 border-[#FFB800] pb-10 mb-10">
            <Image src="/cuemath-logo.svg" alt="Cuemath" width={220} height={60} priority />
            <div className="text-right">
              <h1 className="text-5xl font-black tracking-tighter uppercase text-[#002147]">COACH ASSESSMENT</h1>
              <p className="text-[#FFB800] text-sm font-black tracking-[0.3em] uppercase mt-2">Professional Hiring Report</p>
            </div>
          </div>

          {/* SECTION: Candidate Profile */}
          <div data-pdf-section className="space-y-10 bg-[#F8F8F8] p-12 rounded-[2.5rem] border border-[#EEEEEE] mb-16 shadow-sm">
            <h2 className="text-3xl font-black uppercase tracking-widest text-[#002147] border-l-[12px] border-[#FFB800] pl-8">
              Candidate Profile
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-10 mb-10 pb-10 border-b-2 border-[#EEEEEE]">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-[#FFB800]/40 shadow-xl flex-shrink-0">
                {candidate?.gender ? (
                  <Image
                    src={candidate.gender === 'male' ? '/avatar-male.png' : '/avatar-female.png'}
                    alt={candidate.gender}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#FFB800]/10 flex items-center justify-center">
                    <span className="text-5xl font-black text-[#FFB800]">
                      {candidate?.name?.charAt(0).toUpperCase() || "C"}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-4xl font-black text-[#002147] tracking-tighter mb-2 leading-none">{candidate?.name}</h2>
                <p className="text-[#666666] text-lg font-bold">{candidate?.email}</p>
                <span className="inline-block mt-4 text-[10px] font-black tracking-widest uppercase bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20 px-4 py-1.5 rounded-full">
                  Application Complete
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Location */}
              <div className="bg-white border-2 border-[#EEEEEE] rounded-3xl p-7 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#999999]">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#FFB800]/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-[#FFB800]" />
                  </div>
                  <p className="font-black text-[#002147] text-xl tracking-tight leading-tight">
                    {candidate?.residesInIndia ? "Currently in India" : "Outside India"}
                  </p>
                </div>
              </div>

              {/* Commitment */}
              <div className="bg-white border-2 border-[#EEEEEE] rounded-3xl p-7 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#999999]">
                  <Clock className="w-3.5 h-3.5" /> Weekly Commitment
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#FFB800]/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-[#FFB800]" />
                  </div>
                  <p className="font-black text-[#002147] text-xl tracking-tight leading-tight">
                    {candidate?.canCommit24hrs ? "Available (24+ hrs/week)" : "Limited Availability"}
                  </p>
                </div>
              </div>

              {/* Graduation status */}
              <div className="bg-white border-2 border-[#EEEEEE] rounded-3xl p-7 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#999999]">
                  <GraduationCap className="w-3.5 h-3.5" /> Graduation Status
                </div>
                <p className="font-black text-[#002147] text-xl tracking-tight leading-tight">
                  {candidate?.graduationStatus === 'graduate' ? 'Already a Graduate' : 'Pursuing Graduation'}
                </p>
              </div>

              {/* Education */}
              <div className="bg-white border-2 border-[#EEEEEE] rounded-3xl p-7 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#999999]">
                  <BookOpen className="w-3.5 h-3.5" /> Education
                </div>
                <div>
                  <p className="font-black text-[#002147] text-xl tracking-tight leading-tight mb-0.5">{candidate?.degree || '—'}</p>
                  {candidate?.fieldOfStudy && (
                    <p className="text-base text-[#666666] font-bold leading-tight">{candidate.fieldOfStudy}</p>
                  )}
                </div>
              </div>

              {/* Grade Preference */}
              <div className="bg-white border-2 border-[#EEEEEE] rounded-3xl p-7 space-y-3 shadow-sm">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#999999]">
                  <User className="w-3.5 h-3.5" /> Grade Preference
                </div>
                <p className="font-black text-[#002147] text-xl tracking-tight leading-tight">{candidate?.gradePreference || '—'}</p>
              </div>

              {/* Region Preference */}
              {candidate?.regionPreference && (
                <div className="bg-gradient-to-br from-[#FFB800]/10 to-transparent border-2 border-[#FFB800]/20 rounded-3xl p-7 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#FFB800]/80">
                    <Globe className="w-3.5 h-3.5" /> Teaching Region
                  </div>
                  <p className="font-black text-[#FFB800] text-2xl tracking-tight leading-tight">{candidate.regionPreference}</p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: Interview Evaluation Header + Summary (Grouped to prevent orphaned title) */}
          <div data-pdf-section className="space-y-8 mb-12">
            <h2 className="text-2xl font-black uppercase tracking-widest text-[#002147] border-l-[10px] border-brand-cyan pl-6">
              Interview Evaluation
            </h2>
            <div className="bg-[#F8F8F8] p-10 rounded-[3rem] border border-[#EEEEEE] space-y-12">
              <AssessmentSummary />
            </div>
          </div>
              
          {/* Strengths Card */}
          <div data-pdf-section className="bg-[#F8F8F8] p-10 rounded-[3rem] border border-[#EEEEEE] mb-12">
            <StrengthsCard 
              strengths={assessment.strengths} 
              areasForImprovement={assessment.areas_for_improvement} 
            />
          </div>

          {/* Dimensional Analytics Title + Grid (Compact 2-column layout) */}
          <div className="space-y-6">
            <h3 data-pdf-section className="text-sm font-black text-[#002147]/50 tracking-[0.3em] uppercase flex items-center pl-8 mb-2">
              Dimensional Analytics
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Grouping into rows of 2 for smart pagination without slicing */}
              {Array.from({ length: Math.ceil(Object.entries(assessment.dimensions).length / 2) }).map((_, rowIndex) => {
                const rowDims = Object.entries(assessment.dimensions).slice(rowIndex * 2, rowIndex * 2 + 2);
                return (
                  <div key={rowIndex} data-pdf-section className="grid grid-cols-2 gap-6 w-full col-span-2">
                    {rowDims.map(([key, data]) => (
                      <div key={key} className="bg-[#F8F8F8] p-6 rounded-2xl border border-[#EEEEEE] h-full flex flex-col shadow-sm">
                        <div className="flex justify-between items-start mb-4 border-b border-[#EEEEEE] pb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{DIMENSION_ICONS[key] || "⭐"}</span>
                            <span className="font-black text-[#002147] text-sm uppercase tracking-tight leading-tight">
                              {DIMENSION_LABELS[key] || key}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-black text-[#B01F1F] leading-none">
                              {Math.round(data.score)}
                            </div>
                            <div className="text-[9px] font-black text-[#999999] uppercase tracking-wider mt-1">
                              / 20 Units
                            </div>
                          </div>
                        </div>
                        <p className="text-[14px] leading-relaxed text-[#0A0A0A] font-semibold grow">
                          {data.explanation || "Detailed assessment data for this dimension is being processed."}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer - will be handled specially or at the end */}
          <div data-pdf-section className="pt-20 text-center border-t border-[#EEEEEE]">
            <p className="text-xs font-bold text-[#999999] uppercase tracking-widest">
              Generated by Cuemath AI Assessment Engine • {formatDate(new Date())}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
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
