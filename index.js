const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/getLinks', async (req, res) => {
    const video_url = req.body.video_url;

    const browser = await puppeteer.launch({
        headless: 'new'
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto('https://www.y2mate.com');

    // ... (Your Puppeteer code for processing the video_url and getting image and download links)

    let input_field = null;

    // Retry logic: Keep reloading the page until the input field is found
    while (!input_field) {
        await page.waitForTimeout(2000); // Wait for 2 seconds before reloading
        await page.reload(); // Reload the page
        input_field = await page.$('#txt-url'); // Try to find the input field again
    }

    // Input data into the text field
    await input_field.type(video_url);

    // Click enter button
    const clickEnterBtn = '#btn-submit';
    await page.waitForSelector(clickEnterBtn);
    await page.click(clickEnterBtn);

    await page.waitForSelector('table.table-bordered tbody tr td:first-child');

    const tdElements = await page.evaluate(() => {
        const tds = document.querySelectorAll('table.table-bordered tbody tr td:first-child');
        return Array.from(tds).map(td => td.textContent.trim());
    });

    let image_link = '';
    const imageSelector = '#result > div > div.col-xs-12.col-sm-5.col-md-5 > div > img';
    await page.waitForSelector(imageSelector);
    const imgElement = await page.$(imageSelector);
    if (imgElement) {
        image_link = await imgElement.evaluate(img => img.src);
    }

    let video_title = '';

    const videoTitleSelector = '#result > div.tabs.row > div.col-xs-12.col-sm-5.col-md-5 > div > div';
    await page.waitForSelector(videoTitleSelector);
    const titleElement = await page.$(videoTitleSelector);
    if(titleElement){
        video_title = await titleElement.evaluate(b => b.textContent);
    }

    let download_link = '';

    // Loop through the <td> elements and find the one with the specific text
    for (let i = 0; i < tdElements.length; i++) {
        if (tdElements[i].includes('480p')) {
            const buttonSelector = `table.table-bordered tbody tr:nth-child(${i + 1}) td.txt-center button`;
            await page.waitForSelector(buttonSelector); // Wait for the button to be present in the DOM
            const button = await page.$(buttonSelector);
            if (button) {
                await button.click();
                const downloadBtnSelector = '#process-result > div > a';
                await page.waitForSelector(downloadBtnSelector); // Wait for the download button to be present in the DOM
                download_link = await page.evaluate(() => {
                    const downloadBtn = document.querySelector('#process-result > div > a');
                    return downloadBtn ? downloadBtn.href : '';
                });
                break;
            }
        }
    }
    // console.log(download_link);

    await browser.close();

    res.send({
        download_link: download_link,
        image_link: image_link,
        video_title: video_title
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
