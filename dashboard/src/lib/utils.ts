import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** API base URL — runtime fallback when env was missing at build time. */
export function getApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'studio.wavelens.online' || host.endsWith('.wavelens.online')) {
      return 'https://api.wavelens.online';
    }
  }

  return 'http://localhost:5000';
}

/** @deprecated use getApiUrl() — kept for imports that read the constant */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export type UserRole = 'ADMIN' | 'TENANT';

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  tenantId: number | null;
}

export interface TenantOverview {
  tenant: {
    id: number;
    name: string;
    contactEmail: string | null;
    bundleId: string;
    clientId: string;
    status: string;
    createdAt: string;
  };
  filters: {
    entitled: Array<{ id: string; name: string; category: string; type: string }>;
    enabledIds: string[];
  };
}

export interface AdminTenantRow {
  id: number;
  name: string;
  contactEmail: string | null;
  bundleId: string;
  clientId: string;
  status: string;
  createdAt: string;
  entitledCount: number;
  enabledCount: number;
  userCount: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (typeof data.message === 'string') return data.message;
    return res.statusText || 'Request failed';
  } catch {
    return res.statusText || 'Request failed';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
