export interface PasswordResetTemplateParams {
  toEmail: string;
  userName: string;
  resetLink: string;
  accountType?: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'STAFF' | string;
  organizationName?: string | null;
}

export interface RenderedEmail {
  subject: string;
  heading: string;
  html: string;
  text: string;
}

/**
 * Color Theme for Password Reset Emails (Violet / Purple Modern Slate)
 */
export const PASSWORD_RESET_THEME = {
  primary: '#7c3aed', // Vibrant Violet
  brandHeader: '#8b5cf6', // Light Violet
  background: '#020617', // Slate 950
  cardBackground: '#0b0f19', // Dark Slate Card
  insetBox: '#0f172a', // Slate 900
  border: '#1e293b', // Slate 800
  textHeading: '#f8fafc', // Slate 50
  textGreeting: '#cbd5e1', // Slate 300
  textBody: '#94a3b8', // Slate 400
  textMuted: '#64748b', // Slate 500
  textFooter: '#475569', // Slate 600
  buttonText: '#ffffff', // Pure White
};

export function renderPasswordResetEmail(params: PasswordResetTemplateParams): RenderedEmail {
  const { userName, resetLink, accountType = 'SUPER_ADMIN', organizationName } = params;
  const isSuperAdmin = accountType === 'SUPER_ADMIN';
  const isStaff = accountType === 'STAFF';

  const subject = isSuperAdmin
    ? 'Reset your Super Admin password'
    : isStaff
      ? 'Reset your Staff account password'
      : 'Reset your Organization Admin password';

  const heading = isSuperAdmin
    ? 'Reset your Super Admin password'
    : isStaff
      ? 'Reset your Staff Account password'
      : 'Reset your Organization Admin password';

  const greeting = isSuperAdmin ? 'Hello, Platform Super Admin' : `Hello, ${userName}`;

  const bodyDescription = isSuperAdmin
    ? 'We received a request to reset the password for your Super Admin account.'
    : isStaff
      ? `We received a request to reset the password for your Staff account at ${organizationName || 'your cafeteria'}.`
      : 'We received a request to reset the password for your Organization Admin account.';

  const orgSectionHtml =
    !isSuperAdmin && organizationName
      ? `
      <div style="margin: 20px 0; padding: 14px 16px; background-color: ${PASSWORD_RESET_THEME.insetBox}; border: 1px solid ${PASSWORD_RESET_THEME.border}; border-radius: 8px;">
        <div style="font-size: 11px; font-weight: 600; color: ${PASSWORD_RESET_THEME.textBody}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Organization</div>
        <div style="font-size: 14px; font-weight: 600; color: ${PASSWORD_RESET_THEME.textHeading};">${organizationName}</div>
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
      background-color: ${PASSWORD_RESET_THEME.background};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: ${PASSWORD_RESET_THEME.textHeading};
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: ${PASSWORD_RESET_THEME.background};
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: ${PASSWORD_RESET_THEME.cardBackground};
      border: 1px solid ${PASSWORD_RESET_THEME.border};
      border-radius: 12px;
      padding: 36px 32px;
      box-sizing: border-box;
    }
    .brand-header {
      font-size: 12px;
      font-weight: 700;
      color: ${PASSWORD_RESET_THEME.brandHeader};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 24px;
    }
    .divider {
      height: 1px;
      background-color: ${PASSWORD_RESET_THEME.border};
      margin: 20px 0 24px;
      border: none;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: ${PASSWORD_RESET_THEME.textHeading};
      margin: 0 0 16px;
      line-height: 1.4;
    }
    .greeting {
      font-size: 14px;
      font-weight: 600;
      color: ${PASSWORD_RESET_THEME.textGreeting};
      margin: 0 0 12px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: ${PASSWORD_RESET_THEME.textBody};
      margin: 0 0 16px;
    }
    .cta-container {
      margin: 28px 0;
      text-align: left;
    }
    .btn {
      display: inline-block;
      background-color: ${PASSWORD_RESET_THEME.primary};
      color: ${PASSWORD_RESET_THEME.buttonText} !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 6px;
    }
    .security-note {
      font-size: 12px;
      color: ${PASSWORD_RESET_THEME.textBody};
      margin: 20px 0 12px;
    }
    .disclaimer {
      font-size: 12px;
      color: ${PASSWORD_RESET_THEME.textMuted};
      margin: 0 0 20px;
    }
    .fallback-note {
      font-size: 11px;
      color: ${PASSWORD_RESET_THEME.textMuted};
      margin: 0 0 6px;
    }
    .fallback-url {
      font-size: 11px;
      font-family: monospace;
      color: ${PASSWORD_RESET_THEME.textBody};
      word-break: break-all;
      background-color: ${PASSWORD_RESET_THEME.background};
      border: 1px solid ${PASSWORD_RESET_THEME.border};
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 24px;
    }
    .footer {
      font-size: 12px;
      color: ${PASSWORD_RESET_THEME.textFooter};
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
        <a href="${resetLink}" target="_blank" class="btn">Reset Password</a>
      </div>

      <div class="security-note">
        This link expires in <strong>1 hour</strong> and can only be used once.
      </div>

      <div class="disclaimer">
        If you did not request this password reset, you can safely ignore this email.
      </div>

      <div class="fallback-note">
        If the button does not work, copy and paste the link below into your browser:
      </div>
      <div class="fallback-url">
        ${resetLink}
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

  const text = `${greeting},

${bodyDescription}

To reset your password, please open the following link in your browser:
${resetLink}

This link is valid for 1 hour. If you did not request this password reset, you can safely ignore this email.

Best regards,
Money Card Platform Team`;

  return { subject, heading, html, text };
}
