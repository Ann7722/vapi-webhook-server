const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const EMAIL_USER = process.env.EMAIL_USER || '';

let transporter;
if (EMAIL_USER.includes('@qq.com')) {
  transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: { user: EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
} else {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}

const NOTIFICATION_EMAIL = process.env.NOTIFY_EMAIL || process.env.EMAIL_USER;

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Webhook Server', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});app.post('/webhook', async (req, res) => {
  console.log('Webhook received');
  try {
    const callData = extractCallData(req.body);
    await sendEmailNotification(callData);
    res.status(200).json({ received: true, emailSent: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ received: true, error: error.message });
  }
});

function extractCallData(payload) {
  const message = payload.message || payload;
  return {
    callId: message.call?.id || 'unknown',
    customerName: message.call?.variableStore?.customer_name || 'Not provided',
    phone: message.call?.variableStore?.phone || 'Not provided',
    movingDate: message.call?.variableStore?.moving_date || 'Not provided',
    loadingAddress: message.call?.variableStore?.loading_address || 'Not provided',
    unloadingAddress: message.call?.variableStore?.unloading_address || 'Not provided',
    propertySize: message.call?.variableStore?.property_size || 'Not provided',
    specialItems: message.call?.variableStore?.special_items || 'None',
    estimatedHours: message.call?.variableStore?.estimated_hours || 'Not provided',
    notes: message.call?.variableStore?.notes || '',
    callDuration: message.call?.duration || 0
  };
}

async function sendEmailNotification(data) {
  const subject = 'New Moving Inquiry - ' + data.customerName;
  const text = 'Call ID: ' + data.callId + '\nName: ' + data.customerName + '\nPhone: ' + data.phone + '\nDate: ' + data.movingDate + '\nFrom: ' + data.loadingAddress + '\nTo: ' + data.unloadingAddress + '\nSize: ' + data.propertySize + '\nHours: ' + data.estimatedHours + '\nSpecial: ' + data.specialItems + '\nNotes: ' + data.notes;
  await transporter.sendMail({ from: process.env.EMAIL_USER, to: NOTIFICATION_EMAIL, subject: subject, text: text });
  console.log('Email sent');
}

app.post('/send-email', async (req, res) => {
  const { to, subject, body, html } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to: to, subject: subject, text: body, html: html || body.replace(/\n/g, '<br>') });
    res.status(200).json({ success: true, message: 'Email sent', to: to });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

module.exports = app;
