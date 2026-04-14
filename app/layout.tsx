import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { InterviewProvider } from "@/context/InterviewContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Cuemath Tutor Screening | AI-Powered Interview",
  description: "Complete your Cuemath tutor screening interview in under 10 minutes. Our AI interviewer will guide you through a friendly, voice-based conversation to assess your teaching potential.",
  keywords: ["Cuemath", "tutor screening", "AI interview", "teaching assessment"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <InterviewProvider>
          {children}
        </InterviewProvider>
      </body>
    </html>
  );
}
