"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { useRouter } from "next/navigation"
import { useInterview } from "@/context/InterviewContext"
import { isSpeechRecognitionSupported, startListening, stopListening, preloadVoices, type SpeechRecognitionResult } from "@/lib/speech-adapter"
import { cn } from "@/lib/utils"
import {
  Mic, MicOff, AlertCircle, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft, ArrowRight, User, Mail, ChevronDown, Clock, Check
} from "lucide-react"

// ─── Step indicators ───────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Sign Up" },
  { id: 2, label: "Quick Questions" },
  { id: 3, label: "Mic Check" },
]

// ─── Degree / Field data (from screenshots) ────────────────────────────────────
const DEGREES = ["Bachelors", "Masters", "Doctorate — PhD", "Diploma", "Other"]
const FIELDS_OF_STUDY: Record<string, string[]> = {
  "Bachelors": [
    "Engineering — Electrical", "Engineering — M.Tech", "Engineering — Other",
    "Commerce — B.Com", "Commerce — BBA", "Commerce — MBA", "Commerce — M.Com",
    "Commerce — CA", "Commerce — Other",
    "Arts — BA", "Arts — MA", "Arts — Other",
    "Education — B.Ed", "Education — M.Ed", "Education — Other",
    "Doctorate — PhD", "Diploma", "Other",
  ],
  "Masters": [
    "Engineering — M.Tech", "Engineering — Other", "Commerce — MBA",
    "Commerce — M.Com", "Arts — MA", "Education — M.Ed", "Other",
  ],
  "Doctorate — PhD": ["Mathematics", "Applied Mathematics", "Other Sciences", "Other"],
  "Diploma": ["Mathematics", "Science", "Commerce", "Arts", "Other"],
  "Other": ["Other"],
}
const MATH_DEGREE_TYPES = ["Mathematics", "Applied Mathematics", "Others"]
const GRADE_OPTIONS = [
  { label: "Grades 1–5", sub: "Foundational math concepts for young learners. Focus on arithmetic, number sense, and basic geometry." },
  { label: "Grades 3–8", sub: "Core math skills including fractions, decimals, algebra basics, and data handling." },
  { label: "Grades 9–12", sub: "Advanced math including algebra, trigonometry, calculus, and exam preparation." },
]
const REGION_OPTIONS = [
  { flag: "🇺🇸", label: "United States", time: "IST 7:30 PM – 7:30 AM", highDemand: true },
  { flag: "🇬🇧", label: "United Kingdom", time: "IST 1:30 PM – 9:30 PM", highDemand: false },
  { flag: "🌏", label: "Asia Pacific", time: "IST 3:30 AM – 1:30 PM", highDemand: false },
  { flag: "🇮🇳", label: "India & Middle East", time: "IST 3:30 PM – 9:30 PM", highDemand: false },
  { flag: "🌍", label: "I have no preference", time: "We'll assign you based on availability", highDemand: false },
]

export function CandidateForm({ onStepChange }: { onStepChange?: (step: number) => void }) {
  const router = useRouter()
  const { setCandidate, setFallbackMode } = useInterview()
  const [step, setStep] = useState(1)
  
  // Mobile detection for timing workarounds
  const isMobileDevice = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  /**
   * Hardware-level Microphone Release
   */
  const releaseMicHardware = async () => {
    console.log("[MIC CLEANUP] Releasing hardware tracks...");
    stopListening();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log("[MIC CLEANUP] Track stopped:", track.label);
        });
      }
    } catch (e) {
      console.warn("[MIC CLEANUP] Release error:", e);
    }
  };

  // ── Step 1 state ──────────────────────────────────────────────────────────────
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [formError, setFormError] = useState("")

  // ── Step 2 state ──────────────────────────────────────────────────────────────
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [residesInIndia, setResidesInIndia] = useState<boolean | null>(null)
  const [graduationStatus, setGraduationStatus] = useState<"graduate" | "pursuing" | null>(null)
  const [canCommit, setCanCommit] = useState<boolean | null>(null)
  const [degree, setDegree] = useState("")
  const [fieldOfStudy, setFieldOfStudy] = useState("")
  const [mathDegreeType, setMathDegreeType] = useState("")
  const [gradePreference, setGradePreference] = useState("")
  const [regionPreference, setRegionPreference] = useState("")
  const [screenerError, setScreenerError] = useState("")

  // ── Step 3 mic state ─────────────────────────────────────────────────────────
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState("")
  const [micError, setMicError] = useState<string | null>(null)
  const [hasTested, setHasTested] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [supported, setSupported] = useState(true)
  const [lastTranscriptUpdate, setLastTranscriptUpdate] = useState<number>(Date.now())
  const formContainerRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  // Clear form errors on input change
  useEffect(() => { if (formError) setFormError("") }, [name, email])
  useEffect(() => { if (screenerError) setScreenerError("") }, [gender, residesInIndia, graduationStatus, canCommit, degree, fieldOfStudy, gradePreference, regionPreference])
  useEffect(() => { setLastTranscriptUpdate(Date.now()) }, [testResult])

  // Reset field of study when degree changes
  useEffect(() => { setFieldOfStudy(""); setMathDegreeType("") }, [degree])

  // Cinematic smooth scroll helper — easeInOutQuart curve
  const smoothScrollTo = (targetY: number, duration: number = 650) => {
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;
    let startTime: number | null = null;

    const easeInOutQuart = (t: number) =>
      t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutQuart(progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Scroll to a question block by id — centers it in the viewport
  const scrollToQuestion = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const elH = el.offsetHeight;
        const winH = window.innerHeight;
        // Centering math: absolute position - half viewport + half element height
        const y = el.getBoundingClientRect().top + window.pageYOffset - (winH / 2) + (elH / 2);
        smoothScrollTo(Math.max(0, y), 600);
      }
    }, 320); // Perfectly timed for dropdown exit animations
  };
  // Auto-scroll on step change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // On mic test and form steps, cinematic scroll to very top
    if (step === 3 || step === 2) {
      smoothScrollTo(0, 750);
      return;
    }

    if (formContainerRef.current) {
      const yOffset = -100;
      const element = formContainerRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      smoothScrollTo(y, 650);
    }
  }, [step])

  // Auto-scroll to grading section (Q5) only when the last education step is completed
  /* useEffect(() => {
    if (mathDegreeType) {
      scrollToQuestion('q5')
    }
  }, [mathDegreeType]) */

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  // Preload voices when entering step 3
  useEffect(() => {
    if (step === 3) {
      if (!isSpeechRecognitionSupported()) {
        setSupported(false)
        setFallbackMode(true)
      }
      preloadVoices()
    }
    return () => { 
      if (step === 3) {
        console.log("[MIC CLEANUP] Component unmounting, forcing release.");
        releaseMicHardware();
      }
    }
  }, [step, setFallbackMode])

  // Auto-stop mic on silence
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTesting && testResult.trim().length > 0) {
      interval = setInterval(() => {
        if (Date.now() - lastTranscriptUpdate > 3000) handleStopTest()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTesting, testResult, lastTranscriptUpdate])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setFormError("Please fill in both name and email."); return }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setFormError("Please enter a valid email address."); return }
    setStep(2)
  }

  const handleStep2 = () => {
    if (!gender) { setScreenerError("Please select your gender."); return }
    if (residesInIndia === null) { setScreenerError("Please answer all required questions."); return }
    if (graduationStatus === null) { setScreenerError("Please answer all required questions."); return }
    if (canCommit === null) { setScreenerError("Please answer all required questions."); return }
    if (!degree) { setScreenerError("Please select your degree."); return }
    if (!fieldOfStudy) { setScreenerError("Please select your field of study."); return }
    if (!gradePreference) { setScreenerError("Please select grades you'd like to teach."); return }
    if (!regionPreference) { setScreenerError("Please select your preferred teaching region."); return }
    setStep(3)
  }

  const handleStartTest = () => {
    setIsTesting(true)
    setTestResult("")
    setMicError(null)
    startListening(
      (res: SpeechRecognitionResult) => setTestResult(res.transcript),
      (finalTranscript: string) => {
        setIsTesting(false)
        if (finalTranscript.trim().length > 0) {
          setIsValidating(true)
          setTimeout(() => { setIsValidating(false); setHasTested(true) }, 2000)
        }
      },
      (err: string) => { setIsTesting(false); setMicError(err) }
    )
  }

  const handleStopTest = () => { stopListening(); setIsTesting(false) }

  const submitAndStart = async (useFallback = false) => {
    // 1. Release Mic Immediately
    await releaseMicHardware();
    
    if (useFallback) setFallbackMode(true)
    setCandidate({
      name, email,
      residesInIndia: residesInIndia ?? undefined,
      graduationStatus: graduationStatus ?? undefined,
      canCommit24hrs: canCommit ?? undefined,
      degree, fieldOfStudy, mathDegreeType, gradePreference, regionPreference, gender: gender ?? undefined,
    })

    // 2. Mobile-specific handoff delay
    if (isMobileDevice) {
      console.log("[MIC CLEANUP] Mobile detected: Waiting 500ms for hardware release...");
      setTimeout(() => {
        router.push("/interview");
      }, 500);
    } else {
      router.push("/interview");
    }
  }

  // ── Field of study options ────────────────────────────────────────────────────
  const availableFields = degree
    ? (FIELDS_OF_STUDY[degree] ?? FIELDS_OF_STUDY["Other"])
    : []

  // ── Pill button helper ────────────────────────────────────────────────────────
  const Pill = ({
    active, onClick, children,
  }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 184, 0, 0.08)" }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200",
        active
          ? "bg-[#FFB800] text-[#002147] border-[#FFB800] shadow-md"
          : "bg-muted/20 dark:bg-transparent border-border text-foreground/70 hover:border-[#FFB800]/50 hover:text-foreground hover:bg-muted/40"
      )}
    >
      {children}
    </motion.button>
  )
 
  // ── Custom Select component ──────────────────────────────────────────────────
  const CustomSelect = ({
    label, value, onChange, options, placeholder, disabled = false
  }: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    options: string[], 
    placeholder: string,
    disabled?: boolean
  }) => {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
        }
      }
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden"
      } else {
        document.body.style.overflow = "unset"
      }
      return () => { document.body.style.overflow = "unset" }
    }, [isOpen])

    return (
      <div className="relative w-full" ref={containerRef}>
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#FFB800] mb-1.5 block ml-1">
          {label}
        </label>
        <motion.button
          type="button"
          disabled={disabled}
          whileTap={!disabled ? { scale: 0.99 } : {}}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 text-sm font-medium relative",
            isOpen 
              ? "border-[#FFB800] ring-4 ring-[#FFB800]/20 z-50 shadow-[0_0_30px_rgba(255,184,0,0.4)] bg-background" 
              : "border-border bg-muted/10 dark:bg-white/5 hover:border-[#FFB800]/40",
            disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <span className={cn(value ? "text-foreground" : "text-muted-foreground/50")}>
            {value || placeholder}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 5, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-2xl border border-[#FFB800]/40 bg-background/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-2 custom-scrollbar"
            >
              <div className="flex flex-col gap-1">
                {options.map((opt, idx) => (
                  <motion.button
                    key={opt}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.03 } }}
                    onClick={() => { onChange(opt); setIsOpen(false) }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                      value === opt 
                        ? "bg-[#FFB800] text-[#002147] font-bold" 
                        : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
                    )}
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── Step progress bar ─────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div className="relative mb-14 px-1">
      {/* Background Track */}
      <div className="absolute top-5 left-10 right-10 h-[2px] bg-border/50 z-0" />
      
      {/* Active Track Overlay */}
      <div 
        className="absolute top-5 left-10 h-[2px] bg-[#FFB800] transition-all duration-500 z-0"
        style={{ 
          width: step === 1 ? '0%' : step === 2 ? 'calc(50% - 2.5rem)' : 'calc(100% - 5rem)',
          opacity: step > 1 ? 1 : 0,
          clipPath: 'inset(-6px 0px -6px 0px)'
        }}
      >
        {/* Repeating glow sweep */}
        {step > 1 && (
          <motion.div
            className="absolute w-[10%]"
            style={{
              top: '-1px',
              height: '4px',
              background: 'linear-gradient(90deg, transparent, rgba(255,240,100,0.95), transparent)',
              filter: 'blur(1.5px)',
            }}
            animate={{ left: step === 3 ? ["46%", "105%"] : ["-10%", "105%"] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
          />
        )}
      </div>

      <div className="relative flex justify-between z-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-col items-center">
            {/* Circle */}
            <motion.div 
              animate={step === s.id ? { 
                boxShadow: ["0 0 0px rgba(255,184,0,0)", "0 0 20px rgba(255,184,0,0.4)", "0 0 0px rgba(255,184,0,0)"],
              } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 shadow-lg",
                step > s.id
                  ? "bg-[#FFB800] text-[#002147]"
                  : step === s.id
                    ? "bg-[#FFB800] text-[#002147] ring-4 ring-[#FFB800]/20 scale-110"
                    : "bg-muted text-muted-foreground border border-border"
              )}
            >
              {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : s.id}
            </motion.div>

            {/* Label */}
            <div className="absolute top-12 whitespace-nowrap">
              <span className={cn(
                "text-[10px] font-bold tracking-widest uppercase transition-colors duration-300",
                step >= s.id ? "text-[#FFB800]" : "text-muted-foreground/40"
              )}>
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────────
  // ── Animation Variants ───────────────────────────────────────────────────────
  const containerVariants: Variants = {
    animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  }

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  }

  return (
    <motion.div 
      ref={formContainerRef}
      layout
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "w-full mx-auto transition-all duration-500",
        step === 1 ? "max-w-4xl" : "max-w-5xl"
      )}
    >
      {/* Outer card */}
      <motion.div 
        whileHover={{ 
          scale: 1.01,
          boxShadow: "0 40px 100px -20px rgba(255,184,0,0.15), 0 0 40px -10px rgba(0,0,0,0.1)"
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative border border-border rounded-3xl bg-card/60 backdrop-blur-3xl shadow-2xl overflow-hidden group
          transition-all duration-300 hover:bg-[#FFB800]/[0.04] dark:hover:bg-[#FFB800]/[0.02]
          focus-within:ring-1 focus-within:ring-[#FFB800]/20 cursor-default"
      >
        {/* Glass Shine sweep effect */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -inset-[100%] group-hover:animate-shine bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent skew-x-12 transition-all duration-1000" />
        </div>

        {/* Animated border glow */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FFB800]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FFB800]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-[#FFB800]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-[#FFB800]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="px-8 sm:px-16 pt-12 sm:pt-16 pb-12 sm:pb-16">
          <ProgressBar />

          <AnimatePresence mode="wait">
            {/* ── STEP 1: SIGN UP ────────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div 
                key="step-1"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-8"
              >
                <motion.div variants={itemVariants}>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-foreground">Get started</h2>
                  <p className="text-muted-foreground text-lg mb-8">Enter your details to begin your Cuemath coaching journey</p>
                </motion.div>

                <motion.form variants={itemVariants} onSubmit={handleStep1} noValidate className="space-y-6">
                {/* Name */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="name"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-background/50 border border-border
                      focus:border-[#FFB800] focus:ring-2 focus:ring-[#FFB800]/10 focus:outline-none
                      transition-all text-sm font-medium placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Email */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-background/50 border border-border
                      focus:border-[#FFB800] focus:ring-2 focus:ring-[#FFB800]/10 focus:outline-none
                      transition-all text-sm font-medium placeholder:text-muted-foreground/50"
                  />
                </div>

                {formError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-500 font-semibold">{formError}</p>
                  </div>
                )}

                  <button
                    type="submit"
                    className="w-full mt-2 py-5 rounded-xl amber-button font-bold text-base
                      flex items-center justify-center gap-2 shadow-xl shadow-[#FFB800]/20
                      hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Start Application <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.form>
              </motion.div>
            )}

            {/* ── STEP 2: SCREENER QUESTIONS ─────────────────────────────────── */}
            {step === 2 && (
              <motion.div 
                key="step-2"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-foreground">Tell us about your background</h2>
                  <p className="text-muted-foreground text-lg mb-8">Takes less than 2 minutes</p>
                </motion.div>

                {/* Q0 – Gender */}
                <motion.div variants={itemVariants} className="p-3.5 rounded-2xl border border-border bg-background/30 space-y-3">
                  <p className="text-sm font-bold text-foreground">
                    What is your gender? <span className="text-red-400">*</span>
                  </p>
                  <div className="flex gap-2">
                    <Pill active={gender === 'male'} onClick={() => { setGender('male'); /* scrollToQuestion('q1') */ }}>Male</Pill>
                    <Pill active={gender === 'female'} onClick={() => { setGender('female'); /* scrollToQuestion('q1') */ }}>Female</Pill>
                  </div>
                </motion.div>

                {/* Q1 */}
                <motion.div id="q1" variants={itemVariants} className="p-3.5 rounded-2xl border border-border bg-background/30 space-y-3">
                  <p className="text-sm font-bold text-foreground">
                    Are you currently residing in India? <span className="text-red-400">*</span>
                  </p>
                  <div className="flex gap-2">
                    <Pill active={residesInIndia === true} onClick={() => { setResidesInIndia(true); /* scrollToQuestion('q2') */ }}>Yes</Pill>
                    <Pill active={residesInIndia === false} onClick={() => { setResidesInIndia(false); /* scrollToQuestion('q2') */ }}>No</Pill>
                  </div>
                </motion.div>

                {/* Q2 */}
                <motion.div id="q2" variants={itemVariants} className="p-3.5 rounded-2xl border border-border bg-background/30 space-y-3">
                  <p className="text-sm font-bold text-foreground">
                    College graduation status <span className="text-red-400">*</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Pill active={graduationStatus === "graduate"} onClick={() => { setGraduationStatus("graduate"); /* scrollToQuestion('q3') */ }}>I'm already a graduate</Pill>
                    <Pill active={graduationStatus === "pursuing"} onClick={() => { setGraduationStatus("pursuing"); /* scrollToQuestion('q3') */ }}>I'm still pursuing graduation</Pill>
                  </div>
                </motion.div>

                {/* Q3 */}
                <motion.div id="q3" variants={itemVariants} className="p-3.5 rounded-2xl border border-border bg-background/30 space-y-3">
                  <p className="text-sm font-bold text-foreground">
                    Can you commit to a minimum of 24 hours per week? <span className="text-red-400">*</span>
                  </p>
                  <div className="flex gap-2">
                    <Pill active={canCommit === true} onClick={() => { setCanCommit(true); /* scrollToQuestion('q4') */ }}>Yes</Pill>
                    <Pill active={canCommit === false} onClick={() => { setCanCommit(false); /* scrollToQuestion('q4') */ }}>No</Pill>
                  </div>
                </motion.div>

                {/* Q4 – Education */}
                <motion.div id="q4" variants={itemVariants} className="p-4 rounded-2xl border border-border bg-background/30 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Tell us about your education <span className="text-red-400">*</span>
                  </p>
                  <p className="text-xs text-muted-foreground">We need this to match you with the right students</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CustomSelect 
                    label="Degree"
                    value={degree}
                    onChange={setDegree}
                    options={DEGREES}
                    placeholder="Select degree"
                  />
                  <CustomSelect 
                    label="Field of Study"
                    value={fieldOfStudy}
                    onChange={setFieldOfStudy}
                    options={availableFields}
                    placeholder="Select field"
                    disabled={!degree}
                  />
                </div>
                {/* Math degree type (optional) */}
                <CustomSelect 
                  label="Math degree type"
                  value={mathDegreeType}
                  onChange={setMathDegreeType}
                  options={MATH_DEGREE_TYPES}
                  placeholder="Select your math degree type"
                />
              </motion.div>

                {/* Q5 – Grade range */}
                  <motion.div id="q5" variants={itemVariants} className="p-3.5 rounded-2xl border border-border bg-background/30 space-y-3">
                  <p className="text-sm font-bold text-foreground">
                    Which grades do you want to teach? <span className="text-red-400">*</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Choose the grade range that best fits your expertise</p>
                  <div className="space-y-2">
                    {GRADE_OPTIONS.map((g) => (
                      <motion.button
                        key={g.label}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => { setGradePreference(g.label); /* scrollToQuestion('q6') */ }}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all duration-300",
                          gradePreference === g.label
                            ? "border-[#FFB800] bg-[#FFB800]/10 shadow-[0_0_15px_rgba(255,184,0,0.15)]"
                            : "border-border bg-muted/20 dark:bg-white/5 hover:bg-muted/40 hover:border-[#FFB800]/30"
                        )}
                      >
                        <p className={cn("text-base font-bold transition-colors", gradePreference === g.label ? "text-[#FFB800]" : "text-foreground")}>{g.label}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{g.sub}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Q6 – Region */}
                <motion.div id="q6" variants={itemVariants} className="p-3.5 rounded-2xl border border-border bg-background/30 space-y-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Which region do you want to teach in? <span className="text-red-400">*</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">This determines your teaching hours in IST</p>
                  </div>
                  <div className="space-y-2">
                    {REGION_OPTIONS.map((r) => {
                      const isSelected = regionPreference === r.label;
                      return (
                        <motion.button
                          key={r.label}
                          type="button"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setRegionPreference(r.label)}
                          className={cn(
                            "w-full text-left rounded-xl border transition-all duration-300 relative overflow-hidden",
                            isSelected
                              ? "border-[#FFB800] shadow-[0_0_20px_rgba(255,184,0,0.2)]"
                              : "border-border hover:border-[#FFB800]/40"
                          )}
                        >
                          {/* Background gradient on selected */}
                          <div className={cn(
                            "absolute inset-0 transition-opacity duration-300",
                            isSelected
                              ? "opacity-100 bg-gradient-to-r from-[#FFB800]/15 via-[#FFB800]/8 to-transparent"
                              : "opacity-0"
                          )} />

                          <div className="relative flex items-start sm:items-center gap-3 sm:gap-4 p-3.5 sm:p-4">
                            {/* Flag */}
                            <span className="text-xl sm:text-2xl flex-shrink-0 mt-0.5 sm:mt-0">{r.flag}</span>

                            {/* Label + time */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-y-1 gap-x-2">
                                <p className={cn(
                                  "text-sm font-bold transition-colors leading-tight",
                                  isSelected ? "text-[#FFB800]" : "text-foreground"
                                )}>{r.label}</p>
                                
                                {r.highDemand && (
                                  <span className="sm:hidden text-[8px] font-black tracking-widest uppercase bg-[#FFB800] text-[#002147] px-1.5 py-0.5 rounded-md">
                                    HIGH DEMAND
                                  </span>
                                )}
                              </div>

                              {r.time !== "We'll assign you based on availability" ? (
                                <span className={cn(
                                  "inline-flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full",
                                  isSelected
                                    ? "bg-[#FFB800]/20 text-[#FFB800]"
                                    : "bg-muted/50 text-muted-foreground"
                                )}>
                                  <Clock className="w-2.5 h-2.5" />
                                  {r.time}
                                </span>
                              ) : (
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{r.time}</p>
                              )}
                            </div>

                            {/* Right side: Desktop Badge + Checkmark */}
                            <div className="flex-shrink-0 flex items-center gap-2">
                              {r.highDemand && (
                                <span className="hidden sm:inline-block text-[9px] font-black tracking-widest uppercase bg-[#FFB800] text-[#002147] px-2 py-1 rounded-full">
                                  HIGH DEMAND
                                </span>
                              )}
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0",
                                isSelected
                                  ? "bg-[#FFB800] border-[#FFB800]"
                                  : "border-border"
                              )}>
                                {isSelected && <Check className="w-3 h-3 text-[#002147]" strokeWidth={3} />}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {screenerError && (
                  <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-500 font-semibold">{screenerError}</p>
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-xl border border-border text-sm font-semibold
                    hover:bg-foreground/5 transition-all flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleStep2}
                  className="flex-[2] py-3.5 rounded-xl amber-button text-sm font-semibold
                    flex items-center justify-center gap-1 shadow-xl shadow-[#FFB800]/20
                    hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
                </motion.div>
              </motion.div>
            )}{/* ── STEP 3: MIC TEST ───────────────────────────────────────────── */}
            {step === 3 && (
              <motion.div 
                key="step-3"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-5"
              >
                <motion.div variants={itemVariants}>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-foreground">Test your microphone</h2>
                  <p className="text-muted-foreground text-lg italic">"Let's make sure we can hear you clearly"</p>
                </motion.div>

                {!supported ? (
                  <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-600 dark:text-red-400 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <h4 className="font-bold text-sm">Voice not supported</h4>
                    <p className="text-xs mt-1 opacity-80 leading-relaxed">
                      Your browser doesn't support voice features. Please use Chrome or Edge for the best experience.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Mic button with decorative arrows */}
                  <div className="flex items-center justify-center py-6 gap-8 sm:gap-16 relative">
                    {/* Left Decorative Arrow */}
                    <motion.div
                      initial={{ x: 10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ 
                        repeat: Infinity, 
                        repeatType: "reverse", 
                        duration: 1.5,
                        ease: "easeInOut" 
                      }}
                      className="hidden sm:flex items-center text-[#FFB800]/30"
                    >
                      <ChevronRight className="w-10 h-10 opacity-40" strokeWidth={2.5} />
                      <ChevronRight className="w-10 h-10 -ml-6" strokeWidth={2.5} />
                    </motion.div>

                    <button
                      type="button"
                      onClick={isTesting ? handleStopTest : handleStartTest}
                      disabled={isValidating}
                      className={cn(
                        "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl z-10",
                        isTesting
                          ? "bg-[#FFB800] ring-[10px] ring-[#FFB800]/25 shadow-[0_0_50px_rgba(255,184,0,0.5)] scale-110"
                          : isValidating
                            ? "bg-muted"
                            : "amber-button hover:scale-105"
                      )}
                    >
                      {isValidating
                        ? <Loader2 className="w-10 h-10 animate-spin text-[#FFB800]" />
                        : isTesting
                          ? <Mic className="w-10 h-10 text-white animate-pulse" />
                          : <Mic className="w-10 h-10 text-[#002147]" />
                      }
                    </button>

                    {/* Right Decorative Arrow */}
                    <motion.div
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ 
                        repeat: Infinity, 
                        repeatType: "reverse", 
                        duration: 1.5,
                        ease: "easeInOut" 
                      }}
                      className="hidden sm:flex items-center text-[#FFB800]/30"
                    >
                      <ChevronRight className="w-10 h-10 rotate-180 -mr-6" strokeWidth={2.5} />
                      <ChevronRight className="w-10 h-10 rotate-180 opacity-40" strokeWidth={2.5} />
                    </motion.div>
                  </div>
                    <div className="text-center">
                      <p className={cn("text-base font-bold transition-colors duration-300",
                        isValidating ? "text-[#FFB800]" : isTesting ? "text-[#00D1FF]" : "text-foreground"
                      )}>
                        {isValidating ? "Validating clarity..." : isTesting ? "Recording..." : "Ready to test?"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isValidating
                          ? "Ensuring your audio is crisp and clear"
                          : isTesting
                            ? "Say something like 'Ready to teach!'"
                            : "Tap the mic icon above and say something"}
                      </p>
                      {!isValidating && !isTesting && (
                        <p className="text-base text-brand-amber font-medium mt-1.5 animate-in fade-in slide-in-from-top-1 duration-700">
                          Example: "Hi, I'm excited to teach math concepts clearly."
                        </p>
                      )}
                    </div>

                  {/* Transcript box */}
                  <div className={cn(
                    "w-full p-4 sm:p-5 rounded-2xl border min-h-20 flex items-center justify-center transition-all duration-500",
                    isValidating ? "border-[#FFB800]/30 bg-[#FFB800]/5"
                      : isTesting ? "border-[#00D1FF]/30 bg-[#00D1FF]/5"
                        : "border-border bg-muted/30"
                  )}>
                    {isValidating ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-1 h-6 items-end">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className="w-1.5 bg-[#FFB800] rounded-full animate-wave" style={{ animationDelay: `${i * 0.1}s` }} />
                          ))}
                        </div>
                        <p className="text-[10px] font-black tracking-widest uppercase text-[#FFB800] animate-pulse">Running audio analysis...</p>
                      </div>
                    ) : testResult ? (
                      <p className="text-foreground text-lg font-medium text-center italic animate-in fade-in duration-300">
                        "{testResult}"
                      </p>
                    ) : (
                      <p className="text-muted-foreground italic text-center text-lg opacity-60">
                        {isTesting ? "Waiting for speech..." : "We’ll show your voice transcript here in real-time"}
                      </p>
                    )}
                  </div>

                  {/* Mic error */}
                  {micError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">Mic issue</p>
                        <p className="text-xs opacity-90">{micError}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Troubleshooting */}
              <div className="bg-muted/40 border border-border rounded-2xl p-4 text-xs group">
                <h4 className="font-black text-foreground/40 mb-2 flex items-center tracking-widest uppercase text-[9px] group-hover:text-[#FFB800] transition-colors">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Troubleshooting
                </h4>
                <ul className="space-y-1.5 text-muted-foreground font-light">
                  <li className="flex items-start"><span className="w-1.5 h-1.5 rounded-full bg-[#00D1FF] mt-1.5 mr-3 flex-shrink-0" />Click "Allow" if asked for mic access</li>
                  <li className="flex items-start"><span className="w-1.5 h-1.5 rounded-full bg-[#00D1FF] mt-1.5 mr-3 flex-shrink-0" />Find a quiet spot for the AI assessment</li>
                </ul>
              </div>

              {/* Nav buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { stopListening(); setStep(2) }}
                  className="flex-1 py-3.5 rounded-xl border border-border text-sm font-semibold
                    hover:bg-foreground/5 transition-all flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => submitAndStart(false)}
                  disabled={!supported ? false : (!hasTested && !micError && testResult.trim().length === 0)}
                  className={cn(
                    "flex-[2] py-3.5 rounded-xl amber-button text-sm font-semibold",
                    "flex items-center justify-center gap-2 shadow-xl shadow-[#FFB800]/20",
                    "hover:scale-[1.02] active:scale-95 transition-all",
                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                    hasTested && !isTesting && !isValidating && "ring-2 ring-[#FFB800]/20 pulse-gentle"
                  )}
                >
                  {hasTested
                    ? <><CheckCircle2 className="w-4 h-4" /> I'm ready — Start</>
                    : "Confirm & start"
                  }
                </button>
              </div>

              {/* Text-mode fallback button */}
              {(!hasTested || micError) && supported && (
                <div className="flex justify-center mt-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                  <button
                    type="button"
                    onClick={() => submitAndStart(true)}
                    className="px-6 py-3 rounded-full border border-border/40 bg-muted/20 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 transition-all duration-300 hover:bg-brand-amber/5 hover:border-brand-amber/40 hover:text-brand-amber hover:scale-105 active:scale-95 flex items-center gap-3 group shadow-sm shadow-black/5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 group-hover:bg-brand-amber group-hover:animate-pulse transition-colors" />
                    Having trouble? Continue with text mode
                  </button>
                </div>
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
