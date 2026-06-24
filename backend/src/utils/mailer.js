const axios = require('axios');

const MAILGUN_DOMAIN = process.env.MAILGUN_EMAIL_DOMAIN || 'lucred.co';
const MAILGUN_API_KEY = process.env.MAILGUN_EMAIL_APIKEY;
const FROM = `"Lucred" <noreply@${MAILGUN_DOMAIN}>`;

// Mailgun HTTP API — avoids SMTP domain mismatch issues
async function sendMail({ to, subject, html }) {
  if (!MAILGUN_API_KEY) throw new Error('MAILGUN_EMAIL_APIKEY not set');
  const form = new URLSearchParams();
  form.append('from', FROM);
  form.append('to', to);
  form.append('subject', subject);
  form.append('html', html);
  await axios.post(
    `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
    form.toString(),
    {
      auth: { username: 'api', password: MAILGUN_API_KEY },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
}

async function sendPasswordReset(to, resetUrl) {
  await sendMail({
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

async function sendWelcome(to, { organizationName }) {
  await sendMail({
    to,
    subject: 'Welcome to Lucred — you\'re all set',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">B2B Credit Engine</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Welcome, ${organizationName}!</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          Your account is set up. Head to your dashboard to find your API key under <strong>API Keys</strong>.
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          <strong>Start with these three steps:</strong><br>
          1. Add your first borrower via the dashboard or <code style="background:#e2e8f0;padding:1px 5px;border-radius:3px">POST /v1/customers</code><br>
          2. Run a BVN or NIN verification<br>
          3. Upload a bank statement for AI analysis
        </p>
        <a href="https://mfi.lucred.co/dashboard" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Go to Dashboard →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">
          Questions? Reply to this email or visit <a href="https://mfi.lucred.co/docs" style="color:#0ea5e9">mfi.lucred.co/docs</a>
        </p>
      </div>
    `,
  });
}

async function sendLoanDecision(to, { borrowerName, verdict, summary, loanAmount, loanTenor, organizationName }) {
  const verdictColor = verdict === 'ELIGIBLE' ? '#16a34a' : verdict === 'CONDITIONAL' ? '#d97706' : '#dc2626';
  const verdictLabel = verdict === 'ELIGIBLE' ? 'Approved' : verdict === 'CONDITIONAL' ? 'Conditionally Approved' : 'Not Approved';
  await sendMail({
    to,
    subject: `Your loan application decision — ${organizationName}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">Powered by ${organizationName}</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Dear ${borrowerName},</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">
          Your loan application has been reviewed. Here is the decision:
        </p>
        <div style="background:#fff;border:2px solid ${verdictColor};border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center">
          <div style="font-size:13px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Decision</div>
          <div style="font-size:24px;font-weight:800;color:${verdictColor}">${verdictLabel}</div>
          ${loanAmount ? `<div style="font-size:13px;color:#64748b;margin-top:8px">Amount requested: ₦${Number(loanAmount).toLocaleString()}${loanTenor ? ` · ${loanTenor} months` : ''}</div>` : ''}
        </div>
        ${summary ? `<p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">${summary}</p>` : ''}
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          Please contact <strong>${organizationName}</strong> for next steps or if you have questions about this decision.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">
          This decision was generated by Lucred's credit engine on behalf of ${organizationName}.
        </p>
      </div>
    `,
  });
}

async function sendPlanLimitWarning(to, { organizationName, used, limit, plan, resetDate }) {
  const pct = Math.round((used / limit) * 100);
  await sendMail({
    to,
    subject: `You've used ${pct}% of your Lucred API quota`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">B2B Credit Engine</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">API quota warning</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">
          Hi ${organizationName}, you've used <strong>${used.toLocaleString()} of ${limit.toLocaleString()} API calls</strong> (${pct}%) on your <strong>${plan}</strong> plan this month.
        </p>
        <div style="background:#fff;border-radius:8px;padding:4px;margin-bottom:24px;border:1px solid #e2e8f0">
          <div style="height:10px;background:#f1f5f9;border-radius:6px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:#ef4444;border-radius:6px"></div>
          </div>
        </div>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          Your quota resets on <strong>${resetDate}</strong>. Upgrade now to avoid disruption to your credit checks.
        </p>
        <a href="https://mfi.lucred.co/pricing" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Upgrade Plan →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">
          You'll receive this warning once when you cross 90%. If you've already upgraded, ignore this email.
        </p>
      </div>
    `,
  });
}

async function sendVerificationEmail(to, { organizationName, verifyUrl }) {
  await sendMail({
    to,
    subject: 'Verify your Lucred email address',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="font-size:22px;font-weight:800;color:#6d28d9;margin-bottom:4px">Lucred</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:28px">Credit Engine</div>
        <h2 style="font-size:20px;color:#0f172a;margin:0 0 12px">Verify your email</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          Hi ${organizationName}, click below to verify your email address and activate your account.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Verify Email →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">Link expires in 24 hours. If you didn't create a Lucred account, you can ignore this email.</p>
      </div>
    `,
  });
}

async function sendTeamInvite(to, { inviterName, orgName, inviteUrl, role }) {
  await sendMail({
    to,
    subject: `You've been invited to join ${orgName} on Lucred`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="font-size:22px;font-weight:800;color:#6d28d9;margin-bottom:4px">Lucred</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:28px">Credit Engine</div>
        <h2 style="font-size:20px;color:#0f172a;margin:0 0 12px">You've been invited</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 8px">
          <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Lucred as a <strong>${role}</strong>.
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          Click below to set your password and access the dashboard.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Accept Invitation →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">Link expires in 48 hours. If you weren't expecting this, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordReset, sendWelcome, sendLoanDecision, sendPlanLimitWarning, sendVerificationEmail, sendTeamInvite };
