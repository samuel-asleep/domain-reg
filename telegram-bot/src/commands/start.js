const db = require('../db');
const keyboards = require('../keyboards');

async function startCommand(ctx) {
  const telegramUser = ctx.from;
  
  const user = await db.createUser(
    telegramUser.id,
    telegramUser.username,
    telegramUser.first_name,
    telegramUser.last_name
  );
  
  await db.clearSession(user.id, ctx.chat.id);
  
  const welcomeMessage = `
🌐 *Welcome to InfinityFree Domain Bot!*

Hello ${telegramUser.first_name || 'there'}! I can help you:

• 🌐 Register free domains
• 📋 View your registered domains
• 🔧 Manage DNS records
• 📊 See available domain extensions

Use the menu below to get started!
  `.trim();
  
  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...keyboards.mainMenu
  });
}

async function helpCommand(ctx) {
  const helpMessage = `
📖 *InfinityFree Domain Bot Help*

*Available Commands:*
/start - Start the bot and see main menu
/help - Show this help message
/domains - View your registered domains
/register - Register a new domain
/extensions - View available domain extensions
/cancel - Cancel current operation

*Features:*
• Register free InfinityFree subdomains
• View and manage your domains
• Add/remove DNS records (CNAME)
• All domains are linked to your Telegram account

*How to Register a Domain:*
1. Tap "🌐 Register Domain"
2. Choose a domain extension
3. Enter your desired subdomain name
4. Confirm registration

*DNS Management:*
1. Go to "📋 My Domains"
2. Select a domain
3. View or add DNS records

Need help? Contact @your_support_username
  `.trim();
  
  await ctx.reply(helpMessage, {
    parse_mode: 'Markdown',
    ...keyboards.mainMenu
  });
}

module.exports = {
  startCommand,
  helpCommand
};
