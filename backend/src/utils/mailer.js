const axios = require('axios');

const MAILGUN_DOMAIN = process.env.MAILGUN_EMAIL_DOMAIN || 'lucred.co';
const MAILGUN_API_KEY = process.env.MAILGUN_EMAIL_APIKEY;
const FROM = `"Lucred Credit Engine" <noreply@${MAILGUN_DOMAIN}>`;

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
    subject: 'Reset your Lucred Credit Engine password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">B2B Credit Engine</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Reset your password</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          We received a request to reset the password for your Lucred Credit Engine account.<br>
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
    subject: 'Application received — Lucred Credit Engine',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">B2B Credit Engine</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Thanks for applying, ${organizationName}!</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px">
          We've received your application and our team is reviewing it. We typically complete KYB verification within <strong>1–2 business days</strong>.
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          You'll receive a separate email once your account is approved and you can start using the platform. In the meantime, you can explore the dashboard and read our documentation.
        </p>
        <a href="https://engine.lucred.co/dashboard" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          View Dashboard →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">
          Questions? Contact us at <a href="mailto:support@lucred.co" style="color:#0ea5e9">support@lucred.co</a>
        </p>
      </div>
    `,
  });
}

async function sendApprovalNotification(to, { organizationName }) {
  await sendMail({
    to,
    subject: 'Your Lucred Credit Engine account is approved — you\'re ready to go',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">B2B Credit Engine</div>
        <div style="background:#dcfce7;border-radius:10px;padding:16px 20px;margin-bottom:24px;display:inline-block">
          <span style="font-size:20px;font-weight:800;color:#16a34a">✓ Account Approved</span>
        </div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Welcome aboard, ${organizationName}!</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">
          Your KYB review is complete and your account is now fully activated. Here's how to get started:
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          1. Go to <strong>API Keys</strong> in your dashboard and create your first key<br>
          2. Add your first borrower via the dashboard or API<br>
          3. Run a BVN/NIN verification or upload a bank statement
        </p>
        <a href="https://engine.lucred.co/dashboard/api-keys" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Create Your API Key →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">
          Need help? Visit <a href="https://engine.lucred.co/docs" style="color:#0ea5e9">our docs</a> or contact <a href="mailto:support@lucred.co" style="color:#0ea5e9">support@lucred.co</a>
        </p>
      </div>
    `,
  });
}

async function sendSLARequest(to, { organizationName }) {
  await sendMail({
    to,
    subject: 'Action required: Sign your Lucred Credit Engine Service Agreement',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">B2B Credit Engine</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Service Level Agreement — ${organizationName}</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px">
          As part of completing your onboarding, please review and sign the Lucred Credit Engine Service Level Agreement (SLA).
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          This agreement covers data handling, API usage terms, liability, and your obligations as a platform user. Your account activation will be finalised once the agreement is signed.
        </p>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          Please reply to this email with your signed copy, or contact <a href="mailto:support@lucred.co" style="color:#0ea5e9">support@lucred.co</a> if you have any questions about the terms.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">
          Lucred Credit Engine · <a href="mailto:support@lucred.co" style="color:#0ea5e9">support@lucred.co</a>
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
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
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
          This decision was generated by Lucred Credit Engine's credit engine on behalf of ${organizationName}.
        </p>
      </div>
    `,
  });
}

async function sendPlanLimitWarning(to, { organizationName, used, limit, plan, resetDate }) {
  const pct = Math.round((used / limit) * 100);
  await sendMail({
    to,
    subject: `You've used ${pct}% of your Lucred Credit Engine API quota`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
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
    subject: 'Verify your Lucred Credit Engine email address',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="font-size:22px;font-weight:800;color:#6d28d9;margin-bottom:4px">Lucred Credit Engine</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:28px">Credit Engine</div>
        <h2 style="font-size:20px;color:#0f172a;margin:0 0 12px">Verify your email</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
          Hi ${organizationName}, click below to verify your email address and activate your account.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Verify Email →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">Link expires in 24 hours. If you didn't create a Lucred Credit Engine account, you can ignore this email.</p>
      </div>
    `,
  });
}

async function sendTeamInvite(to, { inviterName, orgName, inviteUrl, role }) {
  await sendMail({
    to,
    subject: `You've been invited to join ${orgName} on Lucred Credit Engine`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="font-size:22px;font-weight:800;color:#6d28d9;margin-bottom:4px">Lucred Credit Engine</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:28px">Credit Engine</div>
        <h2 style="font-size:20px;color:#0f172a;margin:0 0 12px">You've been invited</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 8px">
          <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Lucred Credit Engine as a <strong>${role}</strong>.
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

// Notify org owner (and admin members) when a loan review is completed
async function sendStaffLoanReviewAlert(to, { staffName, customerName, verdict, loanAmount, dashboardUrl }) {
  const verdictColor = verdict === 'ELIGIBLE' ? '#16a34a' : verdict === 'CONDITIONAL' ? '#d97706' : '#dc2626';
  const verdictLabel = verdict === 'ELIGIBLE' ? 'Eligible' : verdict === 'CONDITIONAL' ? 'Conditional' : 'Not Eligible';
  await sendMail({
    to,
    subject: `Loan review complete — ${customerName} is ${verdictLabel}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">Staff Notification</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Loan review ready for ${staffName ? staffName : 'your team'}</h2>
        <div style="background:#fff;border-left:4px solid ${verdictColor};border-radius:8px;padding:16px 20px;margin-bottom:20px">
          <div style="font-size:13px;color:#64748b;margin-bottom:4px">Customer</div>
          <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:8px">${customerName}</div>
          <div style="font-size:12px;color:#64748b">Verdict: <strong style="color:${verdictColor}">${verdictLabel}</strong>${loanAmount ? ` · ₦${Number(loanAmount).toLocaleString()}` : ''}</div>
        </div>
        <a href="${dashboardUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          View Customer →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">You're receiving this because you are an admin on this Lucred Credit Engine account.</p>
      </div>
    `,
  });
}

// Notify org owner when a customer's pipeline status changes
async function sendStaffStatusChangeAlert(to, { staffName, customerName, newStatus, dashboardUrl }) {
  const STATUS_LABEL = { applied: 'Applied', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected', disbursed: 'Disbursed' };
  const STATUS_COLOR = { applied: '#1d4ed8', under_review: '#d97706', approved: '#16a34a', rejected: '#dc2626', disbursed: '#6d28d9' };
  const color = STATUS_COLOR[newStatus] ?? '#64748b';
  await sendMail({
    to,
    subject: `${customerName} moved to ${STATUS_LABEL[newStatus] ?? newStatus}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">Pipeline Notification</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Pipeline status updated</h2>
        <div style="background:#fff;border-left:4px solid ${color};border-radius:8px;padding:16px 20px;margin-bottom:20px">
          <div style="font-size:13px;color:#64748b;margin-bottom:4px">Customer</div>
          <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:8px">${customerName}</div>
          <div style="font-size:12px;color:#64748b">New status: <strong style="color:${color}">${STATUS_LABEL[newStatus] ?? newStatus}</strong></div>
        </div>
        <a href="${dashboardUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          View Customer →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">You're receiving this because you are an admin on this Lucred Credit Engine account.</p>
      </div>
    `,
  });
}

async function sendLowBalanceAlert(to, { organizationName, balance, threshold }) {
  await sendMail({
    to,
    subject: `Low wallet balance — ₦${balance.toLocaleString()} remaining`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">Wallet Alert</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px">Your wallet balance is low</h2>
        <div style="background:#fff;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:20px">
          <div style="font-size:13px;color:#64748b;margin-bottom:4px">${organizationName}</div>
          <div style="font-size:28px;font-weight:800;color:#dc2626">₦${balance.toLocaleString()}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">remaining in your wallet</div>
        </div>
        <p style="font-size:14px;color:#334155;line-height:1.6">Your wallet balance has dropped below ₦${threshold.toLocaleString()}. Top up now to avoid interruptions when running BVN, NIN, bureau or statement analyses.</p>
        <a href="https://engine.lucred.co/dashboard/billing" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Top Up Wallet →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">You're receiving this because you are the account owner on Lucred Credit Engine.</p>
      </div>
    `,
  });
}

async function sendMonthlySummary(to, { organizationName, month, analyses, totalSpent, savedVsPayg, plan }) {
  const rows = Object.entries(analyses)
    .filter(([, v]) => v.count > 0)
    .map(([service, v]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155">${v.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center">${v.count}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right">₦${v.spent.toLocaleString()}</td>
      </tr>`).join('');

  await sendMail({
    to,
    subject: `Your ${month} usage summary — Lucred Credit Engine`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:28px">Monthly Summary — ${month}</div>
        <h2 style="font-size:18px;color:#0f172a;margin:0 0 16px">Here's how ${organizationName} used Lucred Credit Engine in ${month}</h2>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:20px">
          <thead><tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Service</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Runs</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Spent</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="3" style="padding:16px;text-align:center;color:#94a3b8;font-size:13px">No analyses run this month</td></tr>'}</tbody>
        </table>
        <div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between">
          <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Total spent</div><div style="font-size:22px;font-weight:800;color:#0f172a">₦${totalSpent.toLocaleString()}</div></div>
          ${savedVsPayg > 0 ? `<div style="text-align:right"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Saved vs PAYG</div><div style="font-size:22px;font-weight:800;color:#16a34a">₦${savedVsPayg.toLocaleString()}</div></div>` : ''}
        </div>
        <a href="https://engine.lucred.co/dashboard/billing" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          View Full Transaction Log →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">You're receiving this monthly summary as the account owner on Lucred Credit Engine.</p>
      </div>
    `,
  });
}

async function sendTopupConfirmation(to, { organizationName, amount, balance, description }) {
  await sendMail({
    to,
    subject: `Wallet credited — ₦${Number(amount).toLocaleString()} added to your Lucred Credit Engine wallet`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <h2 style="font-size:20px;color:#0f172a;margin:0 0 20px">Wallet top-up confirmed</h2>
        <p style="font-size:14px;color:#334155;margin-bottom:24px">Hi ${organizationName},<br/><br/>Your Lucred Credit Engine wallet has been credited. Here's the summary:</p>
        <div style="background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <span style="font-size:13px;color:#64748b">Amount credited</span>
            <span style="font-size:15px;font-weight:800;color:#16a34a">+₦${Number(amount).toLocaleString()}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <span style="font-size:13px;color:#64748b">Description</span>
            <span style="font-size:13px;color:#0f172a">${description || 'Manual top-up'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0">
            <span style="font-size:13px;color:#64748b">New balance</span>
            <span style="font-size:18px;font-weight:800;color:#0f172a">₦${Number(balance).toLocaleString()}</span>
          </div>
        </div>
        <a href="https://engine.lucred.co/dashboard/billing" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View Wallet →</a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">If you didn't request this top-up, please contact <a href="mailto:support@lucred.co" style="color:#0ea5e9">support@lucred.co</a> immediately.</p>
      </div>
    `,
  });
}

async function sendNewSignupAlert({ organizationName, email, contactPerson, phone, adminUrl }) {
  const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'dahunsitemitope@gmail.com';
  await sendMail({
    to: ADMIN_EMAIL,
    subject: `New MFI signup: ${organizationName}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="font-size:22px;font-weight:800;color:#0ea5e9;margin-bottom:8px">Lucred Credit Engine</div>
        <h2 style="font-size:20px;color:#0f172a;margin:0 0 8px">New signup — review required</h2>
        <p style="font-size:14px;color:#64748b;margin:0 0 24px">A new organisation has applied for API access and is pending KYB approval.</p>
        <div style="background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:24px;border:1px solid #e2e8f0">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <span style="font-size:13px;color:#64748b;font-weight:600">Organisation</span>
            <span style="font-size:14px;font-weight:700;color:#0f172a">${organizationName}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <span style="font-size:13px;color:#64748b;font-weight:600">Contact person</span>
            <span style="font-size:13px;color:#0f172a">${contactPerson}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <span style="font-size:13px;color:#64748b;font-weight:600">Email</span>
            <span style="font-size:13px;color:#0f172a">${email}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0">
            <span style="font-size:13px;color:#64748b;font-weight:600">Phone</span>
            <span style="font-size:13px;color:#0f172a">${phone || '—'}</span>
          </div>
        </div>
        <a href="${adminUrl}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Review in Admin →</a>
        <p style="color:#94a3b8;font-size:12px;margin-top:28px">Complete KYB, send the SLA, and activate the account when ready.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordReset, sendWelcome, sendLoanDecision, sendPlanLimitWarning, sendVerificationEmail, sendTeamInvite, sendStaffLoanReviewAlert, sendStaffStatusChangeAlert, sendLowBalanceAlert, sendMonthlySummary, sendTopupConfirmation, sendApprovalNotification, sendSLARequest, sendNewSignupAlert };
