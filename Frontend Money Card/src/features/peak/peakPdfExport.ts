// ─── Peak & Food Demand Analytics PDF Export Utility ──────────────────
// Generates publication-quality standard PDF documents without any raw UUIDs.
// Supports option-wise customization (Peak Hour Metrics, 24-Hour Traffic, Food Demand).

import { jsPDF } from 'jspdf';
import type { PeakAnalyticsOverview } from '@/types';
import { formatCurrency } from '@/utils';

export interface PeakPdfSectionOptions {
  includeRushKpis: boolean;
  includeTrafficDistribution: boolean;
  includeFoodDemand: boolean;
}

export interface GeneratePeakPdfOptions {
  data: PeakAnalyticsOverview;
  selectedBranchName: string;
  dateRangeLabel: string;
  organizationName?: string;
  sections?: Partial<PeakPdfSectionOptions>;
}

export function buildPeakDemandJsPdf({
  data,
  selectedBranchName,
  dateRangeLabel,
  organizationName = 'Money Card Cafeteria',
  sections,
}: GeneratePeakPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const effectiveSections: PeakPdfSectionOptions = {
    includeRushKpis: sections?.includeRushKpis ?? true,
    includeTrafficDistribution: sections?.includeTrafficDistribution ?? true,
    includeFoodDemand: sections?.includeFoodDemand ?? true,
  };

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  function drawHeader(isContinuation = false) {
    doc.setFillColor(15, 23, 42); // Slate-900
    const h = isContinuation ? 14 : 24;
    doc.rect(margin, 12, contentWidth, h, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isContinuation ? 10 : 13);
    doc.setTextColor(255, 255, 255);
    const title = isContinuation
      ? `${organizationName.toUpperCase()} - PEAK & DEMAND REPORT (CONT.)`
      : `${organizationName.toUpperCase()} - PEAK & FOOD DEMAND REPORT`;
    doc.text(title, margin + 6, isContinuation ? 21 : 22);

    if (!isContinuation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const docId = `DOC-#${Date.now().toString().slice(-8)}`;
      doc.text(
        `Scope: Organization Admin  |  Document ID: ${docId}  |  Generated: ${new Date().toLocaleString()}`,
        margin + 6,
        30,
      );
    }
  }

  function addNewPage(): number {
    doc.addPage();
    drawHeader(true);
    return 32;
  }

  // Draw initial page header
  drawHeader(false);

  // Filter Bar on Page 1
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, 38, contentWidth, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Location Scope: ${selectedBranchName}`, margin + 4, 44);
  doc.text(`Date Range: ${dateRangeLabel}`, margin + 80, 44);
  doc.text(`Busiest Day: ${data.busiestDay || 'Friday'}`, margin + 140, 44);

  let curY = 54;
  let sectionCounter = 1;
  let hasAnySection = false;

  // 1. Section 1: Executive Demand KPIs
  if (effectiveSections.includeRushKpis) {
    hasAnySection = true;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionCounter}. Operational Rush & Peak Hour Metrics`, margin, curY);
    sectionCounter++;

    const kpis = [
      { label: 'Busiest Peak Hour', val: data.comparison?.busiestHour || '13:00' },
      { label: 'Peak Hours Volume', val: formatCurrency(data.comparison?.peakVolume || 0) },
      { label: 'Peak Transactions', val: (data.comparison?.peakTransactions || 0).toLocaleString() },
      { label: 'Busiest Branch', val: data.comparison?.busiestBranchName || selectedBranchName },
    ];

    const cardW = (contentWidth - 9) / 4;
    kpis.forEach((kpi, idx) => {
      const x = margin + idx * (cardW + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, curY + 4, cardW, 18, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 3, curY + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.val.substring(0, 18), x + 3, curY + 17);
    });

    curY += 28;
  }

  // 2. Section 2: 24-Hour Traffic & Volume Distribution
  if (effectiveSections.includeTrafficDistribution) {
    hasAnySection = true;
    if (curY > 210) {
      curY = addNewPage();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionCounter}. 24-Hour Traffic & Volume Distribution`, margin, curY);
    sectionCounter++;

    const tableY = curY + 4;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, tableY, contentWidth, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Hour Window', margin + 4, tableY + 5);
    doc.text('Transactions', margin + 45, tableY + 5);
    doc.text('Purchases', margin + 80, tableY + 5);
    doc.text('Recharges', margin + 115, tableY + 5);
    doc.text('Hourly Volume (INR)', margin + 150, tableY + 5);

    curY = tableY + 7;
    const hourlyRows = data.hourlyDistribution || [];

    if (hourlyRows.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('No hourly distribution data available for this range.', margin + 4, curY + 5);
      curY += 8;
    } else {
      hourlyRows.forEach((row, idx) => {
        if (curY > 265) {
          curY = addNewPage();
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.rect(margin, curY, contentWidth, 7, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          doc.text('Hour Window (Cont.)', margin + 4, curY + 5);
          doc.text('Transactions', margin + 45, curY + 5);
          doc.text('Purchases', margin + 80, curY + 5);
          doc.text('Recharges', margin + 115, curY + 5);
          doc.text('Hourly Volume (INR)', margin + 150, curY + 5);
          curY += 7;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, curY, contentWidth, 5.5, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, curY + 5.5, margin + contentWidth, curY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        const nextH = (row.hour + 1) % 24;
        const windowLabel = `${row.hourLabel} - ${String(nextH).padStart(2, '0')}:00`;
        doc.text(windowLabel, margin + 4, curY + 4);
        doc.text(String(row.transactionCount), margin + 45, curY + 4);
        doc.text(String(row.purchaseCount), margin + 80, curY + 4);
        doc.text(String(row.rechargeCount), margin + 115, curY + 4);
        doc.text(formatCurrency(row.totalVolume), margin + 150, curY + 4);

        curY += 5.5;
      });
      curY += 6;
    }
  }

  // 3. Section 3: Food & Product Demand Table
  if (effectiveSections.includeFoodDemand) {
    hasAnySection = true;
    if (curY > 210) {
      curY = addNewPage();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionCounter}. Top Food & Item Demand Summary`, margin, curY);
    sectionCounter++;

    const prodTableY = curY + 4;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, prodTableY, contentWidth, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Food / Product Item', margin + 4, prodTableY + 5);
    doc.text('Gross Revenue', margin + 68, prodTableY + 5);
    doc.text('Stock Status', margin + 105, prodTableY + 5);
    doc.text('Units Sold', margin + 138, prodTableY + 5);
    doc.text('Category', margin + 165, prodTableY + 5);

    curY = prodTableY + 7;
    const products = data.productDemand || [];

    if (products.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('No product demand records available for this filter.', margin + 4, curY + 5);
      curY += 8;
    } else {
      products.forEach((p, idx) => {
        if (curY > 265) {
          curY = addNewPage();
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.rect(margin, curY, contentWidth, 7, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          doc.text('Food / Product Item (Cont.)', margin + 4, curY + 5);
          doc.text('Gross Revenue', margin + 68, curY + 5);
          doc.text('Stock Status', margin + 105, curY + 5);
          doc.text('Units Sold', margin + 138, curY + 5);
          doc.text('Category', margin + 165, curY + 5);
          curY += 7;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, curY, contentWidth, 5.5, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, curY + 5.5, margin + contentWidth, curY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(p.productName.substring(0, 30), margin + 4, curY + 4);
        doc.text(formatCurrency(p.revenue), margin + 68, curY + 4);
        const stockText = p.currentStock !== undefined
          ? `${p.stockStatus.replace(/_/g, ' ')} (${p.currentStock})`
          : p.stockStatus.replace(/_/g, ' ');
        doc.text(stockText.substring(0, 16), margin + 105, curY + 4);
        doc.text(`${p.quantitySold} units`, margin + 138, curY + 4);
        doc.text(p.category.substring(0, 16), margin + 165, curY + 4);

        curY += 5.5;
      });
      curY += 6;
    }
  }

  // Empty state if no section is selected
  if (!hasAnySection) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, 70, contentWidth, 36, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text('No Report Sections Selected', margin + 10, 84);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Please select at least one report section (Peak Hour Metrics, 24-Hour Traffic, or Food Demand)',
      margin + 10,
      92,
    );
    doc.text(
      'using the option toggles in the preview window to generate and download content.',
      margin + 10,
      98,
    );
  }

  // Draw Footer on all generated pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, 282, margin + contentWidth, 282);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated via Money Card Enterprise Platform  •  Confidential & Proprietary', margin, 287);
    doc.text(`Page ${i} of ${totalPages}`, margin + contentWidth - 20, 287);
  }

  return doc;
}

export function generatePeakDemandPdfBlob(options: GeneratePeakPdfOptions): Blob {
  const doc = buildPeakDemandJsPdf(options);
  return doc.output('blob');
}

export function downloadPeakDemandPdf(options: GeneratePeakPdfOptions, filename: string): void {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const doc = buildPeakDemandJsPdf(options);
  doc.save(safeFilename);
}
