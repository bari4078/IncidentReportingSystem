const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('frontend/index.html','utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });

dom.window.addEventListener('load', () => {
  console.log('DOM loaded');
  try {
    dom.window.checkAuth();
    console.log('checkAuth executed');
  } catch (e) {
    console.error('checkAuth error', e);
  }
  try {
    dom.window.showSection('userDashboard');
    console.log('showSection executed');
  } catch (e) {
    console.error('showSection error', e);
  }
});

// wait briefly for scripts to run
setTimeout(() => process.exit(0), 2000);
