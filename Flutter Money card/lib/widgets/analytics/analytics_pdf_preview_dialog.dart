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
    includeFinancialOverview: true,
    includeMenuAnalytics: true,
  );

  Uint8List? _lastGeneratedBytes;
  bool _isExporting = false;

  void _toggleSection(String key) {
    setState(() {
      if (key == 'financial' || key == 'overview') {
        _sections = _sections.copyWith(includeFinancialOverview: !_sections.includeFinancialOverview);
      } else if (key == 'menu' || key == 'products') {
        _sections = _sections.copyWith(includeMenuAnalytics: !_sections.includeMenuAnalytics);
      }
    });
  }

  void _setAll(bool enable) {
    setState(() {
      _sections = AnalyticsPdfSectionOptions(
        includeFinancialOverview: enable,
        includeMenuAnalytics: enable,
      );
    });
  }

  Future<void> _handleDownload() async {
    if (_isExporting || _sections.activeCount == 0) return;
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
      final String filename;
      if (_sections.includeFinancialOverview && !_sections.includeMenuAnalytics) {
        filename = 'MoneyCard_Financial_Overview_${safeBranch}_$dateStr.pdf';
      } else if (_sections.includeMenuAnalytics && !_sections.includeFinancialOverview) {
        filename = 'MoneyCard_Menu_Analytics_${safeBranch}_$dateStr.pdf';
      } else {
        filename = 'MoneyCard_Analytics_${safeBranch}_$dateStr.pdf';
      }

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
            onPressed: activeCount == 0 ? null : _handleDownload,
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Clickable Checkbox Section Selector ──────────────────────
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
                          'Select Sections to Include & Download',
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
                              'Select Both',
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

                // 2 Clickable Checkbox Cards
                Row(
                  children: [
                    Expanded(
                      child: _buildCheckboxCard(
                        id: 'financial',
                        label: 'Financial Overview',
                        subtitle: 'Recharge, sales, refunds, cancellations & wallets',
                        icon: Icons.account_balance_wallet_outlined,
                        isSelected: _sections.includeFinancialOverview,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Expanded(
                      child: _buildCheckboxCard(
                        id: 'menu',
                        label: 'Menu Analytics',
                        subtitle: 'Food sales, cancelled orders & ordered items',
                        icon: Icons.restaurant_menu,
                        isSelected: _sections.includeMenuAnalytics,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ── Interactive PDF View ─────────────────────────────────────
          Expanded(
            child: activeCount == 0
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.picture_as_pdf_outlined, size: 56, color: AppColors.textTertiaryLight),
                          SizedBox(height: 12),
                          Text(
                            'No Sections Selected',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textSecondaryLight,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Select Financial Overview, Menu Analytics, or both to preview and download the report.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: AppColors.textTertiaryLight),
                          ),
                        ],
                      ),
                    ),
                  )
                : PdfPreview(
                    key: ValueKey('pdf_${_sections.includeFinancialOverview}_${_sections.includeMenuAnalytics}'),
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
                      disabledBackgroundColor: AppColors.borderLight,
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
                          ? 'Select at least 1 report'
                          : 'Download Selected PDF ($activeCount)',
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

  Widget _buildCheckboxCard({
    required String id,
    required String label,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
  }) {
    return InkWell(
      onTap: () => _toggleSection(id),
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.borderLight,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Checkbox(
              value: isSelected,
              activeColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
              visualDensity: VisualDensity.compact,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              onChanged: (_) => _toggleSection(id),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: isSelected ? AppColors.primaryDark : AppColors.textPrimaryLight,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 9, color: AppColors.textSecondaryLight),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
