import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QueryResult } from '@/types/chat';

export const exportToPDF = async (
  visualizationElement: HTMLElement,
  result: QueryResult,
  query: string
) => {
  try {
    // Create new PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add title
    pdf.setFontSize(16);
    pdf.text(`Data Visualization: ${query}`, 20, 20);
    
    // Add timestamp
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    
    // Capture the visualization as an image
    const canvas = await html2canvas(visualizationElement, {
      scale: 2,
      logging: false,
      useCORS: true,
    });
    
    // Add the visualization image
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pageWidth - 40; // 20mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 20, 40, imgWidth, imgHeight);
    
    // Add summary if available
    let currentY = 40 + imgHeight + 10;
    if (result.summary) {
      pdf.setFontSize(12);
      pdf.text('Summary:', 20, currentY);
      currentY += 10;
      
      pdf.setFontSize(10);
      const splitSummary = pdf.splitTextToSize(result.summary, pageWidth - 40);
      pdf.text(splitSummary, 20, currentY);
      currentY += (splitSummary.length * 5) + 10;
    }
    
    // Add insights if available
    if (result.insights && result.insights.length > 0) {
      // Check if we need a new page
      if (currentY > pageHeight - 60) {
        pdf.addPage();
        currentY = 20;
      }
      
      pdf.setFontSize(12);
      pdf.text('Key Insights:', 20, currentY);
      currentY += 10;
      
      pdf.setFontSize(10);
      result.insights.forEach((insight) => {
        // Check if we need a new page
        if (currentY > pageHeight - 20) {
          pdf.addPage();
          currentY = 20;
        }
        
        const splitInsight = pdf.splitTextToSize(`• ${insight}`, pageWidth - 40);
        pdf.text(splitInsight, 20, currentY);
        currentY += (splitInsight.length * 5) + 5;
      });
    }
    
    // Save the PDF
    pdf.save(`visualization-${new Date().getTime()}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}; 