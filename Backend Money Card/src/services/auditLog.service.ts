import { prisma } from '../config/database.js';

export interface CreateAuditLogParams {
  organizationId?: string | null;
  userId?: string | null;
  userName?: string | null;
  action: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}

export async function recordAuditLog(params: CreateAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId || null,
        userId: params.userId || null,
        userName: params.userName || null,
        action: params.action,
        severity: params.severity || 'INFO',
        details: params.details || undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

export interface ListAuditLogsFilters {
  organizationId?: string;
  action?: string;
  severity?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(filters: ListAuditLogsFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 50));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.organizationId) {
    where.organizationId = filters.organizationId;
  }
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.severity) {
    where.severity = filters.severity;
  }
  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search, mode: 'insensitive' } },
      { userName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
