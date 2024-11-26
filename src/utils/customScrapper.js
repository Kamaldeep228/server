import axios from 'axios';
import * as cheerio from 'cheerio';

async function customscrapeJobs(url, newcookies) {
  let cookieString = '';

  try {
    // Parse the cookies if provided
    const parsedCookies = JSON.parse(newcookies);

    // Check if parsedCookies is an array or an object
    if (Array.isArray(parsedCookies)) {
      // If it's an array, assume each object has a 'name' and 'value'
      cookieString = parsedCookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
    } else if (typeof parsedCookies === 'object') {
      // If it's an object, convert it directly
      cookieString = Object.entries(parsedCookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    }
  } catch (error) {/* 
    console.error('Failed to parse cookies:', error); */
    return; 
  }

  console.log(cookieString)

  try {
    // Make the HTTP request to the URL
    const {data} = await axios.get("https://www.helloworld.org/",{
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.upwork.com/',
    },
    });

    console.log(data)

    // Load the HTML into cheerio for parsing
    const $ = cheerio.load(data);

    // Scrape the job name
    const jobname = $('section.air3-card-section h4 span').text().trim();

    // Scrape the expertise
    const expertise = $('section.air3-card-section div.break.mt-2 p').text().trim();

    // Scrape the skills
    const skills = [];
    $('section.air3-card-section span[data-test="Skill"] span[slot="reference"] a').each((index, element) => {
      skills.push($(element).text().trim());
    });

    return { jobname, expertise, skills };
  } catch (error) {/* 
    console.error('Error scraping job:', error); */
    return { error: 'Failed to scrape job. Please check the URL and try again.' };
  }
}

export default customscrapeJobs;
