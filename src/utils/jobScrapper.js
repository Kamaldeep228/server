import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
import chromium from '@sparticuz/chromium';
import { createPool } from 'generic-pool';

puppeteer.use(pluginStealth());

// Create a Puppeteer browser pool
const factory = {
  create: async () => {
    return await puppeteer.launch({
      args: [...chromium.args,  '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ],
     executablePath: await chromium.executablePath(),
     headless: true,
     ignoreHTTPSErrors: true});
  },
  destroy: async (browser) => {
    await browser.close();
  },
  validate: async (browser) => {
    // Validate if the browser instance is still alive
    try {
      const pages = await browser.pages();
      return pages.length > 0;
    } catch (error) {
      return false;
    }
  },
};

// Create a pool of browser instances
const browserPool = createPool(factory, {
  max: 2, // Maximum number of browser instances
  min: 1, // Minimum number of browser instances
  idleTimeoutMillis: 60000, // Close unused instances after 30s
  acquireTimeoutMillis: 60000, // Timeout for acquiring browser
});

async function scrapeJobs(url, newcookies) {
  let parsedCookies;

  try {
    parsedCookies = JSON.parse(newcookies);
  } catch (error) {
    console.error('Failed to parse cookies:', error);
    return { error: 'Invalid cookie format' };
  }

  let browser;
  let page;

  try {
    // Acquire a browser from the pool
    browser = await browserPool.acquire();
    page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 720 });
    await page.setRequestInterception(true);

    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Go to the URL
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('login');

/*     // Get and set cookies
    const cookies = await page.cookies();
    const updatedCookies = [...cookies, ...parsedCookies];
    console.log(updatedCookies) */
    await page.setCookie(...parsedCookies);
    console.log('set cookies');

    // Reload the page with the updated cookies
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 50000 });
    console.log('navigated to url');

    // Ensure key elements are loaded
    await page.waitForSelector('div.air3-card-sections', { timeout: 40000 }).catch(async () => {
      throw new Error('Failed to scrape key section');
    });

    // Scrape the data
    const profile = await page.evaluate(() => {
      
      const jobnameElement = document.querySelector('header.air3-card-section h4') || document.querySelector('section.air3-card-section h4 span');
      const jobname = jobnameElement ? jobnameElement.innerText.trim() : 'No job name available';

      const expertise = document.querySelector('section.air3-card-section div.break.mt-2 p')?.innerText || "No expertise available";
      const skillElements = document.querySelectorAll('section.air3-card-section[data-test="Expertise"] span[data-test="Skill"] span[slot="reference"]');
      const skills = Array.from(skillElements).map(el => el?.textContent);
      return { jobname, expertise, skills };
    });

    // Return scraped data
    return profile;
  } catch (error) {
    console.error('Error scraping job:', error);
    return { error: 'Failed to scrape job. Please check the URL and try again.' };
  } finally {
    if (page) await page.close();
    if (browser) browserPool.release(browser); // Release browser back to the pool
  }
}

export default scrapeJobs;
