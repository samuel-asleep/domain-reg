const db = require('../db');
const apiClient = require('../services/apiClient');
const keyboards = require('../keyboards');

let dnsRecordsCache = {};

async function showDnsRecords(ctx, domain) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const userDomain = await db.getDomainByName(user.id, domain);
  if (!userDomain) {
    if (ctx.callbackQuery) {
      return ctx.editMessageText('❌ Domain not found or you don\'t have access to it.');
    }
    return ctx.reply('❌ Domain not found or you don\'t have access to it.', keyboards.mainMenu);
  }
  
  const loadingMsg = ctx.callbackQuery 
    ? await ctx.editMessageText('⏳ Loading DNS records...')
    : await ctx.reply('⏳ Loading DNS records...');
  
  try {
    const result = await apiClient.getDnsRecords(domain);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load DNS records');
    }
    
    const records = result.records || [];
    
    dnsRecordsCache[`${user.id}:${domain}`] = records;
    
    if (records.length === 0) {
      const msg = `📋 *DNS Records for*\n\`${domain}\`\n\nNo DNS records found.`;
      if (ctx.callbackQuery) {
        await ctx.editMessageText(msg, {
          parse_mode: 'Markdown',
          ...keyboards.domainActionsKeyboard(domain)
        });
      } else {
        await ctx.reply(msg, {
          parse_mode: 'Markdown',
          ...keyboards.domainActionsKeyboard(domain)
        });
      }
      return;
    }
    
    const recordsList = records.map((r, i) => 
      `${i + 1}. *${r.type}*: \`${r.domain}\` → \`${r.target}\``
    ).join('\n');
    
    const msg = `📋 *DNS Records for*\n\`${domain}\`\n\n${recordsList}`;
    
    if (ctx.callbackQuery) {
      await ctx.editMessageText(msg, {
        parse_mode: 'Markdown',
        ...keyboards.dnsRecordsKeyboard(domain, records)
      });
    } else {
      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        ...keyboards.dnsRecordsKeyboard(domain, records)
      });
    }
  } catch (error) {
    console.error('Error loading DNS records:', error);
    const errorMsg = `❌ Error loading DNS records: ${error.message}`;
    if (ctx.callbackQuery) {
      await ctx.editMessageText(errorMsg);
    } else {
      await ctx.reply(errorMsg, keyboards.mainMenu);
    }
  }
}

async function showDnsRecordDetails(ctx, domain, recordIndex) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const cacheKey = `${user.id}:${domain}`;
  const records = dnsRecordsCache[cacheKey];
  
  if (!records || !records[recordIndex]) {
    return ctx.editMessageText('❌ Record not found. Please reload DNS records.');
  }
  
  const record = records[recordIndex];
  
  const msg = `📝 *DNS Record Details*\n\nType: \`${record.type}\`\nName: \`${record.domain}\`\nTarget: \`${record.target}\``;
  
  await ctx.editMessageText(msg, {
    parse_mode: 'Markdown',
    ...keyboards.dnsRecordActionsKeyboard(domain, record.deleteId)
  });
}

async function startAddCname(ctx, domain) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  const userDomain = await db.getDomainByName(user.id, domain);
  if (!userDomain) {
    return ctx.editMessageText('❌ Domain not found or you don\'t have access to it.');
  }
  
  await db.setSession(user.id, ctx.chat.id, 'adding_cname_host', {
    domain: domain
  });
  
  if (ctx.callbackQuery) {
    await ctx.editMessageText(
      `➕ *Add CNAME Record*\n\nDomain: \`${domain}\`\n\nEnter the host/subdomain name:\n(e.g., "www" or "api")`,
      { parse_mode: 'Markdown' }
    );
  }
  
  await ctx.reply('Enter CNAME host:', keyboards.cancelMenu);
}

async function handleCnameHostInput(ctx, host) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return false;
  
  const session = await db.getSession(user.id, ctx.chat.id);
  if (!session || session.state !== 'adding_cname_host') return false;
  
  const cleanHost = host.toLowerCase().trim();
  
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(cleanHost) && cleanHost !== '@') {
    await ctx.reply('❌ Invalid host name. Use only letters, numbers, and hyphens. Try again:', keyboards.cancelMenu);
    return true;
  }
  
  await db.setSession(user.id, ctx.chat.id, 'adding_cname_target', {
    domain: session.state_data.domain,
    host: cleanHost
  });
  
  await ctx.reply(
    `Host: \`${cleanHost}\`\n\nNow enter the target (where it should point):\n(e.g., "example.com" or "myapp.herokuapp.com")`,
    { parse_mode: 'Markdown', ...keyboards.cancelMenu }
  );
  
  return true;
}

async function handleCnameTargetInput(ctx, target) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return false;
  
  const session = await db.getSession(user.id, ctx.chat.id);
  if (!session || session.state !== 'adding_cname_target') return false;
  
  const cleanTarget = target.toLowerCase().trim();
  
  if (!/^[a-z0-9]([a-z0-9-.]*[a-z0-9])?$/.test(cleanTarget)) {
    await ctx.reply('❌ Invalid target. Enter a valid domain name. Try again:', keyboards.cancelMenu);
    return true;
  }
  
  const { domain, host } = session.state_data;
  
  await ctx.reply('⏳ Creating CNAME record...');
  
  try {
    const result = await apiClient.createCnameRecord(domain, host, cleanTarget);
    
    if (result.success) {
      await db.clearSession(user.id, ctx.chat.id);
      await ctx.reply(
        `✅ *CNAME Record Created!*\n\n\`${host}.${domain}\` → \`${cleanTarget}\``,
        { parse_mode: 'Markdown', ...keyboards.mainMenu }
      );
    } else {
      throw new Error(result.message || 'Failed to create record');
    }
  } catch (error) {
    console.error('CNAME creation error:', error);
    await db.clearSession(user.id, ctx.chat.id);
    await ctx.reply(
      `❌ *Failed to Create CNAME*\n\n${error.message}`,
      { parse_mode: 'Markdown', ...keyboards.mainMenu }
    );
  }
  
  return true;
}

async function deleteDnsRecord(ctx, deleteId) {
  const user = await db.getUser(ctx.from.id);
  if (!user) return;
  
  await ctx.editMessageText('⏳ Deleting DNS record...');
  
  try {
    const result = await apiClient.deleteDnsRecord(deleteId);
    
    if (result.success) {
      await ctx.editMessageText(
        '✅ *DNS Record Deleted*\n\nThe record has been successfully removed.',
        { parse_mode: 'Markdown' }
      );
      await ctx.reply('Returning to menu...', keyboards.mainMenu);
    } else {
      throw new Error(result.message || 'Failed to delete record');
    }
  } catch (error) {
    console.error('DNS delete error:', error);
    await ctx.editMessageText(
      `❌ *Deletion Failed*\n\n${error.message}`,
      { parse_mode: 'Markdown' }
    );
  }
}

async function manageDnsMenu(ctx) {
  const user = await db.getUser(ctx.from.id);
  if (!user) {
    return ctx.reply('Please use /start first to register.');
  }
  
  const domains = await db.getUserDomains(user.id);
  
  if (domains.length === 0) {
    return ctx.reply(
      '🔧 *Manage DNS*\n\nYou need to register a domain first before managing DNS records.',
      { parse_mode: 'Markdown', ...keyboards.mainMenu }
    );
  }
  
  await ctx.reply(
    '🔧 *Manage DNS*\n\nSelect a domain to manage its DNS records:',
    { parse_mode: 'Markdown', ...keyboards.domainListKeyboard(domains) }
  );
}

module.exports = {
  showDnsRecords,
  showDnsRecordDetails,
  startAddCname,
  handleCnameHostInput,
  handleCnameTargetInput,
  deleteDnsRecord,
  manageDnsMenu
};
