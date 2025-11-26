require('dotenv').config();

const express = require('express');
const { Telegraf } = require('telegraf');
const db = require('./db');
const keyboards = require('./keyboards');

const { startCommand, helpCommand } = require('./commands/start');
const {
  myDomainsCommand,
  registerDomainStart,
  handleExtensionSelection,
  handleSubdomainInput,
  confirmRegistration,
  showDomainDetails,
  deleteDomainConfirm,
  deleteDomainExecute,
  extensionsCommand
} = require('./commands/domains');
const {
  showDnsRecords,
  showDnsRecordDetails,
  startAddCname,
  handleCnameHostInput,
  handleCnameTargetInput,
  deleteDnsRecord,
  manageDnsMenu
} = require('./commands/dns');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.BOT_PORT || 3000;

if (!BOT_TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

if (!process.env.DOMAIN_REG_API) {
  console.error('ERROR: DOMAIN_REG_API is required');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.command('start', startCommand);
bot.command('help', helpCommand);
bot.command('domains', myDomainsCommand);
bot.command('register', registerDomainStart);
bot.command('extensions', extensionsCommand);
bot.command('dns', manageDnsMenu);

bot.command('cancel', async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (user) {
    await db.clearSession(user.id, ctx.chat.id);
  }
  await ctx.reply('Operation cancelled.', keyboards.mainMenu);
});

bot.hears('🌐 Register Domain', registerDomainStart);
bot.hears('📋 My Domains', myDomainsCommand);
bot.hears('🔧 Manage DNS', manageDnsMenu);
bot.hears('📊 Extensions', extensionsCommand);
bot.hears('ℹ️ Help', helpCommand);
bot.hears('⚙️ Settings', async (ctx) => {
  await ctx.reply(
    '⚙️ *Settings*\n\nNo settings available yet.',
    { parse_mode: 'Markdown', ...keyboards.mainMenu }
  );
});

bot.hears('❌ Cancel', async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (user) {
    await db.clearSession(user.id, ctx.chat.id);
  }
  await ctx.reply('Operation cancelled.', keyboards.mainMenu);
});

bot.hears('⬅️ Back to Menu', async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (user) {
    await db.clearSession(user.id, ctx.chat.id);
  }
  await ctx.reply('Main menu:', keyboards.mainMenu);
});

bot.hears('✅ Confirm', confirmRegistration);

bot.action(/^ext:(.+)$/, async (ctx) => {
  const extension = ctx.match[1];
  await handleExtensionSelection(ctx, extension);
});

bot.action(/^ext_page:(\d+)$/, async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const session = await db.getSession(user.id, ctx.chat.id);
  if (!session || !session.state_data.extensions) return;
  
  const page = parseInt(ctx.match[1]);
  await ctx.editMessageReplyMarkup(
    keyboards.extensionsKeyboard(session.state_data.extensions, page).reply_markup
  );
});

bot.action(/^domain:(.+)$/, async (ctx) => {
  const domain = ctx.match[1];
  await showDomainDetails(ctx, domain);
});

bot.action('my_domains', async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const domains = await db.getUserDomains(user.id);
  
  if (domains.length === 0) {
    return ctx.editMessageText('You haven\'t registered any domains yet.');
  }
  
  const domainList = domains.map((d, i) => `${i + 1}. \`${d.domain}\``).join('\n');
  
  await ctx.editMessageText(
    `📋 *Your Domains*\n\n${domainList}\n\nSelect a domain to manage:`,
    { parse_mode: 'Markdown', ...keyboards.domainListKeyboard(domains) }
  );
});

bot.action(/^dns:(.+)$/, async (ctx) => {
  const domain = ctx.match[1];
  await showDnsRecords(ctx, domain);
});

bot.action(/^dns_record:(.+):(\d+)$/, async (ctx) => {
  const domain = ctx.match[1];
  const recordIndex = parseInt(ctx.match[2]);
  await showDnsRecordDetails(ctx, domain, recordIndex);
});

bot.action(/^add_cname:(.+)$/, async (ctx) => {
  const domain = ctx.match[1];
  await startAddCname(ctx, domain);
});

bot.action(/^delete_domain:(.+)$/, async (ctx) => {
  const domain = ctx.match[1];
  await deleteDomainConfirm(ctx, domain);
});

bot.action(/^confirm_delete:domain:(.+)$/, async (ctx) => {
  const domain = ctx.match[1];
  await deleteDomainExecute(ctx, domain);
});

bot.action(/^delete_dns:(.+)$/, async (ctx) => {
  const deleteId = ctx.match[1];
  await deleteDnsRecord(ctx, deleteId);
});

bot.action('back_to_menu', async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (user) {
    await db.clearSession(user.id, ctx.chat.id);
  }
  await ctx.editMessageText('Returning to main menu...');
  await ctx.reply('Main menu:', keyboards.mainMenu);
});

bot.action('cancel', async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (user) {
    await db.clearSession(user.id, ctx.chat.id);
  }
  await ctx.editMessageText('Operation cancelled.');
  await ctx.reply('Main menu:', keyboards.mainMenu);
});

bot.on('text', async (ctx) => {
  const user = await db.getUser(ctx.from.id);
  if (!user) {
    return ctx.reply('Please use /start first to register.', keyboards.mainMenu);
  }
  
  const session = await db.getSession(user.id, ctx.chat.id);
  if (!session) return;
  
  const text = ctx.message.text;
  
  if (session.state === 'entering_subdomain') {
    await handleSubdomainInput(ctx, text);
  } else if (session.state === 'adding_cname_host') {
    await handleCnameHostInput(ctx, text);
  } else if (session.state === 'adding_cname_target') {
    await handleCnameTargetInput(ctx, text);
  }
});

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('An error occurred. Please try again or use /start.').catch(console.error);
});

async function startBot() {
  try {
    console.log('Initializing database...');
    await db.initDatabase();
    console.log('Database initialized');
    
    const app = express();
    app.use(express.json());
    
    app.get('/', (req, res) => {
      res.json({ status: 'ok', message: 'InfinityFree Domain Bot is running' });
    });
    
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
    
    if (WEBHOOK_URL) {
      const webhookPath = `/bot${BOT_TOKEN}`;
      
      app.use(bot.webhookCallback(webhookPath));
      
      app.listen(PORT, '0.0.0.0', async () => {
        console.log(`Webhook server running on port ${PORT}`);
        
        const fullWebhookUrl = `${WEBHOOK_URL}${webhookPath}`;
        await bot.telegram.setWebhook(fullWebhookUrl);
        console.log(`Webhook set to: ${fullWebhookUrl}`);
        
        const botInfo = await bot.telegram.getMe();
        console.log(`Bot started: @${botInfo.username}`);
      });
    } else {
      console.log('No WEBHOOK_URL set, starting in polling mode...');
      
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Health check server running on port ${PORT}`);
      });
      
      await bot.launch();
      const botInfo = await bot.telegram.getMe();
      console.log(`Bot started in polling mode: @${botInfo.username}`);
    }
    
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

startBot();
