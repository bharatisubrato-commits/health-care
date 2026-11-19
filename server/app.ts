import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import crypto from 'crypto';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { db, initDatabase, calculateExpiryDate, UPLOADS_DIR } from './db.ts';
import {
  isValidEmail,
  isValidIndianMobile,
  isValidUtr,
  logAudit,
  requireAuth,
  requireOwner,
  sanitizeText,
  signAdminToken,
} from './middleware.ts';
import type { AuthenticatedRequest } from './middleware.ts';

export function createApp() {
  initDatabase();

  const app = express();

  app.set('trust proxy', 1);

  // Normalize Netlify Functions base path when invoked via /.netlify/functions/api/*
  app.use((req, _res, next) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      req.url = req.url.replace('/.netlify/functions/api', '') || '/';
    }
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(UPLOADS_DIR)
  );

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  });

  const publicSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests submitted. Please wait a few minutes.' },
  });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
      };
      const ext = extMap[file.mimetype] || '.jpg';
      cb(null, `utr_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.mimetype)) {
        cb(new Error('Only JPG, PNG, and WEBP image screenshots are allowed (max 5MB).'));
        return;
      }
      cb(null, true);
    },
  });

  function getSettingsMap(): Record<string, string> {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return map;
  }

  function getPublicSettings(): Record<string, string> {
    const all = getSettingsMap();
    const privateKeys = new Set([
      'upi_id',
      'upi_name',
      'bank_account_name',
      'bank_account_number',
      'bank_name',
      'bank_branch',
      'bank_ifsc',
    ]);
    const pub: Record<string, string> = {};
    for (const [k, v] of Object.entries(all)) {
      if (!privateKeys.has(k)) {
        pub[k] = v;
      }
    }
    return pub;
  }

  function generateMemberCode(): string {
    const year = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      const code = `BB-${year}-${rand}`;
      const exists = db.prepare('SELECT 1 FROM members WHERE member_code = ?').get(code);
      if (!exists) return code;
    }
    return `BB-${year}-${Date.now().toString().slice(-5)}`;
  }

  function generateOrderId(): string {
    for (let i = 0; i < 10; i++) {
      const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
      const id = `ORD-BB-${rand}`;
      const exists = db.prepare('SELECT 1 FROM payments WHERE order_id = ?').get(id);
      if (!exists) return id;
    }
    return `ORD-BB-${Date.now().toString().slice(-6)}`;
  }

  function logMemberActivity(
    memberId: number,
    memberCode: string,
    activityType:
      | 'registration'
      | 'payment_submitted'
      | 'payment_approved'
      | 'payment_rejected'
      | 'gym_checkin'
      | 'renewal'
      | 'profile_updated'
      | 'note',
    title: string,
    details: string,
    actor = 'system'
  ) {
    db.prepare(
      `INSERT INTO member_activity_logs (member_id, member_code, activity_type, title, details, actor)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(memberId, memberCode, activityType, title.slice(0, 150), details.slice(0, 600), actor);
  }

  function recordCtaEvent(params: {
    buttonName: 'join_now' | 'start_membership' | 'book_free_trial' | 'contact_form';
    buttonLabel: string;
    pagePath?: string;
    status?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    details?: string;
  }) {
    db.prepare(
      `INSERT INTO cta_events (
         button_name, button_label, page_path, status,
         customer_name, customer_phone, customer_email, details
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      params.buttonName,
      sanitizeText(params.buttonLabel, 100),
      sanitizeText(params.pagePath || '/', 120) || '/',
      sanitizeText(params.status || 'clicked', 40) || 'clicked',
      sanitizeText(params.customerName || '', 120),
      sanitizeText(params.customerPhone || '', 30),
      sanitizeText(params.customerEmail || '', 150),
      sanitizeText(params.details || '', 600)
    );
  }

  // ---------------- PUBLIC ROUTES ----------------

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'muscle-arena-api' });
  });

  app.get('/api/public/bootstrap', (_req, res) => {
    const plans = db
      .prepare('SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
      .all()
      .map((p: any) => ({
        ...p,
        features: JSON.parse(p.features || '[]'),
        is_popular: Boolean(p.is_popular),
        is_active: Boolean(p.is_active),
      }));

    res.json({
      settings: getPublicSettings(),
      plans,
    });
  });

  app.get('/api/plans', (_req, res) => {
    const plans = db
      .prepare('SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')
      .all()
      .map((p: any) => ({
        ...p,
        features: JSON.parse(p.features || '[]'),
        is_popular: Boolean(p.is_popular),
        is_active: Boolean(p.is_active),
      }));
    res.json({ plans });
  });

  app.post('/api/enquiries', publicSubmitLimiter, (req, res) => {
    const name = sanitizeText(req.body.name, 100);
    const phone = sanitizeText(req.body.phone, 20).replace(/\D/g, '').slice(-10);
    const email = sanitizeText(req.body.email, 150);
    const source = req.body.source === 'free_trial' ? 'free_trial' : 'contact';
    const message = sanitizeText(req.body.message, 1000);

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!isValidIndianMobile(phone)) {
      res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const result = db
      .prepare(
        `INSERT INTO enquiries (name, phone, email, source, message, status)
         VALUES (?, ?, ?, ?, ?, 'new')`
      )
      .run(name, phone, email, source, message);

    recordCtaEvent({
      buttonName: source === 'free_trial' ? 'book_free_trial' : 'contact_form',
      buttonLabel: source === 'free_trial' ? 'Book Trial' : 'Send Enquiry',
      pagePath: sanitizeText(req.body.page_path || '/', 120) || '/',
      status: 'submitted',
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      details: message,
    });

    res.status(201).json({
      id: result.lastInsertRowid,
      message:
        source === 'free_trial'
          ? 'Free trial request received! Our team will call you shortly.'
          : 'Enquiry saved. We will contact you soon.',
    });
  });

  app.post('/api/cta-events', publicSubmitLimiter, (req, res) => {
    const allowedButtons = new Set(['join_now', 'start_membership', 'book_free_trial', 'contact_form']);
    const rawName = sanitizeText(req.body.button_name, 40);
    if (!allowedButtons.has(rawName)) {
      res.status(400).json({ error: 'Invalid CTA button identifier.' });
      return;
    }

    recordCtaEvent({
      buttonName: rawName as 'join_now' | 'start_membership' | 'book_free_trial' | 'contact_form',
      buttonLabel: sanitizeText(req.body.button_label || rawName, 100),
      pagePath: sanitizeText(req.body.page_path || '/', 120) || '/',
      status: sanitizeText(req.body.status || 'initiated', 40) || 'initiated',
      details: sanitizeText(req.body.details || '', 400),
    });

    res.status(201).json({ ok: true });
  });

  app.post('/api/memberships/register', publicSubmitLimiter, (req, res) => {
    const name = sanitizeText(req.body.name, 120);
    const phone = sanitizeText(req.body.phone, 20).replace(/\D/g, '').slice(-10);
    const email = sanitizeText(req.body.email, 150);
    const gender = sanitizeText(req.body.gender, 30);
    const dob = sanitizeText(req.body.dob, 20);
    const address = sanitizeText(req.body.address, 300);
    const emergency_contact = sanitizeText(req.body.emergency_contact, 20)
      .replace(/\D/g, '')
      .slice(-10);
    const fitness_goal = sanitizeText(req.body.fitness_goal, 100);
    const plan_id = Number(req.body.plan_id);
    const start_date = sanitizeText(req.body.start_date, 20);
    const terms_accepted = Boolean(req.body.terms_accepted);
    const rawSourceCta = sanitizeText(req.body.source_cta || 'direct', 40);
    const source_cta = ['join_now', 'start_membership', 'select_plan', 'direct'].includes(rawSourceCta)
      ? rawSourceCta
      : 'direct';

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Full name is required.' });
      return;
    }
    if (!isValidIndianMobile(phone)) {
      res.status(400).json({ error: 'Valid 10-digit Indian mobile number is required.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Valid email address is required.' });
      return;
    }
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      res.status(400).json({ error: 'Please select a valid gender.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      res.status(400).json({ error: 'Valid date of birth is required.' });
      return;
    }
    if (!address || address.length < 5) {
      res.status(400).json({ error: 'Address is required.' });
      return;
    }
    if (!isValidIndianMobile(emergency_contact)) {
      res.status(400).json({ error: 'Valid 10-digit emergency contact number is required.' });
      return;
    }
    if (!fitness_goal) {
      res.status(400).json({ error: 'Please select your fitness goal.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      res.status(400).json({ error: 'Valid preferred start date is required.' });
      return;
    }
    if (!terms_accepted) {
      res.status(400).json({ error: 'You must accept the gym terms & conditions.' });
      return;
    }

    const plan = db
      .prepare('SELECT * FROM plans WHERE id = ? AND is_active = 1')
      .get(plan_id) as any;
    if (!plan) {
      res.status(404).json({ error: 'Selected membership plan was not found or is inactive.' });
      return;
    }

    const memberCode = generateMemberCode();
    const orderId = generateOrderId();

    const createTx = db.transaction(() => {
      const memberRes = db
        .prepare(
          `INSERT INTO members (
            member_code, name, phone, email, gender, dob, address,
            emergency_contact, fitness_goal, plan_id, start_date, expiry_date, status, source_cta
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?)`
        )
        .run(
          memberCode,
          name,
          phone,
          email,
          gender,
          dob,
          address,
          emergency_contact,
          fitness_goal,
          plan.id,
          start_date,
          source_cta
        );

      db.prepare(
        `INSERT INTO payments (
          order_id, member_id, plan_id, amount, payment_method, status
        ) VALUES (?, ?, ?, ?, 'upi', 'awaiting_payment')`
      ).run(orderId, memberRes.lastInsertRowid, plan.id, plan.price);

      logMemberActivity(
        Number(memberRes.lastInsertRowid),
        memberCode,
        'registration',
        'Online Registration Submitted',
        `Registered for ${plan.name} (₹${plan.price}), Order ${orderId}, Goal: ${fitness_goal} (via ${source_cta})`,
        'member'
      );

      recordCtaEvent({
        buttonName: source_cta === 'start_membership' ? 'start_membership' : 'join_now',
        buttonLabel:
          source_cta === 'start_membership'
            ? 'Start Your Membership (Form Submitted)'
            : 'Join Now (Form Submitted)',
        pagePath: '/join',
        status: 'form_submitted',
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        details: `${plan.name} (₹${plan.price}) · Member ${memberCode} · Order ${orderId}`,
      });
    });

    createTx();

    res.status(201).json({
      orderId,
      memberCode,
      amount: plan.price,
      planName: plan.name,
    });
  });

  app.get('/api/orders/lookup', (req, res) => {
    const q = sanitizeText(req.query.query, 40).toUpperCase();
    if (!q) {
      res.status(400).json({ error: 'Order ID or Member ID is required.' });
      return;
    }
    const row = db
      .prepare(
        `SELECT p.order_id
         FROM payments p
         JOIN members m ON p.member_id = m.id
         WHERE UPPER(p.order_id) = ? OR UPPER(m.member_code) = ?
         ORDER BY p.id DESC
         LIMIT 1`
      )
      .get(q, q) as { order_id: string } | undefined;

    if (!row) {
      res.status(404).json({ error: 'No matching Order ID or Member ID found.' });
      return;
    }
    res.json({ orderId: row.order_id });
  });

  app.get('/api/orders/:orderId', async (req, res) => {
    const orderId = sanitizeText(req.params.orderId, 40);
    const row = db
      .prepare(
        `SELECT
           p.id as payment_id, p.order_id, p.amount, p.payment_method, p.utr,
           p.screenshot_path, p.status as payment_status, p.rejection_reason,
           p.verified_by, p.verified_at, p.created_at as order_created_at,
           m.id as member_id, m.member_code, m.name as member_name, m.phone, m.email,
           m.start_date, m.expiry_date, m.status as member_status, m.fitness_goal,
           pl.id as plan_id, pl.name as plan_name, pl.duration_value, pl.duration_unit
         FROM payments p
         JOIN members m ON p.member_id = m.id
         LEFT JOIN plans pl ON p.plan_id = pl.id
         WHERE p.order_id = ?`
      )
      .get(orderId) as any;

    if (!row) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const settings = getSettingsMap();
    const upiId = settings.upi_id || 'buildbody@sbi';
    const upiName = settings.upi_name || 'Subrato Bharati';
    const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
      upiName
    )}&am=${row.amount}&cu=INR&tn=${encodeURIComponent(row.order_id)}`;

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(upiDeepLink, {
        width: 280,
        margin: 2,
        color: { dark: '#09090B', light: '#FFFFFF' },
      });
    } catch {
      qrDataUrl = '';
    }

    res.json({
      order: row,
      paymentDetails: {
        upiId,
        upiName,
        upiDeepLink,
        qrDataUrl,
        bank: {
          accountName: settings.bank_account_name || 'Subrato Bharati',
          accountNumber: settings.bank_account_number || '1234321444',
          bankName: settings.bank_name || 'State Bank of India',
          branch: settings.bank_branch || 'Durgapur Branch',
          ifsc: settings.bank_ifsc || 'SBIN0000075',
        },
      },
    });
  });

  app.post(
    '/api/orders/:orderId/submit-payment',
    publicSubmitLimiter,
    (req, res, next) => {
      upload.single('screenshot')(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: err.message || 'Invalid screenshot file upload.' });
          return;
        }
        next();
      });
    },
    (req, res) => {
      const orderId = sanitizeText(req.params.orderId, 40);
      const payment = db
        .prepare('SELECT * FROM payments WHERE order_id = ?')
        .get(orderId) as any;

      if (!payment) {
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      if (payment.status === 'approved') {
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(400).json({ error: 'This order has already been approved.' });
        return;
      }

      const mode = req.body.payment_method === 'pay_at_gym' ? 'pay_at_gym' : 'upi';

      if (mode === 'pay_at_gym') {
        if (req.file) fs.unlink(req.file.path, () => {});
        db.prepare(
          `UPDATE payments
           SET payment_method = 'pay_at_gym', status = 'pending_gym_payment', rejection_reason = NULL
           WHERE id = ?`
        ).run(payment.id);

        db.prepare(`UPDATE members SET status = 'pending', updated_at = datetime('now') WHERE id = ?`).run(
          payment.member_id
        );

        const mRow = db
          .prepare('SELECT member_code FROM members WHERE id = ?')
          .get(payment.member_id) as { member_code: string } | undefined;
        if (mRow) {
          logMemberActivity(
            payment.member_id,
            mRow.member_code,
            'payment_submitted',
            'Pay at Gym Desk Selected',
            `Order ${orderId} (₹${payment.amount}) marked for front-desk cash/UPI payment.`,
            'member'
          );
        }

        res.json({
          status: 'pending_gym_payment',
          message: 'Pay at gym selected. Please pay at the Muscle Arena front desk to activate your membership.',
        });
        return;
      }

      const utr = sanitizeText(req.body.utr, 20).replace(/\s+/g, '');
      if (!isValidUtr(utr)) {
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(400).json({ error: 'Please enter a valid 12-digit numeric UTR number.' });
        return;
      }

      const existingUtr = db
        .prepare('SELECT id, order_id FROM payments WHERE utr = ? AND id != ?')
        .get(utr, payment.id) as { id: number; order_id: string } | undefined;

      if (existingUtr) {
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(409).json({
          error: 'This UTR number has already been submitted for another order. Duplicate UTRs are blocked.',
        });
        return;
      }

      const screenshotPath = req.file ? `/uploads/${req.file.filename}` : payment.screenshot_path;

      db.prepare(
        `UPDATE payments
         SET payment_method = 'upi',
             utr = ?,
             screenshot_path = ?,
             status = 'pending_verification',
             rejection_reason = NULL
         WHERE id = ?`
      ).run(utr, screenshotPath, payment.id);

      db.prepare(`UPDATE members SET status = 'pending', updated_at = datetime('now') WHERE id = ?`).run(
        payment.member_id
      );

      const mRow = db
        .prepare('SELECT member_code FROM members WHERE id = ?')
        .get(payment.member_id) as { member_code: string } | undefined;
      if (mRow) {
        logMemberActivity(
          payment.member_id,
          mRow.member_code,
          'payment_submitted',
          'UPI UTR Submitted',
          `Order ${orderId} · UTR ${utr} submitted for verification.`,
          'member'
        );
      }

      res.json({
        status: 'pending_verification',
        utr,
        message: 'Payment submitted! Your membership will become Active after admin verification.',
      });
    }
  );

  app.get('/api/orders/:orderId/receipt', (req, res) => {
    const orderId = sanitizeText(req.params.orderId, 40);
    const row = db
      .prepare(
        `SELECT
           p.order_id, p.amount, p.payment_method, p.utr, p.status as payment_status,
           p.verified_by, p.verified_at,
           m.member_code, m.name as member_name, m.phone, m.email, m.address,
           m.start_date, m.expiry_date, m.status as member_status,
           pl.name as plan_name, pl.duration_value, pl.duration_unit
         FROM payments p
         JOIN members m ON p.member_id = m.id
         LEFT JOIN plans pl ON p.plan_id = pl.id
         WHERE p.order_id = ?`
      )
      .get(orderId) as any;

    if (!row) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (row.payment_status !== 'approved') {
      res.status(400).json({ error: 'Receipt is available only after payment approval.' });
      return;
    }

    const settings = getPublicSettings();
    res.json({ receipt: row, gym: settings });
  });

  // ---------------- ADMIN AUTH ROUTES ----------------

  app.post('/api/admin/login', loginLimiter, (req, res) => {
    const identifier = sanitizeText(req.body.username || req.body.email, 120);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }

    const admin = db
      .prepare('SELECT * FROM admins WHERE username = ? OR email = ?')
      .get(identifier, identifier) as any;

    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const token = signAdminToken(admin);
    res.cookie('bb_admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000,
    });

    logAudit(admin, 'ADMIN_LOGIN', 'admin', admin.id, `Role: ${admin.role}`, req);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.must_change_password === 1,
      },
    });
  });

  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie('bb_admin_token');
    res.json({ ok: true });
  });

  app.get('/api/admin/me', requireAuth(true), (req: AuthenticatedRequest, res) => {
    const admin = req.admin!;
    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.must_change_password === 1,
      },
    });
  });

  app.post('/api/admin/change-password', requireAuth(true), (req: AuthenticatedRequest, res) => {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const row = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin!.id) as any;
    if (!row || !bcrypt.compareSync(currentPassword, row.password_hash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE admins SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
      newHash,
      row.id
    );

    logAudit(req.admin!, 'PASSWORD_CHANGED', 'admin', row.id, 'Admin changed password', req);

    const token = signAdminToken(row);
    res.cookie('bb_admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.json({
      token,
      admin: {
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        mustChangePassword: false,
      },
    });
  });

  // ---------------- ADMIN PROTECTED DATA ROUTES ----------------

  app.get('/api/admin/dashboard', requireAuth(), (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const in7DaysDate = new Date();
    in7DaysDate.setDate(in7DaysDate.getDate() + 7);
    const in7Days = in7DaysDate.toISOString().slice(0, 10);
    const monthPrefix = today.slice(0, 7);

    // Auto-mark expired active members whose expiry_date < today
    db.prepare(
      `UPDATE members SET status = 'expired', updated_at = datetime('now')
       WHERE status = 'active' AND expiry_date IS NOT NULL AND expiry_date < ?`
    ).run(today);

    const totalMembers = (db.prepare('SELECT COUNT(*) as c FROM members').get() as any).c;
    const activeMembers = (
      db.prepare(`SELECT COUNT(*) as c FROM members WHERE status = 'active'`).get() as any
    ).c;
    const expiredMembers = (
      db.prepare(`SELECT COUNT(*) as c FROM members WHERE status = 'expired'`).get() as any
    ).c;
    const pendingPayments = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM payments WHERE status IN ('pending_verification', 'pending_gym_payment')`
        )
        .get() as any
    ).c;

    const monthlyRevenue = (
      db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) as total
           FROM payments
           WHERE status = 'approved' AND substr(COALESCE(verified_at, created_at), 1, 7) = ?`
        )
        .get(monthPrefix) as any
    ).total;

    const expiringSoon = db
      .prepare(
        `SELECT m.id, m.member_code, m.name, m.phone, m.expiry_date, pl.name as plan_name
         FROM members m
         LEFT JOIN plans pl ON m.plan_id = pl.id
         WHERE m.status = 'active' AND m.expiry_date BETWEEN ? AND ?
         ORDER BY m.expiry_date ASC`
      )
      .all(today, in7Days);

    const newEnquiries = (
      db.prepare(`SELECT COUNT(*) as c FROM enquiries WHERE status = 'new'`).get() as any
    ).c;

    res.json({
      metrics: {
        totalMembers,
        activeMembers,
        expiredMembers,
        pendingPayments,
        monthlyRevenue,
        expiringSoonCount: expiringSoon.length,
        newEnquiries,
      },
      expiringSoon,
    });
  });

  app.get('/api/admin/members', requireAuth(), (req, res) => {
    const search = sanitizeText(req.query.search, 100);
    const status = sanitizeText(req.query.status, 30);

    let sql = `
      SELECT m.*, pl.name as plan_name, pl.price as plan_price
      FROM members m
      LEFT JOIN plans pl ON m.plan_id = pl.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ` AND m.status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (m.name LIKE ? OR m.phone LIKE ? OR m.email LIKE ? OR m.member_code LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ` ORDER BY m.id DESC`;
    const members = db.prepare(sql).all(...params);
    res.json({ members });
  });

  app.get('/api/admin/members/:id', requireAuth(), (req, res) => {
    const id = Number(req.params.id);
    const member = db
      .prepare(
        `SELECT m.*, pl.name as plan_name, pl.price as plan_price, pl.duration_value, pl.duration_unit
         FROM members m
         LEFT JOIN plans pl ON m.plan_id = pl.id
         WHERE m.id = ?`
      )
      .get(id) as any;

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const payments = db
      .prepare(
        `SELECT p.*, pl.name as plan_name
         FROM payments p
         LEFT JOIN plans pl ON p.plan_id = pl.id
         WHERE p.member_id = ?
         ORDER BY p.id DESC`
      )
      .all(id);

    const activityLogs = db
      .prepare(
        `SELECT * FROM member_activity_logs
         WHERE member_id = ?
         ORDER BY id DESC LIMIT 100`
      )
      .all(id);

    res.json({ member, payments, activityLogs });
  });

  app.post('/api/admin/members', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const name = sanitizeText(req.body.name, 120);
    const phone = sanitizeText(req.body.phone, 20).replace(/\D/g, '').slice(-10);
    const email = sanitizeText(req.body.email, 150);
    const gender = sanitizeText(req.body.gender || 'Male', 30);
    const dob = sanitizeText(req.body.dob || '1998-01-01', 20);
    const address = sanitizeText(req.body.address || 'Durgapur, WB', 300);
    const emergency_contact = sanitizeText(req.body.emergency_contact || phone, 20)
      .replace(/\D/g, '')
      .slice(-10);
    const fitness_goal = sanitizeText(req.body.fitness_goal || 'General Fitness', 100);
    const plan_id = Number(req.body.plan_id);
    const start_date = sanitizeText(req.body.start_date || new Date().toISOString().slice(0, 10), 20);
    const status = ['active', 'pending', 'expired'].includes(req.body.status)
      ? req.body.status
      : 'active';

    if (!name || !isValidIndianMobile(phone) || !isValidEmail(email)) {
      res.status(400).json({ error: 'Valid name, 10-digit Indian mobile, and email are required.' });
      return;
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
    if (!plan) {
      res.status(400).json({ error: 'Valid plan is required.' });
      return;
    }

    const expiry_date =
      status === 'active'
        ? calculateExpiryDate(start_date, plan.duration_value, plan.duration_unit)
        : null;
    const memberCode = generateMemberCode();

    const result = db
      .prepare(
        `INSERT INTO members (
          member_code, name, phone, email, gender, dob, address,
          emergency_contact, fitness_goal, plan_id, start_date, expiry_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        memberCode,
        name,
        phone,
        email,
        gender,
        dob,
        address,
        emergency_contact,
        fitness_goal,
        plan.id,
        start_date,
        expiry_date,
        status
      );

    logAudit(
      req.admin!,
      'MEMBER_CREATED',
      'member',
      result.lastInsertRowid as number,
      `Added ${name} (${memberCode}) on ${plan.name}`,
      req
    );

    logMemberActivity(
      Number(result.lastInsertRowid),
      memberCode,
      'registration',
      'Member Added by Admin',
      `Enrolled on ${plan.name} (Status: ${status}${expiry_date ? `, Expiry: ${expiry_date}` : ''})`,
      req.admin!.username
    );

    res.status(201).json({ id: result.lastInsertRowid, member_code: memberCode });
  });

  app.put('/api/admin/members/:id', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const name = sanitizeText(req.body.name ?? existing.name, 120);
    const phone = sanitizeText(req.body.phone ?? existing.phone, 20).replace(/\D/g, '').slice(-10);
    const email = sanitizeText(req.body.email ?? existing.email, 150);
    const address = sanitizeText(req.body.address ?? existing.address, 300);
    const fitness_goal = sanitizeText(req.body.fitness_goal ?? existing.fitness_goal, 100);
    const plan_id = req.body.plan_id ? Number(req.body.plan_id) : existing.plan_id;
    const start_date = sanitizeText(req.body.start_date ?? existing.start_date, 20);
    let expiry_date = req.body.expiry_date ?? existing.expiry_date;
    let status = req.body.status ?? existing.status;

    if (!name || !isValidIndianMobile(phone) || !isValidEmail(email)) {
      res.status(400).json({ error: 'Valid name, 10-digit Indian mobile, and email are required.' });
      return;
    }

    if (req.body.renew === true) {
      const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
      if (!plan) {
        res.status(400).json({ error: 'Plan not found for renewal' });
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const baseDate =
        existing.expiry_date && existing.expiry_date > today ? existing.expiry_date : today;
      expiry_date = calculateExpiryDate(baseDate, plan.duration_value, plan.duration_unit);
      status = 'active';
    }

    db.prepare(
      `UPDATE members
       SET name = ?, phone = ?, email = ?, address = ?, fitness_goal = ?,
           plan_id = ?, start_date = ?, expiry_date = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(name, phone, email, address, fitness_goal, plan_id, start_date, expiry_date, status, id);

    logAudit(
      req.admin!,
      req.body.renew ? 'MEMBER_RENEWED' : 'MEMBER_UPDATED',
      'member',
      id,
      `${existing.member_code} (${name}) -> status: ${status}, expiry: ${expiry_date || 'N/A'}`,
      req
    );

    logMemberActivity(
      id,
      existing.member_code,
      req.body.renew ? 'renewal' : 'profile_updated',
      req.body.renew ? 'Membership Renewed' : 'Member Profile Updated',
      `Status: ${status}${expiry_date ? `, Expiry: ${expiry_date}` : ''}`,
      req.admin!.username
    );

    res.json({ ok: true, expiry_date, status });
  });

  app.delete('/api/admin/members/:id', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    db.prepare('DELETE FROM members WHERE id = ?').run(id);
    logAudit(
      req.admin!,
      'MEMBER_DELETED',
      'member',
      id,
      `Deleted member ${existing.member_code} (${existing.name})`,
      req
    );

    res.json({ ok: true });
  });

  app.get('/api/admin/members/export/csv', requireAuth(), (req: AuthenticatedRequest, res) => {
    const rows = db
      .prepare(
        `SELECT m.member_code, m.name, m.phone, m.email, m.gender, m.dob, m.fitness_goal,
                pl.name as plan_name, m.start_date, m.expiry_date, m.status
         FROM members m
         LEFT JOIN plans pl ON m.plan_id = pl.id
         ORDER BY m.id DESC`
      )
      .all() as any[];

    const headers = [
      'Member ID',
      'Name',
      'Phone',
      'Email',
      'Gender',
      'DOB',
      'Fitness Goal',
      'Plan',
      'Start Date',
      'Expiry Date',
      'Status',
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.member_code,
          r.name,
          r.phone,
          r.email,
          r.gender,
          r.dob,
          r.fitness_goal,
          r.plan_name || '',
          r.start_date,
          r.expiry_date || '',
          r.status,
        ]
          .map(escapeCsv)
          .join(',')
      );
    }

    logAudit(req.admin!, 'MEMBERS_CSV_EXPORT', 'member', null, `Exported ${rows.length} rows`, req);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="muscle-arena-members.csv"');
    res.send(lines.join('\n'));
  });

  app.get('/api/admin/payments', requireAuth(), (req, res) => {
    const status = sanitizeText(req.query.status, 30);
    let sql = `
      SELECT p.*, m.member_code, m.name as member_name, m.phone, m.email, m.start_date, m.expiry_date,
             pl.name as plan_name, pl.duration_value, pl.duration_unit
      FROM payments p
      JOIN members m ON p.member_id = m.id
      LEFT JOIN plans pl ON p.plan_id = pl.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status && status !== 'all') {
      sql += ` AND p.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY p.id DESC`;
    const payments = db.prepare(sql).all(...params);
    res.json({ payments });
  });

  app.post('/api/admin/payments/:id/approve', requireAuth(), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(payment.member_id) as any;
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(payment.plan_id) as any;

    if (!member || !plan) {
      res.status(400).json({ error: 'Associated member or plan not found' });
      return;
    }

    const expiryDate = calculateExpiryDate(member.start_date, plan.duration_value, plan.duration_unit);
    const nowIso = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE payments
         SET status = 'approved', rejection_reason = NULL, verified_by = ?, verified_at = ?
         WHERE id = ?`
      ).run(req.admin!.username, nowIso, id);

      db.prepare(
        `UPDATE members
         SET status = 'active', expiry_date = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(expiryDate, member.id);
    });
    tx();

    logAudit(
      req.admin!,
      'PAYMENT_APPROVED',
      'payment',
      payment.order_id,
      `Approved ₹${payment.amount} (UTR: ${payment.utr || 'Cash/Gym'}) for ${member.member_code}. Expiry: ${expiryDate}`,
      req
    );

    logMemberActivity(
      member.id,
      member.member_code,
      'payment_approved',
      'Payment Approved & Membership Active',
      `Order ${payment.order_id} (₹${payment.amount}${payment.utr ? `, UTR ${payment.utr}` : ''}) approved. Active until ${expiryDate}.`,
      req.admin!.username
    );

    res.json({ ok: true, expiryDate, orderId: payment.order_id });
  });

  app.post('/api/admin/payments/:id/reject', requireAuth(), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const reason = sanitizeText(req.body.reason, 300);
    if (!reason || reason.length < 3) {
      res.status(400).json({ error: 'Please provide a rejection reason.' });
      return;
    }

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE payments
         SET status = 'rejected', rejection_reason = ?, verified_by = ?, verified_at = ?
         WHERE id = ?`
      ).run(reason, req.admin!.username, nowIso, id);

      db.prepare(
        `UPDATE members SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`
      ).run(payment.member_id);
    });
    tx();

    logAudit(
      req.admin!,
      'PAYMENT_REJECTED',
      'payment',
      payment.order_id,
      `Rejected payment ${payment.order_id}. Reason: ${reason}`,
      req
    );

    const mRow = db
      .prepare('SELECT member_code FROM members WHERE id = ?')
      .get(payment.member_id) as { member_code: string } | undefined;
    if (mRow) {
      logMemberActivity(
        payment.member_id,
        mRow.member_code,
        'payment_rejected',
        'Payment Verification Rejected',
        `Order ${payment.order_id} rejected. Reason: ${reason}`,
        req.admin!.username
      );
    }

    res.json({ ok: true });
  });

  app.get('/api/admin/plans', requireAuth(), (_req, res) => {
    const plans = db
      .prepare('SELECT * FROM plans ORDER BY sort_order ASC, id ASC')
      .all()
      .map((p: any) => ({
        ...p,
        features: JSON.parse(p.features || '[]'),
        is_popular: Boolean(p.is_popular),
        is_active: Boolean(p.is_active),
      }));
    res.json({ plans });
  });

  app.post('/api/admin/plans', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const name = sanitizeText(req.body.name, 100);
    const price = Number(req.body.price);
    const duration_value = Number(req.body.duration_value);
    const duration_unit = ['days', 'months', 'years'].includes(req.body.duration_unit)
      ? req.body.duration_unit
      : 'months';
    const description = sanitizeText(req.body.description || '', 300);
    const features = Array.isArray(req.body.features)
      ? req.body.features.map((f: unknown) => sanitizeText(f, 150)).filter(Boolean)
      : [];
    const is_popular = req.body.is_popular ? 1 : 0;
    const is_active = req.body.is_active === false ? 0 : 1;
    const sort_order = Number(req.body.sort_order || 10);

    if (!name || !(price > 0) || !(duration_value > 0)) {
      res.status(400).json({ error: 'Valid plan name, positive price, and duration are required.' });
      return;
    }

    if (is_popular === 1) {
      db.prepare('UPDATE plans SET is_popular = 0').run();
    }

    const result = db
      .prepare(
        `INSERT INTO plans (name, price, duration_value, duration_unit, description, features, is_popular, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        price,
        duration_value,
        duration_unit,
        description,
        JSON.stringify(features),
        is_popular,
        is_active,
        sort_order
      );

    logAudit(req.admin!, 'PLAN_CREATED', 'plan', result.lastInsertRowid as number, `${name} (₹${price})`, req);
    res.status(201).json({ id: result.lastInsertRowid });
  });

  app.put('/api/admin/plans/:id', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM plans WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const name = sanitizeText(req.body.name ?? existing.name, 100);
    const price = req.body.price !== undefined ? Number(req.body.price) : existing.price;
    const duration_value =
      req.body.duration_value !== undefined ? Number(req.body.duration_value) : existing.duration_value;
    const duration_unit = ['days', 'months', 'years'].includes(req.body.duration_unit)
      ? req.body.duration_unit
      : existing.duration_unit;
    const description = sanitizeText(req.body.description ?? existing.description, 300);
    const features = Array.isArray(req.body.features)
      ? req.body.features.map((f: unknown) => sanitizeText(f, 150)).filter(Boolean)
      : JSON.parse(existing.features || '[]');
    const is_popular =
      req.body.is_popular !== undefined ? (req.body.is_popular ? 1 : 0) : existing.is_popular;
    const is_active =
      req.body.is_active !== undefined ? (req.body.is_active ? 1 : 0) : existing.is_active;

    if (is_popular === 1) {
      db.prepare('UPDATE plans SET is_popular = 0 WHERE id != ?').run(id);
    }

    db.prepare(
      `UPDATE plans
       SET name = ?, price = ?, duration_value = ?, duration_unit = ?, description = ?,
           features = ?, is_popular = ?, is_active = ?
       WHERE id = ?`
    ).run(name, price, duration_value, duration_unit, description, JSON.stringify(features), is_popular, is_active, id);

    logAudit(req.admin!, 'PLAN_UPDATED', 'plan', id, `${name} (₹${price}, active=${is_active})`, req);
    res.json({ ok: true });
  });

  app.delete('/api/admin/plans/:id', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const used = db.prepare('SELECT COUNT(*) as c FROM members WHERE plan_id = ?').get(id) as any;
    if (used.c > 0) {
      db.prepare('UPDATE plans SET is_active = 0 WHERE id = ?').run(id);
      logAudit(req.admin!, 'PLAN_DEACTIVATED', 'plan', id, 'Plan has members; set inactive', req);
      res.json({ ok: true, deactivated: true });
      return;
    }
    db.prepare('DELETE FROM plans WHERE id = ?').run(id);
    logAudit(req.admin!, 'PLAN_DELETED', 'plan', id, 'Plan deleted', req);
    res.json({ ok: true });
  });

  app.get('/api/admin/enquiries', requireAuth(), (_req, res) => {
    const enquiries = db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all();
    res.json({ enquiries });
  });

  app.get('/api/admin/enquiries/export/csv', requireAuth(), (req: AuthenticatedRequest, res) => {
    const rows = db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all() as any[];
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Source', 'Message', 'Status', 'Created At'];
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [r.id, r.name, r.phone, r.email, r.source, r.message, r.status, r.created_at]
          .map(escapeCsv)
          .join(',')
      );
    }
    logAudit(req.admin!, 'ENQUIRIES_CSV_EXPORT', 'enquiry', null, `Exported ${rows.length} rows`, req);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="muscle-arena-enquiries.csv"');
    res.send(lines.join('\n'));
  });

  app.patch('/api/admin/enquiries/:id', requireAuth(), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const status = ['new', 'contacted', 'closed'].includes(req.body.status) ? req.body.status : null;
    if (!status) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
    logAudit(req.admin!, 'ENQUIRY_UPDATED', 'enquiry', id, `Status -> ${status}`, req);
    res.json({ ok: true });
  });

  app.get('/api/admin/settings', requireAuth(), requireOwner, (_req, res) => {
    res.json({ settings: getSettingsMap() });
  });

  app.put('/api/admin/settings', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const allowedKeys = [
      'gym_name',
      'owner_name',
      'address',
      'phone',
      'email',
      'timings_mon_sat',
      'timings_sun',
      'instagram',
      'facebook',
      'youtube',
      'upi_id',
      'upi_name',
      'bank_account_name',
      'bank_account_number',
      'bank_name',
      'bank_branch',
      'bank_ifsc',
      'hero_headline',
      'hero_subtext',
      'about_story',
      'about_mission',
    ];

    const upsert = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    const tx = db.transaction(() => {
      for (const k of allowedKeys) {
        if (typeof req.body[k] === 'string') {
          upsert.run(k, sanitizeText(req.body[k], 1500));
        }
      }
    });
    tx();

    logAudit(req.admin!, 'SETTINGS_UPDATED', 'settings', null, 'Gym & payment settings updated', req);
    res.json({ settings: getSettingsMap() });
  });

  app.get('/api/admin/audit-logs', requireAuth(), requireOwner, (_req, res) => {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200').all();
    res.json({ logs });
  });

  app.get('/api/admin/staff', requireAuth(), requireOwner, (_req, res) => {
    const admins = db
      .prepare('SELECT id, username, email, role, must_change_password, created_at FROM admins ORDER BY id ASC')
      .all();
    res.json({ admins });
  });

  app.post('/api/admin/staff', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const username = sanitizeText(req.body.username, 60);
    const email = sanitizeText(req.body.email, 120);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = req.body.role === 'owner' ? 'owner' : 'staff';

    if (!username || !isValidEmail(email) || password.length < 8) {
      res.status(400).json({ error: 'Valid username, email, and 8+ character password are required.' });
      return;
    }

    try {
      const result = db
        .prepare(
          `INSERT INTO admins (username, email, password_hash, role, must_change_password)
           VALUES (?, ?, ?, ?, 1)`
        )
        .run(username, email, bcrypt.hashSync(password, 10), role);

      logAudit(req.admin!, 'STAFF_CREATED', 'admin', result.lastInsertRowid as number, `${username} (${role})`, req);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch {
      res.status(409).json({ error: 'Username or email already exists.' });
    }
  });

  app.get('/api/admin/member-activity', requireAuth(), (req, res) => {
    const type = sanitizeText(req.query.type, 40);
    const search = sanitizeText(req.query.search, 100);
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    let sql = `
      SELECT a.*, m.name as member_name
      FROM member_activity_logs a
      LEFT JOIN members m ON a.member_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (memberId) {
      sql += ` AND a.member_id = ?`;
      params.push(memberId);
    }
    if (type && type !== 'all') {
      sql += ` AND a.activity_type = ?`;
      params.push(type);
    }
    if (search) {
      sql += ` AND (a.member_code LIKE ? OR m.name LIKE ? OR a.title LIKE ? OR a.details LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ` ORDER BY a.id DESC LIMIT 300`;
    const logs = db.prepare(sql).all(...params);
    res.json({ logs });
  });

  app.post('/api/admin/members/:id/activity', requireAuth(), (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const member = db.prepare('SELECT id, member_code, name FROM members WHERE id = ?').get(id) as any;
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const allowedTypes = new Set(['gym_checkin', 'note', 'profile_updated', 'renewal']);
    const activityType = allowedTypes.has(req.body.activity_type)
      ? req.body.activity_type
      : 'gym_checkin';
    const defaultTitle =
      activityType === 'gym_checkin' ? 'Gym Floor Check-In' : 'Coach / Desk Activity Note';
    const title = sanitizeText(req.body.title || defaultTitle, 150) || defaultTitle;
    const details = sanitizeText(req.body.details || '', 500);

    logMemberActivity(
      member.id,
      member.member_code,
      activityType,
      title,
      details,
      req.admin!.username
    );
    logAudit(
      req.admin!,
      'MEMBER_ACTIVITY_LOGGED',
      'member',
      member.member_code,
      `${activityType}: ${title}`,
      req
    );

    res.status(201).json({ ok: true });
  });

  app.get('/api/admin/member-activity/export/csv', requireAuth(), (req: AuthenticatedRequest, res) => {
    const rows = db
      .prepare(
        `SELECT a.created_at, a.member_code, m.name as member_name, a.activity_type, a.title, a.details, a.actor
         FROM member_activity_logs a
         LEFT JOIN members m ON a.member_id = m.id
         ORDER BY a.id DESC`
      )
      .all() as any[];

    const headers = ['Timestamp', 'Member ID', 'Member Name', 'Type', 'Title', 'Details', 'Recorded By'];
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [r.created_at, r.member_code, r.member_name || '', r.activity_type, r.title, r.details, r.actor]
          .map(escapeCsv)
          .join(',')
      );
    }
    logAudit(
      req.admin!,
      'MEMBER_ACTIVITY_CSV_EXPORT',
      'member_activity',
      null,
      `Exported ${rows.length} rows`,
      req
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="muscle-arena-member-activity.csv"');
    res.send(lines.join('\n'));
  });

  app.get('/api/admin/cta-events', requireAuth(), (req, res) => {
    const button = sanitizeText(req.query.button, 40);
    const search = sanitizeText(req.query.search, 100);

    let sql = `SELECT * FROM cta_events WHERE 1=1`;
    const params: any[] = [];

    if (button && button !== 'all') {
      sql += ` AND button_name = ?`;
      params.push(button);
    }
    if (search) {
      sql += ` AND (customer_name LIKE ? OR customer_phone LIKE ? OR customer_email LIKE ? OR details LIKE ? OR button_label LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }

    sql += ` ORDER BY id DESC LIMIT 300`;
    const events = db.prepare(sql).all(...params);

    const countRows = db
      .prepare(`SELECT button_name, COUNT(*) as c FROM cta_events GROUP BY button_name`)
      .all() as Array<{ button_name: string; c: number }>;

    const counts: Record<string, number> = {
      join_now: 0,
      start_membership: 0,
      book_free_trial: 0,
      contact_form: 0,
      total: 0,
    };
    for (const r of countRows) {
      counts[r.button_name] = r.c;
      counts.total += r.c;
    }

    res.json({ events, counts });
  });

  app.get('/api/admin/cta-events/export/csv', requireAuth(), (req: AuthenticatedRequest, res) => {
    const rows = db.prepare('SELECT * FROM cta_events ORDER BY id DESC').all() as any[];
    const headers = [
      'Timestamp',
      'Button / Form Source',
      'Label',
      'Status',
      'Customer Name',
      'Phone',
      'Email',
      'Page',
      'Details',
    ];
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.created_at,
          r.button_name,
          r.button_label,
          r.status,
          r.customer_name,
          r.customer_phone,
          r.customer_email,
          r.page_path,
          r.details,
        ]
          .map(escapeCsv)
          .join(',')
      );
    }
    logAudit(req.admin!, 'CTA_EVENTS_CSV_EXPORT', 'cta_events', null, `Exported ${rows.length} rows`, req);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="muscle-arena-button-form-leads.csv"');
    res.send(lines.join('\n'));
  });

  app.get('/api/admin/backup/json', requireAuth(), requireOwner, (req: AuthenticatedRequest, res) => {
    const backup = {
      exportedAt: new Date().toISOString(),
      members: db.prepare('SELECT * FROM members ORDER BY id DESC').all(),
      payments: db.prepare('SELECT * FROM payments ORDER BY id DESC').all(),
      enquiries: db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all(),
      ctaEvents: db.prepare('SELECT * FROM cta_events ORDER BY id DESC').all(),
      memberActivityLogs: db.prepare('SELECT * FROM member_activity_logs ORDER BY id DESC').all(),
      plans: db.prepare('SELECT * FROM plans ORDER BY id ASC').all(),
      settings: getSettingsMap(),
      auditLogs: db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all(),
    };
    logAudit(req.admin!, 'FULL_BACKUP_EXPORT', 'system', null, 'Exported full JSON backup', req);
    const dateTag = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="muscle-arena-backup-${dateTag}.json"`
    );
    res.send(JSON.stringify(backup, null, 2));
  });

  return app;
}
