import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/analytics.dart';
import '../../services/analytics_pdf_service.dart';

class AnalyticsPdfPreviewDialog extends StatefulWidget {
  final BranchPerformanceMetric analytics;
  final String branchName;
  final String timeWindow;

  const AnalyticsPdfPreviewDialog({
    super.key,
    required this.analytics,
    required this.branchName,
    required this.timeWindow,
  });

  static Future<void> show({
    required BuildContext context,
    required BranchPerformanceMetric analytics,
    required String branchName,
    required String timeWindow,
  }) {
    return showDialog<void>(
      context: context,
      useSafeArea: false,
      barrierDismissible: true,
      builder: (context) => AnalyticsPdfPreviewDialog(
        analytics: analytics,
        branchName: branchName,
        timeWindow: timeWindow,
      ),
    );
  }

  @override
  State<AnalyticsPdfPreviewDialog> createState() => _AnalyticsPdfPreviewDialogState();
}

class _AnalyticsPdfPreviewDialogState extends State<AnalyticsPdfPreviewDialog> {
  AnalyticsPdfSectionOptions _sections = const AnalyticsPdfSectionOptions(
    includeOverview: true,
    includeOperations: true,
    includeProductsDemand: true,
  );

  Uint8List? _lastGeneratedBytes;
  bool _isExporting = false;

  void _toggleSection(String key) {
    setState(() {
      if (key == 'overview') {
        _sections = _sections.copyWith(includeOverview: !_sections.includeOverview);
      } else if (key == 'operations') {
        _sections = _sections.copyWith(includeOperations: !_sections.includeOperations);
      } else if (key == 'products') {
        _sections = _sections.copyWith(includeProductsDemand: !_sections.includeProductsDemand);
      }
    });
  }

  void _setAll(bool enable) {
    setState(() {
      _sections = AnalyticsPdfSectionOptions(
        includeOverview: enable,
        includeOperations: enable,
        includeProductsDemand: enable,
      );
    });
  }

  Future<void> _handleDownload() async {
    if (_isExporting) return;
    setState(() => _isExporting = true);

    try {
      final bytes = _lastGeneratedBytes ??
          await AnalyticsPdfService.generateAnalyticsPdf(
            analytics: widget.analytics,
            branchName: widget.branchName,
            timeWindow: widget.timeWindow,
            sections: _sections,
          );

      final dateStr = DateTime.now().toIso8601String().split('T').first;
      final safeBranch = widget.branchName.replaceAll(RegExp(r'\s+'), '_');
      final filename = 'MoneyCard_Analytics_${safeBranch}_$dateStr.pdf';

      await AnalyticsPdfService.downloadOrSharePdf(
        pdfBytes: bytes,
        filename: filename,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download PDF: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isExporting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _sections.activeCount;

    return Scaffold(
      backgroundColor: AppColors.surfaceLight,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Analytics Report — PDF Preview',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              '${widget.branchName} \u2022 ${widget.timeWindow}',
              style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Download / Share PDF',
            icon: _isExporting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  )
                : const Icon(Icons.download, color: AppColors.primary),
            onPressed: _handleDownload,
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Option-Wise Section Customizer Toolbar ───────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: AppColors.borderLight)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.tune, size: 16, color: AppColors.primary),
                        SizedBox(width: 6),
                        Text(
                          'Customize Report Sections',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        InkWell(
                          onTap: () => _setAll(true),
                          borderRadius: BorderRadius.circular(4),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            child: Text(
                              'Select All',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ),
                        const Text(' | ', style: TextStyle(color: AppColors.textTertiaryLight, fontSize: 12)),
                        InkWell(
                          onTap: () => _setAll(false),
                          borderRadius: BorderRadius.circular(4),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            child: Text(
                              'Clear All',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textSecondaryLight,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),

                // 3 Interactive Click Option Pills (like in Org Admin Page)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildOptionPill(
                        id: 'overview',
                        label: '1. Overview & Revenue',
                        icon: Icons.bar_chart,
                        isSelected: _sections.includeOverview,
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      _buildOptionPill(
                        id: 'operations',
                        label: '2. Operations & Inventory',
                        icon: Icons.inventory_2_outlined,
                        isSelected: _sections.includeOperations,
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      _buildOptionPill(
                        id: 'products',
                        label: '3. Products & Demand',
                        icon: Icons.restaurant_menu,
                        isSelected: _sections.includeProductsDemand,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Interactive PDF View ─────────────────────────────────────
          Expanded(
            child: PdfPreview(
              key: ValueKey('pdf_${_sections.includeOverview}_${_sections.includeOperations}_${_sections.includeProductsDemand}'),
              build: (format) async {
                final bytes = await AnalyticsPdfService.generateAnalyticsPdf(
                  analytics: widget.analytics,
                  branchName: widget.branchName,
                  timeWindow: widget.timeWindow,
                  sections: _sections,
                );
                _lastGeneratedBytes = bytes;
                return bytes;
              },
              canChangeOrientation: false,
              canChangePageFormat: false,
              canDebug: false,
              allowPrinting: true,
              allowSharing: true,
              pdfFileName: 'MoneyCard_Analytics_${widget.branchName}.pdf',
              loadingWidget: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
          ),

          // ── Bottom Action Bar ────────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.borderLight)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Close'),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: activeCount == 0 ? null : _handleDownload,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: _isExporting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.download, size: 18),
                    label: Text(
                      activeCount == 0
                          ? 'Download PDF (Empty)'
                          : 'Download PDF ($activeCount Section${activeCount > 1 ? "s" : ""})',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionPill({
    required String id,
    required String label,
    required IconData icon,
    required bool isSelected,
  }) {
    return InkWell(
      onTap: () => _toggleSection(id),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.borderLight,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
              size: 14,
              color: isSelected ? AppColors.primary : AppColors.textTertiaryLight,
            ),
            const SizedBox(width: 5),
            Icon(
              icon,
              size: 14,
              color: isSelected ? AppColors.primaryDark : AppColors.textSecondaryLight,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
