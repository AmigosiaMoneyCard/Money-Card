import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/utils/formatters.dart';
import '../../models/transaction.dart';
import '../../providers/analytics_provider.dart';
import '../../providers/branch_provider.dart';
import '../../providers/recharges_provider.dart';
import '../../widgets/states/app_loading_view.dart';

class RechargesScreen extends ConsumerStatefulWidget {
  const RechargesScreen({super.key});

  @override
  ConsumerState<RechargesScreen> createState() => _RechargesScreenState();
}

class _RechargesScreenState extends ConsumerState<RechargesScreen> {
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickCustomDateRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: now,
      initialDateRange: DateTimeRange(
        start: now.subtract(const Duration(days: 7)),
        end: now,
      ),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: AppColors.textPrimaryLight,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final startStr =
          '${picked.start.year}-${picked.start.month.toString().padLeft(2, '0')}-${picked.start.day.toString().padLeft(2, '0')}';
      final endStr =
          '${picked.end.year}-${picked.end.month.toString().padLeft(2, '0')}-${picked.end.day.toString().padLeft(2, '0')}';
      ref.read(rechargesNotifierProvider.notifier).setCustomDates(startStr, endStr);
    }
  }

  Future<void> _showCancelDialog(Transaction tx) async {
    String selectedReason = 'Wrong Amount Entered';
    final customReasonCtrl = TextEditingController();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setModalState) => AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
              SizedBox(width: 8),
              Text('Cancel Top-up?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This will void the top-up of ₹${tx.amount.toStringAsFixed(2)} for ${tx.cardNumber ?? "Card"}.',
                style: const TextStyle(fontSize: 14, color: AppColors.textPrimaryLight),
              ),
              const SizedBox(height: 16),
              const Text(
                'Select Cancellation Reason:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: selectedReason,
                items: const [
                  DropdownMenuItem(value: 'Wrong Amount Entered', child: Text('Wrong Amount Entered')),
                  DropdownMenuItem(value: 'Duplicate Scan', child: Text('Duplicate Scan')),
                  DropdownMenuItem(value: 'Payment Failed', child: Text('Payment Failed')),
                  DropdownMenuItem(value: 'Other Reason', child: Text('Other Reason')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setModalState(() => selectedReason = val);
                  }
                },
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
              if (selectedReason == 'Other Reason') ...[
                const SizedBox(height: 10),
                TextField(
                  controller: customReasonCtrl,
                  decoration: InputDecoration(
                    hintText: 'Enter specific reason...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Keep Top-up'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Confirm Void', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );

    if (confirm != true) return;

    final reason = selectedReason == 'Other Reason' && customReasonCtrl.text.trim().isNotEmpty
        ? customReasonCtrl.text.trim()
        : selectedReason;

    final success = await ref
        .read(rechargesNotifierProvider.notifier)
        .cancelRecharge(tx.id, reason);

    if (!mounted) return;
    if (success) {
      ref.read(analyticsNotifierProvider.notifier).loadAnalytics();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Top-up of ₹${tx.amount.toStringAsFixed(2)} cancelled successfully.'),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      final err = ref.read(rechargesNotifierProvider).errorMessage ?? 'Cancellation failed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(rechargesNotifierProvider);
    final notifier = ref.read(rechargesNotifierProvider.notifier);
    final currentBranch = ref.watch(currentBranchProvider);

    final summary = state.summary;
    final upiVolume = (summary['upiVolume'] as num?)?.toDouble() ?? 0.0;
    final upiCount = (summary['upiCount'] as num?)?.toInt() ?? 0;
    final cashVolume = (summary['cashVolume'] as num?)?.toDouble() ?? 0.0;
    final cashCount = (summary['cashCount'] as num?)?.toInt() ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Recharges & Top-ups'),
            if (currentBranch != null)
              Text(
                currentBranch.name,
                style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Recharges',
            onPressed: () => notifier.loadRecharges(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => notifier.loadRecharges(),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 16),
          children: [
            // ─── 1. Prominent Side-by-Side UPI & Cash Boxes ───
            Row(
              children: [
                // Online UPI Money Box
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F3FF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFDDD6FE), width: 1.5),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Online UPI',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF6D28D9),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEDE9FE),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '$upiCount top-ups',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF6D28D9),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '₹${upiVolume.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF4C1D95),
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Direct bank UPI receipts',
                          style: TextStyle(fontSize: 11, color: Color(0xFF7C3AED)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Cash Money Box
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFA7F3D0), width: 1.5),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Cash Money',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF047857),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD1FAE5),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '$cashCount top-ups',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF047857),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '₹${cashVolume.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF065F46),
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Cash in counter drawer',
                          style: TextStyle(fontSize: 11, color: Color(0xFF059669)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ─── 2. Date Range Filter Dropdown & Reset to Today ───
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today, size: 18, color: AppColors.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: state.selectedPreset,
                        isDense: true,
                        items: const [
                          DropdownMenuItem(value: 'today', child: Text('Today (Today\'s Top-ups)')),
                          DropdownMenuItem(value: 'yesterday', child: Text('Yesterday')),
                          DropdownMenuItem(value: 'last7', child: Text('Last 7 Days')),
                          DropdownMenuItem(value: 'last30', child: Text('Last 30 Days')),
                          DropdownMenuItem(value: 'thisMonth', child: Text('This Month')),
                          DropdownMenuItem(value: 'custom', child: Text('Pick Custom Date Range...')),
                        ],
                        onChanged: (val) {
                          if (val == 'custom') {
                            _pickCustomDateRange();
                          } else if (val != null) {
                            notifier.setPreset(val);
                          }
                        },
                      ),
                    ),
                  ),
                  if (state.selectedPreset != 'today')
                    TextButton.icon(
                      style: TextButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        foregroundColor: AppColors.primary,
                      ),
                      icon: const Icon(Icons.replay, size: 14),
                      label: const Text('Reset to Today', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      onPressed: () => notifier.resetToToday(),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // ─── 3. Search Bar & Status Filter Chips ───
            TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Search card ID, customer name, phone...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          notifier.setSearch(null);
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderLight),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderLight),
                ),
              ),
              onChanged: (val) => notifier.setSearch(val.trim().isEmpty ? null : val.trim()),
            ),
            const SizedBox(height: 12),

            // Payment & Status Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ChoiceChip(
                    label: const Text('All Recharges'),
                    selected: state.paymentMethod == 'ALL',
                    onSelected: (_) => notifier.setPaymentMethod('ALL'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('📱 UPI Only'),
                    selected: state.paymentMethod == 'UPI',
                    onSelected: (_) => notifier.setPaymentMethod('UPI'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('💵 Cash Only'),
                    selected: state.paymentMethod == 'CASH',
                    onSelected: (_) => notifier.setPaymentMethod('CASH'),
                  ),
                  const SizedBox(width: 14),
                  ChoiceChip(
                    label: const Text('Active Only'),
                    selected: state.statusFilter == 'ACTIVE',
                    onSelected: (_) => notifier.setStatusFilter(
                      state.statusFilter == 'ACTIVE' ? 'ALL' : 'ACTIVE',
                    ),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('Cancelled Only'),
                    selected: state.statusFilter == 'CANCELLED',
                    onSelected: (_) => notifier.setStatusFilter(
                      state.statusFilter == 'CANCELLED' ? 'ALL' : 'CANCELLED',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ─── 4. Recharges List ───
            if (state.isLoading)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: AppLoadingView(message: 'Loading recharges...')),
              )
            else if (state.recharges.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  child: Column(
                    children: const [
                      Icon(Icons.history_toggle_off, size: 54, color: AppColors.textTertiaryLight),
                      SizedBox(height: 12),
                      Text(
                        'No recharges found for this filter',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textSecondaryLight),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Try switching the date filter or searching a different card',
                        style: TextStyle(fontSize: 13, color: AppColors.textTertiaryLight),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: state.recharges.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (ctx, idx) {
                  final tx = state.recharges[idx];
                  final isCash = tx.paymentMethod == PaymentMethod.cash;

                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: tx.isCancelled ? Colors.grey.shade50 : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: tx.isCancelled ? Colors.grey.shade300 : AppColors.borderLight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 6,
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
                            Row(
                              children: [
                                Text(
                                  '+₹${tx.amount.toStringAsFixed(2)}',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: tx.isCancelled ? Colors.grey : AppColors.success,
                                    decoration: tx.isCancelled ? TextDecoration.lineThrough : null,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isCash ? AppColors.successLight : Colors.purple.shade50,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    isCash ? '💵 Cash' : '📱 UPI',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: isCash ? AppColors.primaryDark : Colors.purple.shade700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (tx.isCancelled)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade200,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'CANCELLED',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black54),
                                ),
                              )
                            else
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.error,
                                  side: const BorderSide(color: AppColors.error),
                                  visualDensity: VisualDensity.compact,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                ),
                                icon: const Icon(Icons.cancel_outlined, size: 14),
                                label: const Text('Cancel Top-up', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                onPressed: () => _showCancelDialog(tx),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Card: ${tx.cardNumber ?? "MC-Card"}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            Text(
                              tx.customerName ?? 'Customer',
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Staff: ${tx.staffName ?? "Counter Staff"}',
                              style: const TextStyle(fontSize: 12, color: AppColors.textTertiaryLight),
                            ),
                            Text(
                              AppFormatters.formatIsoDate(tx.createdAt),
                              style: const TextStyle(fontSize: 12, color: AppColors.textTertiaryLight),
                            ),
                          ],
                        ),
                        if (tx.isCancelled && tx.cancellationReason != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline, size: 14, color: Colors.black54),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Cancelled: ${tx.cancellationReason}',
                                    style: const TextStyle(fontSize: 11, color: Colors.black54, fontStyle: FontStyle.italic),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
