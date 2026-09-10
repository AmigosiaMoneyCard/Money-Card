import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import {
  renderPasswordResetEmail,
  PASSWORD_RESET_THEME,
  PasswordResetTemplateParams,
} from './templates/passwordReset.template.js';
import {
  renderAccountActivationEmail,
  ACTIVATION_THEME,
  AccountActivationTemplateParams,
} from './templates/accountActivation.template.js';

export {
  PASSWORD_RESET_THEME,
  ACTIVATION_THEME,
  PasswordResetTemplateParams,
  AccountActivationTemplateParams,
  renderPasswordResetEmail,
  renderAccountActivationEmail,
};

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'Money Card <onboarding@resend.dev>';

const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : undefined);
const smtpPort = Number(process.env.SMTP_PORT) || (smtpHost === 'smtp.gmail.com' || process.env.GMAIL_USER ? 465 : 587);
const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';
const gmailPass = rawPass.replace(/\s+/g, '');

const mailTransporter = (gmailUser && gmailPass)
  ? nodemailer.createTransport({
      host: smtpHost || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465,
      family: 4,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 4000,
    } as any)
  : null;

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const googleMailWebhook = process.env.GOOGLE_MAIL_WEBHOOK_URL;
const brevoApiKey = process.env.BREVO_API_KEY;

export interface SendEmailResult {
  sent: boolean;
  provider: 'gmail_smtp' | 'gmail_webhook' | 'brevo' | 'resend' | 'console';
  id?: string;
  error?: string;
}

async function sendViaWebhook(toEmail: string, subject: string, html: string, text?: string): Promise<SendEmailResult | null> {
  if (!googleMailWebhook) return null;
  try {
    const res = await fetch(googleMailWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail,
        subject,
        html,
        text: text || `${subject}\n\nPlease view this message in an HTML-compatible client.\n\nMoney Card Platform`,
        name: 'Money Card',
      }),
      redirect: 'follow',
    });
    const data: any = await res.json().catch(() => ({ success: true }));
    if (data.success !== false) {
      console.log(`[EMAIL_SERVICE] Email dispatched via Google Webhook to ${toEmail}`);
      return { sent: true, provider: 'gmail_webhook' };
    }
    console.warn('[EMAIL_SERVICE_WARNING] Google Webhook response error:', data.error);
    return null;
  } catch (err: any) {
    console.warn('[EMAIL_SERVICE_WARNING] Google Webhook exception:', err.message);
    return null;
  }
}

async function sendViaBrevo(toEmail: string, userName: string, subject: string, html: string): Promise<SendEmailResult | null> {
  if (!brevoApiKey) return null;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: gmailUser || 'amigosiamoneycard@gmail.com', name: 'Money Card' },
        to: [{ email: toEmail, name: userName }],
        subject,
        htmlContent: html,
      }),
    });
    if (res.ok) {
      const data: any = await res.json().catch(() => ({}));
      console.log(`[EMAIL_SERVICE] Email dispatched via Brevo to ${toEmail} (ID: ${data.messageId || 'ok'})`);
      return { sent: true, provider: 'brevo', id: data.messageId };
    }
    const errText = await res.text();
    console.warn('[EMAIL_SERVICE_WARNING] Brevo API error:', errText);
    return null;
  } catch (err: any) {
    console.warn('[EMAIL_SERVICE_WARNING] Brevo exception:', err.message);
    return null;
  }
}

export type AccountType = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'STAFF';

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  resetLink: string,
  accountType: AccountType | string = 'SUPER_ADMIN',
  organizationName?: string | null,
): Promise<SendEmailResult> {
  const { subject, html: htmlContent, text: textContent } = renderPasswordResetEmail({
    toEmail,
    userName,
    resetLink,
    accountType,
    organizationName,
  });

  const webhookResult = await sendViaWebhook(toEmail, subject, htmlContent, textContent);
  if (webhookResult) return webhookResult;

  const brevoResult = await sendViaBrevo(toEmail, userName, subject, htmlContent);
  if (brevoResult) return brevoResult;

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: `"Money Card" <${gmailUser}>`,
        to: toEmail,
        subject,
        html: htmlContent,
      });

      console.log(`[EMAIL_SERVICE] Reset email dispatched via Gmail SMTP to ${toEmail} (${accountType}). Message ID: ${info.messageId}`);
      return {
        sent: true,
        provider: 'gmail_smtp',
        id: info.messageId,
      };
    } catch (err: any) {
      console.warn(`[EMAIL_SERVICE_WARNING] Gmail SMTP failed, attempting fallback:`, err.message);
    }
  }

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: emailFrom,
        to: toEmail,
        subject,
        html: htmlContent,
      });

      if (response.error) {
        console.warn(`[EMAIL_SERVICE_WARNING] Resend API error, falling back:`, response.error.message);
      } else {
        console.log(`[EMAIL_SERVICE] Reset email dispatched via Resend to ${toEmail} (${accountType}). Message ID: ${response.data?.id}`);
        return {
          sent: true,
          provider: 'resend',
          id: response.data?.id || undefined,
        };
      }
    } catch (err: any) {
      console.warn(`[EMAIL_SERVICE_WARNING] Resend exception, falling back:`, err.message);
    }
  }

  // Fallback: log prominently to server console
  console.log('\n================================================================');
  console.log(' [EMAIL RECOVERY FALLBACK]');
  console.log('----------------------------------------------------------------');
  console.log(`To: ${toEmail} (${userName}) [${accountType}]`);
  console.log(`Subject: ${subject}`);
  console.log(`Reset Link: ${resetLink}`);
  console.log('================================================================\n');

  return {
    sent: false,
    provider: mailTransporter ? 'gmail_smtp' : (resend ? 'resend' : 'console'),
    error: 'Direct delivery unavailable. Recovery link logged to server console.',
  };
}

export const sendSuperAdminPasswordResetEmail = sendPasswordResetEmail;

export async function sendAccountActivationEmail(
  toEmail: string,
  userName: string,
  activationLink: string,
  accountType: AccountType | string = 'STAFF',
  organizationName?: string | null,
): Promise<SendEmailResult> {
  const { subject, html: htmlContent, text: textContent } = renderAccountActivationEmail({
    toEmail,
    userName,
    activationLink,
    accountType,
    organizationName,
  });

  const webhookResult = await sendViaWebhook(toEmail, subject, htmlContent, textContent);
  if (webhookResult) return webhookResult;

  const brevoResult = await sendViaBrevo(toEmail, userName, subject, htmlContent);
  if (brevoResult) return brevoResult;

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: `"Money Card" <${gmailUser}>`,
        to: toEmail,
        subject,
        html: htmlContent,
      });

      console.log(`[EMAIL_SERVICE_SUCCESS] Activation email sent via Gmail SMTP to ${toEmail} (ID: ${info.messageId})`);
      return { sent: true, provider: 'gmail_smtp', id: info.messageId };
    } catch (err: any) {
      console.warn('[EMAIL_SERVICE_WARNING] Gmail SMTP failed, attempting fallback:', err.message);
    }
  }

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: emailFrom,
        to: toEmail,
        subject,
        html: htmlContent,
      });

      if (response.error) {
        console.warn('[EMAIL_SERVICE_WARNING] Resend API error, falling back:', response.error.message);
      } else {
        console.log(`[EMAIL_SERVICE_SUCCESS] Activation email sent to ${toEmail} (ID: ${response.data?.id})`);
        return { sent: true, provider: 'resend', id: response.data?.id };
      }
    } catch (err: any) {
      console.warn('[EMAIL_SERVICE_WARNING] Resend exception, falling back:', err.message);
    }
  }

  // Fallback: log prominently to server console
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 [ACTIVATION LINK RECOVERY]');
  console.log(`To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Activation Link: ${activationLink}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return {
    sent: false,
    provider: mailTransporter ? 'gmail_smtp' : (resend ? 'resend' : 'console'),
    error: 'Direct delivery unavailable. Activation link logged to server console.',
  };
}
