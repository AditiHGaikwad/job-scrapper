const {
  events,
  IData,
  LinkedinScraper,
  ERelevanceFilterOptions,
  ETimeFilterOptions,
} = require("linkedin-jobs-scraper");

const fs = require("fs");

const indeed = require("indeed-scraper");
const queryOptions = {
  host: "www.indeed.com",
  query: "Software",
  city: "Seattle, WA",
  radius: "25",
  level: "entry_level",
  jobType: "fulltime",
  maxAge: "7",
  sort: "date",
  limit: 100,
};

indeed.query(queryOptions).then((res) => {
  console.log(res); // An array of Job objects
  let jsonData = JSON.stringify(res);
  fs.writeFile("indeed.json", jsonData, function (err, result) {
    if (err) console.log("error", err);
  });
});

(async () => {
  // Each scraper instance is associated with one browser.
  // Concurrent queries will run on different pages within the same browser instance.
  const scraper = new LinkedinScraper({
    headless: true,
    slowMo: 10,
  });

  let scrapedData = [];

  // Add listeners for scraper events
  scraper.on(events.scraper.data, (data) => {
    scrapedData.push({
      Location: data.location,
      Title: data.title,
      Company: data.company,
      Place: data.place,
      Date: data.date,
      Link: data.link,
      SenorityLevel: data.senorityLevel,
      Function: data.jobFunction,
      EmploymentType: data.employmentType,
      Industries: data.industries,
    });
    console.log(data);
  });

  scraper.on(events.scraper.error, (err) => {
    console.error(err);
  });

  scraper.on(events.scraper.end, () => {
    console.log("All done!");
    let jsonData = JSON.stringify(scrapedData);
    fs.writeFile("linkedin.json", jsonData, function (err, result) {
      if (err) console.log("error", err);
    });
  });

  // Add listeners for puppeteer browser events
  scraper.on(events.puppeteer.browser.targetcreated, () => {});
  scraper.on(events.puppeteer.browser.targetchanged, () => {});
  scraper.on(events.puppeteer.browser.targetdestroyed, () => {});
  scraper.on(events.puppeteer.browser.disconnected, () => {});

  // Custom function executed on browser side to extract job description
  const descriptionProcessor = () =>
    document
      .querySelector(".description__text")
      .innerText.replace(/[\s\n\r]+/g, " ")
      .trim();

  // Run queries concurrently
  await Promise.all([
    scraper.run("Graphic Designer", "London", {
      paginationMax: 1,
    }),
    scraper.run(["Software Engineer"], ["Bengaluru", "Hyderabad"], {
      paginationMax: 1,
      descriptionProcessor,
      filter: {
        relevance: ERelevanceFilterOptions.RECENT,
        time: ETimeFilterOptions.DAY,
      },
      optimize: true, // Block resources such as images, fonts etc to improve bandwidth usage
    }),
  ]);

  // Close browser
  await scraper.close();
})();
