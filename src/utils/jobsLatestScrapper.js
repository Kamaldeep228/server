import { WebSocketServer } from "ws";
import puppeteer from "puppeteer-extra";
import pluginStealth from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";
import { app } from "../app.js";
import http from 'http';

// Create the HTTP server
const server = http.createServer(app);

puppeteer.use(pluginStealth());

const wss = new WebSocketServer({
  server, // Attach the WebSocket server to the HTTP server
  perMessageDeflate: false, // Optional WebSocket compression settings
});


function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}


wss.on("connection", async (ws) => {
  console.log("Client connected.");

  let page; // Declare page variable in the outer scope to reuse
  const lastJobs = []; // Store last two jobs to compare against
  let pageLoadedFirstTime = true; // Initially set to true
  let url = "https://www.upwork.com/nx/search/jobs/?per_page=10&sort=recency"; // Default URL

  const browser = await puppeteer.launch({
    args: [...chromium.args,  '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ],
   executablePath: await chromium.executablePath(),
   headless: true,
   ignoreHTTPSErrors: true
  });

  const openPage = async () => {
    if (page) {
      // If a page already exists, close it before opening a new one
      await page.close();
    }
    page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 720 });
    
    await delay(1000) 

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    console.log("Page loaded for the first time.");
  };

  // Listen for messages from the client
  ws.on("message", async (message) => {
    console.log("Received message from client:", message.toString());
    url = message.toString(); // Update the URL with the received message
    console.log("Updated URL:", url); // Log the new URL

    // Reopen the page with the new URL
    await openPage();
    // Set pageLoadedFirstTime to true to limit job scraping after URL change
    pageLoadedFirstTime = true;

    // Perform a scrape after loading the new page
    sendJobsToClient();
  });

  // Define the function to scrape and send jobs to connected clients
  const sendJobsToClient = async () => {
    try {
      if (!page) {
        // Open page if it doesn't exist (first connection)
        await openPage();
      } else {
        // Reload page to get fresh job listings
        await page.reload({ waitUntil: "domcontentloaded" });
        console.log("Page reloaded.");
      }

      await page
        .waitForSelector('section[data-test="JobsList"]', { timeout: 60000 })
        .catch(() => {
          throw new Error("Failed to find job list section");
        });

      // Scrape the jobs (reusing your scraping logic)
      const jobs = await page.evaluate((pageLoadedFirstTime) => {
        const jobElements = document.querySelectorAll(
          'section[data-test="JobsList"] article[data-test="JobTile"]'
        );
        const jobsData = [];

        // Function to convert relative time string to seconds
        const convertPostedTimeToSeconds = (postedTime) => {
          const now = Math.floor(Date.now() / 1000); // Current time in seconds

          const timeParts = postedTime.split(" ");
          const value = parseInt(timeParts[0]);
          const unit = timeParts[1].toLowerCase();

          let secondsAgo = 0;
          if (unit.includes("second")) {
            secondsAgo = value;
          } else if (unit.includes("minute")) {
            secondsAgo = value * 60;
          } else if (unit.includes("hour")) {
            secondsAgo = value * 3600;
          } else if (unit.includes("day")) {
            secondsAgo = value * 86400;
          } else if (unit.includes("week")) {
            secondsAgo = value * 604800;
          } else if (unit.includes("month")) {
            secondsAgo = value * 2592000;
          } else if (unit.includes("year")) {
            secondsAgo = value * 31536000;
          }

          return now - secondsAgo; // Returns the exact timestamp of the job post
        };

        jobElements.forEach((jobElement, index) => {
          const limit = pageLoadedFirstTime ? 10 : 2;
          if (index < limit) {
            // Limit to top 2 jobs
            const jobTitleElement = jobElement.querySelector(
              "h2.job-tile-title a"
            );
            const jobTitle =
              jobTitleElement?.innerText.trim() || "No title available";
            const jobUrl =
              jobTitleElement?.getAttribute("href") || "No URL available";
            const jobType =
              jobElement
                .querySelector('li[data-test="job-type-label"] strong')
                ?.innerText.trim() || "No job type available";
            const experienceLevel =
              jobElement
                .querySelector('li[data-test="experience-level"] strong')
                ?.innerText.trim() || "No experience level available";
            const budget =
              jobElement
                .querySelector(
                  'li[data-test="is-fixed-price"] strong:nth-child(2)'
                )
                ?.innerText.trim() || "No budget available";
            const description =
              jobElement.querySelector("p.text-body-sm")?.innerText.trim() ||
              "No description available";
            const skillElements = jobElement.querySelectorAll(
              'div[data-test="TokenClamp JobAttrs"] button span'
            );
            const skills = Array.from(skillElements).map((skill) =>
              skill?.innerText.trim()
            );
            const postedTimeText =
              jobElement
                .querySelector(
                  'small[data-test="job-pubilshed-date"] span:nth-child(2)'
                )
                ?.innerText.trim() || "No posted time available";
            // Convert the posted time to a timestamp
            const postedTime = convertPostedTimeToSeconds(postedTimeText);

            jobsData.push({
              jobTitle,
              jobUrl,
              jobType,
              experienceLevel,
              budget,
              description,
              skills,
              postedTime,
            });
          }
        });

        return jobsData;
      }, pageLoadedFirstTime);

      // Set pageLoadedFirstTime to false after the first load
      pageLoadedFirstTime = false;

      // Compare the latest job with the last two jobs
      if (jobs.length > 0) {
        const latestJob = jobs[0];

        // Check if the latest job matches either of the last two jobs
        const isMatch = lastJobs.some((lastJob) => {
          return lastJob.jobTitle === latestJob.jobTitle;
        });

        // If it does not match, send the new job data to the client
        if (!isMatch) {
          // Store the latest job and update lastJobs array
          lastJobs.push(latestJob);
          if (lastJobs.length > 2) {
            lastJobs.shift(); // Keep only the last two jobs
          }
          // Send the new job data to the client
          ws.send(JSON.stringify(jobs));
        } else {
          ws.send("No new jobs to send; latest job matches the last two jobs.");
          console.log(
            "No new jobs to send; latest job matches the last two jobs."
          );
        }
      }
    } catch (error) {
      console.error("Error scraping jobs:", error);
    }
  };

  // Send job data immediately and then every 10 seconds
  sendJobsToClient(); // Initial scrape
  const intervalId = setInterval(sendJobsToClient, 30000);

  // Clean up when client disconnects
  ws.on("close", () => {
    console.log("Client disconnected.");
    clearInterval(intervalId);
    if (page) {
      browser.close(); // Ensure the page is closed on WebSocket disconnect
    }
  });
});

console.log("WebSocket server is running on ws://localhost:8080");


export {server}