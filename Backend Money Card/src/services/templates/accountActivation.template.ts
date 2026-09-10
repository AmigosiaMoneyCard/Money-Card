export interface AccountActivationTemplateParams {
  toEmail: string;
  userName: string;
  activationLink: string;
  accountType?: 'ORG_ADMIN' | 'STAFF' | string;
  organizationName?: string | null;
}

export interface RenderedEmail {
  subject: string;
  heading: string;
  html: string;
  text: string;
}

/**
 * Color Theme for Account Activation Emails (Emerald / Mint Modern Fintech)
 */
export const ACTIVATION_THEME = {
  primary: '#10b981', // Emerald Green Accent & Button
  primaryShadow: 'rgba(16, 185, 129, 0.4)', // Neon Emerald Glow
  headerGradientStart: 'rgba(16, 185, 129, 0.1)',
  headerGradientEnd: 'rgba(11, 19, 43, 0)',
  background: '#020617', // Slate 950 Canvas
  cardBackground: '#0b132b', // Midnight Blue Card Container
  insetBox: '#0f172a', // Slate 900 Inset Box
  border: '#1e293b', // Slate 800 Border & Dividers
  textHeading: '#f8fafc', // Slate 50 Crisp White
  textGreeting: '#cbd5e1', // Slate 300
  textBody: '#94a3b8', // Slate 400
  textMuted: '#64748b', // Slate 500
  textFooter: '#475569', // Slate 600
  buttonText: '#020617', // Deep Obsidian contrast on emerald
};

export function renderAccountActivationEmail(params: AccountActivationTemplateParams): RenderedEmail {
  const { userName, activationLink, accountType = 'STAFF', organizationName } = params;
  const isOrgAdmin = accountType === 'ORG_ADMIN';

  const subject = isOrgAdmin
    ? `Welcome to Money Card - Activate your Organization Administrator account`
    : `You're invited to join ${organizationName || 'Money Card'} - Activate your Staff account`;

  const heading = isOrgAdmin
    ? 'Activate your Administrator Account'
    : 'Welcome to the Team! Set your password';

  const greeting = `Hello, ${userName}`;

  const bodyDescription = isOrgAdmin
    ? `Your administrator account for <strong>${organizationName || 'your organization'}</strong> has been created. Please set your password to activate your account and access your dashboard.`
    : `You have been invited to join <strong>${organizationName || 'Money Card'}</strong> as a Staff Member. Please click below to choose your password and activate your POS account.`;

  const orgSectionHtml = organizationName
    ? `
      <div style="margin: 20px 0; padding: 14px 16px; background-color: ${ACTIVATION_THEME.insetBox}; border: 1px solid ${ACTIVATION_THEME.border}; border-radius: 8px;">
        <div style="font-size: 11px; font-weight: 600; color: ${ACTIVATION_THEME.textBody}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Organization</div>
        <div style="font-size: 14px; font-weight: 600; color: ${ACTIVATION_THEME.textHeading};">${organizationName}</div>
      </div>
    `
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${ACTIVATION_THEME.background};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: ${ACTIVATION_THEME.textHeading};
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      background-color: ${ACTIVATION_THEME.cardBackground};
      border: 1px solid ${ACTIVATION_THEME.border};
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      padding: 32px 32px 20px 32px;
      text-align: center;
      background: linear-gradient(180deg, ${ACTIVATION_THEME.headerGradientStart} 0%, ${ACTIVATION_THEME.headerGradientEnd} 100%);
    }
    .logo {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-transform: uppercase;
    }
    .logo span {
      color: ${ACTIVATION_THEME.primary};
    }
    .content {
      padding: 0 32px 32px 32px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: ${ACTIVATION_THEME.textHeading};
      margin-top: 0;
      margin-bottom: 12px;
      text-align: center;
    }
    .greeting {
      font-size: 15px;
      color: ${ACTIVATION_THEME.textGreeting};
      margin-bottom: 16px;
      font-weight: 600;
    }
    .body-text {
      font-size: 14px;
      line-height: 1.6;
      color: ${ACTIVATION_THEME.textBody};
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: ${ACTIVATION_THEME.primary};
      color: ${ACTIVATION_THEME.buttonText} !important;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      box-shadow: 0 4px 14px ${ACTIVATION_THEME.primaryShadow};
      text-align: center;
    }
    .footer {
      padding: 24px 32px;
      background-color: ${ACTIVATION_THEME.background};
      border-top: 1px solid ${ACTIVATION_THEME.border};
      font-size: 12px;
      color: ${ACTIVATION_THEME.textMuted};
      line-height: 1.5;
      text-align: center;
    }
    .fallback-url {
      word-break: break-all;
      color: ${ACTIVATION_THEME.primary};
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MONEY <span>CARD</span></div>
    </div>
    <div class="content">
      <h1 class="title">${heading}</h1>
      <div class="greeting">${greeting},</div>
      <div class="body-text">
        ${bodyDescription}
      </div>
      
      ${orgSectionHtml}

      <div class="btn-container">
        <a href="${activationLink}" class="btn" target="_blank" rel="noopener noreferrer">Activate Account & Set Password</a>
      </div>

      <div class="body-text" style="font-size: 12px; color: ${ACTIVATION_THEME.textMuted};">
        This invitation link is valid for <strong>24 hours</strong> and can only be used once. If you did not expect this invitation, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">If the button above does not work, copy and paste this link into your browser:</p>
      <p class="fallback-url" style="margin: 0;">${activationLink}</p>
      <p style="margin: 16px 0 0 0; color: ${ACTIVATION_THEME.textFooter};">&copy; 2026 Money Card Multi-Tenant Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `Hello ${userName},

${
  isOrgAdmin
    ? 'Your administrator account for ' + (organizationName || 'your organization') + ' has been created.'
    : 'You have been invited to join ' + (organizationName || 'Money Card') + ' as a Staff Member.'
}

To activate your account and set your password, please open the following link in your browser:
${activationLink}

This link is valid for 24 hours.

Best regards,
Money Card Platform Team`;

  return { subject, heading, html, text };
}
