-- Migration: Enable Row Level Security (RLS) on all remaining public tables
-- Description:
-- Enables RLS on all remaining public tables to prevent unauthenticated access via Supabase REST API (PostgREST),
-- matching Production environment security configuration.
-- Backend connections via Prisma (database owner role 'postgres') continue to have full access.

ALTER TABLE IF EXISTS public.branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.card_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_history_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
