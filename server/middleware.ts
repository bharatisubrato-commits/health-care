import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.ts';

export const JWT_SECRET =
  process.env.JWT_SECRET || 'buildbody-dev-secret-change-me-in-production-2026';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'owner' | 'staff';
  must_change_password: number;
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminUser;
}

export function sanitizeText(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isValidUtr(utr: string): boolean {
  return /^\d{12}$/.test(utr.trim());
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const key = part.slice(0, idx).trim();
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      cookies[key] = val;
    }
  }
  return cookies;
}

export function signAdminToken(admin: AdminUser): string {
  return jwt.sign(
    {
      id: admin.id,
      username: admin.username,
      role: admin.role,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function requireAuth(allowPasswordChange = false) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = bearerToken || cookies.bb_admin_token;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const admin = db
        .prepare('SELECT id, username, email, role, must_change_password FROM admins WHERE id = ?')
        .get(decoded.id) as AdminUser | undefined;

      if (!admin) {
        res.status(401).json({ error: 'Admin account not found' });
        return;
      }

      if (admin.must_change_password === 1 && !allowPasswordChange) {
        res.status(403).json({
          error: 'Password change required before accessing admin resources',
          code: 'PASSWORD_CHANGE_REQUIRED',
        });
        return;
      }

      req.admin = admin;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired session' });
    }
  };
}

export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.admin || req.admin.role !== 'owner') {
    res.status(403).json({ error: 'Owner permissions required for this action' });
    return;
  }
  next();
}

export function logAudit(
  admin: { id?: number | null; username: string },
  action: string,
  entityType: string,
  entityId: string | number | null,
  details: string,
  req: Request
) {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  db.prepare(
    `INSERT INTO audit_logs (admin_id, admin_username, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    admin.id ?? null,
    admin.username,
    action,
    entityType,
    entityId !== null ? String(entityId) : null,
    details.slice(0, 1000),
    ip
  );
}
