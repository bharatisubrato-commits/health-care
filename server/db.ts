import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const isServerless = Boolean(
  process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
);
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : isServerless
    ? path.join('/tmp', 'muscle-arena-data')
    : path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'buildbody.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function calculateExpiryDate(
  startDateStr: string,
  durationValue: number,
  durationUnit: 'days' | 'months' | 'years'
): string {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (durationUnit === 'days') {
    date.setUTCDate(date.getUTCDate() + durationValue);
  } else if (durationUnit === 'months') {
    const targetMonth = date.getUTCMonth() + durationValue;
    const dayOfMonth = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(targetMonth);
    const maxDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(dayOfMonth, maxDay));
  } else if (durationUnit === 'years') {
    const targetYear = date.getUTCFullYear() + durationValue;
    const month = date.getUTCMonth();
    const dayOfMonth = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCFullYear(targetYear, month, 1);
    const maxDay = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(dayOfMonth, maxDay));
  }

  return date.toISOString().slice(0, 10);
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'staff')),
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      duration_value INTEGER NOT NULL,
      duration_unit TEXT NOT NULL CHECK(duration_unit IN ('days', 'months', 'years')),
      description TEXT NOT NULL DEFAULT '',
      features TEXT NOT NULL DEFAULT '[]',
      is_popular INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      gender TEXT NOT NULL,
      dob TEXT NOT NULL,
      address TEXT NOT NULL,
      emergency_contact TEXT NOT NULL,
      fitness_goal TEXT NOT NULL,
      plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
      start_date TEXT NOT NULL,
      expiry_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'expired', 'rejected')),
      source_cta TEXT NOT NULL DEFAULT 'direct',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'upi' CHECK(payment_method IN ('upi', 'pay_at_gym')),
      utr TEXT,
      screenshot_path TEXT,
      status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK(status IN ('awaiting_payment', 'pending_verification', 'pending_gym_payment', 'approved', 'rejected')),
      rejection_reason TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_utr
      ON payments(utr)
      WHERE utr IS NOT NULL AND utr != '';

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'contact' CHECK(source IN ('contact', 'free_trial')),
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      admin_username TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL DEFAULT '',
      ip_address TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS member_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      member_code TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN (
        'registration',
        'payment_submitted',
        'payment_approved',
        'payment_rejected',
        'gym_checkin',
        'renewal',
        'profile_updated',
        'note'
      )),
      title TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      actor TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cta_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      button_name TEXT NOT NULL CHECK(button_name IN ('join_now', 'start_membership', 'book_free_trial', 'contact_form')),
      button_label TEXT NOT NULL,
      page_path TEXT NOT NULL DEFAULT '/',
      status TEXT NOT NULL DEFAULT 'clicked',
      customer_name TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      customer_email TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const memberCols = db.prepare(`PRAGMA table_info(members)`).all() as Array<{ name: string }>;
  if (!memberCols.some((c) => c.name === 'source_cta')) {
    db.exec(`ALTER TABLE members ADD COLUMN source_cta TEXT NOT NULL DEFAULT 'direct'`);
  }

  seedInitialData();
}

function seedInitialData() {
  const adminCount = (db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number }).count;
  if (adminCount === 0) {
    const ownerPass = process.env.ADMIN_DEFAULT_PASSWORD || 'BuildBody@2026';
    const staffPass = process.env.ADMIN_STAFF_PASSWORD || 'Staff@2026';

    db.prepare(
      `INSERT INTO admins (username, email, password_hash, role, must_change_password)
       VALUES (?, ?, ?, 'owner', 1)`
    ).run('owner', 'owner@buildbody-demo.com', bcrypt.hashSync(ownerPass, 10));

    db.prepare(
      `INSERT INTO admins (username, email, password_hash, role, must_change_password)
       VALUES (?, ?, ?, 'staff', 0)`
    ).run('staff', 'staff@buildbody-demo.com', bcrypt.hashSync(staffPass, 10));
  }

  const defaultSettings: Record<string, string> = {
    gym_name: 'Muscle Arena',
    owner_name: 'Subrato Bharati',
    address: 'Near Gopalmath Water Tank, Durgapur, West Bengal, 713217',
    phone: '8388922869',
    email: 'info@buildbody-demo.com',
    timings_mon_sat: '5:30 AM - 10:00 PM',
    timings_sun: '6:00 AM - 12:00 PM',
    instagram: 'https://instagram.com/buildbody.demo',
    facebook: 'https://facebook.com/buildbody.demo',
    youtube: 'https://youtube.com/@buildbodydemo',
    upi_id: 'buildbody@sbi',
    upi_name: 'Subrato Bharati',
    bank_account_name: 'Subrato Bharati',
    bank_account_number: '1234321444',
    bank_name: 'State Bank of India',
    bank_branch: 'Durgapur Branch',
    bank_ifsc: 'SBIN0000075',
    hero_headline: 'BUILD STRENGTH. TRAIN HARDER.',
    hero_subtext:
      'Calibrated barbells, structured hypertrophy coaching, and high-energy conditioning near Gopalmath Water Tank, Durgapur.',
    about_story:
      'Founded by Subrato Bharati in Gopalmath, Durgapur, Muscle Arena was built to replace crowded, unguided fitness rooms with a disciplined strength and conditioning floor. Every rack, calibrated plate, and coaching block is organized around measurable weekly progression.',
    about_mission:
      'Our mission is to make serious strength coaching, safe barbell mechanics, and honest nutrition guidance accessible to students, working professionals, and competitive athletes across Durgapur.',
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const txSettings = db.transaction(() => {
    for (const [k, v] of Object.entries(defaultSettings)) {
      insertSetting.run(k, v);
    }
    db.prepare(`UPDATE settings SET value = 'Muscle Arena' WHERE key = 'gym_name' AND value = 'Build Body'`).run();
    db.prepare(
      `UPDATE settings SET value = replace(value, 'Build Body', 'Muscle Arena') WHERE key = 'about_story' AND value LIKE '%Build Body%'`
    ).run();
  });
  txSettings();

  const planCount = (db.prepare('SELECT COUNT(*) as count FROM plans').get() as { count: number }).count;
  if (planCount === 0) {
    const insertPlan = db.prepare(
      `INSERT INTO plans (name, price, duration_value, duration_unit, description, features, is_popular, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    );

    insertPlan.run(
      'Monthly',
      1200,
      1,
      'months',
      'Full floor access with general floor coaching for flexible monthly training.',
      JSON.stringify([
        'Unlimited gym floor access (Mon–Sun)',
        'Calibrated strength & free-weight zone',
        'Cardio & conditioning turf access',
        'Starter workout split assessment',
      ]),
      0,
      1
    );

    insertPlan.run(
      'Quarterly',
      3200,
      3,
      'months',
      'Built for consistent 12-week hypertrophy or fat-loss training blocks.',
      JSON.stringify([
        'Everything in Monthly access',
        'Customized 12-week progressive split',
        'Bi-weekly body composition check-ins',
        'Macro & daily protein target guide',
        '15% savings over monthly billing',
      ]),
      1,
      2
    );

    insertPlan.run(
      'Yearly',
      10999,
      1,
      'years',
      'Best annual value for dedicated lifters training year-round.',
      JSON.stringify([
        'Full 365-day gym floor & turf access',
        'Quarterly strength & mobility review',
        'Priority personal coaching slot access',
        'Guest pass (2 friends per month)',
        'Save ₹3,401 vs monthly plan',
      ]),
      0,
      3
    );

    insertPlan.run(
      '90-Day Transformation Special',
      5499,
      90,
      'days',
      'Intensive guided recomposition package with 1-on-1 trainer check-ins.',
      JSON.stringify([
        'Full 90-day gym & conditioning access',
        '3x/week guided coach form supervision',
        'Personalized Indian diet & meal chart',
        'Weekly weight, waist & PR tracking',
        'Supplementation & recovery blueprint',
      ]),
      0,
      4
    );
  }

  // Seed realistic sample members & enquiries only when database is brand new
  const memberCount = (db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number }).count;
  if (memberCount === 0) {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return fmt(d);
    };
    const daysAhead = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return fmt(d);
    };

    const insertMember = db.prepare(
      `INSERT INTO members (member_code, name, phone, email, gender, dob, address, emergency_contact, fitness_goal, plan_id, start_date, expiry_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertPayment = db.prepare(
      `INSERT INTO payments (order_id, member_id, plan_id, amount, payment_method, utr, status, verified_by, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const m1 = insertMember.run(
      'BB-2026-1001',
      'Arjun Chatterjee',
      '9832145670',
      'arjun.c@example.com',
      'Male',
      '1998-04-12',
      'Benachity, Durgapur, 713213',
      '9832100011',
      'Muscle Gain',
      2,
      daysAgo(20),
      daysAhead(70),
      'active'
    );
    insertPayment.run(
      'ORD-BB-261001',
      m1.lastInsertRowid,
      2,
      3200,
      'upi',
      '431890234512',
      'approved',
      'owner',
      daysAgo(20)
    );

    const m2 = insertMember.run(
      'BB-2026-1002',
      'Priya Sen',
      '9732198432',
      'priya.sen@example.com',
      'Female',
      '2000-09-21',
      'City Centre, Durgapur, 713216',
      '9732100022',
      'Fat Loss',
      1,
      daysAgo(26),
      daysAhead(4),
      'active'
    );
    insertPayment.run(
      'ORD-BB-261002',
      m2.lastInsertRowid,
      1,
      1200,
      'upi',
      '431890239901',
      'approved',
      'owner',
      daysAgo(26)
    );

    const m3 = insertMember.run(
      'BB-2026-1003',
      'Rohan Dasgupta',
      '9434011223',
      'rohan.d@example.com',
      'Male',
      '1995-11-05',
      'Bidhannagar, Durgapur, 713212',
      '9434000033',
      'Strength',
      1,
      daysAgo(45),
      daysAgo(15),
      'expired'
    );
    insertPayment.run(
      'ORD-BB-261003',
      m3.lastInsertRowid,
      1,
      1200,
      'upi',
      '431780112233',
      'approved',
      'owner',
      daysAgo(45)
    );

    const insertEnquiry = db.prepare(
      `INSERT INTO enquiries (name, phone, email, source, message, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertEnquiry.run(
      'Sayan Mukherjee',
      '9800123456',
      'sayan.m@example.com',
      'free_trial',
      'Interested in evening 7 PM trial session.',
      'new'
    );
    insertEnquiry.run(
      'Ananya Roy',
      '9832277665',
      'ananya.roy@example.com',
      'contact',
      'Looking for women strength coaching timings.',
      'contacted'
    );
  }

  const activityCount = (
    db.prepare('SELECT COUNT(*) as count FROM member_activity_logs').get() as { count: number }
  ).count;
  if (activityCount === 0) {
    const seededMembers = db
      .prepare('SELECT id, member_code, name, status, expiry_date FROM members ORDER BY id ASC LIMIT 3')
      .all() as Array<{
      id: number;
      member_code: string;
      name: string;
      status: string;
      expiry_date: string | null;
    }>;

    const insertActivity = db.prepare(
      `INSERT INTO member_activity_logs (member_id, member_code, activity_type, title, details, actor)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const m of seededMembers) {
      insertActivity.run(
        m.id,
        m.member_code,
        'registration',
        'Membership Registered',
        `${m.name} completed membership registration.`,
        'member'
      );
      insertActivity.run(
        m.id,
        m.member_code,
        'payment_approved',
        'Payment Approved & Activated',
        `Membership verified (${m.status}${m.expiry_date ? `, expires ${m.expiry_date}` : ''}).`,
        'owner'
      );
    }

    if (seededMembers[0]) {
      insertActivity.run(
        seededMembers[0].id,
        seededMembers[0].member_code,
        'gym_checkin',
        'Morning Floor Check-In',
        'Completed supervised barbell squat & push session.',
        'staff'
      );
    }
  }

  const ctaCount = (db.prepare('SELECT COUNT(*) as count FROM cta_events').get() as { count: number })
    .count;
  if (ctaCount === 0) {
    const insertCta = db.prepare(
      `INSERT INTO cta_events (button_name, button_label, page_path, status, customer_name, customer_phone, customer_email, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const existingEnquiries = db
      .prepare('SELECT name, phone, email, source, message FROM enquiries ORDER BY id ASC')
      .all() as Array<{
      name: string;
      phone: string;
      email: string;
      source: string;
      message: string;
    }>;
    for (const enq of existingEnquiries) {
      insertCta.run(
        enq.source === 'free_trial' ? 'book_free_trial' : 'contact_form',
        enq.source === 'free_trial' ? 'Book Trial' : 'Send Enquiry',
        '/',
        'submitted',
        enq.name,
        enq.phone,
        enq.email,
        enq.message || ''
      );
    }
  }
}
