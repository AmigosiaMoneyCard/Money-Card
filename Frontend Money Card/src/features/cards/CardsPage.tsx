import { useAuth } from '@/hooks';
import { OrgAdminCardsView } from './OrgAdminCardsView';
import { CounterStaffCardsView } from './CounterStaffCardsView';

/**
 * CardsPage - Role Isolated Entry Point
 * 
 * - ORG_ADMIN: Organization Admin counter-wise management table
 *   (Counter Name, Customer History, Card Analytics, Card Details per Counter).
 * - STAFF: Counter Staff isolated Live Active Cards registry
 *   (4 Columns: Coupon/Card ID, Customer, Live Balance, Actions, with Counter & Active Since in modal).
 */
export function CardsPage() {
  const { user } = useAuth();
  const isCounterView = user?.role === 'STAFF';

  if (isCounterView) {
    return <CounterStaffCardsView />;
  }

  return <OrgAdminCardsView />;
}

export { OrgAdminCardsView } from './OrgAdminCardsView';
export { CounterStaffCardsView } from './CounterStaffCardsView';
