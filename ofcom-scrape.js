const puppeteer = require('puppeteer');

function transformSelector(selector) {
  return selector.replace(/:/gu, '\\3a ');
}

function waitFor(page, selector) {
  return page.waitFor(transformSelector(selector), {timeout: 10000});
}

async function fillFields(page, form) {
  // Disappointingly, you can't type into multiple fields simultaneously.
  for (let key of Object.keys(form)) {
    await page.type(transformSelector(key), form[key]);
  }
}

async function click(page, selector) {
  try {
    await Promise.all([
      page.waitForNavigation({timeout: 10000}),
      page.$eval(transformSelector(selector), el => el.click()),
    ]);
  } catch (err) {
    throw new Error(
      `Error when clicking ${selector} on URL ${page.url()}: ${err}`,
    );
  }
}

function avcheck(suffix) {
  let inputParam = {};
  inputParam['licenceType'] = CS.getAttributeValue('Licence_Type_0');
  inputParam['requestedCallSignSuffix'] = suffix.toUpperCase();
  inputParam['requestedCallSignPrefix'] = '';
  inputParam['licenseeId'] = CS.getAttributeValue('Licensee_0');

  let promise = new Promise((resolve, reject) => {
    Visualforce.remoting.Manager.invokeAction(
      'LicenceConfigWidgets.checkCallSignAvailability',
      JSON.stringify(inputParam),
      function(result, event) {
        if (event.statusCode === 200) {
          resolve(JSON.parse(result));
        } else {
          reject();
        }
      },
      {escape: false},
    );
  });
  return promise;
}

class OfcomScrape {
  async init(options) {
    this.browser = await puppeteer.launch(options);
    this.page = await this.browser.newPage();
    await this.page.setViewport({width: 1000, height: 1500});
  }

  async login(email, password) {
    await this.page.goto('https://ofcom.force.com');
    await waitFor(this.page, 'input#login:template:guest:login');
    await fillFields(this.page, {
      'input#login:template:guest:username': email,
      'input#login:template:guest:password': password,
    });
    await click(this.page, 'input#login:template:guest:login');
    await waitFor(this.page, 'div.of-wrapper');
    if (await this.page.$(transformSelector('#login:template:error'))) {
      return false;
    }
    await waitFor(
      this.page,
      'input#dashboard:template:internal:licensingTab:j_id109:applyForLicence',
    );
    return true;
  }

  async selectPendingLicense() {
    await this.page.goto('https://ofcom.force.com/LicensingComLicences');
    await click(
      this.page,
      '#licences:template:internal:licenceApplicationsList:licenceApplicationList:licenceApplications:j_id237:0:continueApplication',
    );
    await waitFor(this.page, 'button[data-cs-group="Next"]');
    await this.page.click('button[data-cs-group="Next"]');
    await waitFor(this.page, 'input#checkCallSignAvailabilityButton');
  }

  async testCallsign(suffix) {
    return this.page.evaluate(avcheck, suffix);
  }

  async close() {
    this.browser.close();
  }
}

exports.default = OfcomScrape;
