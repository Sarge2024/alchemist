import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (response.url().includes('/api/library')) {
      console.log('API RESPONSE STATUS:', response.status());
      response.text().then(text => console.log('API RESPONSE BODY:', text)).catch(() => {});
    }
  });
  
  await page.goto('http://localhost:4005/acervo', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
