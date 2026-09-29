// Vapi Webhook Receiver + Email Notifier
// Deploy to Render.com or Railway.app

const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON body from Vapi
app.use(bodyParser.json());

// ===== CORS =====
// Allow your HTML frontend to call this API from anywhere
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ===== EMAIL CONFIG =====
// Supports Gmail, QQ Mail (qq.com), 163 Mail, Outlook, etc.
const EMAIL_USER = process.env.EMAIL_USER || '';

let transporter;
if (EMAIL_USER.includes('@qq.com')) {
  transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

const NOTIFICATION_EMAIL = process.env.NOTIFY_EMAIL || process.env.EMAIL_USER;

// ===== HEALTH CHECK =====
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Vapi Webhook Receiver',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ===== WEBHOOK ENDPOINT =====
app.post('/webhook', async (req, res) => {
  console.log('Webhook received at', new Date().toISOString());
  try {
    const payload = req.body;
    const callData = extractCallData(payload);
    await sendEmailNotification(callData);
    res.status(200).json({ received: true, emailSent: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ received: true, error: error.message });
  }
});

function extractCallData(payload) {
  const message = payload.message || payload;
  return {
    callId: message.call?.id || message.id || 'unknown',
    customerName: extractVariable(message, 'customer_name') || 'Not provided',
    phone: extractVariable(message, 'phone') || 'Not provided',
    movingDate: extractVariable(message, 'moving_date') || 'Not provided',
    loadingAddress: extractVariable(message, 'loading_address') || 'Not provided',
    unloadingAddress: extractVariable(message, 'unloading_address') || 'Not provided',
    propertySize: extractVariable(message, 'property_size') || 'Not provided',
    specialItems: extractVariable(message, 'special_items') || 'None',
    estimatedHours: extractVariable(message, 'estimated_hours') || 'Not provided',
    notes: extractVariable(message, 'notes') || '',
    callDuration: message.call?.duration || 0,
    recordingUrl: message.call?.recordingUrl || '',
    transcript: message.call?.transcript || ''
  };
}

function extractVariable(message, key) {
  if (message.variableStore && message.variableStore[key] !== undefined) {
    return message.variableStore[key];
  }
  if (message.call && message.call.variableStore && message.call.variableStore[key] !== undefined) {
    return message.call.variableStore[key];
  }
  return null;
}

async function sendEmailNotification(data) {
  const subject = `New Moving Reservation - ${data.customerName}`;
  const text = `
New moving reservation received!

Customer: ${data.customerName}
Phone: ${data.phone}
Moving Date: ${data.movingDate}
From: ${data.loadingAddress}
To: ${data.unloadingAddress}
Property Size: ${data.propertySize}
Special Items: ${data.specialItems}
Estimated Hours: ${data.estimatedHours}
Notes: ${data.notes || 'None'}
Call Duration: ${data.callDuration}s
Recording: ${data.recordingUrl || 'N/A'}

---
Sent from Vapi Webhook Receiver
  `.trim();

  await transporter.sendMail({
    from: EMAIL_USER,
    to: NOTIFICATION_EMAIL,
    subject: subject,
    text: text
  });
}

// ===== SEND EMAIL API (for HTML frontend) =====
app.post('/send-email', async (req, res) => {
  console.log('Send email request at', new Date().toISOString());
  const { to, subject, body, html } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, body'
    });
  }

  const emailRegex = /^<sup>\s@</sup>+@<sup>\s@</sup>+\.<sup>\s@</sup>+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid recipient email format'
    });
  }

  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: to,
      subject: subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>')
    });
    console.log('Email sent to', to);
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      to: to
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Email user: ${EMAIL_USER}`);
  console.log(`Notification email: ${NOTIFICATION_EMAIL}`);
});

module.exports = app;
