// const puppeteer = require('puppeteer');

// (async () => {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();
//   await page.goto('https://www.instagram.com/DrawingQuickAcademy');
//   console.log(await page.content());
//   await browser.close();
// })();
const axios = require('axios');

// Simple function to get Instagram bio
async function getInstagramBio(username) {
    try {
      const response = await axios.get(`https://instagram.com/${username}/?__a=1`);
      return response.data.graphql.user.biography;
    } catch (error) {
      return "Could not fetch bio";
    }
  }

// Test the function
(async () => {
  const username = "by_tyma.ma"; // Change this to test different accounts
  const bio = await getInstagramBio(username);
  
  console.log(`Instagram Bio for @${username}:`);
  console.log(`https://instagram.com/@${username}`);
  console.log("Bio:", bio);
})();