const nodemailer = require("nodemailer");



// Email configuration with rotation
const emailConfigs = [
  {
    email: process.env.EMAIL_1,
    password: process.env.EMAIL_1_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500, // Gmail's daily limit
  },
  {
    email: process.env.EMAIL_2,
    password: process.env.EMAIL_2_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500,
  },
  {
    email: process.env.EMAIL_3,
    password: process.env.EMAIL_3_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500,
  },
  {
    email: process.env.EMAIL_4,
    password: process.env.EMAIL_4_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500,
  },
  {
    email: process.env.EMAIL_5,
    password: process.env.EMAIL_5_PASSWORD,
    name: "Tech Fiesta Team",
    currentUsage: 0,
    dailyLimit: 500,
  },
];

// Current email index for rotation
let currentEmailIndex = 0;

// Reset usage counters daily
const resetUsageCounters = () => {
  emailConfigs.forEach((config) => {
    config.currentUsage = 0;
  });
  console.log("📧 Email usage counters reset for the day");
};

// Reset usage counters at midnight
setInterval(resetUsageCounters, 24 * 60 * 60 * 1000);

// Get email service status
const getEmailServiceStatus = () => {
  if (process.env.BREVO_API_KEY) {
    return [
      {
        type: "Brevo",
        email: process.env.BREVO_SENDER_EMAIL || "Not configured",
        isConfigured: true,
        currentUsage: "N/A",
        dailyLimit: "300 emails/day",
        isActive: true,
      }
    ];
  }
  return emailConfigs.map((config, index) => ({
    index: index + 1,
    email: config.email
      ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
      : "Not configured",
    isConfigured: !!(config.email && config.password),
    currentUsage: config.currentUsage,
    dailyLimit: config.dailyLimit,
    isActive: config.currentUsage < config.dailyLimit,
  }));
};

// Get next available email configuration
const getAvailableEmailConfig = () => {
  console.log(
    `🔍 Looking for available email config. Current index: ${currentEmailIndex}`
  );

  // Try to find an email with available quota
  for (let i = 0; i < emailConfigs.length; i++) {
    const config = emailConfigs[(currentEmailIndex + i) % emailConfigs.length];
    const configIndex = (currentEmailIndex + i) % emailConfigs.length;

    console.log(`📧 Checking email config ${configIndex + 1}:`, {
      email: config.email
        ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
        : "Not configured",
      hasPassword: !!config.password,
      currentUsage: config.currentUsage,
      dailyLimit: config.dailyLimit,
      available: config.currentUsage < config.dailyLimit,
    });

    if (
      config.email &&
      config.password &&
      config.currentUsage < config.dailyLimit
    ) {
      console.log(`✅ Found available email config: ${configIndex + 1}`);
      return config;
    }
  }

  console.log(
    "⚠️ No email config with available quota found, using first config"
  );
  return emailConfigs[0]; // Fallback to first config
};

// Create transporter for the selected email
const createTransporter = (config) => {
  if (process.env.RESEND_API_KEY) {
    console.log("🔧 Creating transporter using Resend SMTP");
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY,
        },
      });
      console.log(`✅ Resend transporter created successfully`);
      return transporter;
    } catch (error) {
      console.error(`❌ Error creating Resend transporter:`, error.message);
      throw error;
    }
  }

  console.log(
    `🔧 Creating transporter for Gmail: ${config && config.email
      ? config.email.replace(/(.{3}).*(@.*)/, "$1***$2")
      : "Not configured"
    }`
  );

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.email,
        pass: config.password,
      },
    });

    console.log(`✅ Gmail transporter created successfully`);
    return transporter;
  } catch (error) {
    console.error(`❌ Error creating Gmail transporter:`, error.message);
    throw error;
  }
};

// Generate email template for registration confirmation
const generateRegistrationEmailTemplate = (
  registrationData,
  events,
  workshops
) => {
  const { registrationId, userEmail, paymentDetails, selectedPass } =
    registrationData;

  // Get event details for tech events
  const selectedEventDetails = [];
  if (
    registrationData.selectedEvents &&
    registrationData.selectedEvents.length > 0
  ) {
    registrationData.selectedEvents.forEach((selectedEvent) => {
      // Handle both {id, title} format and just id format
      const eventId = selectedEvent.id || selectedEvent;
      const event = events.find((e) => e.id === eventId && e.type === "tech");
      if (event) {
        selectedEventDetails.push(event);
      }
    });
  }

  // Get workshop details
  const selectedWorkshopDetails = [];
  if (
    registrationData.selectedWorkshops &&
    registrationData.selectedWorkshops.length > 0
  ) {
    registrationData.selectedWorkshops.forEach((selectedWorkshop) => {
      // Handle both {id, title} format and just id format
      const workshopId = selectedWorkshop.id || selectedWorkshop;
      const workshop = workshops.find((w) => w.id === workshopId);
      if (workshop) {
        selectedWorkshopDetails.push(workshop);
      }
    });
  }

  // Get non-tech event details
  const selectedNonTechEventDetails = [];
  if (
    registrationData.selectedNonTechEvents &&
    registrationData.selectedNonTechEvents.length > 0
  ) {
    registrationData.selectedNonTechEvents.forEach((selectedEvent) => {
      // Handle both {id, title} format and just id format
      const eventId = selectedEvent.id || selectedEvent;
      const event = events.find(
        (e) => e.id === eventId && e.type === "non-tech"
      );
      if (event) {
        selectedNonTechEventDetails.push(event);
      }
    });
  }

  const isCIT = userEmail && userEmail.endsWith("@citchennai.net");
  const isFreRegistration = !paymentDetails || paymentDetails.amount === 0;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1e293b; 
            background-color: #f8fafc; 
            margin: 0; 
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .container { 
            max-width: 600px; 
            margin: 40px auto; 
            padding: 0; 
            background: #ffffff; 
            border-radius: 16px; 
            box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); 
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
        }
        .header h1 { 
            margin: 0 0 10px 0; 
            font-size: 28px; 
            font-weight: 800; 
            letter-spacing: -0.025em;
            color: #ffffff;
        }
        .header h2 { 
            margin: 0 0 5px 0; 
            font-size: 18px; 
            font-weight: 600; 
            color: #818cf8; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .header p { 
            margin: 0; 
            font-size: 14px; 
            color: #94a3b8; 
        }
        .date-badge {
            display: inline-block;
            background: rgba(99, 102, 241, 0.25);
            border: 1px solid rgba(129, 140, 248, 0.4);
            color: #e0e7ff;
            padding: 8px 16px;
            border-radius: 9999px;
            margin-top: 15px;
            font-weight: 700;
            font-size: 14px;
        }
        .content { 
            padding: 35px 30px; 
        }
        .card { 
            background: #f8fafc; 
            padding: 24px; 
            border-radius: 12px; 
            margin-bottom: 24px; 
            border: 1px solid #f1f5f9;
        }
        .card-title {
            margin-top: 0;
            margin-bottom: 18px;
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            display: flex;
            align-items: center;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .info-label {
            color: #64748b;
            font-weight: 500;
        }
        .info-value {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
        }
        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-verified {
            background-color: #dcfce7;
            color: #15803d;
        }
        .badge-free {
            background-color: #e0f2fe;
            color: #0369a1;
        }
        .event-list { 
            margin-bottom: 24px;
        }
        .event-list-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 16px 0;
        }
        .event-card { 
            background: #ffffff; 
            padding: 20px; 
            border-radius: 12px; 
            margin-bottom: 12px; 
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.01);
        }
        .event-title {
            margin: 0 0 10px 0;
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
        }
        .event-meta {
            font-size: 13px;
            color: #475569;
            margin-bottom: 4px;
        }
        .event-meta strong {
            color: #334155;
        }
        .event-desc {
            font-size: 13px;
            color: #64748b;
            margin: 8px 0 0 0;
            line-height: 1.5;
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 6px;
        }
        .amount-display { 
            font-size: 20px; 
            font-weight: 800; 
            color: #4f46e5; 
        }
        .pass-card { 
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
            padding: 24px; 
            border-radius: 12px; 
            margin-bottom: 24px; 
            border: 1px solid #bfdbfe; 
        }
        .pass-title {
            color: #1e40af;
            font-size: 16px;
            font-weight: 800;
            margin-top: 0;
            margin-bottom: 12px;
        }
        .instruction-item {
            margin-bottom: 8px;
            padding-left: 10px;
            position: relative;
        }
        .footer { 
            text-align: center; 
            padding: 30px; 
            background-color: #f1f5f9;
            color: #64748b; 
            font-size: 13px; 
            border-top: 1px solid #e2e8f0;
        }
        .footer a { 
            color: #4f46e5; 
            text-decoration: none;
            font-weight: 600;
        }
        .footer p {
            margin: 0 0 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Tech Fiesta 2025</h2>
            <h1>🎉 Registration Confirmed!</h1>
            <p>Chennai Institute of Technology</p>
            <div class="date-badge">📅 Event Date: 4th August</div>
        </div>
        
        <div class="content">
            <div class="card">
                <div class="card-title">📋 Registration Summary</div>
                
                <div class="info-row">
                    <span class="info-label">Registration ID</span>
                    <span class="info-value" style="font-family: monospace; font-size: 15px; color: #4f46e5;">${registrationId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Participant Name</span>
                    <span class="info-value">${registrationData.userDetails?.name || registrationData.name || "Not provided"}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email Address</span>
                    <span class="info-value">${userEmail}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">College</span>
                    <span class="info-value">${registrationData.userDetails?.college || registrationData.college || "Not provided"}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Student Type</span>
                    <span class="info-value">${isCIT ? "CIT Student" : "External Student"}</span>
                </div>
                
                ${!isFreRegistration
                  ? `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                        <div class="info-row">
                            <span class="info-label">Payment ID</span>
                            <span class="info-value" style="font-family: monospace;">${paymentDetails.paymentId}</span>
                        </div>
                        <div class="info-row" style="margin-top: 8px;">
                            <span class="info-label">Amount Paid</span>
                            <span class="info-value amount-display">₹${paymentDetails.amount}</span>
                        </div>
                        <div class="info-row" style="margin-top: 8px;">
                            <span class="info-label">Payment Status</span>
                            <span class="info-value"><span class="badge badge-verified">✅ Verified</span></span>
                        </div>
                    </div>
                    `
                  : `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                        <div class="info-row">
                            <span class="info-label">Registration Type</span>
                            <span class="info-value"><span class="badge badge-free">✅ Free Registration</span></span>
                        </div>
                    </div>
                    `
                }
            </div>

            ${(registrationData.teamDetails?.isTeamEvent || registrationData.isTeamEvent) &&
              (registrationData.teamDetails?.teamMembers || registrationData.teamMembers) &&
              (registrationData.teamDetails?.teamMembers || registrationData.teamMembers).length > 0
              ? `
                <div class="card">
                    <div class="card-title">👥 Team Information</div>
                    <div class="info-row">
                        <span class="info-label">Team Leader</span>
                        <span class="info-value">${registrationData.userDetails?.name || registrationData.name || "Not provided"}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Team Size</span>
                        <span class="info-value">${registrationData.teamDetails?.teamSize || registrationData.teamSize || (registrationData.teamDetails?.teamMembers || registrationData.teamMembers).length + 1} members</span>
                    </div>
                    <div style="margin-top: 15px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Team Members:</h4>
                        ${(registrationData.teamDetails?.teamMembers || registrationData.teamMembers)
                            .map((member, index) => `
                                <div style="margin-bottom: 12px; padding: 10px 14px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #6366f1;">
                                    <div style="font-weight: 700; font-size: 14px; color: #0f172a;">Member ${index + 2}: ${member.name || "Not provided"}</div>
                                    <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                                        📧 ${member.email || "N/A"} | 📱 ${member.whatsapp || "N/A"}
                                    </div>
                                    <div style="font-size: 12px; color: #64748b;">
                                        🏛️ ${member.department || "N/A"} | Year ${member.year || "N/A"}
                                    </div>
                                </div>
                            `).join("")}
                    </div>
                </div>
                `
              : ""
            }

            ${selectedPass
              ? `
                <div class="pass-card">
                    <div class="pass-title">🎫 Selected Pass Details</div>
                    <div style="font-weight: 700; color: #1e3a8a; font-size: 15px;">Tech Fiesta General Pass</div>
                    <div style="font-size: 13px; color: #1e40af; margin-top: 8px; line-height: 1.5;">
                        <div style="margin-bottom: 4px;">✅ Unlimited access to ALL technical events</div>
                        <div style="margin-bottom: 4px;">✅ 1 workshop included + up to 4 additional workshops</div>
                        <div style="margin-bottom: 4px;">✅ Priority seating and exclusive merchandise access</div>
                    </div>
                    <div style="margin-top: 15px; font-size: 13px; color: #1e40af;">
                        <strong>Pass ID:</strong> <span style="font-family: monospace; font-size: 14px; font-weight: bold;">${selectedPass}</span>
                    </div>
                </div>
                `
              : ""
            }

            ${!selectedPass &&
              selectedEventDetails.length === 0 &&
              selectedWorkshopDetails.length === 0 &&
              selectedNonTechEventDetails.length === 0
              ? `
                <div class="card" style="background: #eff6ff; border: 1px solid #bfdbfe;">
                    <div class="card-title" style="color: #1e40af; border-bottom-color: #bfdbfe;">🎪 Welcome to Tech Fiesta 2025!</div>
                    <p style="margin: 0; font-size: 14px; color: #1e3a8a;">
                        Your registration has been completed successfully! You can still sign up for individual events:
                    </p>
                    <div style="margin-top: 12px; font-size: 13px; color: #1e40af; line-height: 1.6;">
                        • <strong>Walk-in Registration:</strong> Available at the venue for most events<br>
                        • <strong>Non-Tech Events:</strong> Register and pay at the venue on event day<br>
                        • <strong>General Pass:</strong> Purchase at the venue for unlimited access to tech events
                    </div>
                </div>
                `
              : ""
            }

            ${selectedEventDetails.length > 0
              ? `
                <div class="event-list">
                    <div class="event-list-title">🎯 Technical Events Registered</div>
                    ${selectedEventDetails.map((event) => `
                        <div class="event-card">
                            <div class="event-title">${event.title}</div>
                            <div class="event-meta">📅 <strong>Date:</strong> 4th August</div>
                            <div class="event-meta">🕒 <strong>Time:</strong> ${event.time}</div>
                            <div class="event-meta">📍 <strong>Venue:</strong> ${event.venue}</div>
                            <p class="event-desc">${event.description}</p>
                        </div>
                    `).join("")}
                </div>
                `
              : ""
            }

            ${selectedWorkshopDetails.length > 0
              ? `
                <div class="event-list">
                    <div class="event-list-title">🛠️ Workshops Registered</div>
                    ${selectedWorkshopDetails.map((workshop) => `
                        <div class="event-card" style="border-left: 4px solid #10b981;">
                            <div class="event-title">${workshop.title}</div>
                            <div class="event-meta">📅 <strong>Date:</strong> 4th August</div>
                            <div class="event-meta">🕒 <strong>Time:</strong> ${workshop.time}</div>
                            <div class="event-meta">📍 <strong>Venue:</strong> ${workshop.venue}</div>
                            <div class="event-meta">👨‍🏫 <strong>Instructor:</strong> ${workshop.instructor}</div>
                            <div class="event-meta">⏱️ <strong>Duration:</strong> ${workshop.duration} | 📊 <strong>Level:</strong> ${workshop.level}</div>
                            <p class="event-desc">${workshop.description}</p>
                        </div>
                    `).join("")}
                </div>
                `
              : ""
            }

            ${selectedNonTechEventDetails.length > 0
              ? `
                <div class="event-list">
                    <div class="event-list-title">🎨 Non-Technical Events Registered</div>
                    <div style="background: #fef3c7; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px; color: #92400e; font-size: 13px; margin-bottom: 12px; font-weight: 500;">
                        📢 <strong>Important:</strong> Payment for non-technical events is collected at the venue on the day of the event.
                    </div>
                    ${selectedNonTechEventDetails.map((event) => `
                        <div class="event-card" style="border-left: 4px solid #f59e0b;">
                            <div class="event-title">${event.title}</div>
                            <div class="event-meta">📅 <strong>Date:</strong> 4th August</div>
                            <div class="event-meta">🕒 <strong>Time:</strong> ${event.time}</div>
                            <div class="event-meta">📍 <strong>Venue:</strong> ${event.venue}</div>
                            <p class="event-desc">${event.description}</p>
                        </div>
                    `).join("")}
                </div>
                `
              : ""
            }

            <div class="card">
                <div class="card-title" style="color: #ef4444; border-bottom-color: #fee2e2;">⚠️ Essential Instructions</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.7;">
                    <li style="margin-bottom: 6px;"><strong>Save this email</strong> - show the Registration ID at the desk.</li>
                    <li style="margin-bottom: 6px;">Bring your college **physical ID card** for quick validation.</li>
                    <li style="margin-bottom: 6px;">Arrive at the respective venues at least **15 minutes early**.</li>
                    <li style="margin-bottom: 6px;">Walk-in and on-the-spot payments apply for any unpaid non-tech entries.</li>
                </ul>
            </div>

            <div class="card">
                <div class="card-title">📞 Contact Support</div>
                <div class="info-row">
                    <span class="info-label">Support Email</span>
                    <span class="info-value"><a href="mailto:Asymmetric@citchennai.net" style="color: #4f46e5; text-decoration: none; font-weight: bold;">Asymmetric@citchennai.net</a></span>
                </div>
                <div class="info-row">
                    <span class="info-label">Help Desk</span>
                    <span class="info-value">Main Campus Registration Desk</span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for participating in Tech Fiesta 2025!</p>
            <p style="font-weight: 700; color: #334155;">Chennai Institute of Technology</p>
            <p>© 2025 Tech Fiesta. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

// Send registration confirmation email
const sendRegistrationConfirmationEmail = async (
  registrationData,
  events = [],
  workshops = []
) => {
  console.log(`📨 Starting registration confirmation email process`);
  console.log(`📧 Recipient: ${registrationData.userEmail}`);
  console.log(`🆔 Registration ID: ${registrationData.registrationId}`);
  console.log(
    `💰 Payment Amount: ₹${registrationData.paymentDetails?.amount || 0}`
  );

  try {
    if (process.env.BREVO_API_KEY) {
      console.log(`📝 Generating email template...`);
      logEmailTemplateInfo(registrationData, events, workshops);
      const htmlContent = generateRegistrationEmailTemplate(
        registrationData,
        events,
        workshops
      );
      console.log(
        `✅ Email template generated successfully (${htmlContent.length} characters)`
      );

      const senderEmail = process.env.BREVO_SENDER_EMAIL || "vimanexample@gmail.com";
      const senderName = process.env.BREVO_SENDER_NAME || "Tech Fiesta Team";
      console.log(`📤 Sending email via Brevo HTTP API...`);

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail
          },
          to: [
            {
              email: registrationData.userEmail
            }
          ],
          subject: `🎉 Tech Fiesta 2025 - Registration Confirmed (${registrationData.registrationId})`,
          htmlContent: htmlContent,
          textContent: `
Tech Fiesta 2025 - Registration Confirmed

Event Date: 4th August
Registration ID: ${registrationData.registrationId}
Email: ${registrationData.userEmail}
Amount Paid: ₹${registrationData.paymentDetails?.amount || 0}
Payment ID: ${registrationData.paymentDetails?.paymentId || "N/A (Free Registration)"
            }

Your registration has been confirmed successfully!
Please save this email for your records and bring it to events for verification.

For queries, contact: Asymmetric@citchennai.net
          `
        })
      });

      const resultJson = await response.json();

      if (!response.ok) {
        console.error("❌ Brevo API Error:", resultJson);
        return { success: false, error: resultJson.message || "Failed to send email via Brevo" };
      }

      console.log(`✅ Registration email sent successfully! Message ID: ${resultJson.messageId}`);
      return {
        success: true,
        messageId: resultJson.messageId,
        usedEmail: "Brevo HTTP API",
      };
    }

    // Gmail SMTP Fallback
    const emailConfig = getAvailableEmailConfig();
    if (!emailConfig.email || !emailConfig.password) {
      console.error("❌ No email configuration available");
      return { success: false, error: "Email service not configured" };
    }
    console.log(
      `🔧 Using Gmail config for sending: ${emailConfig.email.replace(
        /(.{3}).*(@.*)/,
        "$1***$2"
      )}`
    );
    const transporter = createTransporter(emailConfig);

    console.log(`📝 Generating email template...`);
    logEmailTemplateInfo(registrationData, events, workshops);
    const htmlContent = generateRegistrationEmailTemplate(
      registrationData,
      events,
      workshops
    );
    console.log(
      `✅ Email template generated successfully (${htmlContent.length} characters)`
    );

    const fromAddress = `"${emailConfig.name}" <${emailConfig.email}>`;

    const mailOptions = {
      from: fromAddress,
      to: registrationData.userEmail,
      subject: `🎉 Tech Fiesta 2025 - Registration Confirmed (${registrationData.registrationId})`,
      html: htmlContent,
      text: `
Tech Fiesta 2025 - Registration Confirmed

Registration ID: ${registrationData.registrationId}
Email: ${registrationData.userEmail}
Amount Paid: ₹${registrationData.paymentDetails?.amount || 0}
Payment ID: ${registrationData.paymentDetails?.paymentId || "N/A (Free Registration)"
        }

Your registration has been confirmed successfully!
Please save this email for your records and bring it to events for verification.

For queries, contact: Asymmetric@citchennai.net
      `,
    };

    console.log(`📤 Sending email via SMTP...`);
    const info = await transporter.sendMail(mailOptions);

    // Increment usage counter
    emailConfig.currentUsage++;
    // Move to next email for the next send
    currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;
    console.log(`📊 Email usage stats:`, {
      usedEmail: emailConfig.email.replace(/(.{3}).*(@.*)/, "$1***$2"),
      currentUsage: emailConfig.currentUsage,
      dailyLimit: emailConfig.dailyLimit,
      nextEmailIndex: currentEmailIndex,
    });

    console.log(`✅ Registration email sent successfully via SMTP!`);
    console.log(`📧 Sent to: ${registrationData.userEmail}`);
    console.log(`🆔 Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      usedEmail: emailConfig.email,
    };
  } catch (error) {
    console.error("❌ Error sending registration email:", error);

    // If current email failed, try the next one (only applicable to SMTP Gmail rotation)
    if (!process.env.BREVO_API_KEY && (error.code === "EAUTH" || error.code === "ELIMIT")) {
      console.log("🔄 Trying next email configuration...");
      currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

      // Recursive retry with next email (only once to avoid infinite loop)
      if (currentEmailIndex !== 0) {
        console.log(
          `🔁 Retrying with next email config (index: ${currentEmailIndex})`
        );
        return await sendRegistrationConfirmationEmail(
          registrationData,
          events,
          workshops
        );
      }
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

// Send general notification email
const sendNotificationEmail = async (to, subject, htmlContent, textContent) => {
  console.log(`📨 Starting notification email process`);
  console.log(`📧 Recipient: ${to}`);
  console.log(`📝 Subject: ${subject}`);

  try {
    if (process.env.BREVO_API_KEY) {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || "vimanexample@gmail.com";
      const senderName = process.env.BREVO_SENDER_NAME || "Tech Fiesta Team";
      console.log(`📤 Sending notification email via Brevo HTTP API...`);

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail
          },
          to: [
            {
              email: to
            }
          ],
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent || htmlContent.replace(/<[^>]*>/g, "")
        })
      });

      const resultJson = await response.json();

      if (!response.ok) {
        console.error("❌ Brevo API Error:", resultJson);
        return { success: false, error: resultJson.message || "Failed to send email via Brevo" };
      }

      console.log(`✅ Notification email sent successfully! Message ID: ${resultJson.messageId}`);
      return {
        success: true,
        messageId: resultJson.messageId,
        usedEmail: "Brevo HTTP API",
      };
    }

    // Gmail SMTP Fallback
    const emailConfig = getAvailableEmailConfig();
    if (!emailConfig.email || !emailConfig.password) {
      console.error("❌ No email configuration available");
      return { success: false, error: "Email service not configured" };
    }
    console.log(
      `🔧 Using Gmail config for notification: ${emailConfig.email.replace(
        /(.{3}).*(@.*)/,
        "$1***$2"
      )}`
    );
    const transporter = createTransporter(emailConfig);

    const fromAddress = `"${emailConfig.name}" <${emailConfig.email}>`;

    const mailOptions = {
      from: fromAddress,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    console.log(`📤 Sending notification email via SMTP...`);
    const info = await transporter.sendMail(mailOptions);

    emailConfig.currentUsage++;
    currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

    console.log(`✅ Notification email sent successfully via SMTP!`);
    return {
      success: true,
      messageId: info.messageId,
      usedEmail: emailConfig.email,
    };
  } catch (error) {
    console.error("❌ Error sending notification email:", error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

// Test email connectivity
const testEmailConnectivity = async () => {
  console.log(`🧪 Testing email connectivity...`);
  const results = [];

  if (process.env.BREVO_API_KEY) {
    console.log(`🔍 Testing Brevo HTTP API key configuration`);
    try {
      const response = await fetch("https://api.brevo.com/v3/account", {
        method: "GET",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "accept": "application/json"
        }
      });
      const resultJson = await response.json();
      if (!response.ok) {
        throw new Error(resultJson.message || "Failed to fetch account info");
      }
      console.log(`✅ Brevo HTTP API: Connection/Key is valid`);
      results.push({
        type: "brevo",
        status: "success",
        message: `API Key verified. Account Email: ${resultJson.email}`,
      });
    } catch (error) {
      console.error(`❌ Brevo HTTP API: Verification failed -`, error.message);
      results.push({
        type: "brevo",
        status: "failed",
        error: error.message,
      });
    }
  } else {
    console.log(`🧪 Testing email connectivity for all Gmail configurations...`);
    for (let i = 0; i < emailConfigs.length; i++) {
      const config = emailConfigs[i];
      if (!config.email || !config.password) {
        continue;
      }
      console.log(
        `🔍 Testing email ${i + 1}: ${config.email.replace(
          /(.{3}).*(@.*)/,
          "$1***$2"
        )}`
      );

      try {
        const transporter = createTransporter(config);

        // Verify the connection
        await transporter.verify();

        console.log(`✅ Email ${i + 1}: Connection successful`);
        results.push({
          index: i + 1,
          email: config.email.replace(/(.{3}).*(@.*)/, "$1***$2"),
          status: "success",
          message: "Connection verified",
        });
      } catch (error) {
        console.error(`❌ Email ${i + 1}: Connection failed -`, error.message);
        results.push({
          index: i + 1,
          email: config.email.replace(/(.{3}).*(@.*)/, "$1***$2"),
          status: "failed",
          error: error.message,
          code: error.code,
        });
      }
    }
  }

  console.log(`🏁 Email connectivity test completed`);
  console.table(results);

  return results;
};

// Log detailed email template information
const logEmailTemplateInfo = (registrationData, events, workshops) => {
  console.log(`📋 Email Template Information:`);
  console.log(`  Registration ID: ${registrationData.registrationId}`);
  console.log(`  User Email: ${registrationData.userEmail}`);
  console.log(
    `  User Name: ${registrationData.userDetails?.name ||
    registrationData.name ||
    "Not provided"
    }`
  );
  console.log(
    `  User College: ${registrationData.userDetails?.college ||
    registrationData.college ||
    "Not provided"
    }`
  );
  console.log(
    `  User Department: ${registrationData.userDetails?.department ||
    registrationData.department ||
    "Not provided"
    }`
  );
  console.log(
    `  User WhatsApp: ${registrationData.userDetails?.whatsapp ||
    registrationData.whatsapp ||
    "Not provided"
    }`
  );
  console.log(
    `  Is CIT Student: ${registrationData.userEmail?.endsWith(
      "@citchennai.net"
    )}`
  );
  console.log(
    `  Payment Amount: ₹${registrationData.paymentDetails?.amount || 0}`
  );
  console.log(
    `  Payment ID: ${registrationData.paymentDetails?.paymentId || "N/A"}`
  );
  console.log(`  Selected Pass: ${registrationData.selectedPass || "None"}`);
  console.log(
    `  Selected Events: ${registrationData.selectedEvents?.length || 0} events`
  );
  console.log(
    `  Selected Workshops: ${registrationData.selectedWorkshops?.length || 0
    } workshops`
  );
  console.log(
    `  Selected Non-Tech Events: ${registrationData.selectedNonTechEvents?.length || 0
    } events`
  );

  if (events?.length > 0) {
    console.log(`  Available Events: ${events.length}`);
    events.forEach((event) => {
      console.log(`    - ${event.title} (ID: ${event.id})`);
    });
  }

  if (workshops?.length > 0) {
    console.log(`  Available Workshops: ${workshops.length}`);
    workshops.forEach((workshop) => {
      console.log(`    - ${workshop.title} (ID: ${workshop.id})`);
    });
  }
};

// Send OD letter email with PDF attachment
const sendODLetterWithAttachment = async (to, subject, htmlContent, textContent, attachment) => {
  console.log(`📨 Starting OD letter email with attachment process`);
  console.log(`📧 Recipient: ${to}`);
  console.log(`📎 Attachment: ${attachment.filename}`);

  try {
    if (resend) {
      const fromAddress = process.env.EMAIL_FROM || "Tech Fiesta Team <onboarding@resend.dev>";
      console.log(`📤 Sending OD letter email with PDF attachment via Resend HTTP API...`);

      // Normalize attachment content to Buffer for Resend
      const attachmentContent = Buffer.isBuffer(attachment.content)
        ? attachment.content
        : Buffer.from(attachment.content);

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent,
        attachments: [
          {
            filename: attachment.filename,
            content: attachmentContent,
          },
        ],
      });

      if (error) {
        console.error("❌ Resend API Error:", error);
        return { success: false, error: error.message || String(error) };
      }

      console.log(`✅ OD letter email with PDF sent successfully! Message ID: ${data.id}`);
      return {
        success: true,
        messageId: data.id,
        usedEmail: "Resend HTTP API",
      };
    }

    // Gmail SMTP Fallback
    const emailConfig = getAvailableEmailConfig();
    if (!emailConfig.email || !emailConfig.password) {
      console.error("❌ No email configuration available");
      return { success: false, error: "Email service not configured" };
    }
    console.log(
      `🔧 Using Gmail config for OD: ${emailConfig.email.replace(
        /(.{3}).*(@.*)/,
        "$1***$2"
      )}`
    );
    const transporter = createTransporter(emailConfig);

    const fromAddress = `"${emailConfig.name}" <${emailConfig.email}>`;

    const mailOptions = {
      from: fromAddress,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        },
      ],
    };

    console.log(`📤 Sending OD letter email with PDF attachment...`);
    const info = await transporter.sendMail(mailOptions);

    emailConfig.currentUsage++;
    currentEmailIndex = (currentEmailIndex + 1) % emailConfigs.length;

    console.log(`✅ OD letter email with PDF sent successfully!`);
    console.log(`📧 Sent to: ${to}`);
    console.log(`🆔 Message ID: ${info.messageId}`);
    console.log(`📎 PDF attachment: ${attachment.filename} included`);

    return {
      success: true,
      messageId: info.messageId,
      usedEmail: emailConfig.email,
    };
  } catch (error) {
    console.error("❌ Error sending OD letter email with attachment:", error);
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

module.exports = {
  sendRegistrationConfirmationEmail,
  sendNotificationEmail,
  getEmailServiceStatus,
  sendODLetterWithAttachment,
  resetUsageCounters,
  testEmailConnectivity,
  logEmailTemplateInfo,
};
