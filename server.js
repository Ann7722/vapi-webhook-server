// Vapi Webhook Receiver + Email Notifier
// Deploy to Render.com or Railway.app

const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON body from Vapi
app.use(bodyParser.json());

// ===== EMAIL CONFIG =====
// Uses Gmail by default. For other providers, change the transporter below.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,      // Your Gmail address
    pass: process.env.EMAIL_PASS       // Gmail App Password (NOT your login password)
  }
});

const NOTIFICATION_EMAIL = process.env.NOTIFY_EMAIL || process.env.EMAIL_USER;

// ===== HEALTH CHECK =====
// Vapi or uptime monitors can ping this to confirm the server is alive
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
// Vapi sends a POST here after each call ends
app.post('/webhook', async (req, res) => {
  console.log('📞 Webhook received at', new Date().toISOString());
  console.log('Payload:', JSON.stringify(req.body, null, 2));

  try {
    const payload = req.body;

    // Extract data from Vapi payload
    // Vapi sends different structures depending on your configuration
    const callData = extractCallData(payload);

    // Send email notification
    await sendEmailNotification(callData);

    res.status(200).json({ received: true, emailSent: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ received: true, error: error.message });
  }
});

// ===== DATA EXTRACTION =====
function extractCallData(payload) {
  // Vapi webhook structure (adjust based on your actual Vapi configuration)
  const message = payload.message || payload;
  
  return {
    callId: message.call?.id || message.id || 'unknown',
    customerName: extractVariable(message, 'customer_name') || extractVariable(message, 'name') || 'Not provided',
    phone: extractVariable(message, 'phone') || extractVariable(message, 'customer_phone') || 'Not provided',
    movingDate: extractVariable(message, 'moving_date') || extractVariable(message, 'date') || 'Not provided',
    loadingAddress: extractVariable(message, 'loading_address') || extractVariable(message, 'from_address') || 'Not provided',
    unloadingAddress: extractVariable(message, 'unloading_address') || extractVariable(message, 'to_address') || 'Not provided',
    propertySize: extractVariable(message, 'property_size') || extractVariable(message, 'size') || 'Not provided',
    specialItems: extractVariable(message, 'special_items') || extractVariable(message, 'special') || 'None',
    estimatedHours: extractVariable(message, 'estimated_hours') || extractVariable(message, 'hours') || 'Not provided',
    notes: extractVariable(message, 'notes') || extractVariable(message, 'additional_notes') || 'None',
    callDuration: message.call?.duration || message.duration || 0,
    recordingUrl: message.call?.recordingUrl || message.recording_url || null,
    transcript: message.call?.transcript || message.transcript || 'Not available',
    rawPayload: JSON.stringify(payload, null, 2)
  };
}

function extractVariable(message, key) {
  // Try to find variable in Vapi's variable_store or message structure
  const vars = message.call?.variableStore || message.variableStore || message.variables || {};
  if (vars[key]) return vars[key];
  
  // Also check results or analysis
  const results = message.call?.results || message.results || {};
  if (results[key]) return results[key];
  
  return null;
}

// ===== EMAIL NOTIFICATION =====
async function sendEmailNotification(data) {
  const subject = `📞 New Moving Inquiry - ${data.customerName} (${data.phone})`;
  
  const htmlBody = `
    <h2>New Moving Inquiry Received</h2>
    <p><strong>Call ID:</strong> ${data.callId}</p>
    <p><strong>Call Duration:</strong> ${Math.round(data.callDuration / 60)} minutes</p>
    <hr>
    
    <h3>Customer Information</h3>
    <ul>
      <li><strong>Name:</strong> ${data.customerName}</li>
      <li><strong>Phone:</strong> ${data.phone}</li>
    </ul>
    
    <h3>Moving Details</h3>
    <ul>
      <li><strong>Date/Time:</strong> ${data.movingDate}</li>
      <li><strong>Loading Address:</strong> ${data.loadingAddress}</li>
      <li><strong>Unloading Address:</strong> ${data.unloadingAddress}</li>
      <li><strong>Property Size:</strong> ${data.propertySize}</li>
      <li><strong>Estimated Hours:</strong> ${data.estimatedHours}</li>
      <li><strong>Special Items:</strong> ${data.specialItems}</li>
    </ul>
    
    <h3>Additional Notes</h3>
    <p>${data.notes}</p>
    
    ${data.recordingUrl ? `<p><strong>Call Recording:</strong> <a href="${data.recordingUrl}">Listen</a></p>` : ''}
    
    <hr>
    <p style="color: #666; font-size: 12px;">
      <strong>Full Transcript:</strong><br>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${data.transcript}</pre>
    </p>
    
    <hr>
    <p style="color: #999; font-size: 11px;">
      This is an automated notification from your Vapi AI Phone Assistant.<br>
      Received at: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT
    </p>
  `;
  
  const textBody = `
NEW MOVING INQUIRY
==================
Call ID: ${data.callId}
Duration: ${Math.round(data.callDuration / 60)} minutes

CUSTOMER
--------
Name: ${data.customerName}
Phone: ${data.phone}

MOVING DETAILS
--------------
Date/Time: ${data.movingDate}
From: ${data.loadingAddress}
To: ${data.unloadingAddress}
Size: ${data.propertySize}
Hours: ${data.estimatedHours}
Special Items: ${data.specialItems}

NOTES
-----
${data.notes}

TRANSCRIPT
----------
${data.transcript}

---
Automated notification from Vapi AI Assistant
Received: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: NOTIFICATION_EMAIL,
    subject: subject,
    text: textBody,
    html: htmlBody
  };

  await transporter.sendMail(mailOptions);
  console.log('✅ Email sent to', NOTIFICATION_EMAIL);
}

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Notification email: ${NOTIFICATION_EMAIL}`);
  console.log(`🔗 Webhook URL: https://your-app-url.onrender.com/webhook`);
});

module.exports = app;