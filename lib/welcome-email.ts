/**
 * Welcome Email Utility
 *
 * Sends welcome emails to new users after onboarding.
 * Gracefully handles missing SMTP configuration.
 */

interface WelcomeEmailOptions {
  familyName: string;
  adminName: string;
  adminEmail: string;
  enabledModules: string[];
  sampleDataGenerated: boolean;
}

/**
 * Send welcome email to the admin user after successful onboarding
 *
 * Currently logs the email content to console.
 * TODO: Integrate with SMTP service (nodemailer, SendGrid, etc.)
 */
export async function sendWelcomeEmail(options: WelcomeEmailOptions): Promise<boolean> {
  const { familyName, adminName, adminEmail, enabledModules, sampleDataGenerated } = options;

  // Check if SMTP is configured
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );

  // Email content
  const subject = `Welcome to Hearth, ${familyName}!`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px 20px;
          border-radius: 0 0 8px 8px;
        }
        .module-list {
          background: white;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
        }
        .module-list li {
          margin: 8px 0;
        }
        .cta-button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏠 Welcome to Hearth!</h1>
      </div>
      <div class="content">
        <p>Hi ${adminName},</p>

        <p>Welcome to <strong>${familyName}</strong>'s Hearth! Your family's household management system is now ready to use.</p>

        ${enabledModules.length > 0 ? `
        <h3>📦 Enabled Modules</h3>
        <div class="module-list">
          <p>You've enabled the following modules:</p>
          <ul>
            ${enabledModules.map(module => `<li>${formatModuleName(module)}</li>`).join('\n            ')}
          </ul>
        </div>
        ` : ''}

        ${sampleDataGenerated ? `
        <p>✨ <strong>Sample data has been generated</strong> to help you explore features. Feel free to edit or delete this data as you get familiar with the system.</p>
        ` : ''}

        <h3>🚀 Next Steps</h3>
        <ol>
          <li>Explore your dashboard and familiarize yourself with the interface</li>
          <li>Add family members (children, other parents) in Settings</li>
          <li>Customize your family's preferences and timezone</li>
          <li>Start creating chores, events, and other content</li>
          <li>Enable additional modules as needed in Settings → Modules</li>
        </ol>

        <div style="text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" class="cta-button">
            Go to Dashboard
          </a>
        </div>

        <h3>💡 Tips</h3>
        <ul>
          <li>Check out the Rules Engine to automate repetitive tasks</li>
          <li>Use the Communication Board to stay connected with family</li>
          <li>Set up routines for morning and bedtime checklists</li>
          <li>Plan meals in advance with the Meal Planning module</li>
        </ul>

        <p>If you have any questions or need help, check our documentation or contact support.</p>

        <p>Happy organizing!</p>
        <p><strong>The Hearth Team</strong></p>
      </div>
      <div class="footer">
        <p>This email was sent because you completed onboarding for Hearth.</p>
        <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to Hearth, ${adminName}!

Your family's household management system "${familyName}" is now ready to use.

${enabledModules.length > 0 ? `
ENABLED MODULES:
${enabledModules.map(module => `- ${formatModuleName(module)}`).join('\n')}
` : ''}

${sampleDataGenerated ? 'Sample data has been generated to help you explore features.\n' : ''}

NEXT STEPS:
1. Explore your dashboard and familiarize yourself with the interface
2. Add family members (children, other parents) in Settings
3. Customize your family's preferences and timezone
4. Start creating chores, events, and other content
5. Enable additional modules as needed in Settings → Modules

Visit your dashboard: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard

Happy organizing!
The Hearth Team
  `.trim();

  if (!smtpConfigured) {
    // SMTP not configured - just log the email content
    console.log('📧 SMTP not configured. Welcome email would have been sent:');
    console.log('---------------------------------------------------');
    console.log(`To: ${adminEmail}`);
    console.log(`Subject: ${subject}`);
    console.log('---------------------------------------------------');
    console.log(textContent);
    console.log('---------------------------------------------------');
    return false;
  }

  // TODO: Implement actual email sending with nodemailer or other SMTP service
  // Example implementation:
  /*
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Hearth <noreply@hearth.app>',
      to: adminEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ Welcome email sent to ${adminEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
  */

  console.log(`✅ Welcome email would be sent to ${adminEmail}`);
  return true;
}

/**
 * Format module ID to human-readable name
 */
function formatModuleName(moduleId: string): string {
  const moduleNames: Record<string, string> = {
    CHORES: 'Chores & Tasks',
    SCREEN_TIME: 'Screen Time Management',
    CREDITS: 'Credits & Rewards',
    SHOPPING: 'Shopping Lists',
    CALENDAR: 'Family Calendar',
    TODOS: 'To-Do Lists',
    ROUTINES: 'Routines & Checklists',
    MEAL_PLANNING: 'Meal Planning',
    RECIPES: 'Recipe Collection',
    INVENTORY: 'Inventory Tracking',
    HEALTH: 'Health & Wellness',
    PROJECTS: 'Family Projects',
    COMMUNICATION: 'Communication Board',
    TRANSPORT: 'Transportation & Carpool',
    PETS: 'Pet Care',
    MAINTENANCE: 'Home Maintenance',
    DOCUMENTS: 'Document Management',
    FINANCIAL: 'Financial Tracking',
    LEADERBOARD: 'Family Leaderboards',
    RULES_ENGINE: 'Automation & Rules',
  };

  return moduleNames[moduleId] || moduleId;
}
