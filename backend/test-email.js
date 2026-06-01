const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'sale@abelops.com',
    pass: 'AbelOps@2025!',
  },
  logger: true,
  debug: true
});

async function testEmail() {
  try {
    console.log("Verifying connection to Hostinger SMTP...");
    await transporter.verify();
    console.log("SUCCESS! Connected to SMTP successfully.");
    
    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: 'Recruitment Team <sale@abelops.com>',
      to: 'sale@abelops.com',
      subject: 'Test Email from Node.js',
      text: 'If you receive this, the SMTP is working perfectly!',
    });
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("FAILED! Error details:");
    console.error(error);
  }
}

testEmail();
