const program = require('commander');
const fs = require('fs');
const csvWriter = require('csv-write-stream');
const readlineSync = require('readline-sync');

const pkg = require('./package.json');
const OfcomScrape = require('./ofcom-scrape.js').default;
const callsign = require('./callsign.js');

program.version(pkg.version).description('Ofcom callsign scraper.');

const introText = [
  "To use this tool you'll need to have passed an RSGB exam and not yet claimed your callsign.",
  "You'll need to have started the license application process as follows:",
  '\t* Log in to https://ofcom.force.com, or create a new account',
  "\t* Click 'Apply for a new license' and select 'Amateur Radio'",
  '\t* Enter your candidate number and select the license to apply for',
  "\t* Enter your personal details and click 'Next'",
  "\t* At the 'Call Sign Assignment' stage, click 'Save' and close the page",
  '',
  'This tool will need your ofcom login email address and password.',
];

program.command('*').action(async function(out_file) {
  const os = new OfcomScrape();
  for (let t of introText) {
    console.log(t);
  }

  let email = readlineSync.question('Email: ');
  let password = readlineSync.question('Password: ', {hideEchoBack: true});
  try {
    console.log("Logging in.")
    await os.init();
    if (!(await os.login(email, password))) {
      console.log('Invalid login!');
      return;
    }
    console.log("Locating license.")
    await os.selectPendingLicense();
    console.log('Starting scrape. This will take around 30 minutes to complete.');

    let writer = csvWriter({
      headers: ['suffix', 'status'],
    });
    writer.pipe(fs.createWriteStream(out_file));
    for (let suffix of callsign.suffixes()) {
      const data = await os.testCallsign(suffix);
      writer.write([suffix, data['Status']]);
    }
    console.log('Scrape finished.');
  } catch (e) {
    console.error(e);
  } finally {
    os.close();
  }
});

program.parse(process.argv);
