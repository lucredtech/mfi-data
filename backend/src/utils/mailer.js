const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordReset(to, resetUrl) {
  await transporter.sendMail({
    from: `"Lucred" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your Lucred password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">B2B Credit Engine</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Reset your password</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          We received a request to reset the password for your Lucred account.<br>
          Click the button below. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Reset Password →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">
          If you didn't request this, you can safely ignore this email.<br>
          Your password won't change until you click the link above.
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordReset };
