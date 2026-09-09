import type { StaffActivityItem } from '@/types';

export interface FilterStaffActivitiesOptions {
  activities: StaffActivityItem[];
  branchFilter: string; // 'ALL' or specific branchId
  branchName?: string;  // Target branch name for fallback matching
  startDate?: string;
  endDate?: string;
  typeFilter?: 'ALL' | 'CARD_ACTIVATION' | 'RECHARGE' | 'PURCHASE' | 'CARD_SETTLEMENT' | 'OTHER';
  searchQuery?: string;
}

function parseBoundaryTime(dateStr: string | undefined, isEnd: boolean): number | null {
  if (!dateStr) return null;
  const formatted = dateStr.includes('T') ? dateStr : `${dateStr}T${isEnd ? '23:59:59.999Z' : '00:00:00.000Z'}`;
  return new Date(formatted).getTime();
}

function matchesBranchScope(act: StaffActivityItem, branchFilter: string, targetBranchNameLower?: string): boolean {
  if (branchFilter === 'ALL') return true;
  if (!act.branchId && !act.branchName) return true;

  const matchesBranchId = act.branchId ? act.branchId === branchFilter : false;
  const matchesBranchName = act.branchName && targetBranchNameLower
    ? act.branchName.toLowerCase() === targetBranchNameLower
    : false;

  return matchesBranchId || matchesBranchName;
}

function matchesTimeWindow(act: StaffActivityItem, fromTime: number | null, toTime: number | null): boolean {
  if (!act.timestamp) return true;
  const actTime = new Date(act.timestamp).getTime();
  if (isNaN(actTime)) return true;
  if (fromTime !== null && actTime < fromTime) return false;
  if (toTime !== null && actTime > toTime) return false;
  return true;
}

function matchesActivityType(act: StaffActivityItem, typeFilter: string): boolean {
  if (typeFilter === 'ALL') return true;
  if (typeFilter === 'CARD_ACTIVATION') return act.type === 'CARD_ACTIVATION';
  if (typeFilter === 'RECHARGE') return act.type.includes('RECHARGE');
  if (typeFilter === 'PURCHASE') return act.type === 'PURCHASE';
  if (typeFilter === 'CARD_SETTLEMENT') return act.type === 'CARD_SETTLEMENT';
  if (typeFilter === 'OTHER') {
    const isStandard =
      act.type === 'CARD_ACTIVATION' ||
      act.type.includes('RECHARGE') ||
      act.type === 'PURCHASE' ||
      act.type === 'CARD_SETTLEMENT';
    return !isStandard;
  }
  return true;
}

function matchesSearchQuery(act: StaffActivityItem, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const q = trimmed.toLowerCase();
  const matchCard = (act.cardNumber || '').toLowerCase().includes(q);
  const matchCustomer = (act.customerName || '').toLowerCase().includes(q);
  const matchPhone = (act.customerPhone || '').toLowerCase().includes(q);
  const matchDesc = act.description.toLowerCase().includes(q);
  const matchBranch = (act.branchName || '').toLowerCase().includes(q);
  return matchCard || matchCustomer || matchPhone || matchDesc || matchBranch;
}

export function filterStaffActivities({
  activities,
  branchFilter,
  branchName,
  startDate,
  endDate,
  typeFilter = 'ALL',
  searchQuery = '',
}: FilterStaffActivitiesOptions): StaffActivityItem[] {
  if (!activities || !Array.isArray(activities)) return [];

  const fromTime = parseBoundaryTime(startDate, false);
  const toTime = parseBoundaryTime(endDate, true);
  const targetBranchNameLower = branchName?.toLowerCase();

  return activities.filter((act) => {
    return (
      matchesBranchScope(act, branchFilter, targetBranchNameLower) &&
      matchesTimeWindow(act, fromTime, toTime) &&
      matchesActivityType(act, typeFilter) &&
      matchesSearchQuery(act, searchQuery)
    );
  });
}

export function calculateScopedStaffMetrics(activities: StaffActivityItem[]) {
  let cardsActivatedCount = 0;
  let cardsSettledCount = 0;
  let cardRechargeVolume = 0;
  let upiRechargeVolume = 0;
  let purchaseVolume = 0;
  let refundVolume = 0;

  for (const act of activities) {
    if (act.type === 'CARD_ACTIVATION') {
      cardsActivatedCount++;
    } else if (act.type === 'CARD_SETTLEMENT') {
      cardsSettledCount++;
    } else if (act.type === 'RECHARGE_CASH') {
      cardRechargeVolume += act.amount || 0;
    } else if (act.type === 'RECHARGE_UPI') {
      upiRechargeVolume += act.amount || 0;
    } else if (act.type === 'PURCHASE') {
      purchaseVolume += act.amount || 0;
    } else if (act.type === 'REFUND') {
      refundVolume += act.amount || 0;
    }
  }

  const rechargeVolume = cardRechargeVolume + upiRechargeVolume;
  const totalVolumeHandled = purchaseVolume + rechargeVolume + refundVolume;

  return {
    cardsActivatedCount,
    cardsSettledCount,
    cardRechargeVolume: Number(cardRechargeVolume.toFixed(2)),
    upiRechargeVolume: Number(upiRechargeVolume.toFixed(2)),
    rechargeVolume: Number(rechargeVolume.toFixed(2)),
    purchaseVolume: Number(purchaseVolume.toFixed(2)),
    refundVolume: Number(refundVolume.toFixed(2)),
    totalVolumeHandled: Number(totalVolumeHandled.toFixed(2)),
  };
}
