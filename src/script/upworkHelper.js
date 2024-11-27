// ==UserScript==
// @name         Upwork Helper Script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Scrape JD and skills, post to API, and populate cover letter field
// @author       Kamaldeep Singh
// @match        https://www.upwork.com/nx/proposals/job/*
// @match        https://www.upwork.com/jobs/*
// @match        https://www.upwork.com/nx/search/jobs*
// @match        https://www.upwork.com/nx/proposals/*
// @match        https://www.upwork.com/nx/proposals/insights/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==
(function () {
  "use strict";



  console.log("Upwork Job Script");

  let autoGenerateProposal = GM_getValue("generateProposals", false);
  let autoRecommendProfiles = GM_getValue("profileAlerts", false);
  let openEligible = GM_getValue("eligibleOnly", false);
  let autoSubmit = GM_getValue("autoSubmit", false);
  let preview = GM_getValue("preview", false);
  let currentMode = GM_getValue("mode", "Manual");
//  let jobAlerts = GM_getValue("jobAlerts", false);
  let autoPageReload = GM_getValue("pageReload", false);
  let validateJobs = GM_getValue("validateJobs", false);
  let milestones = GM_getValue("milestones", false);
  let byProject = GM_getValue("byProject", true);

  console.log("Mode:", currentMode);

  // Style for loader animation (CSS part)
  const style = document.createElement("style");
  style.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
  document.head.appendChild(style);

  let jobName;
  let jobLink;
  let jobDescription;
  let skills = []; // Joining skills as a comma-separated string
  let rating;
  let location;
  let totalJobsPosted;
  let totalSpent;
  let memberSince;
  let reviews;
  let verifiedPayment;
  let verifiedPhone;
  let aboutClient;
  let hireRate = null;
  let openJobs = null;
  let city;
  let totalHires;
  let totalActive;
  let clientHourlyRate;
  let clientHours;
  let profileName;
  let projectType;
  let budget;
  let projectLength;
  let requiredHoursPerWeek;
  let specialization;
  let experience;
  let datePosted;
  let qualifications = {};
  let clientActivity = {};
  let currentjobID;

  //job searching
  let RefreshInterval = null;


  let isMileStoneRadio = false;

  let specializationsForFilter = [];

   // CRM SCRIPT VARIABLES
  let expense = 0;
  let sessionBoxUrl;
  let CRMProfile_Id;
  let UserCrmId = GM_getValue("userCrmId", null);
  let currentUrl = window.location.href;

  const notificationSound = new Audio(
    "https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a",
  );

  function playNotificationSound() {
    if (window.location.href.includes("/nx/search/jobs")) {
      console.log("Sound plays");
      notificationSound.play().catch((error) => {
        console.error("Error playing notification sound:", error);
      });
    }
  }

  function enableSoundAfterInteraction() {
    // Remove interaction listeners once sound can play
    document.removeEventListener("click", enableSoundAfterInteraction);
    document.removeEventListener("keypress", enableSoundAfterInteraction);
  }

  // Add event listeners to detect user interaction
  document.addEventListener("click", enableSoundAfterInteraction);
  document.addEventListener("keypress", enableSoundAfterInteraction);



window.addEventListener('load', function () {
  if (window.location.href.includes("/nx/search/jobs")) {
    handleJobAlertsOnPageLoad();
  }
});

  window.addEventListener("load", async () => {
    setTimeout(() => {
      propsalSettingPopulate();
    }, 2000);
  });

  window.addEventListener("load", function () {
    const currentPath = window.location.pathname;


    getSpecializedProfile().then((res)=>{specializationsForFilter = res?.profileSpecialization;
    console.log("specializationsForFilter",specializationsForFilter);
      if (currentPath.startsWith("/jobs/")) {
          getJobID();
        filterSpecialization();
                       }});

    // Check if the URL starts with "/jobs/"
    if (currentPath.startsWith("/jobs/")) {
     // filterProfiles(); // Call your function only for URLs starting with "/jobs/"
    }
  });


  function handleJobAlertsOnPageLoad() {


           if (window.location.href.includes("/nx/search/jobs")) {

      let searchURL = GM_getValue("searchURL", "");
      let refreshRate = GM_getValue("refreshRate", "");
      let jobAlerts = GM_getValue("jobAlerts", false);


    if (RefreshInterval) {
clearInterval(RefreshInterval);
RefreshInterval = null;
    }

         if (searchURL && refreshRate && jobAlerts && !RefreshInterval && autoPageReload && window.location.href.includes("/nx/search/jobs")) {
      console.log("Search url:", searchURL);
      console.log("Refresh rate:", refreshRate);
      console.log("Auto Job Alerts on page load ", jobAlerts);
      openAndRefreshTab(searchURL, refreshRate);
    }
        }

  }

  function getJobID(){
            currentUrl = window.location.href;

              // Regular expression to match the unique job ID (like "~021843974733681568825")
              const regex = /~([a-zA-Z0-9]+)/;

              const match = currentUrl.match(regex);

              if (match && match[0]) {
              currentjobID = match[0].replace("~",""); // Extract the full job ID like "~021843974733681568825"
  }

             console.log("currentjobID",currentjobID);
  }

  function generateProposal() {
    // Wait for Job Description element
    waitForElement(
      'div.description span[tabindex="-1"] span',
      function (jdElement) {
        jobDescription = jdElement.textContent.trim();

        const jobNameElement = document.querySelector("div.content h3");

        jobName = jobNameElement ? jobNameElement.textContent.trim() : null;

        console.log("jobName", jobName);

        const datePostedElement = document.querySelector("span[itemprop='datePosted']");

        datePosted = datePostedElement ? datePostedElement.textContent.trim() : null;

        console.log("datePosted", datePosted);

     /*   const getStoredJobValidation = getValue(jobName);

        console.log("getStoredJobValidation", getStoredJobValidation);

        if (getStoredJobValidation) {
          console.log("Stored validation:", getStoredJobValidation);
          const initialParsedData = JSON.parse(getStoredJobValidation);
          const parsedData = parseStoredvalue(initialParsedData);
          console.log("parsedData", parsedData);
          populateCoverLetterField(parsedData?.Proposal);
          populateAnswer(parsedData?.Questions);
          return;
        }
        */

        console.log("Job Description:", jobDescription);

        // Check if the "more" button exists
        const moreButton = jdElement
          .closest(".air3-truncation")
          .querySelector(".air3-truncation-btn");

        if (moreButton) {
          // Click the "more" button to expand the job description
          moreButton.click();

          // Wait for the full description to load
          setTimeout(() => {
            // Get the updated job description
            jobDescription = jdElement.textContent.trim(); // Update jobDescription after expanding
            console.log("Full Job Description:", jobDescription);
          }, 500); // Adjust the timeout as necessary to ensure the content is loaded
        } else {
          console.log("No more button found, using initial job description.");
        }

        // Now extract the job posting URL
        const jobPostingLinkElement = document.querySelector(
          'a[data-test="open-original-posting"]',
        ).href;
        if (jobPostingLinkElement) {
          const jobPostingLink = jobPostingLinkElement;
          console.log("Job Posting Link:", jobPostingLink);

          jobLink = jobPostingLink;

          // Fetch the job posting page
          fetch(jobPostingLink)
            .then((response) => response.text())
            .then((html) => {
              // Parse the HTML and extract relevant data
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");

              // Extracting additional details with null checks
              const ratingElement = doc.querySelector(
                '[data-testid="buyer-rating"] .air3-rating-value-text',
              );
              const locationElement = doc.querySelector(
                '[data-qa="client-location"] strong',
              );
              const cityElement = doc.querySelector(
                '[data-qa="client-location"] .nowrap',
              );

              const totalJobsPostedElement = doc.querySelector(
                '[data-qa="client-job-posting-stats"] strong',
              );
              const totalSpentElement = doc.querySelector(
                '[data-qa="client-spend"] span',
              );
              const memberSinceElement = doc.querySelector(
                '[data-qa="client-contract-date"] small',
              );
              const reviewsElement = doc.querySelector(
                '[data-testid="buyer-rating"] span.nowrap',
              );
const strongElements = doc.querySelectorAll("strong.text-light-on-muted.text-caption");

// Initialize default values
 verifiedPayment = "No";
 verifiedPhone = "No";

// Loop through each <strong> element to find matching text
strongElements.forEach((element) => {
     console.log(element.innerText.trim(), "element.innerText");

    if (element.innerText.trim().includes("Payment method verified")) {
        verifiedPayment = "Yes";
    }
    if (element.innerText.trim().includes("Phone number verified")) {
        verifiedPhone = "Yes";
    }
});

console.log("strongElements:", strongElements);
              const hourlyRateElement = doc.querySelector(
                '[data-qa="client-hourly-rate"]',
              );
              const clientHoursElement = doc.querySelector(
                '[data-qa="client-hours"]',
              );
              const userInfoElement = document.querySelector(
                ".nav-user-info-wrapper .nav-user-label",
              );

              // const listItem = doc.querySelector("li[data-v-1e9c74a8]");

              // Select the entire ul element
              const ulElement = doc.querySelector(
                "section[data-ev-label='contract_to_hire_tag_impression'] ul.features.list-unstyled",
              );

              // Check if ulElement exists
              if (ulElement) {
                // Select all li elements inside the ul
                const listItems = ulElement.querySelectorAll("li");

                // Iterate over each li element
                listItems.forEach((listItem) => {
                  // Extract project type
                  const typeElement = listItem.querySelector(
                    'div[data-cy="briefcase-outlined"]',
                  );

                  console.log("listItem:", listItem);

                  if (typeElement) {
                    const strongElement = typeElement.nextElementSibling;
                    if (strongElement) {
                      experience = strongElement.textContent.trim();
                    } else {
                      experience = null;
                    }
                  }

                  // Extract hourly budget range
                  const hourlyBudgetElement = listItem.querySelector(
                    'div[data-cy="clock-timelog"]',
                  );

                  if (hourlyBudgetElement) {
                    const strongElements =
                      hourlyBudgetElement.nextElementSibling.querySelectorAll(
                        "strong",
                      );
                    if (strongElements.length === 2) {
                      const minBudget = strongElements[0].textContent.trim();
                      const maxBudget = strongElements[1].textContent.trim();
                      budget = `${minBudget} - ${maxBudget} Hourly`;
                      console.log("Extracted Budget:", budget);
                    }
                  }

                  // Extract budget elements
                  const budgetElements = listItem.querySelectorAll(
                    'div[data-test="BudgetAmount"] ',
                  );

                  if (budgetElements.length >= 2) {
                    budget = `${budgetElements[0].textContent.trim()} - ${budgetElements[1].textContent.trim()} Hourly`;
                  }

                  const budgetElementsFixed = listItem.querySelector(
                    'div[data-cy="fixed-price"]',
                  );

                  if (budgetElementsFixed && budgetElements.length < 2) {
                    budget = budgetElementsFixed
                      ? budgetElementsFixed.nextElementSibling.textContent.trim()
                      : null;
                  }

                  console.log("budgetElements:", budgetElementsFixed);

                  // Extract project length
                  const lengthElement = listItem.querySelector(
                    "strong span.d-lg-none",
                  );

                  if (lengthElement) {
                    projectLength = lengthElement
                      ? lengthElement.textContent.trim()
                      : null;
                  }

                  // Extract required hours per week
                  const hoursElement = listItem.querySelector(
                    'div[data-cy="clock-hourly"]',
                  );

                  if (hoursElement) {
                    const strongElement = hoursElement.nextElementSibling;
                    if (strongElement) {
                      requiredHoursPerWeek = strongElement.textContent.trim();
                    } else {
                      requiredHoursPerWeek = null;
                    }
                  }
                });
              } else {
                console.log("No project data found.");
              }

              // Scrape the total hires and active hires
              const hiresElement = doc.querySelector(
                '[data-qa="client-hires"]',
              );
              let totalHires = null;
              let totalActive = null;

              if (hiresElement) {
                // Extract text and split to get the hires and active jobs separately
                const hiresText = hiresElement.textContent.trim();
                const matches = hiresText.match(
                  /(\d+)\s+hires,\s+(\d+)\s+active/,
                );

                if (matches) {
                  totalHires = matches[1]; // First number is total hires
                  totalActive = matches[2]; // Second number is active jobs
                }
              }

              rating = ratingElement ? ratingElement.textContent.trim() : null;
              location = locationElement
                ? locationElement.textContent.trim()
                : null;
              totalJobsPosted = totalJobsPostedElement
                ? totalJobsPostedElement.textContent
                    .trim()
                    .split(" ")[0]
                    .replace(/\n|\s+/g, "")
                : null;
              totalSpent = totalSpentElement
                ? totalSpentElement.textContent
                    .replace(/total spent|\s+/g, "")
                    .trim()
                : null;
              memberSince = memberSinceElement
                ? memberSinceElement.textContent
                    .trim()
                    .split(" ")
                    .slice(2)
                    .join(" ")
                : null;
              reviews = reviewsElement
                ? reviewsElement.textContent
                    .trim()
                    .split(" ")[2]
                    .replace(/\n|\s+/g, "")
                : null;
              city = cityElement ? cityElement.textContent.trim() : null;
              clientHourlyRate = hourlyRateElement
                ? hourlyRateElement.childNodes[0].textContent.trim()
                : null;
              clientHours = clientHoursElement
                ? clientHoursElement.textContent
                    .trim()
                    .split(" ")[0]
                    .replace(/\n|\s+/g, "")
                : null;
              profileName = userInfoElement.textContent.trim();
              // Extracting hire rate and open jobs from the client job posting stats
              let jobPostingStatsElement = doc.querySelector(
                '[data-qa="client-job-posting-stats"] div',
              );

              if (jobPostingStatsElement) {
                const jobStatsText = jobPostingStatsElement.textContent.trim();
                const statsArray = jobStatsText.split(",");
                if (statsArray.length === 2) {
                  hireRate = statsArray[0].trim().split(" ")[0]; // e.g., "0% hire rate"
                  openJobs = statsArray[1].match(/\d+/)
                    ? statsArray[1].match(/\d+/)[0]
                    : null; // Extracting number of open jobs
                }
              }

              // Wait for the Skills elements
              waitForElement(".air3-token", function () {
                const skillElements = document.querySelectorAll(".air3-token");
                let skills = [];

                skillElements.forEach((skillElement) => {
                  const skill = skillElement.textContent.trim();
                  skills.push(skill);
                });

                specialization = document
                  .querySelector(".air3-token.text-body-sm.mb-0")
                  .textContent.trim();

                console.log(
                  "Skills:",
                  skills.length > 0 ? skills : "No skills found",
                );

                const formattedJobDescription =
                  removeNonISO8859_1Characters(jobDescription); // Using cleaned job description
                const formattedSkills =
                  skills.length > 0 ? skills.join(", ") : "No skills found"; // Using cleaned skills

const projectTypeElement = doc.querySelector("ul.segmentations li strong");

let projectType;
if (projectTypeElement && projectTypeElement.textContent.includes("Project Type:")) {
    // Access the sibling <span> element, which contains the project type value
    const projectTypeValue = projectTypeElement.nextElementSibling;

    projectType = projectTypeValue ? projectTypeValue.textContent.trim() : null;
    console.log("Project Type:", projectType);
} else {
    projectType = null;
}

                // Find all labels within the questions area
                const questionElements = document.querySelectorAll(
                  ".fe-proposal-job-questions .label",
                );

                const scrapedQuestions = Array.from(questionElements).map(
                  (label) => label.textContent.trim(),
                );

                console.log("scrapedQuestions", scrapedQuestions);

                // Prepare the data for the API request
                const apiData = {
                  prompt_id: "e9617eba-6a0a-4cd1-9948-1cf7521f8fe9",
                  jd: jobDescription,
                  skills: skills.join(", "), // Joining skills as a comma-separated string
                  StarRating: rating,
                  Country: location,
                  TotalJobsPosted: totalJobsPosted,
                  TotalSpent: totalSpent,
                  MemberSince: memberSince,
                  TotalReviews: reviews,
                  IsPaymentMethodVerified: verifiedPayment,
                  IsPhoneVerified: verifiedPhone,
                  HireRate: hireRate,
                  OpenJobs: openJobs,
                  City: city,
                  TotalHires: totalHires,
                  TotalHiresActive: totalActive,
                  AvgHourlyRatePaid: clientHourlyRate,
                  TotalHours: clientHours,
                  ProfileName: profileName,
                  Specialization: specialization,
                  Budget: budget,
                  experience: experience,
                  RequiredHoursPerWeek: requiredHoursPerWeek,
                  ProjectLength: projectLength,
                  questions: JSON.stringify(scrapedQuestions),
                  ProjectType: projectType,
                  DatePosted:datePosted,
                  JobLink : jobLink
                };

                console.log("Data to be sent to API:", apiData);

                // Show loading indicator
                showLoadingIndicator("Generating Cover letter...");

                // Make the POST request to the API
                fetch("https://aiharness.io/portal/api/promptApi", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                    charset: "UTF-8",
                    "x-api-key": "MjYzYWloYXJuZXNz",
                    /*   jd: JSON.stringify(formattedJobDescription), // Include job description in headers
                        skills: formattedSkills, // Include skills in headers
                        StarRating: rating,
                        Country: location,
                        TotalJobsPosted: totalJobsPosted,
                        TotalSpent: totalSpent,
                        MemberSince: memberSince,
                        TotalReviews: reviews,
                        IsPaymentMethodVerified: verifiedPayment,
                        IsPhoneVerified: verifiedPhone,
                        HireRate: hireRate,
                        OpenJobs: openJobs,
                        City: city,
                        TotalHires: totalHires,
                        TotalHiresActive: totalActive,
                        AvgHourlyRatePaid: clientHourlyRate,
                        TotalHours: clientHours,
                        ProfileName: profileName, */
                  },
                  body: JSON.stringify(apiData),
                })
                  .then((response) => response.json())
                  .then((data) => {
                    console.log("API Response:", data);

                    if (data && data.content) {
                      const parsedData = parseStoredvalue(data);
                      populateAnswer(parsedData?.Questions);
                      populateCoverLetterField(parsedData?.Proposal);
                         if(isMileStoneRadio && milestones){
                      populateMilestones(parsedData?.Milestones)
                         }

                        if(parsedData?.Price){
                        populateProjectPrice(parsedData?.Price)
                        }


                    }
                  })
                  .catch((error) => {
                    showToastTimeout("Error! Generating Cover letter");
                    console.error("Error in API request:", error);
                  })
                  .finally(() => {
                    // Hide loading indicator after the API call is completed
                    hideLoadingIndicator();
                  });
              });
            })
            .catch((error) => {
              showToastTimeout("Error! fetching job posting page");
              console.error("Error fetching job posting page:", error);
            });
        } else {
          showToastTimeout("Error! HTML Element not found");
          console.error("Job Posting Link element not found.");
        }
      },
    );
  }

  function parseStoredvalue(responseData) {
    try {
      const sanitizedContent = responseData.content
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
     //   .replace(/\\n/g, "\n")
     //   .replace(/\r/g, "\\r");

      console.log("sanitizedContent",sanitizedContent)
      // Parse the sanitized JSON string
      const parsedContent = JSON.parse(sanitizedContent);
      return parsedContent;
    } catch (error) {
      console.error("Failed to parse API response:", error);
      const errorMark = document.createElement("span");
      return;
    }
  }

  // Function to wait for elements to appear in the DOM
  function waitForElement(selector, callback) {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval); // Stop checking once the element is found
        callback(element);
      }
    }, 500); // Check every 500ms
  }

  // Function to populate fields after navigation
  function populateFields(profile) {
    console.log("populateFields");
    // Show loading indicator
    showLoadingIndicator("Genrating Proposal settings...");
    const freelancerRadio = document.querySelector(
      'input[name="contractor-selector"][value="true"]',
    );
    const agencyRadio = document.querySelector(
      'input[name="contractor-selector"][value="425244693677371392"]',
    );

    if (freelancerRadio) {
      freelancerRadio.click();
    } else {
      console.error("Freelancer radio button not found");
    }

    hideLoadingIndicator();
    // Show loading indicator
    showLoadingIndicator("Genrating Terms...");
    const milestoneRadio = document.querySelector(
      'input[name="milestoneMode"][value="default"]',
    );

    if (milestoneRadio) {
      milestoneRadio.click();
    } else {
      console.error("Milestone radio button not found");
    }

    // Scrape the budget from the specified div
    const budgetElement = document.querySelector(
      ".clients-budget .text-light-on-inverse",
    );
    if (budgetElement) {
      // Extract the text content
      const budgetText = budgetElement.textContent;

      // Use a regular expression to find the minimum and maximum budget values
      const budgetRegex = /\$([0-9,.]+) - \$([0-9,.]+)/; // Matches "$15.00 - $45.00"
      const match = budgetText.match(budgetRegex);

      if (match) {
        // Extract the maximum price
        const maxPrice = parseFloat(match[2].replace(/,/g, "")); // Convert string to number

        // Find the hourly rate field and set the maximum price
        const hourlyRateField = document.querySelector('input[id="step-rate"]');
        if (hourlyRateField) {
          setTimeout(() => {
            hourlyRateField.value = maxPrice; // Set the maximum hourly rate
            hourlyRateField.dispatchEvent(
              new Event("input", { bubbles: true }),
            ); // Trigger input event
            console.log(`Hourly rate set to: $${maxPrice}`);
          }, 2000);
        } else {
          console.error("Hourly rate field not found");
        }
      } else {
        console.error("Budget format not recognized");
      }
    } else {
      console.error("Budget element not found");
    }
    hideLoadingIndicator();
  }

  async function propsalSettingPopulate() {
    if (window.location.href.includes("/nx/proposals/job/")) {
      await waitForFreelancerRadio().then(() => hideLoadingIndicator());
      await waitForMilestoneRadio().then(() => hideLoadingIndicator());
      await selectSpecializedProfile().then(() => hideLoadingIndicator());
      await selectRateIncreaseOption().then(() => hideLoadingIndicator());
      await waitForBudgetAndSetHourlyRate().then(() => hideLoadingIndicator());
      await selectProjectDuration().then(() => hideLoadingIndicator());

      if (autoGenerateProposal) {
        generateProposal();
      }

      submitButtonEvent();
      observeSubmitPopup();

    }
  }

async function populateMilestones(milestones) {
  for (let i = 0; i < milestones.length; i++) {
    // Click "Add milestone" if more milestones are needed
    if (i > 0) {
      const addButton = document.querySelector('button.milestone-add');
      if (addButton) {
        addButton.click();
        await new Promise((resolve) => setTimeout(resolve, 800)); // Wait for new fields
      }
    }

    // Populate fields for each milestone
    const milestone = milestones[i];
    const descriptionInput = document.querySelectorAll('input[data-test="milestone-description"]')[i];
    const dateInput = document.querySelectorAll('div[data-test="milestone-due-date"] input')[i];
    const amountInput = document.querySelectorAll('input[data-test="currency-input"]')[i];

    console.log("Populating milestone:", milestone);

    // Fill in each field
    if (descriptionInput) {
      descriptionInput.focus();
     descriptionInput.value = milestone.description;
      descriptionInput.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (dateInput) {
      dateInput.focus();
      dateInput.setAttribute('value', milestone.dueDate);
      dateInput.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (amountInput) {
      amountInput.focus();
      amountInput.value = milestone.price;
      amountInput.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Small delay to ensure inputs are registered in the UI
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Double-check that all values are set correctly
  const descriptions = Array.from(document.querySelectorAll('input[data-test="milestone-description"]')).map(input => input.value);
  console.log("Final milestone descriptions:", descriptions);
  console.log("Milestones populated successfully");
}

async function populateProjectPrice(maxPrice) {

    const hourlyRateField = document.querySelector(
              'input[id="step-rate"]',
            );

            if (hourlyRateField) {
              hourlyRateField.value = maxPrice;
              hourlyRateField.dispatchEvent(
                new Event("input", { bubbles: true }),
              );
              console.log(`Hourly rate set to: $${maxPrice}`);
            } else {
              console.error("Hourly rate field not found");
            }
}

  async function waitForFreelancerRadio(retries = 5) {
    showLoadingIndicator("Populating Proposal Settings...");
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const freelancerRadio = document.querySelector(
          'input[name="contractor-selector"][value="true"]',
        );
        if (freelancerRadio) {
          freelancerRadio.click();
          console.log("Freelancer radio button clicked");
          clearInterval(interval);
          resolve();
        } else if (attempts >= retries) {
          console.error(
            "Freelancer radio button not found after maximum retries",
          );
          clearInterval(interval);
          resolve(); // Resolve to move on even if element not found
        }
        attempts++;
      }, 500);
    });
  }

  async function waitForMilestoneRadio(retries = 5) {
      milestones = GM_getValue("milestones", false)
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const milestoneRadio = document.querySelector(
          `input[name="milestoneMode"][value=${milestones?"milestone":"default"}]`,
        );
        if (milestoneRadio) {
          milestoneRadio.click();
          console.log("Milestone radio button clicked");
            isMileStoneRadio = true;
          clearInterval(interval);
          resolve();
        } else if (attempts >= retries) {
          console.error(
            "Milestone radio button not found after maximum retries",
          );
          clearInterval(interval);
          resolve();
        }
        attempts++;
      }, 500);
    });
  }

  async function selectSpecializedProfile(retries = 5) {
    showLoadingIndicator("Selecting Profile...");

    const specialization = document
      .querySelector(".air3-token.text-body-sm.mb-0")
      .textContent.trim();
    console.log("specialization:", specialization);

    for (let attempt = 0; attempt < retries; attempt++) {
      const dropdownToggle = document.querySelector(
        '.fe-proposal-settings-special-profile div div div[data-test="dropdown-toggle"]',
      );

      if (dropdownToggle) {
        dropdownToggle.click(); // Open the dropdown

        // Wait for dropdown options to render
        await new Promise((resolve) => setTimeout(resolve, 500));

        const menuContainer = document.querySelector(
          '.air3-menu-list[tabindex="-1"]',
        );

        if (menuContainer) {
          // Check for the specialization option
          const selectedOption = Array.from(
            menuContainer.querySelectorAll(".air3-menu-item"),
          ).find((item) => {
            const itemText = item.textContent.trim();
            return (
              itemText === specialization || itemText === "General Profile"
            );
          });

          if (selectedOption) {
            selectedOption.click();
            console.log(`Selected ${specialization} in dropdown`);
            return; // Exit the function after selection
          } else {
            console.warn(
              `${specialization} option not found on attempt ${attempt + 1}`,
            );
          }
        } else {
          console.warn("Dropdown menu not loaded yet on attempt", attempt + 1);
        }
      } else {
        console.error("Dropdown toggle not found on attempt", attempt + 1);
      }

      // Wait before the next attempt
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    console.error(
      `Failed to select ${specialization} after ${retries} attempts.`,
    );
  }

  async function waitForBudgetAndSetHourlyRate(retries = 5) {
    showLoadingIndicator("Populating Terms...");
    return new Promise((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const budgetElement = document.querySelector(
          ".clients-budget .text-light-on-inverse",
        );
        if (budgetElement) {
          const budgetText = budgetElement.textContent;
          const budgetRegex = /\$([0-9,.]+) - \$([0-9,.]+)/;
          const match = budgetText.match(budgetRegex);

          if (match) {
            const maxPrice = parseFloat(match[2].replace(/,/g, ""));
            const hourlyRateField = document.querySelector(
              'input[id="step-rate"]',
            );

            if (hourlyRateField) {
              hourlyRateField.value = maxPrice;
              hourlyRateField.dispatchEvent(
                new Event("input", { bubbles: true }),
              );
              console.log(`Hourly rate set to: $${maxPrice}`);
            } else if (attempts >= retries) {
              console.error("Hourly rate field not found");
              clearInterval(interval);
              resolve();
            }
          } else {
            console.error("Budget format not recognized");
          }
          clearInterval(interval);
          resolve();
        } else if (attempts >= retries) {
          console.error("Budget element not found after maximum retries");
          clearInterval(interval);
          resolve();
        }
        attempts++;
      }, 500);
    });
  }

async function selectRateIncreaseOption(retries = 5) {
  showLoadingIndicator("Selecting Rate Increase...");
  return new Promise(async (resolve) => {
    let optionSelected = false;

    for (let attempts = 0; attempts < retries; attempts++) {
      const dropdownToggle = document.querySelector(
        '.sri-form-card div div[data-test="dropdown-toggle"]'
      );

      if (dropdownToggle && !optionSelected) {
        dropdownToggle.click(); // Open the dropdown

        // Wait briefly for dropdown options to render
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const menuContainer = document.querySelector(
          '[aria-label="How often do you want a rate increase?"]'
        );

        if (menuContainer) {
          const neverOption = Array.from(
            menuContainer.querySelectorAll(".air3-menu-item")
          ).find((item) => item.textContent.trim() === "Never");

          if (neverOption) {
            neverOption.click();
            console.log("Selected 'Never' in dropdown");
            optionSelected = true;
            resolve();
            return; // Exit the function after successful selection
          }
        } else {
          console.warn("Dropdown menu not loaded yet on attempt", attempts + 1);
        }
      } else {
        console.error("Dropdown toggle not found after attempt", attempts + 1);
      }

      // Optional: wait before the next attempt
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // If we reach here, we exhausted all retries without success
    if (!optionSelected) {
      console.warn("'Never' option not found after maximum retries");
    }
    resolve();
  });
}

  async function selectProjectDuration(retries = 5) {
  showLoadingIndicator("Selecting Project Duration...");
  return new Promise(async (resolve) => {
    let optionSelected = false;

    for (let attempts = 0; attempts < retries; attempts++) {
      const dropdownToggle = document.querySelector(
        'div[aria-labelledby="duration-label"]'
      );

      if (dropdownToggle && !optionSelected) {
        dropdownToggle.click(); // Open the dropdown

        // Wait briefly for dropdown options to render
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const menuContainer = document.querySelector(
          'ul[aria-labelledby="duration-label"]'
        );

        if (menuContainer) {
          const neverOption = Array.from(
            menuContainer.querySelectorAll(".air3-menu-item")
          ).find((item) => item.textContent.trim() == "1 to 3 months");

          if (neverOption) {
            neverOption.click();
            console.log("Selected '1 to 3 months' in dropdown");
            optionSelected = true;
            resolve();
            return; // Exit the function after successful selection
          }
        } else {
          console.warn("Dropdown menu not loaded yet on attempt", attempts + 1);
        }
      } else {
        console.error("Dropdown toggle not found after attempt", attempts + 1);
      }

      // Optional: wait before the next attempt
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // If we reach here, we exhausted all retries without success
    if (!optionSelected) {
      console.warn("'project duration' option not found after maximum retries");
    }
    resolve();
  });
}

  // Function to create and show the loading indicator
  function showLoadingIndicator(name) {
    // Create a loading element
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loadingIndicator";
    loadingDiv.style.position = "fixed";
    loadingDiv.style.top = "50%";
    loadingDiv.style.left = "50%";
    loadingDiv.style.transform = "translate(-50%, -50%)";
    loadingDiv.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
    loadingDiv.style.padding = "20px";
    loadingDiv.style.borderRadius = "5px";
    loadingDiv.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    loadingDiv.style.zIndex = "9999"; // Make sure it is on top
    loadingDiv.innerText = `${name}`; // Change this to a spinner if desired

    document.body.appendChild(loadingDiv);
  }

  // Function to create a loader element
  function showLoader(targetElement) {
    if (!targetElement) {
      console.error("Target element is not valid:", targetElement);
      return; // Exit the function if targetElement is null
    }
    const loader = document.createElement("div");
    loader.classList.add("loader");
    loader.style.width = "24px";
    loader.style.height = "24px";
    loader.style.border = "4px solid #f3f3f3";
    loader.style.borderTop = "4px solid #3498db";
    loader.style.borderRadius = "50%";
    loader.style.animation = "spin 1s linear infinite";
    loader.style.marginLeft = "10px";

    // Append loader to the target element
    targetElement.appendChild(loader);
    return loader; // Return loader for later removal
  }

  // Function to create a tick mark
  function showTick(targetElement, reason) {
    const tickMark = document.createElement("span");
    tickMark.id = "tick"
    tickMark.textContent = "✔";
    tickMark.style.color = "green";
    tickMark.style.fontSize = "24px";
    tickMark.style.marginLeft = "10px";
    tickMark.style.position = "relative";
    tickMark.style.cursor = "pointer";
    const tooltip = createTooltip(reason);

    // Show tooltip on mouse enter and hide on mouse leave
    tickMark.addEventListener("mouseenter", () => {
      tooltip.style.display = "block";
      const rect = tickMark.getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX - tooltip.offsetWidth}px`; // Add scroll position if needed
      tooltip.style.top = `${rect.top + window.scrollY + 5}px`; // Position above the cross mark
    });

    tickMark.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    // Append tick to the target element
    targetElement.appendChild(tickMark);
  }

  function handleApiResponse(responseData, targetElement, loader) {
      console.log("responseData",responseData)
    // Remove the loader once response is received
    if (loader) loader.remove();

  if (targetElement.querySelector("#tick") ||
      targetElement.querySelector("#crossMark") ||
      targetElement.querySelector("#unknownMark") ||
      targetElement.querySelector("#errorMark") ) {
    console.log("Mark already exists, returning early.");
    return;
  }

    let parsedContent;
    try {
      const sanitizedContent = responseData.content
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
      console.log("sanitizedContent",sanitizedContent)
      // Parse the sanitized JSON string
      parsedContent = JSON.parse(sanitizedContent);

      console.log("parsedContent",parsedContent); // Successfully parsed JSON object
    } catch (error) {
      console.error("Failed to parse API response:", error);
      const errorMark = document.createElement("span");
      errorMark.id = "errorMark"
      errorMark.textContent = "Error parsing response";
      errorMark.style.color = "red";
      targetElement.appendChild(errorMark);
      return;
    }

    console.log("parsedContent:", parsedContent);

    const eligibility = parsedContent.Eligible.toLowerCase();
    // Show tick or cross based on the response
    if (eligibility === "yes") {
      showTick(targetElement, parsedContent.Reason);
    } else if (eligibility === "no") {
      showCross(targetElement, parsedContent.Reason);
    } else {
      const unknownMark = document.createElement("span");
      unknownMark.id = "unknownMark"
      unknownMark.textContent = "Unknown response";
      unknownMark.style.color = "orange";
      unknownMark.style.marginLeft = "10px";
      targetElement.appendChild(unknownMark);
    }
  }
  // Function to create a cross mark
  function showCross(targetElement, reason) {
    const crossMark = document.createElement("span");
    crossMark.id = "crossMark"
    crossMark.textContent = "✘";
    crossMark.style.color = "red";
    crossMark.style.fontSize = "24px";
    crossMark.style.marginLeft = "10px";
    crossMark.style.position = "relative";
    crossMark.style.cursor = "pointer";

    const tooltip = createTooltip(reason);

    // Show tooltip on mouse enter and hide on mouse leave
    crossMark.addEventListener("mouseenter", () => {
      tooltip.style.display = "block";
      const rect = crossMark.getBoundingClientRect(); // Get the position of the cross mark
      tooltip.style.left = `${rect.left + window.scrollX - tooltip.offsetWidth}px`; // Add scroll position if needed
      tooltip.style.top = `${rect.top + window.scrollY + 5}px`; // Position above the cross mark
    });

    crossMark.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    // Append cross to the target element
    targetElement.appendChild(crossMark);
  }

  function createTooltip(text) {
    const tooltip = document.createElement("div");
    tooltip.textContent = text;
    tooltip.style.position = "absolute";
    tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    tooltip.style.color = "white";
    tooltip.style.padding = "10px";
    tooltip.style.borderRadius = "8px";
    tooltip.style.zIndex = "2000";
    tooltip.style.fontSize = "18px";
    tooltip.style.display = "none"; // Hide initially
    tooltip.style.width = "20%"; // Hide initially
    document.body.appendChild(tooltip);

    return tooltip;
  }

  // Function to hide the loading indicator
  function hideLoadingIndicator() {
    const loadingDiv = document.getElementById("loadingIndicator");
    if (loadingDiv) {
      loadingDiv.remove(); // Remove the loading indicator from the DOM
    }
  }

  function profilesPopup(profiles, updatedUrl, prefLabel) {

      console.log("propupJobName",jobName)
    // Filter out specialized profiles
    const filteredProfiles = profiles.filter(
      (profile) => profile.isSpecializedProfile,
    );

    const recommendAgainpopupElement = document.querySelector("#recommendAgainpopup");

      if (recommendAgainpopupElement) {
  recommendAgainpopupElement.remove();
}

    // Limit to the first three profiles
    const displayedProfiles = filteredProfiles.slice(0, 3);

    // Create popup overlay
    const overlay = document.createElement("div");
    overlay.id = "profilesPopup";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "9990";

    // Create popup box
    const popup = document.createElement("div");
    popup.style.backgroundColor = "#fff";
    popup.style.borderRadius = "12px";
    popup.style.boxShadow = "0 8px 40px rgba(0, 0, 0, 0.2)";
     popup.style.position = "fixed";
    popup.style.top = "20%";
    popup.style.right = "2%";
    popup.style.padding = "20px";
    popup.style.transition = "transform 0.3s ease-in-out";
    popup.style.transform = "scale(1.05)";
     popup.style.zIndex = "9990";

    // Popup title
    const title = document.createElement("h4");
    title.innerText = "Best Matched Profiles";
    title.style.marginBottom = "20px";
    title.style.fontFamily = "Arial, sans-serif";
    title.style.color = "#333";

    // Popup title
    const label = document.createElement("p");
    label.innerText = "Specialization: ";
    label.style.marginBottom = "14px";
    label.style.fontFamily = "Arial, sans-serif";
    label.style.color = "#333";

    const labeltext = document.createElement("span");
    labeltext.innerText = prefLabel;
    labeltext.style.marginBottom = "16px";
    labeltext.style.fontFamily = "Arial, sans-serif";
    labeltext.style.color = "#333";

    label.appendChild(labeltext);

    // Create a list to show profile names and URLs
    const profileList = document.createElement("ul");
    profileList.style.listStyleType = "none";
    profileList.style.padding = "0";

    for (const profile of displayedProfiles) {
      const listItem = document.createElement("li");
      listItem.style.marginBottom = "15px";
      listItem.style.padding = "10px";
      listItem.style.borderRadius = "8px";
      listItem.style.backgroundColor = "#f8f9fa";
      listItem.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
        listItem.style.position = "relative";

      const link = document.createElement("a");
      link.href = profile?.sessionBoxURL + updatedUrl; // Assuming profile.url exists
      link.innerText = profile?.name; // Profile name
      link.target = "_blank"; // Open in a new tab
      link.style.color = "#007bff";
      link.style.textDecoration = "none";
      link.style.fontWeight = "bold";
      link.style.fontSize = "16px";

      const profileName = document.createElement("span");
      profileName.innerText = " (" + profile?.profileName + ")"; // Profile name
      profileName.style.color = "gray";
      profileName.style.fontWeight = "bold";
      profileName.style.fontSize = "12px";
      profileName.style.marginLeft = "8px";

      if (profile?.pinnedProfile) {
    const pinnedIcon = document.createElement("span");
    pinnedIcon.innerText = "📌"; // Pinned icon, you can use a different emoji or SVG
    pinnedIcon.style.color = "#f39c12"; // Gold color for the pin
    pinnedIcon.style.fontSize = "14px";
    pinnedIcon.style.marginRight = "6px";
    pinnedIcon.style.position = "absolute";
    pinnedIcon.style.top = "0px";
    pinnedIcon.style.right = "0px"; // Top-right corner position

    // Add the pinned icon to the list item
    listItem.appendChild(pinnedIcon);
  }

      // Add hover effect for links
      link.addEventListener("mouseenter", () => {
        link.style.textDecoration = "underline";
      });
      link.addEventListener("mouseleave", () => {
        link.style.textDecoration = "none";
      });
      link.addEventListener("click", () => {
          console.log("popup",jobName, profile?.sessionBoxURL);
       GM_setValue("sessionBoxUrl"+jobName, profile?.sessionBoxURL);
       GM_setValue("CRMProfile_Id"+jobName, profile?.CRMProfile_Id);
      })

      listItem.appendChild(link);
      listItem.appendChild(profileName);
      profileList.appendChild(listItem);
    }

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "Close";
    closeButton.style.backgroundColor = "#28a745";
    closeButton.style.color = "#fff";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "6px";
    closeButton.style.padding = "10px 20px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "16px";
    closeButton.style.fontWeight = "bold";
    closeButton.style.transition = "background-color 0.3s, transform 0.3s";

    // Close button hover effect
    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.backgroundColor = "#218838";
      closeButton.style.transform = "scale(1.05)";
    });
    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.backgroundColor = "#28a745";
      closeButton.style.transform = "scale(1)";
    });

          // Create popup box
    const recommendAgainpopup = document.createElement("div");
    recommendAgainpopup.id = "recommendAgainpopup";
    recommendAgainpopup.style.boxShadow = "0 8px 40px rgba(0, 0, 0, 0.2)";
    recommendAgainpopup.style.position = "fixed";
    recommendAgainpopup.style.top = "20%";
    recommendAgainpopup.style.right = "2%";
    recommendAgainpopup.style.transition = "transform 0.3s ease-in-out";
    recommendAgainpopup.style.transform = "scale(1.05)";
    recommendAgainpopup.style.zIndex = "9990";

    const recommendAgain = document.createElement("button");
    recommendAgain.id = "recommendAgainBtn";
    recommendAgain.innerText = "Recommend Profiles";
    recommendAgain.style.backgroundColor = "#28a745";
    recommendAgain.style.color = "#fff";
    recommendAgain.style.border = "none";
    recommendAgain.style.borderRadius = "6px";
    recommendAgain.style.padding = "10px 20px";
    recommendAgain.style.cursor = "pointer";
    recommendAgain.style.fontSize = "16px";
    recommendAgain.style.fontWeight = "bold";
    recommendAgain.style.transition = "background-color 0.3s, transform 0.3s";


    // Append elements to popup
    popup.appendChild(title);
    popup.appendChild(label);
    popup.appendChild(profileList); // Append the list of profiles
    popup.appendChild(closeButton);
  //  overlay.appendChild(popup);
    document.body.appendChild(popup);


    recommendAgainpopup.appendChild(recommendAgain)

    // Close popup on button click
    closeButton.addEventListener("click", () => {
      document.body.removeChild(popup);
      document.body.appendChild(recommendAgainpopup)
    });

    recommendAgain.addEventListener("click", () => {
      recommendAgain.style.backgroundColor = "#DCDCDC";
      recommendAgain.disabled = true;
      filterProfiles();
    });
  }

  // Function to remove non-ISO-8859-1 characters
  function removeNonISO8859_1Characters(input) {
    return input.replace(/[^\x00-\xFF]/g, ""); // Removes non-ISO-8859-1 characters
  }

  // Function to populate the cover letter field
  function populateCoverLetterField(content) {
    const parseContent = content.replace(/ {2,}/g, "\n\n");
    // Wait for the cover letter field to appear
    waitForElement(
      'textarea[aria-labelledby="cover_letter_label"]',
      function (coverLetterField) {
        coverLetterField.value = parseContent;
        coverLetterField.dispatchEvent(new Event("input", { bubbles: true }));
        console.log("Cover letter field populated successfully");

        if (currentMode.toLowerCase() === "auto" && autoSubmit) {
      setTimeout(() => {
          const applyButton = document.querySelector(".fe-apply-footer-controls .air3-btn-primary");

          if (applyButton) {
            // Click the button
            applyButton.click();
           // console.log("Clicked the 'Send for 15 Connects' button.");
          } else {
            console.error("Button not found.");
          }
        }, 2000); // Adjust the delay if needed
        }
      },
    );
  }

function observeSubmitPopup() {
    // Create a MutationObserver instance
    const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
            // Check if nodes have been added to the DOM
            if (mutation.addedNodes.length > 0) {
                // Look for the specific modal
                const jobTile = document.querySelector('div[role="dialog"][name="intro"]');

                if (jobTile && !jobTile.classList.contains("listener-attached")) {
                    // Add the class to prevent repeated triggers
                    jobTile.classList.add("listener-attached");

                    // Find the checkbox and the continue button
                    const checkbox = jobTile.querySelector('input.air3-checkbox-input');
                    const continueButton = jobTile.querySelector('button[data-ev-label="fixed_price_confirmation_continue"]');

                    if (checkbox && continueButton) {
                        // Simulate a click on the checkbox
                        checkbox.click();

                        // Check if the checkbox is checked before enabling the continue button
                        if (checkbox.checked) {
                            // Remove the "disabled" attribute to enable the button
                            continueButton.removeAttribute('disabled');

                            // Click the continue button
                            continueButton.click();
                            console.log("Clicked 'Yes, I understand' and 'Continue'");
                        }
                    }
                }
            }
        });
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true, // Observe all descendants of the body
    });
}

  function populateAnswer(questionsAndAnswers) {
    console.log("questionsAndAnswers", questionsAndAnswers);

    // Find all labels within the questions area
    const questionElements = document.querySelectorAll(
      ".fe-proposal-job-questions .label",
    );

    questionElements.forEach((label) => {
      const questionText = label.textContent.trim(); // Get the text of each question label

      // Check if the question matches a key in our questionsAndAnswers object
      if (questionsAndAnswers[questionText]) {
        const answerText = questionsAndAnswers[questionText]; // Get the answer for the question

        // Find the textarea next to the matched question label
        const textarea = label
          .closest(".form-group")
          .querySelector(".inner-textarea");

        // Populate the textarea with the answer text if found
        if (textarea) {
          textarea.value = answerText;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          console.log(`Populated answer for question: "${questionText}"`);
        } else {
          console.warn("Textarea not found for the matched question label.");
        }
      }
    });
  }

  /* function addToggleButton() {
    // Locate the "Apply now" button container
    const applyButtonContainer = document.querySelector('[data-test="Apply"]');

    // Create a div to hold the new toggle and label
    const toggleDiv = document.createElement("div");
    toggleDiv.style.marginBottom = "14px"; // Add some space below the new toggle
    toggleDiv.style.display = "flex"; // Use flex to align items
    toggleDiv.style.alignItems = "center"; // Center align items vertically
    toggleDiv.style.padding = "10px"; // Padding for better touch area
    toggleDiv.style.borderRadius = "5px"; // Rounded corners

    // Create the label for the toggle
    const label = document.createElement("label");
    label.innerText = "Auto fill";
    label.style.marginRight = "10px";
    label.style.fontWeight = "bold"; // Bold text for the label
    label.style.color = "#108a00"; // Dark color for the label

    // Create the toggle input (checkbox)
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.style.cursor = "pointer"; // Change cursor on hover
    toggle.style.width = "20px"; // Increase width for better visibility
    toggle.style.height = "20px"; // Increase height for better visibility
    toggle.style.marginRight = "5px"; // Space between toggle and label
    toggle.style.accentColor = "#108a00"; // Set the checked color
    toggle.style.borderRadius = "5px"; // Rounded corners

    // Retrieve the toggle state from localStorage
    const toggleState = localStorage.getItem("autoSubmit") === "true"; // Check if 'true' string

    // Set the toggle state based on localStorage
    toggle.checked = toggleState;

    // Append the label and toggle to the div
    toggleDiv.appendChild(label);
    toggleDiv.appendChild(toggle);

    // Insert the new toggle above the existing button container
    applyButtonContainer.insertBefore(
      toggleDiv,
      applyButtonContainer.firstChild,
    );

    // Add event listener for the toggle
    toggle.addEventListener("change", function () {
      autoSubmit = this.checked;

      localStorage.setItem("autoSubmit", autoSubmit); // Save state to localStorage
    });
  }*/

  function postLeadCRM() {

       sessionBoxUrl = GM_getValue("sessionBoxUrl"+jobName, null);
     CRMProfile_Id = GM_getValue("CRMProfile_Id"+jobName, null);
     UserCrmId = GM_getValue("userCrmId", null)

      console.log("sessionBoxUrl",sessionBoxUrl);
      console.log("CRMProfile_Id",CRMProfile_Id);
       console.log("UserCrmId",UserCrmId);

      if(sessionBoxUrl){
       storeValue("sessionBoxUrl"+jobName, sessionBoxUrl);
      }

     if(CRMProfile_Id){
       storeValue("CRMProfile_Id"+jobName, CRMProfile_Id);
      }

      if(UserCrmId){
       storeValue("userCrmId", UserCrmId);
      }

    const connectsButton = document.querySelector(
      ".fe-apply-footer-controls button.air3-btn-primary",
    );

    const connectsText = connectsButton.innerText;
    const connectsNumber = parseInt(connectsText.match(/\d+/));

    if (!isNaN(connectsNumber)) {
      // Multiply the Connects by 0.15 to get the expense
      expense = connectsNumber * 0.15;

      console.log("Connects:", connectsNumber);
      console.log("Calculated Expense:", expense);
    } else {
      console.log("Could not extract the number of Connects.");
    }

    specialization = document
      .querySelector(".air3-token.text-body-sm.mb-0")
      .textContent.trim();

      if(expense && jobName) {
       console.log("connectsUsed"+jobName, expense);
       storeValue("connectsUsed"+jobName, expense);
      }
  }

  // Function to scrape the number of Connects and update the Expense
  function submitButtonEvent() {
    // Find the button that contains the Connects text (e.g., "Send for 9 Connects")
    const connectsButton = document.querySelector(
      ".fe-apply-footer-controls button.air3-btn-primary",
    );

    if (connectsButton) {
      // Add click event listener to the button
      connectsButton.addEventListener("click", postLeadCRM);
      console.log("Connects button event added");
    } else {
      console.log("Connects button not found.");
    }
  }

  // Inject a button into the webpage to open the settings screen
  function injectSettingsButton() {
    const button = document.createElement("button");
    button.innerHTML = "Script Settings";
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    button.style.zIndex = "50";
    button.style.padding = "10px 20px";
    button.style.backgroundColor = "#108a00";
    button.style.color = "#fff";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    button.style.fontSize = "14px";
    button.id = "injectSettingBtn";

    // Add click event to open the settings popup
    button.addEventListener("click", openSettings);

    document.body.appendChild(button);

    const settings = {
      searchURL: GM_getValue("searchURL", ""),
      refreshRate: GM_getValue("refreshRate", ""),
      jobAlerts: GM_getValue("jobAlerts", false),
    };

if (RefreshInterval) {

      clearInterval(RefreshInterval);

              RefreshInterval = null;
    }
  }
  function openSettings() {
    const settingsScreenScript = document.getElementById(
      "settingsScreenScript",
    );
    if (settingsScreenScript) {
      settingsScreenScript.remove();
      return;
    }

    // Create the settings container
    const settingsContainer = document.createElement("div");
    settingsContainer.style.position = "fixed";
    settingsContainer.style.top = "50%";
    settingsContainer.style.left = "50%";
    settingsContainer.style.transform = "translate(-50%, -50%)"; // Centers the div
  settingsContainer.style.zIndex = "50";
    settingsContainer.style.overflow = "auto";
    settingsContainer.style.maxHeight = "80%";
    settingsContainer.style.backgroundColor = "rgba(225,225,225,0.6)";
    settingsContainer.style.padding = "12px";
    settingsContainer.style.borderRadius = "20px";
    settingsContainer.id = "settingsScreenScript";

    // Get the saved settings values from Tampermonkey storage
    const savedSettings = {
      searchURL: GM_getValue("searchURL", ""),
      refreshRate: GM_getValue("refreshRate", ""),
      excludeSkills: GM_getValue("excludeSkills", ""),
      includeSkills: GM_getValue("includeSkills", ""),
      isPaymentMethodVerified: GM_getValue("isPaymentMethodVerified", ""),
      isPhoneVerified: GM_getValue("isPhoneVerified", ""),
      starRating: GM_getValue("starRating", ""),
      hireRate: GM_getValue("hireRate", ""),
      memberSince: GM_getValue("memberSince", ""),
      avgHourlyRatePaid: GM_getValue("avgHourlyRatePaid", ""),
      mode: GM_getValue("mode", "Manual"),
      jobAlerts: GM_getValue("jobAlerts", false),
      pageReload: GM_getValue("pageReload", false),
      profileAlerts: GM_getValue("profileAlerts", false),
      generateProposals: GM_getValue("generateProposals", false),
      eligibleOnly: GM_getValue("eligibleOnly", false),
      autoSubmit: GM_getValue("autoSubmit", false),
      preview: GM_getValue("preview", false),
      validateJobs: GM_getValue("validateJobs", false),
      userCrmId: GM_getValue("userCrmId", ""),
      milestones: GM_getValue("milestones", false),
      byProject: GM_getValue("byProject", true),
    };

    // Create the settings content (input fields and toggle buttons) and pre-fill values
    settingsContainer.innerHTML = `
    <div style="font-family: Arial, sans-serif; width: 400px; padding: 20px; background-color: #f7f7f7; border-radius: 12px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333; text-align: center; font-size: 24px;">Settings</h2>

        <div style="margin-bottom: 15px;">
            <label for="searchURL" style="display: block; font-weight: bold; color: #555;">Search URL</label>
            <input type="text" id="searchURL" value="${savedSettings.searchURL}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;">
        </div>

        <div style="margin-bottom: 15px;">
            <label for="refreshRate" style="display: block; font-weight: bold; color: #555;">Refresh rate (seconds)</label>
            <input type="number" id="refreshRate" value="${savedSettings.refreshRate}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" min="5" max="60" oninput="this.value = Math.max(5, Math.min(60, this.value))">
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap:12px;">

       <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: bold; color: #555;">Job Alerts</label>
            <label class="switchScript">
                <input type="checkbox" id="jobAlertsToggle" ${savedSettings.jobAlerts ? "checked" : ""}>
                <span class="sliderScript round"></span>
            </label>
        </div>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 15px; flex-direction:column; align-items:end">
            <label style="display: block; font-weight: bold; color: #555;">Auto Reload</label>
            <label class="switchScript">
                <input type="checkbox" id="pageReloadToggle" ${savedSettings.pageReload ? "checked" : ""}>
                <span class="sliderScript round"></span>
            </label>
        </div>
        </div>

        <div style="border-bottom: 2px solid #ccc; margin: 10px;">

  <div style="display: flex; align-items: center; justify-content: space-between; gap:12px;">
        <div id="clearCacheBtn"  class="clear-cache-btn">
        <p>Clear Cache</p>
        </div>

        <div id="specializationsBtn"  class="specializations-btn">
        <p>Specializations</p>
        </div>
  </div>
</div>
         <div style="border-bottom: 2px solid #ccc; margin: 10px;">

        <div style="margin-bottom: 20px;">
            <label style="display: block; font-weight: bold; color: #555;">Mode</label>
            <button id="autoModeBtn" style="padding: 10px 20px; border-radius: 5px; border: none; background-color: ${savedSettings.mode === "Auto" ? "green" : "#ddd"}; color: white; margin-right: 10px;" >Auto</button>
            <button id="manualModeBtn" style="padding: 10px 20px; border-radius: 5px; border: none; background-color: ${savedSettings.mode === "Manual" ? "green" : "#ddd"}; color: white;" >Manual</button>
        </div>


        <div style="display: flex; align-items: center; justify-content: space-between; gap:12px;">
       <div style="margin-bottom: 20px;">
            <label style="display: block; font-weight: bold; color: #555;">Eligibility</label>
            <label class="switchScript">
                <input type="checkbox" id="validateJobsToggle" ${savedSettings.validateJobs ? "checked" : ""}>
                <span class="sliderScript round"></span>
            </label>
        </div>

        <div style="justify-content: flex-end; margin-bottom: 20px; flex-direction: column; align-items: flex-end; display: ${currentMode === 'Manual' ? 'none' : 'flex'};" id="eligibleOnlyDiv">
            <label style="display: block; font-weight: bold; color: #555;">Only Eligible</label>
            <label class="switchScript">
                <input type="checkbox" id="eligibleOnlyToggle" ${savedSettings.eligibleOnly ? "checked" : ""}>
                <span class="sliderScript round"></span>
            </label>
        </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap:12px;">

         <div style="margin-bottom: 20px;">
            <label style="display: block; font-weight: bold; color: #555;">Recommend Profiles</label>
            <label class="switchScript">
                <input type="checkbox" id="profileAlertsToggle" ${savedSettings.profileAlerts ? "checked" : ""}>
                <span class="sliderScript round"></span>
            </label>
        </div>

         <div style="justify-content: flex-end; margin-bottom: 20px; flex-direction: column; align-items: flex-end; display: ${currentMode === 'Manual' ? 'none' : 'flex'};"  id="previewDiv" >
            <label style="display: block; font-weight: bold; color: #555;">Preview</label>
            <label class="switchScript">
                <input type="checkbox" id="previewToggle" ${savedSettings.preview ? "checked" : ""}>
                <span class="sliderScript round"></span>
            </label>
        </div>
       </div>

        <div style="margin-bottom: 20px;">
            <label style="display: block; font-weight: bold; color: #555;">Auto Generate Proposals</label>
            <label class="switchScript">
                <input type="checkbox" id="generateProposalsToggle" ${savedSettings.generateProposals ? "checked" : ""}>
                <span class="sliderScript round"></span>
            </label>
        </div>

        <div style="margin-bottom: 20px;  display: ${currentMode === 'Manual' ? 'none' : 'block'};" id="autoSubmitDiv">
            <label style="display: block; font-weight: bold; color: #555;">Auto Submit</label>
            <label class="switchScript">
                <input type="checkbox" id="autoSubmitToggle" ${savedSettings.autoSubmit ? "checked" : ""}>
                <span class="sliderScript round"></span>
            </label>
        </div>

        </div>

      <div style="margin: 10px;">

      <div style="margin-bottom: 20px;">
            <label for="userCrmId" style="display: block; font-weight: bold; color: #555;">User CRM Id</label>
            <input type="text" id="userCrmId" value="${savedSettings.userCrmId}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;">
        </div>
        </div>

        <div style="margin-bottom: 15px; display:none;">
            <label for="excludeSkills" style="display: block; font-weight: bold; color: #555;">Exclude skills List</label>
            <input type="text" id="excludeSkills" value="${savedSettings.excludeSkills}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" disabled>
        </div>

        <div style="margin-bottom: 15px; display:none;">
            <label for="includeSkills" style="display: block; font-weight: bold; color: #555;">Include skills List</label>
            <input type="text" id="includeSkills" value="${savedSettings.includeSkills}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" disabled>
        </div>

        <div style="margin-bottom: 15px; display:none;">
            <label for="isPaymentMethodVerified" style="display: block; font-weight: bold; color: #555;">Is Payment Method Verified</label>
            <input type="text" id="isPaymentMethodVerified" value="${savedSettings.isPaymentMethodVerified}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" disabled>
        </div>

        <div style="margin-bottom: 15px; display:none;">
            <label for="isPhoneVerified" style="display: block; font-weight: bold; color: #555;">Is Phone Verified</label>
            <input type="text" id="isPhoneVerified" value="${savedSettings.isPhoneVerified}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" disabled>
        </div>

        <div style="margin-bottom: 15px; display:none;">
            <label for="starRating" style="display: block; font-weight: bold; color: #555;">Star Rating</label>
            <input type="text" id="starRating" value="${savedSettings.starRating}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" disabled>
        </div>

        <div style="margin-bottom: 15px; display:none;">
            <label for="hireRate" style="display: block; font-weight: bold; color: #555;">Hire Rate</label>
            <input type="text" id="hireRate" value="${savedSettings.hireRate}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" disabled>
        </div>

        <div style="margin-bottom: 15px; display:none;">
            <label for="memberSince" style="display: block; font-weight: bold; color: #555;">Member Since</label>
            <input type="text" id="memberSince" value="${savedSettings.memberSince}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" disabled>
        </div>

        <div style="margin-bottom: 15px; display:none;">
            <label for="avgHourlyRatePaid" style="display: block; font-weight: bold; color: #555;">Avg Hourly Rate Paid</label>
            <input type="text" id="avgHourlyRatePaid" value="${savedSettings.avgHourlyRatePaid}" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc;" disabled>
        </div>

<div style = "padding: 10px;">
 <label style="display: block; font-weight: bold; color: #555; margin-bottom: 8px;">Fill Proposals</label>

 <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px;">
  <!-- Milestones Option -->
  <div style="margin-bottom: 15px; display: flex; flex-direction: column; align-items: center;">
    <label style="font-weight: bold; color: #555; margin-bottom: 8px;">By Milestones</label>
    <label class="custom-radio">
      <input type="radio" name="selection" id="milestonesToggle" value="milestones" ${savedSettings.milestones ? "checked" : ""}>
      <span class="checkmark"></span>
    </label>
  </div>

  <!-- Project Option -->
  <div style="margin-bottom: 15px; display: flex; flex-direction: column; align-items: center;">
    <label style="font-weight: bold; color: #555; margin-bottom: 8px;">By Project</label>
    <label class="custom-radio">
      <input type="radio" name="selection" id="byProjectToggle" value="project" ${savedSettings.byProject ? "checked" : ""}>
      <span class="checkmark"></span>
    </label>
  </div>
</div>
</div>
        <div style="text-align: center;">
            <button id="saveSettingsBtn" style="padding: 10px 20px; background-color: green; color: white; border: none; border-radius: 5px; margin-right: 10px;">Save</button>
            <button id="closeSettingsBtn" style="padding: 10px 20px; background-color: gray; color: white; border: none; border-radius: 5px;">Close</button>
        </div>
    </div>
`;

    // CSS for the switch button (You can add this to your CSS)
    const style = document.createElement("style");
    style.innerHTML = `
    .switchScript {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
    }

    .switchScript input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .sliderScript {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.4s;
        border-radius: 34px;
    }

    .sliderScript:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
    }

    input:checked + .sliderScript {
        background-color: green;
    }

    input:checked + .sliderScript:before {
        transform: translateX(26px);
    }

    .clear-cache-btn {
    display: inline-block;
    margin-bottom: 30px;
    padding: 8px 16px;
    background-color: #e3342f;
    color: white;
    font-weight: bold;
    text-align: center;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .clear-cache-btn:hover {
    background-color: #cc1f1a;
  }

  .clear-cache-btn p {
    margin: 0;
  }

    .specializations-btn {
    display: inline-block;
    margin-bottom: 30px;
    padding: 8px 16px;
    background-color: #000000;
    color: white;
    font-weight: bold;
    text-align: center;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .specializations-btn:hover {
    background-color: #2a2a2a;
  }

  .specializations-btn p {
    margin: 0;
  }
/* Container for the custom radio button */
.custom-radio {
  display: inline-block;
  position: relative;
  padding-left: 35px;
  cursor: pointer;
  font-size: 18px;
  user-select: none;
}

/* Hide the default radio button */
.custom-radio input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

/* Create a custom checkmark/indicator */
.custom-radio .checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #f1f1f1;
  border: 2px solid #ddd;
  border-radius: 50%;
  transition: all 0.3s;
}

/* When the radio button is checked, change the background */
.custom-radio input:checked ~ .checkmark {
  background-color: green; /* Change to primary color */
  border-color: green;
}

/* Create a dot inside the checkmark when checked */
.custom-radio input:checked ~ .checkmark::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
  display: block;
}

`;
    document.head.appendChild(style);

    // Append the settings screen to the body
    document.body.appendChild(settingsContainer);

    // Add event listeners for save and close buttons
    document
      .getElementById("saveSettingsBtn")
      .addEventListener("click", saveSettings);
    document
      .getElementById("closeSettingsBtn")
      .addEventListener("click", closeSettings);
    document
      .getElementById("clearCacheBtn")
      .addEventListener("click", deleteValue);

    // Add event listeners for mode toggle
    document
      .getElementById("autoModeBtn")
      .addEventListener("click", () => setMode("Auto"));
    document
      .getElementById("manualModeBtn")
      .addEventListener("click", () => setMode("Manual"));
    // Add event listener for Job Alerts toggle
    document
      .getElementById("jobAlertsToggle")
      .addEventListener("change", function () {
        GM_setValue("jobAlerts", this.checked);

        const pageReloadToggle = document.getElementById("pageReloadToggle");

        if (this.checked === false) {
          GM_setValue("pageReload", false);
          pageReloadToggle.checked = false;
          pageReloadToggle.disabled = true;
        } else {
          pageReloadToggle.disabled = false;
        }
      });
    document
      .getElementById("pageReloadToggle")
      .addEventListener("change", function () {
        GM_setValue("pageReload", this.checked);
      });
    document
      .getElementById("profileAlertsToggle")
      .addEventListener("change", function () {
        GM_setValue("profileAlerts", this.checked);

        const previewToggleC = document.getElementById("previewToggle");

        if (this.checked === false) {
          GM_setValue("preview", false);
          previewToggleC.checked = false;
          previewToggleC.disabled = true; // Disable the checkbox
        } else {
          // Enable the preview checkbox when profileAlerts is checked
          previewToggleC.disabled = false; // Enable the checkbox
        }
      });
    document
      .getElementById("generateProposalsToggle")
      .addEventListener("change", function () {
        GM_setValue("generateProposals", this.checked);
      });
    document
      .getElementById("eligibleOnlyToggle")
      .addEventListener("change", function () {
        GM_setValue("eligibleOnly", this.checked);
      });
    document
      .getElementById("autoSubmitToggle")
      .addEventListener("change", function () {
        GM_setValue("autoSubmit", this.checked);
      });
    document
      .getElementById("previewToggle")
      .addEventListener("change", function () {
        GM_setValue("preview", this.checked);
      });
    document
      .getElementById("validateJobsToggle")
      .addEventListener("change", function () {
        GM_setValue("validateJobs", this.checked);


        const eligibleOnlyToggle = document.getElementById("eligibleOnlyToggle");

        if (this.checked === false) {
          GM_setValue("eligibleOnly", false);
          eligibleOnlyToggle.checked = false;
          eligibleOnlyToggle.disabled = true; // Disable the checkbox
        } else {
          // Enable the preview checkbox when profileAlerts is checked
          eligibleOnlyToggle.disabled = false; // Enable the checkbox
        }

      });
      document
      .getElementById("milestonesToggle")
      .addEventListener("change", function () {
        GM_setValue("milestones", this.checked);

        const byProjectToggle = document.getElementById("byProjectToggle");

        if (this.checked === true) {
          GM_setValue("byProject", false);
          byProjectToggle.checked = false;
        }
      });
      document
      .getElementById("byProjectToggle")
      .addEventListener("change", function () {
        GM_setValue("byProject", this.checked);

        const milestonesToggle = document.getElementById("milestonesToggle");

        if (this.checked === true) {
          GM_setValue("milestones", false);
          milestonesToggle.checked = false;
        }
      });

    document.getElementById('specializationsBtn').
    addEventListener('click', openSpecializationSettings);
  }

    let isOpneSpecializationSettingsInProgress = false;

  function openSpecializationSettings () {
    if(closeSpecializationSettings()) {return};

      if (isOpneSpecializationSettingsInProgress) {
      showToastTimeout("Operation in progress");
          return;
      }

      isOpneSpecializationSettingsInProgress = true;

      getSpecializedProfile().then((res)=> {

      let checkboxesHTML = '';

       specializationsForFilter = res?.profileSpecialization;

          if(specializationsForFilter.length === 0) {
         showToastTimeout("No specialization found!");
              return;
          }

      for (let i = 0; i < specializationsForFilter.length; i++) {
  checkboxesHTML += `
    <label>
      <input type="checkbox" value="${specializationsForFilter[i]?.name}" style="width: 20px; height: 20px;"> ${specializationsForFilter[i]?.name}
    </label>
  `;
}

      console.log(res?.profileSpecialization)

   const overlay = document.createElement('div');
    overlay.id = 'modalOverlaySpecializationSettings';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = "1000";

    const modal = document.createElement('div');
    modal.id = 'modalContentSpecializationSettings';
    modal.style.width = '400px';
    modal.style.backgroundColor = '#fff';
    modal.style.borderRadius = '8px';
    modal.style.padding = '20px';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';

    // Add a title and checkboxes to the modal
    modal.innerHTML = `
        <h2 style="margin-top: 0; font-size: 24px;">Choose Specializations</h2>
        <div id="checkboxContainer" style="display: flex; flex-direction: column; align-items: start; width: 100%; gap: 12px; margin-top: 20px;">
    ${checkboxesHTML}
        </div>
        <button id="closeSpecializationModalBtn" style="margin-top: 20px; padding: 10px 20px; background-color: #28a745; color: #fff; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">Close</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('closeSpecializationModalBtn').addEventListener('click', closeSpecializationSettings);

     // Add event listeners to checkboxes to store values
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
        // Set the checkbox state from stored values if available
        const savedValue = GM_getValue(checkbox.value, false);
        checkbox.checked = savedValue;

        // Add onChange listener to update stored values
        checkbox.addEventListener('change', () => {
            GM_setValue(checkbox.value, checkbox.checked);
        });
    });

          }).finally(() => {isOpneSpecializationSettingsInProgress = false});
  }

  // Function to save settings
  function saveSettings() {
    autoPageReload = GM_getValue("pageReload", false);
    validateJobs = GM_getValue("validateJobs", false);
     autoSubmit = GM_getValue("autoSubmit", false);

    const settings = {
      searchURL: document.getElementById("searchURL").value,
      refreshRate: document.getElementById("refreshRate").value,
      excludeSkills: document.getElementById("excludeSkills").value,
      includeSkills: document.getElementById("includeSkills").value,
      isPaymentMethodVerified: document.getElementById(
        "isPaymentMethodVerified",
      ).value,
      isPhoneVerified: document.getElementById("isPhoneVerified").value,
      starRating: document.getElementById("starRating").value,
      hireRate: document.getElementById("hireRate").value,
      memberSince: document.getElementById("memberSince").value,
      avgHourlyRatePaid: document.getElementById("avgHourlyRatePaid").value,
      mode: GM_getValue("mode", "Manual"),
      jobAlerts: GM_getValue("jobAlerts", false),
       userCrmId: document.getElementById("userCrmId").value,
    };

    // Save settings in Tampermonkey storage
    for (const key in settings) {
      GM_setValue(key, settings[key]);
    }

      console.log("RefreshInterval",RefreshInterval)

    if (RefreshInterval) {
      clearInterval(RefreshInterval);
        RefreshInterval = null;
         console.log("HitRefreshInterval")
    }

    if (settings.searchURL && settings.refreshRate && settings.jobAlerts && !RefreshInterval && window.location.href.includes("/nx/search/jobs")) {
       console.log("RefreshInterval:", RefreshInterval);
      console.log("Search url:", settings.searchURL);
      console.log("Refresh rate:", settings.refreshRate);
      openAndRefreshTab(settings.searchURL, settings.refreshRate);
    }


     if(settings.userCrmId){
         console.log(settings.userCrmId)
       storeValue("userCrmId", settings.userCrmId);
      }


localStorage.setItem("autoSubmit", JSON.stringify(autoSubmit));
localStorage.setItem("mode", settings?.mode);

    showToastTimeout("Settings saved!");
    closeSettings();
  }

  // Function to close the settings screen
  function closeSettings() {
    const settingsScreenScript = document.getElementById(
      "settingsScreenScript",
    );
    if (settingsScreenScript) {
      settingsScreenScript.remove();
    }
  }

  function closeSpecializationSettings() {
    const settingsScreenScript = document.getElementById(
      "modalOverlaySpecializationSettings",
    );
    if (settingsScreenScript) {
      settingsScreenScript.remove();
        return true;
    }
      return false;
  }

  // Function to set mode (Auto or Manual)
  function setMode(mode) {
    GM_setValue("mode", mode);

    currentMode = mode;

    // Toggle the display of the div based on mode
    const autoSubmitDiv = document.getElementById("autoSubmitDiv");
    const eligibleOnlyDiv = document.getElementById("eligibleOnlyDiv");
    const previewDiv = document.getElementById("previewDiv");

    if (mode === "Auto") {
      autoSubmitDiv.style.display = "block";
      eligibleOnlyDiv.style.display = "flex";
      previewDiv.style.display = "flex";
    } else {
      autoSubmitDiv.style.display = "none";
      eligibleOnlyDiv.style.display = "none";
      previewDiv.style.display = "none";
    }

    // Update button styles based on selected mode
    document.getElementById("autoModeBtn").style.backgroundColor =
      mode === "Auto" ? "green" : "";
    document.getElementById("manualModeBtn").style.backgroundColor =
      mode === "Manual" ? "green" : "";
  }

  // Inject the settings button when the page loads
  window.addEventListener("load", injectSettingsButton);

  // Function to create and show a toast notification
  function showToast(job) {
    // Create a toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.style.position = "fixed";
      toastContainer.style.top = "20px";
      toastContainer.style.right = "20px";
      toastContainer.style.zIndex = "9999";
      document.body.appendChild(toastContainer);
    }

    // Create a toast element
    const toast = document.createElement("div");
    toast.className = "toast";

    // Apply styles to the toast
    toast.style.backgroundColor = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 24px";
    toast.style.paddingRight = "32px";
    toast.style.marginBottom = "10px";
    toast.style.borderRadius = "5px";
    toast.style.opacity = "0";
    toast.style.position = "relative"; // Position relative for the close button
    toast.style.cursor = "pointer"; // Change cursor to pointer
    toast.style.transition = "opacity 0.5s, transform 0.5s";

    // Create close button
    const closeButton = document.createElement("span");
    closeButton.innerText = "X";
    closeButton.style.position = "absolute";
    closeButton.style.top = "0px";
    closeButton.style.right = "10px";
    closeButton.style.cursor = "pointer";
    closeButton.style.color = "#fff";
    closeButton.style.fontWeight = "bold";
    closeButton.style.padding = "6px";

    toast.appendChild(closeButton);

    // Event listener for closing the toast
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent click event from bubbling up
      toast.style.opacity = "0"; // Fade out
      toast.style.transform = "translateY(-20px)"; // Slide up
      setTimeout(() => {
        toastContainer.removeChild(toast);
        if (toastContainer.childElementCount === 0) {
          document.body.removeChild(toastContainer); // Remove container if no toasts
        }
      }, 500); // Wait for the transition to finish before removing
    });

    // Event listener for navigating to the job URL
    toast.addEventListener("click", () => {
      window.open(job.jobUrl, "_blank"); // Open the job URL in a new tab
    });

    // Append the toast to the container
    toast.innerHTML = `<span style="color: yellow;">New Job Posted:</span>  ${job.jobTitle}`; // Set the job title
    toast.appendChild(closeButton); // Append close button again after setting the title
    // Show the toast
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    toastContainer.insertBefore(toast, toastContainer.firstChild);
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 100);
  }

  function showToastTimeout(message) {
    // Create a toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container-timeout");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container-timeout";
      toastContainer.style.position = "fixed";
      toastContainer.style.top = "20px";
      toastContainer.style.right = "20px";
      toastContainer.style.zIndex = "9999";
      document.body.appendChild(toastContainer);
    }

    // Create a toast element
    const toast = document.createElement("div");
    toast.className = "toast-timeout";
    toast.innerText = message;

    // Apply styles to the toast
    toast.style.backgroundColor = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.marginBottom = "10px";
    toast.style.borderRadius = "5px";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.5s, transform 0.5s";
    toast.style.transform = "translateY(-20px)";

    // Append the toast to the container
    toastContainer.appendChild(toast);

    // Show the toast
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 100);

    // Remove the toast after 3 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-20px)";
      setTimeout(() => {
        toastContainer.removeChild(toast);
        if (toastContainer.childElementCount === 0) {
          document.body.removeChild(toastContainer); // Remove container if no toasts
        }
      }, 500);
    }, 3000); // Show for 3 seconds
  }

  function showToastWithoutTimeout(message, leadID = undefined) {
    // Create a toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.style.position = "fixed";
      toastContainer.style.top = "20px";
      toastContainer.style.right = "20px";
      toastContainer.style.zIndex = "9999";
      document.body.appendChild(toastContainer);
    }

    // Create a toast element
    const toast = document.createElement("div");
    toast.className = "toast";

    // Apply styles to the toast
    toast.style.backgroundColor = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 24px";
    toast.style.paddingRight = "32px";
    toast.style.marginBottom = "10px";
    toast.style.borderRadius = "5px";
    toast.style.opacity = "0";
    toast.style.position = "relative"; // Position relative for the close button
    toast.style.cursor = leadID ? "pointer" : "default";
    toast.style.transition = "opacity 0.5s, transform 0.5s";

    // Create close button
    const closeButton = document.createElement("span");
    closeButton.innerText = "X";
    closeButton.style.position = "absolute";
    closeButton.style.top = "0px";
    closeButton.style.right = "10px";
    closeButton.style.cursor = "pointer";
    closeButton.style.color = "#fff";
    closeButton.style.fontWeight = "bold";
    closeButton.style.padding = "6px";

    toast.appendChild(closeButton);

    // Event listener for closing the toast
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent click event from bubbling up
      toast.style.opacity = "0"; // Fade out
      toast.style.transform = "translateY(-20px)"; // Slide up
      setTimeout(() => {
        toastContainer.removeChild(toast);
        if (toastContainer.childElementCount === 0) {
          document.body.removeChild(toastContainer); // Remove container if no toasts
        }
      }, 500); // Wait for the transition to finish before removing
    });

      console.log(leadID, "leadid")

      if(leadID){
          toast.addEventListener("click", () => {
      window.open(`https://vibhuti.bitrix24.in/crm/lead/details/${leadID}/`, "_blank");
    });
      }

    // Append the toast to the container
    toast.innerHTML = `${message}`; // Set the job title
    toast.appendChild(closeButton); // Append close button again after setting the title
    // Show the toast
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    toastContainer.insertBefore(toast, toastContainer.firstChild);
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 100);
  }

  // Function to open a new tab and refresh it every X seconds
  function openAndRefreshTab(url, refreshRate) {
    if (RefreshInterval) {
      clearInterval(RefreshInterval);
        RefreshInterval = null;
    }

       console.log("InnerRefreshInterval",RefreshInterval)
    if (url && refreshRate && !RefreshInterval) {
       showToastTimeout("Searching New Jobs!");
      console.log("job searching start...");
      let lastJobs = GM_getValue("lastJobs", []);
      console.log("url", url);
      // Set a refresh interval based on the provided refresh rate
      RefreshInterval = setInterval(() => {
        try {
          fetch(url)
            .then((response) => response.text())
            .then((html) => {
              // Parse the HTML and extract relevant data
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");

              const jobElements = doc.querySelectorAll(
                ".card-list-container article.job-tile",
              );
              let jobsData = [];

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
                const limit = 1;
                if (index < limit) {
                  // Limit to top 2 jobs
                  const jobTitleElement = jobElement.querySelector(
                    "h2.job-tile-title a",
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
                        'li[data-test="is-fixed-price"] strong:nth-child(2)',
                      )
                      ?.innerText.trim() || "No budget available";
                  const description =
                    jobElement
                      .querySelector("p.text-body-sm")
                      ?.innerText.trim() || "No description available";
                  const skillElements = jobElement.querySelectorAll(
                    'div[data-test="TokenClamp JobAttrs"] button span',
                  );
                  const skills = Array.from(skillElements).map((skill) =>
                    skill?.innerText.trim(),
                  );
                  const postedTimeText =
                    jobElement
                      .querySelector(
                        'small[data-test="job-pubilshed-date"] span:nth-child(2)',
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

              // Compare the latest job with the last two jobs
              if (jobsData.length > 0) {
                const latestJob = jobsData[0];
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
                  GM_setValue("lastJobs", lastJobs);
                  console.log("jobsData:", jobsData);
                  if (window.location.href.includes("/nx/search/jobs")) {
                    showToast(latestJob);

                  if (
                    jobsData.length > 0 &&
                    currentMode.toLowerCase() === "auto"
                  ) {
                    for (let i = 0; i < jobsData.length; i++) {
                      autoTabMode(jobsData[i]?.jobUrl);
                      playNotificationSound();
                      console.log("loop started");
                    }
                  }
             }
                  if (autoPageReload) {
                    reloadPage();
                  }
                } else {
                  showToastTimeout("No new jobs!");
                  console.log(
                    "No new jobs to send; latest job matches the last two jobs.",
                  );
                }
              }
            });
        } catch (e) {
          console.error("Error searching job");
          clearInterval(RefreshInterval);
            RefreshInterval = null;
        }
      }, refreshRate * 1000); // Convert seconds to milliseconds
    } else {
      showToastTimeout("Please provide URL for job Search."); // Notify if popups are blocked
    }
  }

  function refreshCurrentTab(url, refreshRate) {
    const newTab = window.open(url, "_self"); // Open the URL in a new tab

    // Check if the tab is successfully opened
    if (newTab) {
      // Set a refresh interval based on the provided refresh rate
      const refreshInterval = setInterval(() => {
        if (newTab.closed) {
          clearInterval(refreshInterval); // Stop refreshing if the tab is closed
        } else {
          newTab.location.reload(); // Refresh the new tab
        }
      }, refreshRate * 1000); // Convert seconds to milliseconds
    } else {
      alert("Please allow popups for this website."); // Notify if popups are blocked
    }
  }

  function reloadPage() {
    if (window.location.href.includes("/search")) {
      window.location.reload();
    }
  }

  //validation
  function validateJobPosts() {
    if (!validateJobs) {
      return new Promise((resolve, reject)=>{resolve(true)});
    }
    return new Promise((resolve, reject) => {
      waitForElement(
        "h4.d-flex.align-items-center.mt-0.mb-5",
        function (jdElement) {
          jobDescription = jdElement.textContent.trim();
          console.log("Job Description:", jobDescription);

          const prefLabel = scrapePrefLabel();
          const scrapedQuestions = scrapeQuestionsForProposal();

          const targetElement = document.querySelector(
            "h4.d-flex.align-items-center.mt-0.mb-5",
          );
          const loader = showLoader(targetElement);
          // Extracting additional details with null checks
          const ratingElement = document.querySelector(
            '[data-testid="buyer-rating"] .air3-rating-value-text',
          );
          const locationElement = document.querySelector(
            '[data-qa="client-location"] strong',
          );
          const cityElement = document.querySelector(
            '[data-qa="client-location"] .nowrap',
          );

          const totalJobsPostedElement = document.querySelector(
            '[data-qa="client-job-posting-stats"] strong',
          );
          const totalSpentElement = document.querySelector(
            '[data-qa="client-spend"] span',
          );
          const memberSinceElement = document.querySelector(
            '[data-qa="client-contract-date"] small',
          );
          const reviewsElement = document.querySelector(
            '[data-testid="buyer-rating"] span.nowrap',
          );
          const verifiedPaymentElement = Array.from(
            document.querySelectorAll("strong"),
          ).find((el) => el.textContent.trim() === "Payment method verified");
          const verifiedPhoneElement = Array.from(
            document.querySelectorAll("strong"),
          ).find((el) => el.textContent.trim() === "Phone number verified");
          const hourlyRateElement = document.querySelector(
            '[data-qa="client-hourly-rate"]',
          );
          const clientHoursElement = document.querySelector(
            '[data-qa="client-hours"]',
          );
          // Scrape the total hires and active hires
          const hiresElement = document.querySelector(
            '[data-qa="client-hires"]',
          );
          let totalHires = null;
          let totalActive = null;

          if (hiresElement) {
            // Extract text and split to get the hires and active jobs separately
            const hiresText = hiresElement.textContent.trim();
            const matches = hiresText.match(/(\d+)\s+hires,\s+(\d+)\s+active/);

            if (matches) {
              totalHires = matches[1]; // First number is total hires
              totalActive = matches[2]; // Second number is active jobs
            }
          }

          const listItem = document.querySelector("li[data-v-1e9c74a8]");

          // Select the entire ul element
          const ulElement = document.querySelector("ul.features.list-unstyled");

          // Check if ulElement exists
          if (ulElement) {
            // Select all li elements inside the ul
            const listItems = ulElement.querySelectorAll("li");

            // Iterate over each li element
            listItems.forEach((listItem) => {
              // Extract project type
              const typeElement = listItem.querySelector(
                'div[data-cy="expertise"]',
              );

              if (typeElement) {
                const strongElement = typeElement.nextElementSibling;
                if (strongElement) {
                  experience = strongElement.textContent.trim();
                } else {
                  experience = null;
                }
              }

              // Extract budget elements
              const budgetElements = listItem.querySelectorAll(
                'div[data-test="BudgetAmount"] strong',
              );

              if (budgetElements.length >= 2) {
                budget = `${budgetElements[0].textContent.trim()} - ${budgetElements[1].textContent.trim()} Hourly`;
              }

              const budgetElementsFixed = listItem.querySelector(
                'div[data-test="BudgetAmount"] strong',
              );

              if (budgetElementsFixed && budgetElements.length < 2) {
                budget = budgetElementsFixed
                  ? budgetElementsFixed.textContent.trim()
                  : null;
              }

              // Extract project length
              const lengthElement = listItem.querySelector(
                "strong span.d-lg-none",
              );

              if (lengthElement) {
                projectLength = lengthElement
                  ? lengthElement.textContent.trim()
                  : null;
              }

              // Extract required hours per week
              const hoursElement = listItem.querySelector(
                'div[data-cy="clock-hourly"]',
              );

              if (hoursElement) {
                const strongElement = hoursElement.nextElementSibling;
                if (strongElement) {
                  requiredHoursPerWeek = strongElement.textContent.trim();
                } else {
                  requiredHoursPerWeek = null;
                }
              }
            });
          } else {
            console.log("No project data found.");
          }

          console.log(verifiedPaymentElement, "verifiedPaymentElement");

          const jobNameElement = document
            .querySelector("section.air3-card-section h4")
            .querySelectorAll("span")[0];

          jobName = jobNameElement ? jobNameElement.textContent.trim() : null;

          rating = ratingElement ? ratingElement.textContent.trim() : null;
          location = locationElement
            ? locationElement.textContent.trim()
            : null;
          totalJobsPosted = totalJobsPostedElement
            ? totalJobsPostedElement.textContent
                .trim()
                .split(" ")[0]
                .replace(/\n|\s+/g, "")
            : null;
          totalSpent = totalSpentElement
            ? totalSpentElement.textContent
                .replace(/total spent|\s+/g, "")
                .trim()
            : null;
          memberSince = memberSinceElement
            ? memberSinceElement.textContent
                .trim()
                .split(" ")
                .slice(2)
                .join(" ")
            : null;
          reviews = reviewsElement
            ? reviewsElement.textContent
                .trim()
                .split(" ")[2]
                .replace(/\n|\s+/g, "")
            : null;

          verifiedPayment = verifiedPaymentElement ? "Yes" : "No";

          verifiedPhone = verifiedPhoneElement ? "Yes" : "No";
          city = cityElement ? cityElement.textContent.trim() : null;
          clientHourlyRate = hourlyRateElement
            ? hourlyRateElement.childNodes[0].textContent.trim()
            : null;
          clientHours = clientHoursElement
            ? clientHoursElement.textContent
                .trim()
                .split(" ")[0]
                .replace(/\n|\s+/g, "")
            : null;
          // Extracting hire rate and open jobs from the client job posting stats
          let jobPostingStatsElement = document.querySelector(
            '[data-qa="client-job-posting-stats"] div',
          );

          if (jobPostingStatsElement) {
            const jobStatsText = jobPostingStatsElement.textContent.trim();
            const statsArray = jobStatsText.split(",");
            if (statsArray.length === 2) {
              hireRate = statsArray[0].trim().split(" ")[0]; // e.g., "0% hire rate"
              openJobs = statsArray[1].match(/\d+/)
                ? statsArray[1].match(/\d+/)[0]
                : null; // Extracting number of open jobs
            }
          }

          const qualificationItems = document.querySelectorAll(
            ".qualification-items li",
          );

          // Initialize an empty object to store key-value pairs

          qualificationItems.forEach((item) => {
            // Extract the label and value for each item
            const label =
              item
                .querySelector("strong")
                ?.innerText.trim()
                .replace(/\s+/g, "")
                .replace(/:/g, "") || "Unknown";
            const value =
              item.querySelector("span:not(.icons)")?.textContent.trim() ||
              "Unknown";

            // Add to qualifications object
            qualifications[label] = value;
          });

          console.log("Qualifications:", qualifications);

          const activityItems = document.querySelectorAll(
            ".client-activity-items .ca-item",
          );

          // Initialize an empty object to store key-value pairs

          activityItems.forEach((item) => {
            // Extract the title (label) and remove spaces
            const label =
              item
                .querySelector(".title")
                ?.innerText.trim()
                .replace(/\s+/g, "")
                .replace(/:/g, "") || "Unknown";

            // Extract the value
            const value =
              item.querySelector(".value")?.innerText.trim() || "Unknown";

            // Add to clientActivity object
            clientActivity[label] = value;
          });

          console.log("Client Activity:", clientActivity);

          const projectTypeElement = document.querySelector(
            'section[data-test="Segmentations"] li span',
          );

          projectType = projectTypeElement
            ? projectTypeElement.textContent.trim()
            : null;

          const skillElements = document.querySelectorAll(
            'span[data-test="Skill"] a',
          );
          let skills = [];

          skillElements.forEach((skillElement) => {
            const skill = skillElement.textContent.trim();
            skills.push(skill);
          });

          console.log(
            "Skills:",
            skills.length > 0 ? skills : "No skills found",
          );

          const formattedSkills =
            skills.length > 0 ? skills.join(", ") : "No skills found"; // Using cleaned skills

          const currentUrl = window.location.href;

          // Prepare the data for the API request
          const apiData = {
            prompt_id: "b4b3135b-a857-41ae-8b3e-acf148c5b2c1",
            jd: jobDescription,
            skills: skills.join(", "), // Joining skills as a comma-separated string
            StarRating: rating,
            Country: location,
            TotalJobsPosted: totalJobsPosted,
            TotalSpent: totalSpent,
            MemberSince: memberSince,
            TotalReviews: reviews,
            IsPaymentMethodVerified: verifiedPayment,
            IsPhoneVerified: verifiedPhone,
            HireRate: hireRate,
            OpenJobs: openJobs,
            City: city,
            TotalHires: totalHires,
            TotalHiresActive: totalActive,
            AvgHourlyRatePaid: clientHourlyRate,
            TotalHours: clientHours,
            experience: experience,
            Budget: budget,
            ProjectLength: projectLength,
            RequiredHoursPerWeek: requiredHoursPerWeek,
            JobLink: currentUrl,
            Specialization: prefLabel,
            preferredJSS: qualifications?.JobSuccessScore
              ? qualifications?.JobSuccessScore
              : null,
            preferredLocation: qualifications?.Location
              ? qualifications?.Location
              : null,
            preferredTalentType: qualifications?.TalentType
              ? qualifications?.TalentType
              : null,
            Proposals: clientActivity?.Proposals
              ? clientActivity?.Proposals
              : null,
            Interviewing: clientActivity?.Interviewing
              ? clientActivity?.Interviewing
              : null,
            InvitesSent: clientActivity?.Invitessent
              ? clientActivity?.Invitessent
              : null,
            UnansweredInvites: clientActivity?.Unansweredinvites
              ? clientActivity?.Unansweredinvites
              : null,
            LastViewedByClient: clientActivity?.Lastviewedbyclient
              ? clientActivity?.Lastviewedbyclient
              : null,
            BidRange: clientActivity?.Bidrange
              ? clientActivity?.Bidrange
              : null,
            questions: JSON.stringify(scrapedQuestions),
            ProjectType: projectType,
          };


          const getStoredJobValidation = getValue(jobName);

          if (getStoredJobValidation) {
            console.log("Stored validation:", getStoredJobValidation);
            const initialParsedData = JSON.parse(getStoredJobValidation);

            handleApiResponse(initialParsedData, targetElement, loader);
            resolve(initialParsedData);
          } else {
            console.log("Data to be sent to API:", apiData);
            fetch("https://aiharness.io/portal/api/promptApi", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                charset: "UTF-8",
                "x-api-key": "MjYzYWloYXJuZXNz",
              },
              body: JSON.stringify(apiData),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log("API Response:", data);
                storeValue(jobName, JSON.stringify(data));
                storeValue(
                  jobName + "question",
                  JSON.stringify(scrapedQuestions),
                );
                handleApiResponse(data, targetElement, loader);
                resolve(data);
              })
              .catch((error) => {
                showToastTimeout("Error validating job");
                console.error("Error in API request:", error);
                if (loader) loader.remove();
                reject(error);
              });
          }
        },
      );
    });
  }

  // Function to attach event listener after detecting element is added to the DOM
  function observeDOMChanges() {
    // Create a MutationObserver instance
    const observer = new MutationObserver((mutationsList) => {
      mutationsList.forEach((mutation) => {
        // Check if the job-tile elements are added to the DOM
        if (mutation.addedNodes.length > 0) {
          const jobTile = document.querySelector(
            'div[slidername="job-details-modal"]',
          );

          if (jobTile && !jobTile.classList.contains("listener-attached")) {
            // Add the class to prevent repeated triggers
            jobTile.classList.add("listener-attached");

            // Perform your desired action (e.g., API request)
            console.log("Article clicked:");
            validateJobPosts();
          }
        }
      });
    });

    // Start observing the document for changes
    observer.observe(document.body, { childList: true, subtree: true });
  }

    function filterSpecialization () {

    const prefLabel = scrapePrefLabel();
     console.log(prefLabel,"prefLabel")
     let shouldContinue = true;

for (let i = 0; i < specializationsForFilter.length; i++) {
  const spec = specializationsForFilter[i];
  const isSpecializationTrue = GM_getValue(spec?.name, false);

  if (isSpecializationTrue) {
    if (spec?.name.toLowerCase().replace(/\s+/g, '') === prefLabel.toLowerCase().replace(/\s+/g, '')){
      shouldContinue = true; // Continue if prefLabel spec is true
      console.log("specss", spec?.name, prefLabel, spec?.name == prefLabel, isSpecializationTrue);
      break; // Exit the loop
    } else {
      shouldContinue = false; // Set flag if prefLabel spec is false
      //break; // Exit the loop
    }
  }
}

        console.log("shouldContinue",shouldContinue);

// If no spec was true and prefLabel condition didn't trigger return
if (!shouldContinue) {
    showToastWithoutTimeout("No specialization matched!");
     if (
         currentMode.toLowerCase() === "auto") {
          window.close();
        }
    // Continue with your function logic
} else if (shouldContinue) {
    showToastTimeout("Specialization matched!")
    filterProfiles();
    // Continue as conditions are met
}
    }

  // Call the observer when the page loads
  // window.addEventListener("load", observeDOMChanges);

  async function filterProfiles() {

    let profileEligibility;
    const recommendAgainBtn = document.querySelector("#recommendAgainBtn");

    validateJobPosts()
      .then((res) => {

        if(validateJobs){
        const parsedContent = parseStoredvalue(res);
        profileEligibility = parsedContent.Eligible.toLowerCase();

        console.log("eligibility:", profileEligibility);

        if (
          currentMode.toLowerCase() === "auto" &&
          profileEligibility === "no" &&
          openEligible
        ) {
          window.close();
        }

        if (profileEligibility === "no") {
          showToastWithoutTimeout("Uneligible Job!");
        }
        }
        /*if(currentMode.toLowerCase() === 'manual' && eligibility === 'no'){
     return;
    }


     if(currentMode.toLowerCase() === 'auto' && eligibility === 'no' && !preview){
     return;
    }
*/

        // && eligibility === 'yes'
        if (autoRecommendProfiles) {
          showToastTimeout("Getting Best Matched Profiles...");
          // Wait for Job Description element
          waitForElement(
            "section.air3-card-section h4 span",
            function (jdElement) {
              const prefLabel = scrapePrefLabel();

               jobName = jdElement.textContent.trim();
              console.log(" jobName:", jobName);

              const skillElements = document.querySelectorAll(
                'span[data-test="Skill"] a',
              );
              let skills = [];

              skillElements.forEach((skillElement) => {
                const skill = skillElement.textContent.trim();
                skills.push(skill);
              });

              console.log(
                "Skills:",
                skills.length > 0 ? skills : "No skills found",
              );

              let updatedUrl;

              const currentUrl = window.location.href;

              // Regular expression to match the unique job ID (like "~021843974733681568825")
              const regex = /~([a-zA-Z0-9]+)/;

              const match = currentUrl.match(regex);

              if (match && match[0]) {
                const jobId = match[0]; // Extract the full job ID like "~021843974733681568825"

                // Create the new URL by appending the job ID
                updatedUrl = `https://www.upwork.com/nx/proposals/job/${jobId}/apply/`;

                // Output the new URL to the console or use it as needed
                console.log("New URL: ", updatedUrl);

                // Optionally, you can redirect to the new URL if needed
                // window.location.href = newUrl;
              } else {
                console.log("No job ID found in the current URL.");
              }

              const advancedSearchData = {
                skills: skills,
                jobTitle: jobName,
                prefLabel: prefLabel,
              };

              console.log("Api body", advancedSearchData);

              if (skills && jobName) {
                fetch("https://vibhutidigital.com/api/v1/profiles/search", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                    charset: "UTF-8",
                  },
                  body: JSON.stringify({ advancedSearchData }),
                })
                  .then((response) => response.json())
                  .then((data) => {
                    console.log("API Response:", data);
                    if (data.statusCode == 200) {

                      profilesPopup(data.data, updatedUrl, prefLabel);

                        const filteredProfiles = data?.data?.filter(
                                (profile) => profile.isSpecializedProfile);
                        console.log("filteredProfiles",filteredProfiles)


                      if (!preview && currentMode.toLowerCase() === "auto" && profileEligibility === "yes") {
                          const isProfilePinned = filteredProfiles?.filter(
                                (profile) => profile?.pinnedProfile === true);

                          if(isProfilePinned.length > 0){
                             console.log("isProfilePinned",isProfilePinned)
                          GM_setValue("sessionBoxUrl"+jobName, isProfilePinned[0]?.sessionBoxURL);
                          GM_setValue("CRMProfile_Id"+jobName, isProfilePinned[0]?.CRMProfile_Id);
                          console.log("sessionBoxUrl"+jobName, isProfilePinned[0]?.sessionBoxURL)
                        reloadCurrentTab(
                          isProfilePinned[0].sessionBoxURL + updatedUrl,
                          currentUrl,
                       );
                              return;
                          }

                         console.log("filteredProfiles",filteredProfiles)
                          GM_setValue("sessionBoxUrl"+jobName, filteredProfiles[0]?.sessionBoxURL);
                          GM_setValue("CRMProfile_Id"+jobName, filteredProfiles[0]?.CRMProfile_Id);
                          console.log("sessionBoxUrl"+jobName, filteredProfiles[0]?.sessionBoxURL)
                        reloadCurrentTab(
                          filteredProfiles[0].sessionBoxURL + updatedUrl,
                          currentUrl,
                       );
                      }
                    }
                    if (data.statusCode != 200) {

                        if (recommendAgainBtn) {
                          recommendAgainBtn.disabled = false;
                          recommendAgainBtn.style.backgroundColor = "#28a745";
                        }

                      showToastTimeout("Error filtering profiles");
                    }
                  })
                  .catch((error) => {
                       if (recommendAgainBtn) {
                          recommendAgainBtn.disabled = false;
                          recommendAgainBtn.style.backgroundColor = "#28a745";
                        }
                    showToastTimeout("Error filtering profiles");
                    console.error("Error in API request:", error);
                  });
              }
            },
          );
        }
      })
      .catch((error) => {
            if (recommendAgainBtn) {
                   recommendAgainBtn.disabled = false;
                    recommendAgainBtn.style.backgroundColor = "#28a745";
                   }
        console.error("Error during job validation:", error);
      });
  }

  //session storag3
  function storeValue(key, value) {
    const now = new Date();

    // Create an object with value and expiration time
    const item = {
      value: value,
      expiry: now.getTime() + 30 * 60 * 1000, // Expiration time in milliseconds
    };
     console.log("key",key);
    console.log("item", item);
    try {
      localStorage.setItem(key, JSON.stringify(item)); // Store as JSON string
    } catch (e) {
      console.error("Error storing value:", e);
    }
  }

  function getValue(key) {
    try {
      const itemStr = localStorage.getItem(key);

      // If the item doesn't exist, return null
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      const now = new Date();

      // Check if the item is expired
      if (now.getTime() > item.expiry) {
        // If expired, remove the item from storage
        localStorage.removeItem(key);
        return null;
      }

      return item.value; // Return the stored value if it's not expired
    } catch (e) {
      console.error("Error retrieving value:", e);
      return null;
    }
  }

  function clearExpiredValues() {
    const now = new Date();

    // Loop through all keys in localStorage
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const itemStr = localStorage.getItem(key);
        try {
          const item = JSON.parse(itemStr);
          // If the item has an expiry and it's expired, remove it
          if (item && item.expiry && now.getTime() > item.expiry) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // If parsing fails, continue with the next item
          console.error("Error clearing expired value:", e);
        }
      }
    }
  }

  clearExpiredValues();

  function deleteValue() {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const itemStr = localStorage.getItem(key);
        try {
          const item = JSON.parse(itemStr);
          // If the item has an expiry and it's expired, remove it
          if (item && item.expiry && item.value) {
            console.log("Item to be Clear:", item);
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.error("Error clearing expired value:", e);
        }
      }
    }

    showToastTimeout("Cache Cleared!");
  }

  function autoTabMode(url) {
    if (
      window.location.href.includes("/search") &&
      currentMode.toLowerCase() === "auto"
    ) {
      const newTab = window.open(url, "_blank");
    }
  }

  function reloadCurrentTab(url, currentUrl) {
    if (
      window.location.href.includes(currentUrl) &&
      currentMode.toLowerCase() === "auto"
    ) {
      const newTab = window.open(url, "_self");
    }
  }

  // Function to scrape the 'prefLabel' from the page source
  function scrapePrefLabel() {
    // Get the entire HTML source as a string
    const pageSource = document.documentElement.innerHTML;

    // Use a regular expression to find the 'prefLabel' value
    const regex = /prefLabel\s*:\s*"([^"]+)"/;
    const occupationRegex = /ontologyId\s*:\s*"upworkOccupation:([^"]+)"/;

    // Execute the regular expression on the page source
    const match = regex.exec(pageSource);

    if (match && match[1]) {
      let prefLabel = match[1].trim();

      // Decode Unicode escape sequences like \u002F into actual characters
      try {
        prefLabel = JSON.parse('"' + prefLabel + '"');
      } catch (error) {
        console.error("Failed to decode Unicode sequences:", error);
      }

      console.log("prefLabel:", prefLabel); // Output the prefLabel to the console
      return prefLabel;
    }


 const occupationMatch = occupationRegex.exec(pageSource);
  if (occupationMatch && occupationMatch[1]) {
    const upworkOccupation = occupationMatch[1].trim();
    console.log("upworkOccupation:", upworkOccupation); // Output upworkOccupation to the console
    return upworkOccupation;
  }

  console.log("Neither prefLabel nor upworkOccupation found.");
  return null;
  }

  function scrapeQuestionsForProposal() {
    const questions = [];
    document.querySelectorAll("ol.list-styled.mb-0 li").forEach((item) => {
      const question = item.innerText.trim();
      if (question) {
        questions.push(question);
      }
    });
    return questions;
  }

  function getSpecializedProfile() {
     return new Promise((resolve, reject) => {
      try{
  fetch("https://vibhutidigital.com/api/v1/profileSpecialization").then(async(res)=>await res.json()).then((res)=>resolve(res.data[0]));
      }catch(e){
      console.log(e)
          reject(false)
      }
     })
  }

  // Call the function to insert the toggle button on page load
  window.onload = function () {
    // Check if we're on the job details page and call the scraping function
    if (window.location.href.includes("/jobs")) {
    }
  };


    //CRM Script

const applicationUrlPattern = /https:\/\/www\.upwork\.com\/nx\/proposals\/insights\/\d+/;
  const proposalUrlPattern = /https:\/\/www\.upwork\.com\/nx\/proposals\/\d+/;


function clickMaybeLater() {
  // Use the selector for the "Maybe later" button
  const selector = 'button[data-ev-label="interstitial_skip_cta"]';
  waitForElement(selector, (element) => {
    element.click();
    console.log("Clicked 'Maybe later' button");
  });
}

 async function handleLeadExists() {
  try {
    // Get the job posting link directly
    const jobPostingLinkElement = document.querySelector('a[data-test="open-original-posting"]');
     jobLink = jobPostingLinkElement?.href || null;

    // Retrieve and parse user CRM ID
    UserCrmId = GM_getValue("userCrmId", null);
    // If either jobLink or user CRM ID is missing, return false
    if (!jobLink || !UserCrmId) {
      showToastTimeout("Required parameters are missing");
      return false;
    }

    // Fetch to check if the lead exists
    const response = await fetch(
      `https://vibhuti.bitrix24.in/rest/1/1bru19n6bqydy32c/crm.lead.list.json?filter[UF_CRM_1566634563410]=${jobLink}&filter[ASSIGNED_BY_ID]=${UserCrmId}`,
      { method: "GET" }
    );

    // Check the response status
    if (response.ok) {
      const data = await response.json();
      if (data?.result?.length > 0) {
        showToastTimeout("Lead Exists");
        return true;
      } else {
        return false;
      }
    } else {
      showToastTimeout("Error retrieving lead from CRM");
      console.error("Error fetching lead: ", response.status);
      return false;
    }
  } catch (e) {
    showToastTimeout("Error getting lead from CRM");
    console.error("Error in handleLeadExists:", e);
    return false;
  }
 }

 async function handlepostLeadCRM() {

    const isLeadExists = await handleLeadExists();

     if(isLeadExists){
     return;
     }

    UserCrmId = GM_getValue("userCrmId", null);

    if (!UserCrmId) {
      showToastTimeout("CRM ID is missing");
      return;
    }

      showToastTimeout("Creating CRM Lead........");
    const getButtonById = document.getElementById("CRMButton");

    if (getButtonById) {
      getButtonById.disabled = true;
      getButtonById.style.backgroundColor = "gray";
      getButtonById.style.cursor = "not-allowed";
         getButtonById.style.opacity = "0.6";
    }

    const jobNameElement = document.querySelector("div.content h3");

    jobName = jobNameElement ? jobNameElement.textContent.trim() : null;

    const jobPostingLinkElement = document.querySelector(
      'a[data-test="open-original-posting"]',
    ).href;
    if (jobPostingLinkElement) {
      jobLink = jobPostingLinkElement;
    }

    specialization = document
      .querySelector(".air3-token.text-body-sm.mb-0")
      .textContent.trim();

    console.log("jobLink", jobLink);

    if (jobName) {
      expense = localStorage.getItem("connectsUsed" + jobName) || null;
      sessionBoxUrl = localStorage.getItem("sessionBoxUrl"+jobName) || null;
      CRMProfile_Id = localStorage.getItem("CRMProfile_Id"+jobName) || null;
    }
    //Logging Proposal in CRM
    //CRM have some customm field, we can find all custom fields for leads here https://vibhuti.bitrix24.com/rest/1/1bru19n6bqydy32c/crm.lead.fields.json


      const parsedExpense = JSON.parse(expense);
      const parsedsessionBoxUrl = JSON.parse(sessionBoxUrl);
      const parsedCRMProfile_Id = JSON.parse(CRMProfile_Id);

      console.log("parsedExpense",parsedExpense);
      console.log("parsedsessionBoxUrl",sessionBoxUrl);
      console.log("parsedCRMProfile_Id",parsedCRMProfile_Id);
      console.log("parsedUserCrmId",UserCrmId);

       const currentUrl = window.location.href;

    try {
      const apiUrl =
        "https://vibhuti.bitrix24.in/rest/1/1bru19n6bqydy32c/crm.lead.add.json";
      const data = {
        fields: {
          ASSIGNED_BY_ID: UserCrmId && UserCrmId,
          TITLE: jobName,
          //Platform Job Link
          UF_CRM_1566634563410: jobLink,
          //Platform Proposal Link
          UF_CRM_1662646830214 : parsedsessionBoxUrl?.value+currentUrl,
          //Expemse
          UF_CRM_1566718872633: parsedExpense?.value,
          //Boost Expense
          //Stage = Upwork Bids
          STATUS_ID: "Upwork - Bids",
          //Profile Used :
          UF_CRM_1566602804521: parsedCRMProfile_Id?.value && Number(parsedCRMProfile_Id?.value)
        },
      };

      console.log("data_sent_to_crm_api", data);
     await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => {

         if(res?.status === 200 || res?.ok) {
      showToastTimeout("New Lead Created!");
      console.log("New Lead Created:");
      }
          else {
      showToastTimeout("Error creating lead");
      console.error("Error creating lead");
      }
      });

    } catch (e) {
      showToastTimeout("Error posting lead on CRM");
      console.error("Error posting lead on CRM:", e);
    } finally {
      if (getButtonById) {
        getButtonById.disabled = false;
        getButtonById.style.backgroundColor = "#2727c2";
            getButtonById.style.cursor = "pointer";
           getButtonById.style.opacity = "1";
      }
    }
  }

 async function getLeadCRM() {

    UserCrmId = GM_getValue("userCrmId", null);

      console.log("parsedUserCrmId",UserCrmId)

   const getButtonById = document.getElementById("CRMButton");



    if (getButtonById) {
      getButtonById.disabled = true;
      getButtonById.style.backgroundColor = "gray";
       getButtonById.style.cursor = "not-allowed";
    getButtonById.style.opacity = "0.6";
    }

showLoadingIndicator("Searching lead...");

         const jobPostingLinkElement = document.querySelector('a[data-test="open-original-posting"]').href;
    if (jobPostingLinkElement) {
      jobLink = jobPostingLinkElement || null;
    }

      try{
await fetch(`https://vibhuti.bitrix24.in/rest/1/1bru19n6bqydy32c/crm.lead.list.json?filter[UF_CRM_1566634563410]=${jobLink}`, {
        method: "GET",
      }).then(async(res) => {

         if(res?.status === 200 || res?.ok) {

      const response = await res.json()

      if(response?.result.length > 0){
 showToastWithoutTimeout("Lead exists!", Number(response?.result[0]?.ID));
     await fetch(`https://vibhuti.bitrix24.in/rest/1/1bru19n6bqydy32c/crm.lead.list.json?filter[UF_CRM_1566634563410]=${jobLink}&filter[ASSIGNED_BY_ID]=${UserCrmId}`, {
        method: "GET",
      }).then(async(res) => {
       if(res?.status === 200 || res?.ok) {

      const response = await res.json()

      if(response?.result.length > 0){
       showToastWithoutTimeout("Lead exists with CRM ID " + UserCrmId);
      }else{
      injectCRMButton()
      }}
     })
      }else{
          if(currentMode === "Auto"){
     handlepostLeadCRM();
          }
          else if(currentMode === "Manual"){
                 injectCRMButton();
                   }
      }
      }
}).catch(()=>{showToastTimeout("Error getting lead from CRM");})

      }catch(e) {
      showToastTimeout("Error getting lead from CRM")
      }finally {
          hideLoadingIndicator()
  if (getButtonById) {
            getButtonById.disabled = false;
            getButtonById.style.backgroundColor = "#2727c2";
            getButtonById.style.cursor = "pointer";
            getButtonById.style.opacity = "1";
        }
      }
  }

  function injectCRMButton() {
    const button = document.createElement("button");
    button.innerHTML = "Create Lead";
    button.style.position = "fixed";
    button.style.bottom = "80px";
    button.style.right = "20px";
    button.style.zIndex = "50";
    button.style.padding = "10px 20px";
    button.style.backgroundColor = "#2727c2";
    button.style.color = "#fff";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    button.style.fontSize = "14px";
    button.id = "CRMButton";

    // Add click event to open the settings popup
    button.addEventListener("click", handlepostLeadCRM);

    document.body.appendChild(button);
  }

  if (proposalUrlPattern.test(currentUrl)) {
  //  window.addEventListener("load", getJobID);
   // window.addEventListener("load", injectCRMButton);
    window.addEventListener("load", getLeadCRM);

  }
       if (applicationUrlPattern.test(currentUrl)) {
       clickMaybeLater();
    console.log("pattern working")
  }

})();
