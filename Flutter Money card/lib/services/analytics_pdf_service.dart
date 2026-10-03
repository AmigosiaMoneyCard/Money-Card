import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/analytics.dart';

/// Section options for customizable Analytics PDF Report
class AnalyticsPdfSectionOptions {
  final bool includeFinancialOverview;
  final bool includeMenuAnalytics;

  const AnalyticsPdfSectionOptions({
    this.includeFinancialOverview = true,
    this.includeMenuAnalytics = true,
  });

  bool get includeOverview => includeFinancialOverview;
  bool get includeProductsDemand => includeMenuAnalytics;
  bool get includeOperations => false;

  int get activeCount {
    int c = 0;
    if (includeFinancialOverview) c++;
    if (includeMenuAnalytics) c++;
    return c;
  }

  AnalyticsPdfSectionOptions copyWith({
    bool? includeFinancialOverview,
    bool? includeMenuAnalytics,
    bool? includeOverview,
    bool? includeProductsDemand,
    bool? includeOperations,
  }) {
    return AnalyticsPdfSectionOptions(
      includeFinancialOverview: includeFinancialOverview ?? includeOverview ?? this.includeFinancialOverview,
      includeMenuAnalytics: includeMenuAnalytics ?? includeProductsDemand ?? this.includeMenuAnalytics,
    );
  }
}

class AnalyticsPdfService {
  AnalyticsPdfService._();

  /// Generates standard publication-quality PDF bytes for Branch Analytics
  static Future<Uint8List> generateAnalyticsPdf({
    required BranchPerformanceMetric analytics,
    required String branchName,
    required String timeWindow,
    required AnalyticsPdfSectionOptions sections,
    String organizationName = 'Money Card Cafeteria',
  }) async {
    if (!sections.includeFinancialOverview && !sections.includeMenuAnalytics) {
      throw ArgumentError('At least one section must be selected to generate the analytics report.');
    }

    final pdf = pw.Document();

    final primaryColor = PdfColor.fromHex('#047857'); // Emerald 700
    final primaryLight = PdfColor.fromHex('#ECFDF5'); // Emerald 50
    final textDark = PdfColor.fromHex('#0F172A'); // Slate 900
    final textMuted = PdfColor.fromHex('#64748B'); // Slate 500
    final borderColor = PdfColor.fromHex('#E2E8F0'); // Slate 200
    final bgLight = PdfColor.fromHex('#F8FAFC'); // Slate 50

    final nowStr = DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.now());
    final currencyFmt = NumberFormat.currency(symbol: 'INR ', decimalDigits: 2);

    final String reportTitle;
    if (sections.includeFinancialOverview && !sections.includeMenuAnalytics) {
      reportTitle = 'FINANCIAL OVERVIEW REPORT';
    } else if (sections.includeMenuAnalytics && !sections.includeFinancialOverview) {
      reportTitle = 'MENU ANALYTICS REPORT';
    } else {
      reportTitle = 'ANALYTICS REPORT';
    }

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (pw.Context context) {
          return pw.Container(
            padding: const pw.EdgeInsets.only(bottom: 12),
            decoration: pw.BoxDecoration(
              border: pw.Border(bottom: pw.BorderSide(color: borderColor, width: 1)),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      children: [
                        pw.Container(
                          padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: pw.BoxDecoration(
                            color: primaryColor,
                            borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                          ),
                          child: pw.Text(
                            'MONEY CARD',
                            style: pw.TextStyle(
                              color: PdfColors.white,
                              fontSize: 9,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        ),
                        pw.SizedBox(width: 8),
                        pw.Text(
                          organizationName,
                          style: pw.TextStyle(
                            fontSize: 11,
                            fontWeight: pw.FontWeight.bold,
                            color: textDark,
                          ),
                        ),
                      ],
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Branch: $branchName  |  Time Window: $timeWindow',
                      style: pw.TextStyle(fontSize: 10, color: textMuted),
                    ),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text(
                      reportTitle,
                      style: pw.TextStyle(
                        fontSize: 12,
                        fontWeight: pw.FontWeight.bold,
                        color: primaryColor,
                      ),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      nowStr,
                      style: pw.TextStyle(fontSize: 8, color: textMuted),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
        footer: (pw.Context context) {
          return pw.Container(
            margin: const pw.EdgeInsets.only(top: 16),
            padding: const pw.EdgeInsets.only(top: 8),
            decoration: pw.BoxDecoration(
              border: pw.Border(top: pw.BorderSide(color: borderColor, width: 0.8)),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'Confidential \u2022 Generated by Money Card Staff Platform',
                  style: pw.TextStyle(fontSize: 8, color: textMuted),
                ),
                pw.Text(
                  'Page ${context.pageNumber} of ${context.pagesCount}',
                  style: pw.TextStyle(fontSize: 8, color: textMuted),
                ),
              ],
            ),
          );
        },
        build: (pw.Context context) {
          return [
            pw.SizedBox(height: 12),

            // Report Scope Banner
            pw.Container(
              padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: pw.BoxDecoration(
                color: primaryLight,
                borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                border: pw.Border.all(color: PdfColor.fromHex('#A7F3D0'), width: 0.8),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'Branch Performance Overview \u2014 $branchName',
                    style: pw.TextStyle(
                      fontSize: 11,
                      fontWeight: pw.FontWeight.bold,
                      color: primaryColor,
                    ),
                  ),
                  pw.Text(
                    'Status: ${analytics.status}',
                    style: pw.TextStyle(
                      fontSize: 10,
                      fontWeight: pw.FontWeight.bold,
                      color: primaryColor,
                    ),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 16),

            // ── OPTION 1: Executive Overview & Revenue ──────────────────
            if (sections.includeFinancialOverview) ...[
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                decoration: pw.BoxDecoration(
                  color: bgLight,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                  border: pw.Border.all(color: borderColor, width: 0.8),
                ),
                child: pw.Text(
                  '1. Overview & Financial Revenue Summary',
                  style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                    color: textDark,
                  ),
                ),
              ),
              pw.SizedBox(height: 8),

              pw.Table(
                border: pw.TableBorder.all(color: borderColor, width: 0.8),
                children: [
                  pw.TableRow(
                    decoration: pw.BoxDecoration(color: bgLight),
                    children: [
                      _buildHeaderCell('Metric Description'),
                      _buildHeaderCell('Activity Count', alignRight: true),
                      _buildHeaderCell('Financial Volume (INR)', alignRight: true),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      _buildCell('Recharge Amount'),
                      _buildCell('${analytics.rechargeCount} top-ups', alignRight: true),
                      _buildCell(currencyFmt.format(analytics.rechargeVolume), alignRight: true, isBold: true),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      _buildCell('Total Sales'),
                      _buildCell('${analytics.transactionCount} transactions', alignRight: true),
                      _buildCell(currencyFmt.format(analytics.netMoneyCollected), alignRight: true, isBold: true),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      _buildCell('Wallet Refund'),
                      _buildCell('${analytics.refundCount} refunds', alignRight: true),
                      _buildCell('- ${currencyFmt.format(analytics.refundVolume)}', alignRight: true),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      _buildCell('Cancelled Amount'),
                      _buildCell('${analytics.cancelledTopUpsCount} cancelled', alignRight: true),
                      _buildCell(currencyFmt.format(analytics.cancelledTopUps), alignRight: true),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      _buildCell('Food Sales (POS Purchases)'),
                      _buildCell('${analytics.purchaseCount} orders', alignRight: true),
                      _buildCell(currencyFmt.format(analytics.purchaseVolume), alignRight: true),
                    ],
                  ),
                  pw.TableRow(
                    decoration: pw.BoxDecoration(color: primaryLight),
                    children: [
                      _buildCell('Wallet Activation', isBold: true),
                      _buildCell('${analytics.cardsGivenOut} cards issued', alignRight: true, isBold: true),
                      _buildCell('${analytics.activeSessionsCount} active | ${analytics.settledSessionsCount} settled', alignRight: true, isBold: true),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 16),
            ],

            // ── OPTION 2: Menu Analytics ──────────────────────────────
            if (sections.includeMenuAnalytics) ...[
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                decoration: pw.BoxDecoration(
                  color: bgLight,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                  border: pw.Border.all(color: borderColor, width: 0.8),
                ),
                child: pw.Text(
                  sections.includeFinancialOverview ? '2. Menu Analytics' : '1. Menu Analytics',
                  style: pw.TextStyle(
                    fontSize: 11,
                    fontWeight: pw.FontWeight.bold,
                    color: textDark,
                  ),
                ),
              ),
              pw.SizedBox(height: 8),

              pw.Table(
                border: pw.TableBorder.all(color: borderColor, width: 0.8),
                children: [
                  pw.TableRow(
                    decoration: pw.BoxDecoration(color: bgLight),
                    children: [
                      _buildHeaderCell('Menu Indicator'),
                      _buildHeaderCell('Activity Count', alignRight: true),
                      _buildHeaderCell('Financial Volume (INR)', alignRight: true),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      _buildCell('Food Sales'),
                      _buildCell('${analytics.purchaseCount} orders', alignRight: true),
                      _buildCell(currencyFmt.format(analytics.purchaseVolume), alignRight: true, isBold: true),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      _buildCell('Cancelled Orders'),
                      _buildCell('${analytics.cancelledOrdersCount} orders', alignRight: true, isBold: true),
                      _buildCell('${currencyFmt.format(analytics.cancelledOrdersVolume)} cancelled', alignRight: true),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 12),

              if (analytics.productDemand != null && analytics.productDemand!.isNotEmpty) ...[
                pw.Text(
                  'All Ordered Menu Items',
                  style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: textMuted),
                ),
                pw.SizedBox(height: 4),
                pw.Table(
                  border: pw.TableBorder.all(color: borderColor, width: 0.8),
                  children: [
                    pw.TableRow(
                      decoration: pw.BoxDecoration(color: bgLight),
                      children: [
                        _buildHeaderCell('#', width: 24),
                        _buildHeaderCell('Product Name'),
                        _buildHeaderCell('Quantity Sold', alignRight: true),
                        _buildHeaderCell('Total Revenue (INR)', alignRight: true),
                      ],
                    ),
                    for (int i = 0; i < analytics.productDemand!.length; i++)
                      pw.TableRow(
                        children: [
                          _buildCell('${i + 1}', width: 24),
                          _buildCell(analytics.productDemand![i].productName, isBold: true),
                          _buildCell('${analytics.productDemand![i].quantitySold}', alignRight: true),
                          _buildCell(currencyFmt.format(analytics.productDemand![i].totalRevenue), alignRight: true),
                        ],
                      ),
                  ],
                ),
                pw.SizedBox(height: 12),
              ],
            ],

            if (sections.activeCount == 0)
              pw.Center(
                child: pw.Padding(
                  padding: const pw.EdgeInsets.all(32),
                  child: pw.Text(
                    'No sections selected. Please enable at least one section to display report data.',
                    style: pw.TextStyle(fontSize: 11, color: textMuted, fontStyle: pw.FontStyle.italic),
                  ),
                ),
              ),
          ];
        },
      ),
    );

    return pdf.save();
  }

  /// Downloads or shares the generated PDF binary file on the device
  static Future<void> downloadOrSharePdf({
    required Uint8List pdfBytes,
    required String filename,
  }) async {
    await Printing.sharePdf(
      bytes: pdfBytes,
      filename: filename,
    );
  }

  // Helper widget builders
  static pw.Widget _buildHeaderCell(String text, {bool alignRight = false, double? width}) {
    return pw.Container(
      width: width,
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      child: pw.Text(
        text,
        textAlign: alignRight ? pw.TextAlign.right : pw.TextAlign.left,
        style: pw.TextStyle(
          fontSize: 9,
          fontWeight: pw.FontWeight.bold,
          color: PdfColor.fromHex('#334155'),
        ),
      ),
    );
  }

  static pw.Widget _buildCell(
    String text, {
    bool alignRight = false,
    bool isBold = false,
    PdfColor? color,
    double? width,
  }) {
    return pw.Container(
      width: width,
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      child: pw.Text(
        text,
        textAlign: alignRight ? pw.TextAlign.right : pw.TextAlign.left,
        style: pw.TextStyle(
          fontSize: 9,
          fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
          color: color ?? PdfColor.fromHex('#1E293B'),
        ),
      ),
    );
  }
}
