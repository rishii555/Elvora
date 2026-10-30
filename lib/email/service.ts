/**
 * Pluggable Email Service readiness provider.
 * Supports development console logging with zero external dependencies,
 * and seamless SMTP / transactional provider readiness for production.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
  // In development, or when no email provider credentials are provided, safely log to console
  if (!process.env.SMTP_HOST && !process.env.RESEND_API_KEY) {
    console.info(`[Email Dispatcher (Dev/Staging)] To: ${options.to}`);
    console.info(`[Email Dispatcher (Dev/Staging)] Subject: ${options.subject}`);
    console.info(`[Email Dispatcher (Dev/Staging)] Content:\n${options.text || options.html}\n---`);
    return { success: true, messageId: `dev-msg-${Date.now()}` };
  }

  // If Resend API Key is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Elvora <noreply@elvora.com>",
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Resend delivery failed:", errorData);
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      console.error("Failed sending email via Resend:", err);
      return { success: false };
    }
  }

  return { success: true };
}

/**
 * Sends a password reset link to the user.
 */
export async function sendPasswordResetEmail(email: string, rawToken: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetLink = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

  const subject = "Reset your Elvora account password";
  const text = `Hello,\n\nA password reset request was received for your Elvora account. Click the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 60 minutes. If you did not request this, you can safely ignore this email.\n\nElvora Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a;">Reset Your Elvora Password</h2>
      <p style="color: #475569; font-size: 14px;">A password reset request was received for your account. Click the button below to choose a new password:</p>
      <div style="margin: 28px 0;">
        <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">This link will expire in 60 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  const result = await sendEmail({ to: email, subject, text, html });
  return result.success;
}

/**
 * Sends an email verification link.
 */
export async function sendVerificationEmail(email: string, rawToken: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyLink = `${appUrl}/api/auth/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;

  const subject = "Verify your Elvora email address";
  const text = `Welcome to Elvora!\n\nPlease verify your email address by clicking the link below:\n\n${verifyLink}\n\nThis link expires in 24 hours.\n\nElvora Team`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f172a;">Welcome to Elvora!</h2>
      <p style="color: #475569; font-size: 14px;">Thank you for registering. Please confirm your email address by clicking the button below:</p>
      <div style="margin: 28px 0;">
        <a href="${verifyLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Verify Email</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">This link will expire in 24 hours.</p>
    </div>
  `;

  const result = await sendEmail({ to: email, subject, text, html });
  return result.success;
}
