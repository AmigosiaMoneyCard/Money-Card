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

  const fromTime = startDate
    ? new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`).getTime()
    : null;
  const toTime = endDate
    ? new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`).getTime()
    : null;
  const targetBranchNameLower = branchName?.toLowerCase();

  return activities.filter((act) => {
    // 1. Branch Scope Filter
    if (branchFilter !== 'ALL') {
      const matchesBranchId = act.branchId ? act.branchId === branchFilter : false;
      const matchesBranchName = act.branchName && targetBranchNameLower
        ? act.branchName.toLowerCase() === targetBranchNameLower
        : false;

      if (act.branchId || act.branchName) {
        if (!matchesBranchId && !matchesBranchName) return false;
      }
    }

    // 2. Time Window Filter
    if (act.timestamp) {
      const actTime = new Date(act.timestamp).getTime();
      if (!isNaN(actTime)) {
        if (fromTime !== null && actTime < fromTime) return false;
        if (toTime !== null && actTime > toTime) return false;
      }
    }

    // 3. Activity Type Filter
    if (typeFilter !== 'ALL') {
      if (typeFilter === 'CARD_ACTIVATION' && act.type !== 'CARD_ACTIVATION') return false;
      if (typeFilter === 'RECHARGE' && !act.type.includes('RECHARGE')) return false;
      if (typeFilter === 'PURCHASE' && act.type !== 'PURCHASE') return false;
      if (typeFilter === 'CARD_SETTLEMENT' && act.type !== 'CARD_SETTLEMENT') return false;
      if (
        typeFilter === 'OTHER' &&
        (act.type === 'CARD_ACTIVATION' ||
          act.type.includes('RECHARGE') ||
          act.type === 'PURCHASE' ||
          act.type === 'CARD_SETTLEMENT')
      ) {
        return false;
      }
    }

    // 4. In-modal Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCard = (act.cardNumber || '').toLowerCase().includes(q);
      const matchCustomer = (act.customerName || '').toLowerCase().includes(q);
      const matchPhone = (act.customerPhone || '').toLowerCase().includes(q);
      const matchDesc = act.description.toLowerCase().includes(q);
      const matchBranch = (act.branchName || '').toLowerCase().includes(q);
      if (!matchCard && !matchCustomer && !matchPhone && !matchDesc && !matchBranch) return false;
    }

    return true;
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
