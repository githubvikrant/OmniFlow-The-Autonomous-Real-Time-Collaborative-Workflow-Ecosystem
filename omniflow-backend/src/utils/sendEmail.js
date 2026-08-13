import nodemailer from 'nodemailer';

/**
 * Utility to send transactional emails via Nodemailer.
 * Supports production SMTP (Gmail / SendGrid / AWS SES) and Ethereal Email test accounts.
 */
export const sendEmail = async (options) => {
  let transporter;

  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Production / Configured SMTP Transporter
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
