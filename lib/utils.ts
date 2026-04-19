import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDuration(startTime: number, endTime: number): string {
  const totalSeconds = Math.floor((endTime - startTime) / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generatePDF(elementId: string, filename: string): Promise<void> {
  const { default: html2canvas } = await import('html2canvas-pro');
  const { default: jsPDF } = await import('jspdf');

  const element = document.getElementById(elementId);
  if (!element) throw new Error("Target element not found");

  // Wait for images to be loaded (with a safety timeout)
  const images = Array.from(element.getElementsByTagName('img'));
  const imagePromises = images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // resolve on error too
    });
  });

  // Safety timeout of 5 seconds for image loading
  await Promise.race([
    Promise.all(imagePromises),
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15; // 15mm margins
    const contentWidth = pdfWidth - (margin * 2);
    
    // Find all sections marked for individual capture
    const sections = Array.from(element.querySelectorAll('[data-pdf-section]'));
    let currentY = margin;

    // Capture sections one by one
    for (const section of sections) {
      const sectionCanvas = await html2canvas(section as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Still use onclone to ensure light mode styles are applied during capture
        onclone: (clonedDoc) => {
          const root = clonedDoc.documentElement;
          root.classList.remove('dark');
          root.classList.add('light');
          root.style.colorScheme = 'light';
        }
      });

      const sectionImgData = sectionCanvas.toDataURL('image/png', 1.0);
      const sectionImgWidth = contentWidth;
      const sectionImgHeight = (sectionCanvas.height * sectionImgWidth) / sectionCanvas.width;

      // Check if we need to start a new page
      if (currentY + sectionImgHeight > pdfHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }

      // Add the section to the current page
      pdf.addImage(sectionImgData, 'PNG', margin, currentY, sectionImgWidth, sectionImgHeight);
      currentY += sectionImgHeight + 5; // 5mm spacing between sections
    }

    pdf.save(filename);
  } catch (error) {
    console.error("[PDF] Generation failed:", error);
    throw error;
  }
}
