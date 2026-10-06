// ─── Customer Portal Receipt PDF Export Utility ─────────────────────────
// Generates clean, standard PDF statements and receipts for customers
// scanning their cafeteria wallet QR code. Uses jsPDF.

import { jsPDF } from 'jspdf';
import type { PublicSessionDetail, PublicReceipt, PublicTransaction } from '@/types';

export function formatPdfCurrency(amount: number | null | undefined): string {
  const safe = Number(amount) || 0;
  return `Rs. ${safe.toLocaleString('en-IN', {
    maximumFractionDigits: safe % 1 === 0 ? 0 : 2,
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
  })}`;
}

export interface CustomerReceiptPdfOptions {
  sessionDetail?: Partial<PublicSessionDetail>;
  receipts?: PublicReceipt[];
  transactions?: PublicTransaction[];
  organizationName?: string;
}

export function generateCustomerReceiptPdfBlob(options: CustomerReceiptPdfOptions): Blob {
  const {
    sessionDetail,
    receipts = [],
    transactions = [],
    organizationName = 'Cafeteria Dining',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let curY = 20;

  // Header Bar
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(margin, curY, contentWidth, 2.5, 'F');
  curY += 10;

  // Cafeteria Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(organizationName, margin, curY);

  // Counter & Subtitle
  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`${sessionDetail?.branchDisplayName || 'Main Counter'} - Customer Wallet Receipt`, margin, curY);

  // Date on right
  const issuedDate = sessionDetail?.startedAt
    ? new Date(sessionDetail.startedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-IN');
  doc.text(issuedDate, pageWidth - margin, curY, { align: 'right' });

  curY += 8;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(margin, curY, pageWidth - margin, curY);
  curY += 8;

  // Customer & Session Meta Card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, curY, contentWidth, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, 28, 3, 3, 'S');

  // Customer Name & Phone
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Customer Profile', margin + 5, curY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Name: ${sessionDetail?.customerName || 'Walk-in Customer'}`, margin + 5, curY + 13);
  doc.text(`Phone: ${sessionDetail?.customerPhone || 'Not provided'}`, margin + 5, curY + 19);
  doc.text(`Status: ${sessionDetail?.sessionStatus || 'ACTIVE'}`, margin + 5, curY + 24);

  // Wallet ID & Balance (Right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Wallet Information', margin + contentWidth / 2 + 5, curY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Wallet ID: ${sessionDetail?.cardDisplayNumber || 'Wallet Session'}`, margin + contentWidth / 2 + 5, curY + 13);
  doc.text(`Counter: ${sessionDetail?.branchDisplayName || 'Main Counter'}`, margin + contentWidth / 2 + 5, curY + 19);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`Live Balance: ${formatPdfCurrency(sessionDetail?.currentBalance ?? 0)}`, margin + contentWidth / 2 + 5, curY + 24);

  curY += 36;

  // Itemized Orders Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Itemized Purchased Items', margin, curY);

  curY += 5;

  // Table Columns: Item Name (85mm), Qty (25mm), Unit Price (30mm), Subtotal (34mm)
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, curY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('ITEM DESCRIPTION', margin + 3, curY + 4.8);
  doc.text('QTY', margin + 95, curY + 4.8, { align: 'center' });
  doc.text('PRICE', margin + 125, curY + 4.8, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 3, curY + 4.8, { align: 'right' });

  curY += 7;

  // Gather purchased items from receipts or transactions
  interface ReceiptLine {
    name: string;
    qty: number;
    price: number;
    total: number;
  }
  const itemsList: ReceiptLine[] = [];

  if (receipts.length > 0) {
    for (const r of receipts) {
      for (const it of r.items) {
        itemsList.push({
          name: it.itemName,
          qty: it.quantity,
          price: it.unitPrice,
          total: it.totalPrice,
        });
      }
    }
  } else if (transactions.length > 0) {
    for (const tx of transactions) {
      if (tx.items && tx.items.length > 0) {
        for (const it of tx.items) {
          itemsList.push({
            name: it.itemName,
            qty: it.quantity,
            price: it.unitPrice,
            total: it.totalPrice,
          });
        }
      }
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  if (itemsList.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text('No itemized food purchases recorded for this session.', margin + 3, curY + 6);
    curY += 12;
  } else {
    let subtotalSum = 0;
    for (const item of itemsList) {
      subtotalSum += item.total;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, curY + 7, pageWidth - margin, curY + 7);

      doc.setTextColor(30, 41, 59);
      const safeName = item.name.length > 40 ? item.name.slice(0, 37) + '...' : item.name;
      doc.text(safeName, margin + 3, curY + 5);
      doc.text(String(item.qty), margin + 95, curY + 5, { align: 'center' });
      doc.text(formatPdfCurrency(item.price), margin + 125, curY + 5, { align: 'right' });
      doc.text(formatPdfCurrency(item.total), pageWidth - margin - 3, curY + 5, { align: 'right' });

      curY += 7.5;
      if (curY > 260) {
        doc.addPage();
        curY = 20;
      }
    }
  }

  curY += 6;

  // Transaction Summary Totals
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pageWidth - margin - 75, curY, 75, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth - margin - 75, curY, 75, 28, 2, 2, 'S');

  let totalRecharges = 0;
  let totalPurchases = 0;
  for (const t of transactions) {
    const tType = String(t.type);
    if (tType.startsWith('RECHARGE')) {
      totalRecharges += Number(t.amount) || 0;
    } else if (tType === 'PURCHASE') {
      totalPurchases += Number(t.amount) || 0;
    }
  }

  // If no transactions passed, calculate from items
  if (totalPurchases === 0 && itemsList.length > 0) {
    totalPurchases = itemsList.reduce((acc, curr) => acc + curr.total, 0);
  }

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Recharges:', pageWidth - margin - 70, curY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`+${formatPdfCurrency(totalRecharges)}`, pageWidth - margin - 5, curY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Total Food Bills:', pageWidth - margin - 70, curY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text(`-${formatPdfCurrency(totalPurchases)}`, pageWidth - margin - 5, curY + 14, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(pageWidth - margin - 70, curY + 17.5, pageWidth - margin - 5, curY + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Closing Balance:', pageWidth - margin - 70, curY + 23);
  doc.setTextColor(5, 150, 105);
  doc.text(formatPdfCurrency(sessionDetail?.currentBalance ?? 0), pageWidth - margin - 5, curY + 23, { align: 'right' });

  curY += 38;

  // Footer & Verification Notice
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, curY, pageWidth - margin, curY);
  curY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for dining with us! For questions, present this receipt at the cafeteria counter.', margin, curY);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth - margin, curY, { align: 'right' });

  return doc.output('blob');
}

export function downloadCustomerReceiptPdf(options: CustomerReceiptPdfOptions): void {
  const blob = generateCustomerReceiptPdfBlob(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeId = (options.sessionDetail?.cardDisplayNumber || 'wallet').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = `receipt_${safeId}_${dateStr}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
