import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { InterviewProvider } from "@/context/InterviewContext";
import { MobileNotice } from "@/components/ui/MobileNotice";
import { BrowserTip } from "@/components/ui/BrowserTip";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Cuemath Tutor Screening | AI-Powered Interview",
  description: "Complete your Cuemath tutor screening interview in under 10 minutes. Our AI interviewer will guide you through a friendly, voice-based conversation to assess your teaching potential.",
  keywords: ["Cuemath", "tutor screening", "AI interview", "teaching assessment"],
  authors: [{ name: "Shivanand Verma (starkbbk)" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lexend.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="cuemath-theme"
        >
          <InterviewProvider>
            <MobileNotice />
            <BrowserTip />
            {children}
          </InterviewProvider>

        </ThemeProvider>
      </body>
    </html>
  );
}

