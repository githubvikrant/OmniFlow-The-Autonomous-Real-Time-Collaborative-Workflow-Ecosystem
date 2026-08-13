import nodemailer from 'nodemailer';

/**
 * Utility to send transactional emails via Nodemailer.
 * Supports production SMTP (Gmail / SendGrid / AWS SES) and Ethereal Email test accounts.
 */
export const sendEmail = async (options) => {
  // 1. Resend HTTP API (Recommended for Cloud Hosts like Render & Vercel)
  // Sends over standard HTTPS (Port 443) — NEVER blocked by Render or cloud firewalls!
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        from: 'OmniFlow Support <onboarding@resend.dev>',
        to: [options.email],
        subject: options.subject,
        html: options.html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Resend API failed to send email');
    }
    return data;
  }

  // 2. Nodemailer SMTP Transporter (Local Dev / Unblocked Hosts)
  let transporter;

  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Production / Configured SMTP Transporter
    const cleanPass = process.env.EMAIL_PASS.replace(/\s+/g, '');
    const cleanUser = process.env.EMAIL_USER.trim();
    const port = Number(process.env.EMAIL_PORT) || 465;
    const isSecure = port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST.trim(),
      port: port,
      secure: isSecure, // Port 465 uses SSL direct connection
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      connectionTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  } else {
    // Development / Ethereal Fallback Transporter
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"OmniFlow Support" <noreply@omniflow.dev>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);

  if (!process.env.EMAIL_HOST) {
    console.log('📧 Ethereal Email Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};
