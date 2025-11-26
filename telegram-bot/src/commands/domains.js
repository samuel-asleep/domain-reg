const db = require('../db');
const apiClient = require('../services/apiClient');
const keyboards = require('../keyboards');

async function myDomainsCommand(ctx) {
  const user = await db.getUser(ctx.from.id);
  if (!user) {
    return ctx.reply('Please use /start first to register.');
  }
  
  const domains = await db.getUserDomains(user.id);
  
  if (domains.length === 0) {
    return ctx.reply(
      '📋 *Your Domains*\n\nYou haven\'t registered any domains yet.\n\nTap "🌐 Register Domain" to get started!',
      { parse_mode: 'Markdown', ...keyboards.mainMenu }
    );
  }
  
  const domainList = domains.map((d, i) => `${i + 1}. \`${d.domain}\``).join('\n');
  
  await ctx.reply(
    `📋 *Your Domains*\n\n${domainList}\n\nSelect a domain to manage:`,
    { parse_mode: 'Markdown', ...keyboards.domainListKeyboard(domains) }
  );
}

async function registerDomainStart(ctx) {
  const user = await db.getUser(ctx.from.id);
  if (!user) {
    return ctx.reply('Please use /start first to register.');
  }
  
  await ctx.reply('⏳ Loading available domain extensions...');
  
  try {
    const result = await apiClient.getSubdomainExtensions();
    
    if (!result.success || !result.extensions || result.extensions.length === 0) {
      return ctx.reply(
        '❌ No domain extensions available at the moment. Please try again later.',
        keyboards.mainMenu
      );
    }
    
    await db.setSession(user.id, ctx.chat.id, 'selecting_extension', {
      extensions: result.extensions
    });
    
    await ctx.reply(
      '🌐 *Register New Domain*\n\nSelect a domain extension:',
      { parse_mode: 'Markdown', ...keyboards.extensionsKeyboard(result.extensions) }
    );
  } catch (error) {
    console.error('Error fetching extensions:', error);
    await ctx.reply(
      `❌ Error: ${error.message}\n\nPlease try again later.`,
      keyboards.mainMenu
    );
  }
}

async function handleExtensionSelection(ctx, extension) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  await db.setSession(user.id, ctx.chat.id, 'entering_subdomain', {
    extension: extension
  });
  
  await ctx.editMessageText(
    `🌐 *Register Domain*\n\nSelected extension: \`${extension}\`\n\nNow enter your desired subdomain name:\n(e.g., "mysite" for mysite.${extension})`,
    { parse_mode: 'Markdown' }
  );
  
  await ctx.reply('Enter subdomain name:', keyboards.cancelMenu);
}

async function handleSubdomainInput(ctx, subdomain) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const session = await db.getSession(user.id, ctx.chat.id);
  if (!session || session.state !== 'entering_subdomain') return false;
  
  const stateData = session.state_data;
  const extension = stateData.extension;
  
  const cleanSubdomain = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  
  if (cleanSubdomain.length < 3) {
    await ctx.reply('❌ Subdomain must be at least 3 characters. Try again:', keyboards.cancelMenu);
    return true;
  }
  
  if (cleanSubdomain.length > 63) {
    await ctx.reply('❌ Subdomain is too long. Maximum 63 characters. Try again:', keyboards.cancelMenu);
    return true;
  }
  
  const fullDomain = `${cleanSubdomain}.${extension}`;
  
  await db.setSession(user.id, ctx.chat.id, 'confirming_registration', {
    extension: extension,
    subdomain: cleanSubdomain,
    fullDomain: fullDomain
  });
  
  await ctx.reply(
    `📝 *Confirm Registration*\n\nDomain: \`${fullDomain}\`\n\nDo you want to register this domain?`,
    { parse_mode: 'Markdown', ...keyboards.confirmMenu }
  );
  
  return true;
}

async function confirmRegistration(ctx) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const session = await db.getSession(user.id, ctx.chat.id);
  if (!session || session.state !== 'confirming_registration') {
    return ctx.reply('No pending registration. Use /register to start.', keyboards.mainMenu);
  }
  
  const { subdomain, extension, fullDomain } = session.state_data;
  
  await ctx.reply('⏳ Registering domain... This may take a moment.');
  
  try {
    const result = await apiClient.registerDomain(subdomain, extension);
    
    if (result.success) {
      await db.addDomain(user.id, fullDomain, subdomain, extension);
      await db.clearSession(user.id, ctx.chat.id);
      
      await ctx.reply(
        `✅ *Domain Registered Successfully!*\n\nDomain: \`${fullDomain}\`\n\n${result.message || 'Your domain is now active!'}`,
        { parse_mode: 'Markdown', ...keyboards.mainMenu }
      );
    } else {
      throw new Error(result.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    await db.clearSession(user.id, ctx.chat.id);
    await ctx.reply(
      `❌ *Registration Failed*\n\n${error.message}`,
      { parse_mode: 'Markdown', ...keyboards.mainMenu }
    );
  }
}

async function showDomainDetails(ctx, domain) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const userDomain = await db.getDomainByName(user.id, domain);
  if (!userDomain) {
    return ctx.editMessageText(
      '❌ Domain not found or you don\'t have access to it.',
      keyboards.mainMenu
    );
  }
  
  await ctx.editMessageText(
    `🌐 *Domain Details*\n\nDomain: \`${domain}\`\nStatus: ${userDomain.status || 'Active'}\nRegistered: ${new Date(userDomain.created_at).toLocaleDateString()}`,
    { parse_mode: 'Markdown', ...keyboards.domainActionsKeyboard(domain) }
  );
}

async function deleteDomainConfirm(ctx, domain) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const userDomain = await db.getDomainByName(user.id, domain);
  if (!userDomain) {
    return ctx.editMessageText('❌ Domain not found or you don\'t have access to it.');
  }
  
  await ctx.editMessageText(
    `⚠️ *Delete Domain*\n\nAre you sure you want to delete:\n\`${domain}\`\n\n*This action cannot be undone!*`,
    { parse_mode: 'Markdown', ...keyboards.confirmDeleteKeyboard('domain', domain) }
  );
}

async function deleteDomainExecute(ctx, domain) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const userDomain = await db.getDomainByName(user.id, domain);
  if (!userDomain) {
    return ctx.editMessageText('❌ Domain not found or you don\'t have access to it.');
  }
  
  await ctx.editMessageText('⏳ Deleting domain...');
  
  try {
    const result = await apiClient.deleteDomain(domain);
    
    if (result.success) {
      await db.deleteDomain(user.id, domain);
      await ctx.editMessageText(
        `✅ *Domain Deleted*\n\n\`${domain}\` has been successfully deleted.`,
        { parse_mode: 'Markdown' }
      );
      await ctx.reply('Returning to menu...', keyboards.mainMenu);
    } else {
      throw new Error(result.message || 'Deletion failed');
    }
  } catch (error) {
    console.error('Delete domain error:', error);
    await ctx.editMessageText(
      `❌ *Deletion Failed*\n\n${error.message}`,
      { parse_mode: 'Markdown' }
    );
  }
}

async function extensionsCommand(ctx) {
  try {
    await ctx.reply('⏳ Loading available extensions...');
    const result = await apiClient.getSubdomainExtensions();
    
    if (!result.success || !result.extensions) {
      return ctx.reply('❌ Could not load extensions. Try again later.', keyboards.mainMenu);
    }
    
    const extList = result.extensions.slice(0, 20).map(e => `• ${e.label || e.value}`).join('\n');
    
    await ctx.reply(
      `📊 *Available Domain Extensions*\n\n${extList}\n\n${result.extensions.length > 20 ? `...and ${result.extensions.length - 20} more` : ''}`,
      { parse_mode: 'Markdown', ...keyboards.mainMenu }
    );
  } catch (error) {
    await ctx.reply(`❌ Error: ${error.message}`, keyboards.mainMenu);
  }
}

module.exports = {
  myDomainsCommand,
  registerDomainStart,
  handleExtensionSelection,
  handleSubdomainInput,
  confirmRegistration,
  showDomainDetails,
  deleteDomainConfirm,
  deleteDomainExecute,
  extensionsCommand
};
