const { Markup } = require('telegraf');

const mainMenu = Markup.keyboard([
  ['🌐 Register Domain', '📋 My Domains'],
  ['🔧 Manage DNS', '📊 Extensions'],
  ['ℹ️ Help', '⚙️ Settings']
]).resize();

const cancelMenu = Markup.keyboard([
  ['❌ Cancel']
]).resize();

const backMenu = Markup.keyboard([
  ['⬅️ Back to Menu']
]).resize();

const confirmMenu = Markup.keyboard([
  ['✅ Confirm', '❌ Cancel']
]).resize();

function domainListKeyboard(domains) {
  const buttons = domains.map(d => [Markup.button.callback(d.domain, `domain:${d.domain}`)]);
  buttons.push([Markup.button.callback('⬅️ Back', 'back_to_menu')]);
  return Markup.inlineKeyboard(buttons);
}

function extensionsKeyboard(extensions, page = 0, pageSize = 8) {
  const start = page * pageSize;
  const end = start + pageSize;
  const pageExtensions = extensions.slice(start, end);
  const totalPages = Math.ceil(extensions.length / pageSize);
  
  const buttons = pageExtensions.map(ext => [
    Markup.button.callback(ext.label || ext.value, `ext:${ext.value}`)
  ]);
  
  const navButtons = [];
  if (page > 0) {
    navButtons.push(Markup.button.callback('⬅️ Prev', `ext_page:${page - 1}`));
  }
  if (page < totalPages - 1) {
    navButtons.push(Markup.button.callback('Next ➡️', `ext_page:${page + 1}`));
  }
  if (navButtons.length > 0) {
    buttons.push(navButtons);
  }
  
  buttons.push([Markup.button.callback('❌ Cancel', 'cancel')]);
  
  return Markup.inlineKeyboard(buttons);
}

function domainActionsKeyboard(domain) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 View DNS Records', `dns:${domain}`)],
    [Markup.button.callback('➕ Add CNAME Record', `add_cname:${domain}`)],
    [Markup.button.callback('🗑️ Delete Domain', `delete_domain:${domain}`)],
    [Markup.button.callback('⬅️ Back', 'my_domains')]
  ]);
}

function dnsRecordsKeyboard(domain, records) {
  const buttons = records.map((r, i) => [
    Markup.button.callback(
      `${r.type}: ${r.domain} → ${r.target.substring(0, 20)}...`,
      `dns_record:${domain}:${i}`
    )
  ]);
  
  buttons.push([Markup.button.callback('➕ Add CNAME', `add_cname:${domain}`)]);
  buttons.push([Markup.button.callback('⬅️ Back', `domain:${domain}`)]);
  
  return Markup.inlineKeyboard(buttons);
}

function dnsRecordActionsKeyboard(domain, deleteId) {
  const buttons = [];
  if (deleteId) {
    buttons.push([Markup.button.callback('🗑️ Delete Record', `delete_dns:${deleteId}`)]);
  }
  buttons.push([Markup.button.callback('⬅️ Back', `dns:${domain}`)]);
  return Markup.inlineKeyboard(buttons);
}

function confirmDeleteKeyboard(type, identifier) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Yes, Delete', `confirm_delete:${type}:${identifier}`),
      Markup.button.callback('❌ No, Cancel', 'cancel')
    ]
  ]);
}

module.exports = {
  mainMenu,
  cancelMenu,
  backMenu,
  confirmMenu,
  domainListKeyboard,
  extensionsKeyboard,
  domainActionsKeyboard,
  dnsRecordsKeyboard,
  dnsRecordActionsKeyboard,
  confirmDeleteKeyboard
};
