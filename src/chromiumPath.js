const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

function findChromiumPath() {
  if (process.env.CHROMIUM_PATH) {
    console.log(`Using CHROMIUM_PATH from environment: ${process.env.CHROMIUM_PATH}`);
    return process.env.CHROMIUM_PATH;
  }
  
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(`Using PUPPETEER_EXECUTABLE_PATH from environment: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  if (isWindows) {
    const windowsPaths = [
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Chromium', 'Application', 'chrome.exe'),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ].filter(Boolean);
    
    for (const chromiumPath of windowsPaths) {
      if (fs.existsSync(chromiumPath)) {
        console.log(`Found Chromium/Chrome/Edge on Windows: ${chromiumPath}`);
        return chromiumPath;
      }
    }
    
    try {
      const whereResult = execSync('where chrome.exe 2>nul || where chromium.exe 2>nul || where msedge.exe 2>nul', {
        encoding: 'utf8',
        timeout: 5000
      }).trim().split('\n')[0];
      
      if (whereResult && fs.existsSync(whereResult)) {
        console.log(`Found browser via where command: ${whereResult}`);
        return whereResult;
      }
    } catch (error) {
    }
  }
  
  const unixPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/opt/google/chrome/chrome',
  ];
  
  if (isMac) {
    unixPaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  }
  
  for (const chromiumPath of unixPaths) {
    if (fs.existsSync(chromiumPath)) {
      console.log(`Found Chromium at common path: ${chromiumPath}`);
      return chromiumPath;
    }
  }
  
  if (!isWindows) {
    try {
      const whichResult = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null', {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
      
      if (whichResult && fs.existsSync(whichResult)) {
        console.log(`Found Chromium via which command: ${whichResult}`);
        return whichResult;
      }
    } catch (error) {
    }
    
    try {
      const nixStorePaths = execSync('ls /nix/store/*chromium*/bin/chromium 2>/dev/null | head -1', {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
      
      if (nixStorePaths && fs.existsSync(nixStorePaths)) {
        console.log(`Found Chromium in Nix store: ${nixStorePaths}`);
        return nixStorePaths;
      }
    } catch (error) {
    }
  }
  
  const defaultPath = isWindows 
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/chromium-browser';
  console.log(`Using default Chromium path: ${defaultPath}`);
  return defaultPath;
}

let cachedPath = null;

function getChromiumPath() {
  if (!cachedPath) {
    cachedPath = findChromiumPath();
  }
  return cachedPath;
}

function validateChromiumPath() {
  const chromiumPath = getChromiumPath();
  if (!fs.existsSync(chromiumPath)) {
    console.warn(`Warning: Browser not found at ${chromiumPath}`);
    console.warn('Please install Chrome, Chromium, or Edge, or set CHROMIUM_PATH environment variable');
    return { valid: false, path: chromiumPath };
  }
  console.log(`Browser executable validated: ${chromiumPath}`);
  return { valid: true, path: chromiumPath };
}

module.exports = {
  getChromiumPath,
  findChromiumPath,
  validateChromiumPath
};
