const chromium = require("chromium");
const puppeteer = require("puppeteer");

async function parkingUpdate() {
  try {
    console.log("--------------");
		
    const browser = await puppeteer.launch({
     // userDataDir: __dirname,
     args: ['--disable-setuid-sandbox', '--no-sandbox']
    });

    console.log("launched");
    const page = await browser.newPage();
    console.log("new page");

    await page.goto("https://m.csun.edu/alumni_community/find_parking/index");
    console.log("on page");

    const lots = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll("tr.kgoui_object.kgoui_table_table_row"),
        (e) => ({
          lot: e.querySelector(
            ":first-child div a div .kgo-title :first-child strong"
          ).innerText,
          slots: e.querySelector(
            ":nth-child(2) div a div .kgo-title :first-child span"
          ).innerText,
        })
      )
    );

    console.log("got lots");
    lot_global = lots;

    await browser.close();

    console.log("closed");
		
  } catch (err) {
    console.log(err);
    await browser.close();
  }
}

parkingUpdate()