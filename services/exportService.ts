
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { Opportunity } from '../types';

export const exportToPDF = (opportunities: Opportunity[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Header
  doc.setFillColor(34, 197, 94); // Green-500
  doc.rect(0, 0, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CROSSPECTOR PRO - Opportunity Report', margin, 10);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos += 10;

  opportunities.forEach((opp, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Card Background
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 55, 3, 3, 'F');
    
    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(opp.name, margin + 5, yPos + 10);

    // Strategy & Risk
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`${opp.strategyType} | Risk: ${opp.riskLevel}`, margin + 5, yPos + 16);

    // Prices
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Buy: ${opp.buyPrice}`, margin + 5, yPos + 25);
    doc.text(`Sell: ${opp.sellPrice}`, margin + 60, yPos + 25);
    doc.setTextColor(34, 197, 94);
    doc.text(`ROI: +${opp.predictedProfitPercent}%`, margin + 115, yPos + 25);

    // Secret Sauce
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'italic');
    const splitSauce = doc.splitTextToSize(opp.secretSauce, pageWidth - (margin * 2) - 10);
    doc.text(splitSauce, margin + 5, yPos + 35);

    // Link
    doc.setTextColor(0, 0, 255);
    doc.textWithLink('View Listing', margin + 5, yPos + 50, { url: opp.sourceUrl });

    yPos += 65;
  });

  doc.save('crosspector-pro-report.pdf');
  // Fallback for some WebViews that don't trigger download automatically
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    // Attempt to open if save didn't trigger (hard to detect, but harmless to log)
    console.log("PDF generated. If download didn't start, check permissions.");
  } catch (e) {
    console.error("Export error:", e);
  }
};

export const exportToDOCX = async (opportunities: Opportunity[]) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "CROSSPECTOR PRO - Opportunity Report",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        ...opportunities.flatMap((opp) => [
          new Paragraph({
            children: [
              new TextRun({
                text: opp.name,
                bold: true,
                size: 28,
                color: "22C55E",
              }),
            ],
            spacing: { before: 400, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${opp.strategyType} | Risk: ${opp.riskLevel}`,
                italics: true,
                color: "666666",
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Buy Price", bold: true })],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Sell Price", bold: true })],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "ROI", bold: true })],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: `${opp.buyPrice}` })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: `${opp.sellPrice}` })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: `+${opp.predictedProfitPercent}%`, color: "22C55E" })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Strategy: ",
                bold: true,
              }),
              new TextRun({
                text: opp.secretSauce,
              }),
            ],
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Link: ",
                bold: true,
              }),
              new TextRun({
                text: opp.sourceUrl,
                color: "0000FF",
                underline: {},
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "--------------------------------------------------",
            alignment: AlignmentType.CENTER,
            color: "CCCCCC",
          }),
        ]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "crosspector-pro-report.docx");
  
  // Fallback logging
  try {
    const url = URL.createObjectURL(blob);
    console.log("DOCX generated. If download didn't start, check permissions.");
  } catch (e) {
    console.error("Export error:", e);
  }
};
