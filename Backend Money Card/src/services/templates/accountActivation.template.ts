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
 * Color Theme for Account Activation Emails (Clean White Canvas, Black Text, Emerald Green Accents & Buttons)
 * Exactly matches the Password Reset email template color palette.
 */
export const ACTIVATION_THEME = {
  primary: '#10b981', // Emerald Green Accent & Button
  primaryShadow: 'rgba(16, 185, 129, 0.35)', // Emerald Button Glow
  brandHeader: '#059669', // Deep Emerald Green Brand Title
  background: '#ffffff', // Pure White Background
  cardBackground: '#ffffff', // Pure White Card Container
  insetBox: '#f8fafc', // Light Slate Inset Box (for Organization)
  border: '#e2e8f0', // Crisp Light Gray Border & Dividers
  textHeading: '#0f172a', // Bold Black/Charcoal Heading
  textGreeting: '#1e293b', // Deep Black/Charcoal Greeting
  textBody: '#1e293b', // Crisp Readable Black/Dark Slate Body
  textMuted: '#64748b', // Soft Slate Disclaimers
  textFooter: '#94a3b8', // Light Slate Footer
  buttonText: '#ffffff', // Pure White Text on Emerald Button
  fallbackBg: '#f0fdf4', // Soft Emerald Tint for Fallback URL Box
  fallbackBorder: '#bbf7d0', // Emerald Border for Fallback URL Box
  fallbackText: '#047857', // Dark Emerald Text for Fallback URL
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
        <div style="font-size: 11px; font-weight: 700; color: ${ACTIVATION_THEME.brandHeader}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Organization</div>
        <div style="font-size: 15px; font-weight: 700; color: ${ACTIVATION_THEME.textHeading};">${organizationName}</div>
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
      color: ${ACTIVATION_THEME.textBody};
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: ${ACTIVATION_THEME.background};
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: ${ACTIVATION_THEME.cardBackground};
      border: 1px solid ${ACTIVATION_THEME.border};
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border-radius: 12px;
      padding: 36px 32px;
      box-sizing: border-box;
    }
    .brand-header {
      font-size: 12px;
      font-weight: 800;
      color: ${ACTIVATION_THEME.brandHeader};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .divider {
      height: 1px;
      background-color: ${ACTIVATION_THEME.border};
      margin: 18px 0 24px;
      border: none;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: ${ACTIVATION_THEME.textHeading};
      margin: 0 0 16px;
      line-height: 1.35;
    }
    .greeting {
      font-size: 15px;
      font-weight: 600;
      color: ${ACTIVATION_THEME.textGreeting};
      margin: 0 0 12px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: ${ACTIVATION_THEME.textBody};
      margin: 0 0 16px;
    }
    .cta-container {
      margin: 28px 0;
      text-align: left;
    }
    .btn {
      display: inline-block;
      background-color: ${ACTIVATION_THEME.primary};
      color: ${ACTIVATION_THEME.buttonText} !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 30px;
      border-radius: 8px;
      box-shadow: 0 4px 14px ${ACTIVATION_THEME.primaryShadow};
    }
    .security-note {
      font-size: 13px;
      color: ${ACTIVATION_THEME.textBody};
      margin: 20px 0 12px;
    }
    .disclaimer {
      font-size: 12px;
      color: ${ACTIVATION_THEME.textMuted};
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .fallback-note {
      font-size: 12px;
      color: ${ACTIVATION_THEME.textMuted};
      margin: 0 0 6px;
    }
    .fallback-url {
      font-size: 11px;
      font-family: monospace;
      color: ${ACTIVATION_THEME.fallbackText};
      word-break: break-all;
      background-color: ${ACTIVATION_THEME.fallbackBg};
      border: 1px solid ${ACTIVATION_THEME.fallbackBorder};
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 24px;
    }
    .footer {
      font-size: 12px;
      color: ${ACTIVATION_THEME.textFooter};
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand-header">MONEY CARD PLATFORM</div>
      
      <div class="divider"></div>

      <h1>${heading}</h1>

      <div class="greeting">${greeting}</div>

      <p>${bodyDescription}</p>

      ${orgSectionHtml}

      <div class="cta-container">
        <a href="${activationLink}" target="_blank" class="btn">Activate Account & Set Password</a>
      </div>

      <div class="security-note">
        This invitation link is valid for <strong>24 hours</strong> and can only be used once.
      </div>

      <div class="disclaimer">
        If you did not expect this invitation, you can safely ignore this email.
      </div>

      <div class="fallback-note">
        If the button does not work, copy and paste the link below into your browser:
      </div>
      <div class="fallback-url">
        ${activationLink}
      </div>

      <div class="divider"></div>

      <div class="footer">
        Money Card Platform
      </div>
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
