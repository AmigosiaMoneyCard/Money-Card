import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../models/receipt_bill.dart';
import '../common/app_button.dart';
import '../common/app_card.dart';

class DigitalReceiptDialog extends StatefulWidget {
  final ReceiptBill bill;
  final String title;
  final Directory? targetDownloadDirectory;
  final VoidCallback onDone;

  const DigitalReceiptDialog({
    super.key,
    required this.bill,
    this.title = 'Purchase Successful',
    this.targetDownloadDirectory,
    required this.onDone,
  });

  /// Factory helper that accepts a ReceiptBill directly
  static Future<void> showBill(
    BuildContext context, {
    required ReceiptBill bill,
    String title = 'Purchase Successful',
    Directory? targetDownloadDirectory,
    required VoidCallback onDone,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => DigitalReceiptDialog(
        bill: bill,
        title: title,
        targetDownloadDirectory: targetDownloadDirectory,
        onDone: onDone,
      ),
    );
  }

  /// Convenience helper for screens passing individual parameters
  static Future<void> show(
    BuildContext context, {
    required String branchName,
    required String transactionId,
    required DateTime timestamp,
    required String cardIdentifier,
    required List<Map<String, dynamic>> items,
    required double totalAmount,
    required double remainingBalance,
    double? previousBalance,
    double? amountDeducted,
    double? subtotal,
    String? sessionId,
    String? staffName,
    String title = 'Purchase Successful',
    String receiptTitle = 'SALES RECEIPT',
    String paymentMethod = 'Card Session',
    String? paymentReference,
    String sessionStatus = 'ACTIVE',
    Directory? targetDownloadDirectory,
    required VoidCallback onDone,
  }) {
    final billItems = items
        .map((item) => ReceiptBillItem.fromJson(item))
        .toList();
    final deduct = amountDeducted ?? totalAmount;
    final prevBal = previousBalance ?? (remainingBalance + deduct);
    final sub = subtotal ?? totalAmount;

    final bill = ReceiptBill(
      organizationName: 'MONEY CARD',
      branchName: branchName,
      receiptTitle: receiptTitle,
      transactionId: transactionId,
      timestamp: timestamp,
      cardIdentifier: cardIdentifier,
      sessionId: sessionId,
      staffName: staffName,
      items: billItems,
      subtotal: sub,
      totalAmount: totalAmount,
      previousBalance: prevBal,
      amountDeducted: deduct,
      remainingBalance: remainingBalance,
      paymentMethod: paymentMethod,
      paymentReference: paymentReference,
      sessionStatus: sessionStatus,
    );

    return showBill(
      context,
      bill: bill,
      title: title,
      targetDownloadDirectory: targetDownloadDirectory,
      onDone: onDone,
    );
  }

  @override
  State<DigitalReceiptDialog> createState() => _DigitalReceiptDialogState();
}

class _DigitalReceiptDialogState extends State<DigitalReceiptDialog> {
  /// Action: [ Done ]
  void _handleDone() {
    Navigator.of(context).pop();
    widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('dd MMM yyyy, hh:mm a').format(widget.bill.timestamp);
    final isRecharge = widget.bill.isRecharge;

    return AlertDialog(
      scrollable: true,
      shape: const RoundedRectangleBorder(borderRadius: AppSpacing.roundedLg),
      contentPadding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      title: Row(
        children: [
          const Icon(Icons.check_circle, color: AppColors.success, size: 28),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              widget.title,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Total & Balance Breakdown Card
            Builder(builder: (context) {
              final effectiveDeducted = widget.bill.amountDeducted > 0
                  ? widget.bill.amountDeducted
                  : widget.bill.totalAmount;
              final effectiveRemaining = widget.bill.remainingBalance;
              final effectivePrevBalance = widget.bill.previousBalance > 0
                  ? widget.bill.previousBalance
                  : (isRecharge
                      ? (effectiveRemaining - widget.bill.totalAmount).clamp(0.0, double.infinity)
                      : (effectiveRemaining + effectiveDeducted));

              return AppCard(
                padding: AppSpacing.paddingMd,
                backgroundColor: AppColors.primaryLight.withValues(alpha: 0.35),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          isRecharge ? 'Recharge Amount:' : 'Total Paid:',
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          '₹${widget.bill.totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Divider(height: 1),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Previous Balance:',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          '₹${effectivePrevBalance.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                    if (!isRecharge) ...[
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Deducted:',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondaryLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            '₹${effectiveDeducted.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.error,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          isRecharge ? 'New Balance:' : 'Remaining Balance:',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          '₹${effectiveRemaining.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: AppSpacing.md),

            // Metadata summary
            if (!isRecharge)
              _buildInfoRow('Card No:', widget.bill.displayCardId),
            _buildInfoRow('Date:', dateStr),
            if (isRecharge)
              _buildInfoRow('Payment:', widget.bill.paymentMethod),
            if (widget.bill.paymentReference != null && widget.bill.paymentReference!.isNotEmpty)
              _buildInfoRow('UPI Ref:', widget.bill.paymentReference!),
            if (!isRecharge && widget.bill.items.isNotEmpty)
              _buildInfoRow('Items:', '${widget.bill.items.length} items purchased'),

            const SizedBox(height: AppSpacing.lg),

            // Button: [ Done ]
            AppButton(
              label: 'Done',
              icon: Icons.check,
              onPressed: _handleDone,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
          ),
          const SizedBox(width: AppSpacing.sm),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
