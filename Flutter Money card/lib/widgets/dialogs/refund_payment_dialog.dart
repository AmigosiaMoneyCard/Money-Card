import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';

class RefundPaymentSelectionDialog extends StatefulWidget {
  final double refundAmount;
  final String title;
  final String? subtitle;
  final String confirmLabel;

  const RefundPaymentSelectionDialog({
    super.key,
    required this.refundAmount,
    this.title = 'Card Return & Refund',
    this.subtitle,
    this.confirmLabel = 'Confirm & Settle',
  });

  static Future<String?> show(
    BuildContext context, {
    required double refundAmount,
    String title = 'Card Return & Refund',
    String? subtitle,
    String confirmLabel = 'Confirm & Settle',
  }) async {
    // If remaining balance is zero, return immediately with default CASH without prompting
    if (refundAmount <= 0.0) {
      return 'CASH';
    }

    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => RefundPaymentSelectionDialog(
        refundAmount: refundAmount,
        title: title,
        subtitle: subtitle,
        confirmLabel: confirmLabel,
      ),
    );
  }

  @override
  State<RefundPaymentSelectionDialog> createState() =>
      _RefundPaymentSelectionDialogState();
}

class _RefundPaymentSelectionDialogState
    extends State<RefundPaymentSelectionDialog> {
  String _selectedMethod = 'CASH'; // Cash default for speed

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: AppSpacing.roundedLg,
      ),
      titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20),
      actionsPadding: const EdgeInsets.all(16),
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            widget.title,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimaryLight,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 20),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () => Navigator.of(context).pop(null),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          Text(
            widget.subtitle ?? 'Processing Refund to Customer',
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondaryLight,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: AppSpacing.roundedMd,
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Column(
              children: [
                const Text(
                  'Amount to Refund',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF166534),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${widget.refundAmount.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF166534),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Select Refund Disbursement Method:',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimaryLight,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _selectedMethod = 'CASH';
                    });
                  },
                  borderRadius: AppSpacing.roundedMd,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _selectedMethod == 'CASH'
                          ? AppColors.primary
                          : Colors.white,
                      borderRadius: AppSpacing.roundedMd,
                      border: Border.all(
                        color: _selectedMethod == 'CASH'
                            ? AppColors.primary
                            : AppColors.borderLight,
                        width: _selectedMethod == 'CASH' ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.money,
                          size: 18,
                          color: _selectedMethod == 'CASH'
                              ? Colors.white
                              : AppColors.textPrimaryLight,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Cash',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: _selectedMethod == 'CASH'
                                ? Colors.white
                                : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _selectedMethod = 'UPI';
                    });
                  },
                  borderRadius: AppSpacing.roundedMd,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _selectedMethod == 'UPI'
                          ? AppColors.primary
                          : Colors.white,
                      borderRadius: AppSpacing.roundedMd,
                      border: Border.all(
                        color: _selectedMethod == 'UPI'
                            ? AppColors.primary
                            : AppColors.borderLight,
                        width: _selectedMethod == 'UPI' ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.qr_code,
                          size: 18,
                          color: _selectedMethod == 'UPI'
                              ? Colors.white
                              : AppColors.textPrimaryLight,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'UPI',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: _selectedMethod == 'UPI'
                                ? Colors.white
                                : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _selectedMethod == 'CASH'
                ? 'Disburse physical cash from register drawer.'
                : 'Transfer refund via UPI to customer account.',
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textTertiaryLight,
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
      actions: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(null),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: AppSpacing.roundedMd,
                  ),
                ),
                child: const Text('Cancel'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(_selectedMethod),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: AppSpacing.roundedMd,
                  ),
                ),
                child: Text(
                  widget.confirmLabel,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
