import puppeteer from 'puppeteer-extra';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
import chromium  from '@sparticuz/chromium';
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
  idleTimeoutMillis: 120000, // Close unused instances after 30s
  acquireTimeoutMillis: 120000, // Timeout for acquiring browser
});

async function scrapeProfile(url,newcookies ) {
  let parsedCookies;
  try{
    parsedCookies = JSON.parse(newcookies);
  }catch (error) {
    console.error('Failed to parse cookies:', error);
    return; 
  }
  let browser;
  let page;
  try {
    // Acquire a browser from the pool
    browser = await browserPool.acquire();
    page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 }); 
  

  console.log('browser open')

/*    // Get the current cookies set on the page.
   const cookies = await page.cookies();
   
   // Merge cookies
   const updatedCookies = [...cookies, ...parsedCookies];
   
   // Set the updated cookies back to the page */
   await page.setCookie(...parsedCookies);
   console.log('setcookies')

     // Go to Upwork url
  await page.goto(url, { waitUntil: 'networkidle2' , timeout: 80000 });
  console.log('navigated to url')

  // Ensure key elements are loaded
 await page.waitForSelector('h2[itemprop="name"]', { timeout: 20000 }).catch(async() => { await browser.close(); 
  return { error: 'Failed to scrape h2[itemprop="name"]. Please check the URL and try again.'}});

  // Scrape the profile data as before
  const profile = await page.evaluate(() => {
    const name = document.querySelector('h2[itemprop="name"]')?.innerText;
    const expertise = document.querySelector('h2.mb-0.h4')?.innerText;
    const description = document.querySelector('span.text-pre-line.break')?.innerText;

    let jobSuccessScore = '';
    const scoreElements = document.querySelectorAll('span[data-v-1a549d04]');
    scoreElements.forEach(el => {
      if (el.textContent.includes('Job Success')) {
        jobSuccessScore = el.previousElementSibling?.textContent.trim();
      }
    });

    let profileName;

    const activeProfile = document.querySelector('ul.air3-list-nav li[tabindex="0"]');
    if (activeProfile) {
      // Find the span within the selected <li>
      profileName = activeProfile.querySelector('span.flex-1.mr-2x').innerText;
    }


    const stats = document.querySelectorAll('div.cfe-ui-profile-summary-stats .col-compact');

    let totalEarnings = '';
    let totalJobs = '';
    let totalHours = '';
    
    stats.forEach(stat => {
      const label = stat.querySelector('span.text-base-sm.text-light-on-inverse')?.innerText;
      const value = stat.querySelector('div.stat-amount.h5 span')?.innerText;
      
      if (label.includes('Total earnings')) {
        totalEarnings = value;
      } else if (label.includes('Total jobs')) {
        totalJobs = value;
      } else if (label.includes('Total hours')) {
        totalHours = value;
      }
    });

    const badge = document.querySelector('span.air3-badge-tagline span')?.innerText;
 
    const inProgressWork = document.querySelectorAll('#jobs_in_progress_desktop .assignments-item');
    const inProgressWorks = [];

    inProgressWork.forEach(item => {
      const title = item.querySelector('h5')?.innerText.trim() || 'No Title';
      const dateText = item.querySelector('.text-base-sm.text-stone span')?.innerText.trim() || 'No Date';
      const status = item.querySelector('.mb-0.text-light-on-inverse')?.innerText.trim() || 'No Status';

      inProgressWorks.push({ title, dateText, status });
    });

    return { name,profileName, description, expertise, jobSuccessScore,totalEarnings, totalHours, totalJobs, badge, inProgressWorks};
  });


  let completedWorkHistory = [];

  let hasNextPage = true;

  let limitClick = 0;
  

  while (hasNextPage) {
    // Scrape completed work history data
    const workHistory = await page.evaluate(() => {

  const jobs = [];
  const completedWork = document.querySelectorAll('#jobs_completed_desktop .assignments-item');

  completedWork.forEach(item => {
      const titleElement = item.querySelector('h5');
      const ratingElement = item.querySelector('.air3-rating-foreground');
      const rating = ratingElement ? ratingElement.querySelectorAll('svg').length : 0;
      const ratingCount = item.querySelector('.ml-1.text-body-sm')?.innerText;
      const dateElement = item.querySelector('.text-base-sm.text-stone');
      const feedbackElement = item.querySelector('.feedback span');

      const spanElements = item.querySelectorAll('.air3-grid-container .span-4')
      const hoursElement = spanElements[2]?.querySelector('strong');
      const FixedhoursElement = spanElements[1]?.innerText.trim();

      // Extract title, rating, date range, and feedback
      jobs.push({
          title: titleElement ? titleElement.innerText.trim() : 'No title',
          rating: rating, // Counting number of filled stars for rating
          ratingCount:ratingCount,
          dateRange: dateElement ? dateElement.innerText.trim() : 'No date range',
          feedback: feedbackElement ? feedbackElement.innerText.trim() : 'No feedback',
          hours : hoursElement && hoursElement.innerText.trim() || FixedhoursElement && FixedhoursElement || "No hours",
      });
  });

  return jobs;
})

  // Add the scraped jobs to the completedWorkHistory array
  completedWorkHistory.push(...workHistory);

    // Check if "Next" button is available and enabled
    const nextButton = await page.$('#jobs_completed_desktop .air3-pagination-next-btn');

    if(!nextButton){
      hasNextPage = false;
      limitClick = 0;
    }

    if(nextButton){
      limitClick += 1;
    const isDisabled = await nextButton.evaluate(btn => btn.disabled);

    if (!isDisabled) {
      await Promise.all([
        page.click('#jobs_completed_desktop .air3-pagination-next-btn'),
        await new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    } else {
      limitClick = 0;
      hasNextPage = false;
    }
    }

    if(limitClick === 10){
      console.log("Click Limit Reached")
      limitClick = 0;
      hasNextPage = false;
    }
  }

  return {...profile , completedWorkHistory};

} catch (error) {
  console.error('Error scraping profile:', error);
  return { error: 'Failed to scrape profile. Please check the URL and try again.' };
} finally {
  if (page) await page.close();
  if (browser) browserPool.release(browser); // Release browser back to the pool
}

}

async function scrapeSpecializedProfile(url, newcookies ) {

  let parsedCookies;
  try{
    parsedCookies = JSON.parse(newcookies);
  }catch (error) {
    console.error('Failed to parse cookies:', error);
    return; 
  }

  let browser;
  let page;

  try {
    // Acquire a browser from the pool
    browser = await browserPool.acquire();
    page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 720 }); 
    
  
    console.log('browser open')
  
  /*    // Get the current cookies set on the page.
     const cookies = await page.cookies();
     
     // Merge cookies
     const updatedCookies = [...cookies, ...parsedCookies];
     
     // Set the updated cookies back to the page */
     await page.setCookie(...parsedCookies);
     console.log('setcookies')
  
       // Go to Upwork url
    await page.goto(url, { waitUntil: 'networkidle2' , timeout: 80000 });
    console.log('navigated to url')
 
    // Ensure key elements are loaded
   await page.waitForSelector('h2[itemprop="name"]', { timeout: 20000 }).catch(async() => { await browser.close(); 
    return { error: 'Failed to scrape h2[itemprop="name"]. Please check the URL and try again.'}});

   

  // Scrape the profile data as before
  const profile = await page.evaluate(() => {
    const name = document.querySelector('h2[itemprop="name"]')?.innerText;
    const expertise = document.querySelector('h2.mb-0.h4')?.innerText;
    const description = document.querySelector('span.text-pre-line.break')?.innerText;
    let jobSuccessScore = '';
    const scoreElements = document.querySelectorAll('span[data-v-1a549d04]');
    scoreElements.forEach(el => {
      if (el.textContent.includes('Job Success')) {
        jobSuccessScore = el.previousElementSibling?.textContent.trim();
      }
    });

    let profileName;

    const activeProfile = document.querySelector('ul.air3-list-nav li[tabindex="0"]');
    if (activeProfile) {
      // Find the span within the selected <li>
      profileName = activeProfile.querySelector('span.flex-1.mr-2x').innerText;
    }

    const stats = document.querySelectorAll('div.cfe-ui-profile-summary-stats .col-compact');

    let totalEarnings = '';
    let totalJobs = '';
    let totalHours = '';
    
    stats.forEach(stat => {
      const label = stat.querySelector('span.text-base-sm.text-light-on-inverse')?.innerText;const value = stat.querySelector('div.stat-amount.h5 span')?.innerText || stat.querySelector('div.stat-amount.h5')?.innerText;
      
      if (label.includes('Earnings')) {
        totalEarnings = value;
      } else if (label.includes('Jobs')) {
        totalJobs = value;
      } else if (label.includes('Hours')) {
        totalHours = value;
      }
    });

    const badge = document.querySelector('span.air3-badge-tagline span')?.innerText;
 
    const inProgressWork = document.querySelectorAll('#jobs_in_progress_desktop .assignments-item');
    const inProgressWorks = [];

    inProgressWork.forEach(item => {
      const title = item.querySelector('h5')?.innerText.trim() || 'No Title';
      const dateText = item.querySelector('.text-base-sm.text-stone span')?.innerText.trim() || 'No Date';
      const status = item.querySelector('.mb-0.text-light-on-inverse')?.innerText.trim() || 'No Status';

      inProgressWorks.push({ title, dateText, status });
    });

    return { name, profileName, description, expertise, jobSuccessScore,totalEarnings, totalHours, totalJobs, badge, inProgressWorks};
  });


  let completedWorkHistory = [];

  let hasNextPage = true;
  
  let limitClick = 0;

  while (hasNextPage) {
    // Scrape completed work history data
    const workHistory = await page.evaluate(() => {

  const jobs = [];
  const completedWork = document.querySelectorAll('#jobs_completed_desktop .assignments-item');

  completedWork.forEach(item => {
      const titleElement = item.querySelector('h5');
      const ratingElement = item.querySelector('.air3-rating-foreground');
      const rating = ratingElement ? ratingElement.querySelectorAll('svg').length : 0;
      const ratingCount = item.querySelector('.ml-1.text-body-sm')?.innerText;
      const dateElement = item.querySelector('.text-base-sm.text-stone');
      const feedbackElement = item.querySelector('.feedback span');

      const spanElements = item.querySelectorAll('.air3-grid-container .span-4')
      const hoursElement = spanElements[2]?.querySelector('strong');
      const FixedhoursElement = spanElements[1]?.innerText.trim();

      // Extract title, rating, date range, and feedback
      jobs.push({
          title: titleElement ? titleElement.innerText.trim() : 'No title',
          rating: rating, // Counting number of filled stars for rating
          ratingCount:ratingCount,
          dateRange: dateElement ? dateElement.innerText.trim() : 'No date range',
          feedback: feedbackElement ? feedbackElement.innerText.trim() : 'No feedback',
          hours : hoursElement && hoursElement.innerText.trim() || FixedhoursElement && FixedhoursElement || "No hours",
      });
  });

  return jobs;
})

  // Add the scraped jobs to the completedWorkHistory array
  completedWorkHistory.push(...workHistory);

    // Check if "Next" button is available and enabled
    const nextButton = await page.$('#jobs_completed_desktop .air3-pagination-next-btn');

    if(!nextButton){
      hasNextPage = false;
      limitClick = 0;
    }

    if(nextButton){
      limitClick += 1;
    const isDisabled = await nextButton.evaluate(btn => btn.disabled);

    if (!isDisabled) {
      await Promise.all([
        page.click('#jobs_completed_desktop .air3-pagination-next-btn'),
        await new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    } else {
      limitClick = 0;
      hasNextPage = false;
    }
    }

    if(limitClick === 10){
      console.log("Click Limit Reached")
      limitClick = 0;
      hasNextPage = false;
    }
  }

  return {...profile , completedWorkHistory};

} catch (error) {
  console.error('Error scraping profile:', error);
  return { error: 'Failed to scrape profile. Please check the URL and try again.' };
} finally {
  if (page) await page.close();
  if (browser) browserPool.release(browser); // Release browser back to the pool
}
}

// Example usage:

export default scrapeProfile;

export {scrapeSpecializedProfile};