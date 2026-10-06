import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:money_card_staff/models/analytics.dart';
import 'package:money_card_staff/services/analytics_pdf_service.dart';
import 'package:money_card_staff/widgets/analytics/analytics_pdf_preview_dialog.dart';

void main() {
  const testMetric = BranchPerformanceMetric(
    branchId: 'b-1',
    branchName: 'Main Cafeteria',
    transactionCount: 148,
    purchaseCount: 96,
    purchaseVolume: 18450.0,
    rechargeCount: 52,
    rechargeVolume: 24800.0,
    totalRevenue: 43250.0,
    netMoneyCollected: 43250.0,
    activeSessionsCount: 12,
    settledSessionsCount: 84,
    avgTransactionValue: 292.23,
    avgPurchaseValue: 192.19,
    inventoryItemCount: 10,
    lowStockItemCount: 2,
    productDemand: [
      ProductDemand(
        productId: 'p-1',
        productName: 'Veg Burger',
        quantitySold: 42,
        totalRevenue: 5040.0,
      ),
      ProductDemand(
        productId: 'p-2',
        productName: 'Paneer Wrap',
        quantitySold: 28,
        totalRevenue: 3920.0,
      ),
    ],
    peakPeriods: [
      PeakPeriod(
        timeSlot: '12:00 PM – 1:00 PM',
        activityLevel: 'Highest',
        transactionCount: 54,
        purchaseVolume: 7200.0,
      ),
    ],
  );

  group('AnalyticsPdfService Unit Tests', () {
    test('generates valid PDF when both Financial Overview and Menu Analytics are selected', () async {
      final bytes = await AnalyticsPdfService.generateAnalyticsPdf(
        analytics: testMetric,
        branchName: 'Main Cafeteria',
        timeWindow: 'today',
        sections: const AnalyticsPdfSectionOptions(
          includeFinancialOverview: true,
          includeMenuAnalytics: true,
        ),
      );

      expect(bytes, isNotEmpty);
      expect(bytes.length, greaterThan(200));
      expect(String.fromCharCodes(bytes.take(5)), equals('%PDF-'));
    });

    test('generates valid PDF when only Financial Overview is selected', () async {
      final bytes = await AnalyticsPdfService.generateAnalyticsPdf(
        analytics: testMetric,
        branchName: 'Main Cafeteria',
        timeWindow: 'today',
        sections: const AnalyticsPdfSectionOptions(
          includeFinancialOverview: true,
          includeMenuAnalytics: false,
        ),
      );

      expect(bytes, isNotEmpty);
      expect(String.fromCharCodes(bytes.take(5)), equals('%PDF-'));
    });

    test('generates valid PDF when only Menu Analytics is selected', () async {
      final bytes = await AnalyticsPdfService.generateAnalyticsPdf(
        analytics: testMetric,
        branchName: 'Main Cafeteria',
        timeWindow: 'today',
        sections: const AnalyticsPdfSectionOptions(
          includeFinancialOverview: false,
          includeMenuAnalytics: true,
        ),
      );

      expect(bytes, isNotEmpty);
      expect(String.fromCharCodes(bytes.take(5)), equals('%PDF-'));
    });

    test('throws ArgumentError when no sections are selected', () async {
      expect(
        AnalyticsPdfService.generateAnalyticsPdf(
          analytics: testMetric,
          branchName: 'Main Cafeteria',
          timeWindow: 'today',
          sections: const AnalyticsPdfSectionOptions(
            includeFinancialOverview: false,
            includeMenuAnalytics: false,
          ),
        ),
        throwsArgumentError,
      );
    });
  });

  group('AnalyticsPdfPreviewDialog Widget Tests', () {
    testWidgets('renders checkboxes for Financial Overview and Menu Analytics, allows independent toggling', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AnalyticsPdfPreviewDialog(
              analytics: testMetric,
              branchName: 'Main Cafeteria',
              timeWindow: 'today',
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Verify header and both checkbox titles
      expect(find.text('Analytics Report — PDF Preview'), findsOneWidget);
      expect(find.text('Financial Overview'), findsOneWidget);
      expect(find.text('Menu Analytics'), findsOneWidget);

      // Initially both checkboxes selected -> Download Selected PDF (2) button
      expect(find.text('Download Selected PDF (2)'), findsOneWidget);

      // Tap on Financial Overview card to uncheck it
      await tester.tap(find.text('Financial Overview'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Now only 1 is selected -> Download Selected PDF (1)
      expect(find.text('Download Selected PDF (1)'), findsOneWidget);

      // Tap on Menu Analytics card to uncheck it
      await tester.tap(find.text('Menu Analytics'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Now 0 selected -> Select at least 1 report
      expect(find.text('Select at least 1 report'), findsOneWidget);

      // Tap Menu Analytics card to re-check it
      await tester.tap(find.text('Menu Analytics'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Download Selected PDF (1)'), findsOneWidget);
    });
  });
}
