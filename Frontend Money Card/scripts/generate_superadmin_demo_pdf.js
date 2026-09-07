import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSuperAdminPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // Visual Theme Palette
  const PRIMARY = [79, 70, 229]; // Indigo #4F46E5
  const PRIMARY_DARK = [67, 56, 202]; // Indigo #4338CA
  const DARK = [15, 23, 42]; // Slate-900 #0F172A
  const TEXT = [30, 41, 59]; // Slate-800 #1E293B
  const MUTED = [100, 116, 139]; // Slate-500 #64748B
  const BG_LIGHT = [248, 250, 252]; // Slate-50
  const BG_CARD = [255, 255, 255]; // White
  const BORDER = [226, 232, 240]; // Slate-200
  const ACCENT = [124, 58, 237]; // Violet-600 #7C3AED
  const ACCENT_LIGHT = [245, 243, 255]; // Violet-50
  const SUCCESS = [16, 185, 129]; // Emerald-500
  const WARNING = [245, 158, 11]; // Amber-500

  function addHeaderFooter(pageNumber, totalPages) {
    // Top header line
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, 12, pageWidth - margin, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PRIMARY);
    doc.text('MONEY CARD PLATFORM', margin, 9);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('|   Super Admin End-to-End Demo & System Explanation Guide', margin + 42, 9);
    doc.text('Enterprise SaaS Edition', pageWidth - margin, 9, { align: 'right' });

    // Bottom footer line
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Confidential — For Internal Presentation, Client Demos, & System Auditing', margin, pageHeight - 8);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  function checkPageBreak(requiredHeight) {
    if (currentY + requiredHeight > pageHeight - 16) {
      doc.addPage();
      currentY = 18;
    }
  }

  // ── Cover Banner ──
  doc.setFillColor(...DARK);
  doc.roundedRect(margin, currentY, contentWidth, 38, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('MONEY CARD — SUPER ADMIN DEMO GUIDE', margin + 6, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Comprehensive End-to-End System Walkthrough, Architecture, Malayalam Scripts & FAQs', margin + 6, currentY + 19.5);

  doc.setFillColor(...ACCENT);
  doc.roundedRect(margin + 6, currentY + 25.5, 46, 6, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SUPER ADMIN SCOPE', margin + 9, currentY + 29.8);

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('Multi-Tenant SaaS | Offline POS Sync | Plan Overrides | Real-Time Analytics', margin + 56, currentY + 29.8);

  currentY += 44;

  // ── Section 1: Executive Summary & Role Hierarchy ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text('1. Executive Overview & Multi-Tenant Architecture', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const introText = 'Money Card is an enterprise-grade multi-tenant smart card ecosystem designed for seamless cashless operations in universities, hospital canteens, corporate parks, and multi-branch food courts. The Super Admin holds root authority across the entire platform.';
  const splitIntro = doc.splitTextToSize(introText, contentWidth);
  doc.text(splitIntro, margin, currentY);
  currentY += splitIntro.length * 4.5 + 2;

  // Malayalam summary box
  doc.setFillColor(...BG_LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...ACCENT);
  doc.text('Malayalam Summary / Malayalam Explanation:', margin + 4, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  const mlSummary = 'Money Card ennal college-ukal, hospital-ukal, IT park-ukal ennivayile cafeteriakale poornamayi cashless aakkunna smart card system aanu. Super Admin aanu platform-inte owner. Super Admin-u keezhil palavidha cafeteriakale (Organizations) register cheyyanum, avarude collection, sales, active cards, plan renewal requests enniva live aayi monitor cheyyanum saadhikkum.';
  const splitMl = doc.splitTextToSize(mlSummary, contentWidth - 8);
  doc.text(splitMl, margin + 4, currentY + 10.5);
  currentY += 28;

  // Hierarchy Table
  doc.setFillColor(...PRIMARY);
  doc.rect(margin, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Role Level', margin + 4, currentY + 4.2);
  doc.text('Primary Scope & Responsibilities', margin + 45, currentY + 4.2);
  doc.text('Key Controls & Privileges', margin + 125, currentY + 4.2);
  currentY += 6;

  const roles = [
    { role: 'Super Admin', scope: 'Global Platform Owner (All Cafeterias)', controls: 'Platform analytics, Plan catalog, Org approvals, Overrides' },
    { role: 'Org Admin', scope: 'Single Cafeteria Owner (Multi-Branch)', controls: 'Staff assignment, card inventory, menu pricing, local reports' },
    { role: 'Branch Staff', scope: 'Cashier / POS Operator', controls: 'Card tap checkout, card recharge, balance inquiries, refunds' },
  ];

  roles.forEach((r, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(...BORDER);
    doc.line(margin, currentY + 7, margin + contentWidth, currentY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(r.role, margin + 4, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT);
    doc.text(r.scope, margin + 45, currentY + 4.8);
    doc.text(r.controls, margin + 125, currentY + 4.8);

    currentY += 7;
  });

  currentY += 6;

  // ── Section 2: End-to-End Super Admin Modules Walkthrough ──
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text('2. Super Admin Modules & Core Business Logic', margin, currentY);
  currentY += 6;

  const modules = [
    {
      title: 'Module 1: Real-Time Platform Dashboard (/)',
      desc: 'Central control room featuring Urgent Action Needed alerts, Quick Actions, Time Window filters, and 4 Synchronized KPI Cards (Cafeterias, Sales, Active Cards, Orders). Choosing a cafeteria in the single dropdown immediately synchronizes all 4 KPI boxes to that exact Organization Admin in real time.',
      mlDesc: 'Super Admin login cheyyumpol thanne urgent plan approvals kanikkum. 4 KPI card-ukalil (Cafeteria, Sales, Active Cards, Orders) motham collection live aayi kanam. Oru cafeteria select cheythal aa cafeteria-yude maathram metrics-ilekku taniye maarum.',
      actions: 'View Cafeterias collapsible directory, Quick action routing, Scoped drill-down.',
    },
    {
      title: 'Module 2: Cafeterias / Organization Management (/organizations)',
      desc: 'Onboard new cafeterias, allocate unique organization IDs, assign initial subscription plans, adjust card/staff quota limits, and set status to Active or Suspended based on billing and policy compliance.',
      mlDesc: 'Puthiya cafeteria-kale add cheyyuka, avarude admin email, allocated plan, card limits enniva set cheyyuka, athupole non-payment vannal suspend cheyyuka ennivakkayi upayogikkunnu.',
      actions: 'Add Organization, Manage Quotas, Set Active/Inactive status.',
    },
    {
      title: 'Module 3: Plans & Subscriptions Management (/subscriptions & /plans)',
      desc: 'Configure global SaaS subscription catalog (Basic, Standard, Enterprise), set price billing intervals (Monthly/Yearly), enforce branch/staff/card limits, and review/approve plan change and renewal requests submitted by Org Admins.',
      mlDesc: 'Plan-ukal create cheyyuka (Basic, Standard, Enterprise), cafeteria-kalkkulla card/staff limits theerumanikkuka. Cafeteria-kal ayakkunna plan renewal/upgrade requests review cheythu approve cheyyuka.',
      actions: 'Review & Approve requests, Status filter (Pending/Approved/Rejected), Custom Overrides.',
    },
    {
      title: 'Module 4: Platform Analytics & Client-Side PDF Engine (/analytics)',
      desc: 'Financial aggregation of gross purchases, customer recharges, refunds, and net revenue. Includes branch performance matrices and peak demand hour curves. Offers Dual-Mode PDF export: [View PDF] in-browser blob preview & [Download PDF] native vector rendering.',
      mlDesc: 'Motham revenue, recharges, customer refunds, net revenue enniva live chart-ukalil kanam. [View PDF] vazhi browser-il thanne report preview cheyyam, [Download PDF] vazhi direct print-ready file download aakum.',
      actions: 'Revenue metrics, Peak hour diagnostics, Zero-server-load jsPDF exports.',
    },
  ];

  modules.forEach((mod) => {
    checkPageBreak(40);
    doc.setFillColor(...BG_LIGHT);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, currentY, contentWidth, 34, 2, 2, 'FD');

    // Title bar
    doc.setFillColor(...DARK);
    doc.roundedRect(margin, currentY, contentWidth, 7, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(mod.title, margin + 4, currentY + 4.8);

    // English Desc
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    const sDesc = doc.splitTextToSize(mod.desc, contentWidth - 8);
    doc.text(sDesc, margin + 4, currentY + 11.5);

    // ML Desc
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT);
    doc.text('Malayalam Explanation: ', margin + 4, currentY + 23);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const sMlDesc = doc.splitTextToSize(mod.mlDesc, contentWidth - 42);
    doc.text(sMlDesc, margin + 36, currentY + 23);

    // Actions tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PRIMARY);
    doc.text(`Key Capabilities: ${mod.actions}`, margin + 4, currentY + 31);

    currentY += 37;
  });

  // ── Section 3: Step-by-Step Presentation Script ──
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text('3. Step-by-Step Live Demo Presentation Script', margin, currentY);
  currentY += 6;

  const scriptSteps = [
    {
      step: 'Step 1: Super Admin Login',
      en: 'Log in with super admin credentials. The system recognizes root privileges and directs straight to the platform dashboard.',
      ml: 'Super Admin login cheyyumpol direct aayi central platform dashboard-ilekku access labhikkunnu.',
    },
    {
      step: 'Step 2: Urgent Approvals Banner',
      en: 'Point out the Action Needed banner. Mention that cafeterias seeking plan renewal or card limit upgrades trigger real-time alerts here.',
      ml: 'Dashboard-il mukalilulla Action Needed alert kanikkuka. Plan renewal request vannal Super Admin-u ivide udan notification varum.',
    },
    {
      step: 'Step 3: 4 KPI Cards Scoping',
      en: 'Demonstrate how selecting a specific cafeteria in the single dropdown changes all 4 cards (Cafeteria, Sales, Active Cards, Orders) to that exact cafeteria.',
      ml: 'Single dropdown-il oru cafeteria select cheythu 4 KPI card-ukalum (Sales, Cards, Orders) aa cafeteria-yude mathramayi maarunnath kanikkuka.',
    },
    {
      step: 'Step 4: Collapsible Directory',
      en: 'Click "View Cafeterias" to expand the directory. Highlight the per-row action menu (Filter Dashboard, Manage Org, View Analytics, View Plans).',
      ml: 'View Cafeterias click cheythu table expand cheyyuka. Ooro row-ilumulla Action menu (Filter, Manage, Analytics) kanikkuka.',
    },
    {
      step: 'Step 5: Review & Approve Requests',
      en: 'Navigate to Plans & Subscriptions -> Review Requests tab. Filter by status and click Approve to instantly update an organization’s plan.',
      ml: 'Plans & Subscriptions-il Review Requests eduthu, filter cheythu, pending request single click-il Approve cheyyunnath demo cheyyuka.',
    },
    {
      step: 'Step 6: Live PDF Generation',
      en: 'Open Platform Analytics. Click [View PDF] to preview the branded vector report in a modal, followed by [Download PDF].',
      ml: 'Analytics-il [View PDF] click cheythu in-browser preview-um, [Download PDF] vazhi direct download-um kanikkuka.',
    },
  ];

  scriptSteps.forEach((s) => {
    checkPageBreak(22);
    doc.setFillColor(...BG_LIGHT);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, currentY, contentWidth, 18, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...PRIMARY);
    doc.text(s.step, margin + 4, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(`• English: ${s.en}`, margin + 4, currentY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ACCENT);
    doc.text('• Malayalam: ', margin + 4, currentY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(s.ml, margin + 22, currentY + 14);

    currentY += 21;
  });

  // ── Section 4: Expected Exception Questions & FAQ ──
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text('4. Expected Questions & Exception Scenarios (FAQ)', margin, currentY);
  currentY += 6;

  const faqs = [
    {
      q: 'Q1: What happens if an organization exceeds its smart card limit or staff limit?',
      enAns: 'The platform enforces real-time quota guardrails. When limit is hit, backend blocks new card issuance with 403 PLAN_LIMIT_EXCEEDED and prompts the Org Admin to request an upgrade.',
      mlAns: 'Card limit kazhinjal puthiya card issue cheyyan system sammathikkilla. Super Admin-u plan upgrade request ayakkendi varum.',
    },
    {
      q: 'Q2: How does the system handle offline POS transactions if internet fails in cafeteria?',
      enAns: 'Cashier POS terminals use an encrypted localized transaction buffer with session tokens. When internet reconnects, all buffered transactions sync and reconcile automatically.',
      mlAns: 'Internet poyalum POS machine-il offline aayi bill cheyyam. Internet thirike varumpol automatic aayi central server-il sync aakum.',
    },
    {
      q: 'Q3: Can one cafeteria see sales or customer data of another cafeteria? (Security & Isolation)',
      enAns: 'Strict multi-tenancy isolation is enforced at the database level. Every query and session token is scoped with organizationId. Only Super Admin has cross-tenant platform visibility.',
      mlAns: 'Oru cafeteria-kku mattulla cafeteria-yude sales-o data-yo kanikilla. Strict tenant isolation undu. Super Admin-u mathrame ellaam kananoo.',
    },
    {
      q: 'Q4: How are customer refunds processed and tracked by Super Admin?',
      enAns: 'When a cashier initiates a customer refund, the balance is credited back to the customer wallet. The Super Admin dashboard tracks this under Customer Refunds and computes Net Revenue = Gross Purchases - Refunds.',
      mlAns: 'Oru customer-kku refund nalkumpol panam card-ilekku thirike credit aakunnu. Super Admin dashboard-il Net Revenue = Sales - Refunds aayi calculate cheyyunnu.',
    },
    {
      q: 'Q5: Can Super Admin set custom pricing or discounts for a specific VIP cafeteria?',
      enAns: 'Yes. Super Admin can create Organization Overrides attached to a specific organizationId, granting custom pricing, extended billing, or elevated limits without changing public tiers.',
      mlAns: 'Athe, Super Admin-u oru prathyeka cafeteria-kku mathramayi custom plan override, discount, card limit enniva nalkan kazhiyum.',
    },
    {
      q: 'Q6: What prevents card balance tampering, cloning, or double-spending?',
      enAns: 'Balances are not stored on plain NFC chips. They are managed on the secure cloud ledger. Tapping verifies encrypted UID and session nonce in real time, preventing cloning.',
      mlAns: 'Balance card-il alla, secure cloud ledger-il aanu sookshikkunnath. Card tap cheyyumpol server verify cheyyunnathukondu double-spending nadakkilla.',
    },
    {
      q: 'Q7: How does client-side PDF export work without placing CPU load on the server?',
      enAns: 'The PDF generation uses client-side jsPDF in the browser memory. It formats tables and charts vectorially without requiring backend headless browsers or rendering microservices.',
      mlAns: 'PDF generation poornamayi client browser-il (jsPDF) aanu nadakkunnath. Server bandwidth-o CPU load-o aavashyamilla.',
    },
  ];

  faqs.forEach((f) => {
    checkPageBreak(27);
    doc.setFillColor(...BG_LIGHT);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, currentY, contentWidth, 24, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(f.q, margin + 4, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT);
    const sEn = doc.splitTextToSize(`Ans (EN): ${f.enAns}`, contentWidth - 8);
    doc.text(sEn, margin + 4, currentY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT);
    doc.text('Ans (ML): ', margin + 4, currentY + 19);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const sMl = doc.splitTextToSize(f.mlAns, contentWidth - 24);
    doc.text(sMl, margin + 18, currentY + 19);

    currentY += 27;
  });

  // ── Section 5: Technical Stack Summary ──
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text('5. Technical Stack & Implementation Architecture', margin, currentY);
  currentY += 6;

  doc.setFillColor(...BG_LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, currentY, contentWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.text('• Frontend Core: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite Fast Bundler', margin + 4, currentY + 5);
  doc.text('• PDF Vector Engine: Client-Side jsPDF Vector Engine with Dual-Mode (In-Browser Blob Preview & File Download)', margin + 4, currentY + 9.5);
  doc.text('• Backend Architecture: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL Database', margin + 4, currentY + 14);
  doc.text('• Security & Tenant Isolation: Role-Based Access Control (RBAC), JWT Authentication, Strict Organization Scoping', margin + 4, currentY + 18.5);

  currentY += 26;

  // Apply numbered canvas / headers and footers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeaderFooter(i, totalPages);
  }

  // Output paths: generate both exact naming conventions for maximum convenience
  const target1 = path.resolve(__dirname, '../../SUPER_ADMIN_DEMO_EXPLANATION_GUIDE.pdf');
  const target2 = path.resolve(__dirname, '../../SuperAdmin_Demo_Explanation_Guide.pdf');

  const pdfOutput = doc.output('arraybuffer');
  const buffer = Buffer.from(pdfOutput);

  fs.writeFileSync(target1, buffer);
  fs.writeFileSync(target2, buffer);

  console.log(`PDF generated successfully:`);
  console.log(`  1: ${target1}`);
  console.log(`  2: ${target2}`);
}

generateSuperAdminPdf();
