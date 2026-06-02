const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const prisma = require('../config/database');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const logEmail = async (candidateId, emailType, success, errorMessage = null) => {
  try {
    await prisma.emailLog.create({ data: { candidateId, emailType, success, errorMessage } });
  } catch (err) {
    logger.warn('Could not log email', { error: err.message });
  }
};

const send = async (to, subject, html, candidateId, emailType) => {
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'Recruitment <noreply@company.com>',
      to,
      subject,
      html,
    });
    await logEmail(candidateId, emailType, true);
    logger.info('Email sent', { to, emailType });
  } catch (err) {
    logger.error('Email send failed', { to, emailType, error: err.message });
    await logEmail(candidateId, emailType, false, err.message);
    throw err;
  }
};

// ─── Templates ───────────────────────────────────────────────

const base = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6fa; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header  { background: #105279; color: #fff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; }
    .body    { padding: 28px 32px; color: #374151; line-height: 1.7; }
    .footer  { background: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #9ca3af; }
    .badge-pass   { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; }
    .badge-reject { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>TalentScreen Recruitment</h1></div>
    <div class="body">${content}</div>
    <div class="footer">This is an automated message. Please do not reply to this email.</div>
  </div>
</body>
</html>
`;

const sendConfirmation = async (candidate) => {
  const html = base(`
    <p>Dear <strong>${candidate.fullName}</strong>,</p>
    <p>Thank you for applying! We have received your application and it is currently being reviewed.</p>
    <p>Here's a summary of your submission:</p>
    <ul>
      <li><strong>Language selected:</strong> ${candidate.selectedLanguage}</li>
      <li><strong>Availability shift:</strong> ${candidate.availabilityShift}</li>
    </ul>
    <p>You will receive a follow-up email with the next steps shortly.</p>
    <p>Best regards,<br>The Recruitment Team</p>
  `);
  return send(candidate.email, 'Application Received – TalentScreen', html, candidate.id, 'confirmation');
};

const sendRejection = async (candidate, reasons = []) => {
  const reasonList = reasons.length
    ? `<ul>${reasons.map((r) => `<li>${r}</li>`).join('')}</ul>`
    : '<p>Your application did not meet the minimum requirements at this time.</p>';

  const html = base(`
    <p>Dear <strong>${candidate.fullName}</strong>,</p>
    <p>Thank you for taking the time to apply. After reviewing your application, we regret to inform you that you were not shortlisted for the next stage.</p>
    <span class="badge-reject">Application Not Progressed</span>
    <p style="margin-top:16px"><strong>Reason(s):</strong></p>
    ${reasonList}
    <p>We encourage you to address these areas and apply again in the future.</p>
    <p>Best regards,<br>The Recruitment Team</p>
  `);
  return send(candidate.email, 'Application Update – TalentScreen', html, candidate.id, 'rejection');
};

const sendLevel1Pass = async (candidate, teamsLink = null) => {
  const meetingSection = teamsLink
    ? `<p style="margin-top:16px">Your interview has been scheduled. Please join using the link below:</p>
       <p style="margin:16px 0">
         <a href="${teamsLink}" style="display:inline-block;background:#105279;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
           Join Microsoft Teams Interview
         </a>
       </p>`
    : `<p style="margin-top:16px">A member of our recruitment team will be in touch shortly to schedule the next stage of the process.</p>`;

  const html = base(`
    <p>Dear <strong>${candidate.fullName}</strong>,</p>
    <p>We are pleased to inform you that you have <strong>successfully passed Level 1</strong> of our screening process!</p>
    <span class="badge-pass">Level 1 Passed ✓</span>
    ${meetingSection}
    <p>Please ensure you remain available and check your inbox regularly.</p>
    <p>Best regards,<br>The Recruitment Team</p>
  `);
  return send(candidate.email, 'Congratulations – Level 1 Passed! | TalentScreen', html, candidate.id, 'level1_pass');
};

module.exports = { sendConfirmation, sendRejection, sendLevel1Pass };
