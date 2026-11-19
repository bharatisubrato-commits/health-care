import { jsPDF } from 'jspdf';

export interface ReceiptData {
  order_id: string;
  amount: number;
  payment_method: string;
  utr: string | null;
  verified_by: string | null;
  verified_at: string | null;
  member_code: string;
  member_name: string;
  phone: string;
  email: string;
  address: string;
  start_date: string;
  expiry_date: string | null;
  plan_name: string;
  duration_value: number;
  duration_unit: string;
}

export function downloadMembershipReceiptPdf(
  receipt: ReceiptData,
  gymInfo: {
    gym_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    owner_name?: string;
  }
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark header block
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, pageWidth, 120, 'F');

  // Neon lime accent bar
  doc.setFillColor(180, 240, 0);
  doc.rect(0, 116, pageWidth, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text((gymInfo.gym_name || 'MUSCLE ARENA').toUpperCase(), 48, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 190);
  doc.text(
    gymInfo.address || 'Near Gopalmath Water Tank, Durgapur, West Bengal, 713217',
    48,
    76
  );
  doc.text(
    `Phone: ${gymInfo.phone || '8388922869'}  |  Email: ${gymInfo.email || 'info@buildbody-demo.com'}`,
    48,
    92
  );

  doc.setTextColor(180, 240, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('MEMBERSHIP RECEIPT', pageWidth - 48, 54, { align: 'right' });

  doc.setTextColor(244, 244, 245);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Order ID: ${receipt.order_id}`, pageWidth - 48, 76, { align: 'right' });
  doc.text(`Status: VERIFIED & ACTIVE`, pageWidth - 48, 92, { align: 'right' });

  // Body details
  let y = 165;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Member Details', 48, y);

  y += 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(48, y, pageWidth - 48, y);
  y += 22;

  const leftRows = [
    ['Member ID', receipt.member_code],
    ['Full Name', receipt.member_name],
    ['Mobile', `+91 ${receipt.phone}`],
    ['Email', receipt.email],
    ['Address', receipt.address],
  ];

  doc.setFontSize(10.5);
  for (const [label, val] of leftRows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 48, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val || '-'), 175, y);
    y += 22;
  }

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Membership & Payment Summary', 48, y);

  y += 14;
  doc.line(48, y, pageWidth - 48, y);
  y += 22;

  const payRows = [
    ['Selected Plan', `${receipt.plan_name} (${receipt.duration_value} ${receipt.duration_unit})`],
    ['Start Date', receipt.start_date],
    ['Expiry Date', receipt.expiry_date || '-'],
    ['Payment Method', receipt.payment_method === 'pay_at_gym' ? 'Pay at Gym Desk' : 'UPI Transfer'],
    ['UTR / Reference', receipt.utr || 'Front Desk Receipt'],
    ['Verified By', `${receipt.verified_by || 'Admin'} (${(receipt.verified_at || '').slice(0, 10)})`],
  ];

  doc.setFontSize(10.5);
  for (const [label, val] of payRows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 48, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 175, y);
    y += 22;
  }

  // Total box
  y += 16;
  doc.setFillColor(244, 244, 245);
  doc.rect(48, y, pageWidth - 96, 54, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL PAID (INR)', 68, y + 32);
  doc.setFontSize(18);
  doc.text(`Rs. ${receipt.amount.toLocaleString('en-IN')}`, pageWidth - 68, y + 34, {
    align: 'right',
  });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Authorized by ${gymInfo.owner_name || 'Subrato Bharati'} — Muscle Arena, Durgapur`,
    48,
    760
  );
  doc.text('This is a system-generated membership receipt.', pageWidth - 48, 760, {
    align: 'right',
  });

  doc.save(`MuscleArena_Receipt_${receipt.member_code}_${receipt.order_id}.pdf`);
}
