import dns from 'dns';
import net from 'net';
import dotenv from "dotenv"
import {SMTPClient} from "smtp-client"; 

dotenv.config({
  path: '../.env'
})

// List of disposable email domains
const disposableDomains = [
    'tempmail.net', 'mailinator.com', 'guerrillamail.com', '10minutemail.com',
    'maildrop.cc', 'throwawaymail.com', 'mailnesia.com', 'getnada.com',
    'sharklasers.com', 'yopmail.com', 'spamgourmet.com', 'mytrashmail.com'
];


async function validateEmail(email) {
  // Basic email format check
  const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailFormat.test(email)) {
    return 'Invalid format';
  }

  // Check for disposable email domains
  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain.toLowerCase())) {
    return 'Disposable email address';
  }

  console.log("Domain")

  // Check MX records
  const mxRecords = await getMXRecords(domain);
  if (mxRecords.length === 0) {
    return 'Invalid MX records';
  }

  // Perform SMTP check
  const smtpCheckResult = await smtpCheck(email, mxRecords);
  return smtpCheckResult;
}

function smtpCheck(email, mxRecords) {
  return new Promise(async(resolve, reject) => {
    const smtpAddress = mxRecords[0].exchange;
    console.log(mxRecords)
    const client = new SMTPClient({
      host: smtpAddress,
      port: 25, // Try alternate ports if 25 is blocked
      tls: { rejectUnauthorized: false },
      secure: true,
      timeout: 10000 // Increase timeout
    });
  
    try {
      await client.connect();
      await client.greet({ hostname: 'localhost' });
      await client.mail({ from: `verify@${smtpAddress}` });
      await client.rcpt({ to: email });
      await client.quit();
       resolve('Valid');
    } catch (error) {
      console.log("SMTP Error", error);
      resolve(`SMTP check failed: ${error.message}`);
    }
    
  });
}

function getMXRecords(domain) {
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || addresses.length === 0) {
        resolve([]);
      } else {
        resolve(addresses);
      }
    });
  });
}

 const validateEmailController = async(req, res) => {
	
 const email = req.body.email;
  if (!email) {
    return res.status(400).send({ message: 'Email is required' });
  }

  try {
    const result = await validateEmail(email);
    res.send({ email, result });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
}

const emailfinder = async(req,res) => {
  const {companyName, firstName, lastName} = req.body;
    
    console.log(companyName, firstName, lastName);
    
     const apiKey = process.env.hunter_APIKEY;
  
     console.log(apiKey)
      try {
      
      const getDomain = await fetch(`https://api.hunter.io/v2/domain-search?company=${companyName}&api_key=${apiKey}`);
      const domainData = await getDomain.json();
      const domain = domainData?.data?.domain;

      console.log(domain, "domain")
      
    if(!domain){
    	res.status(404).send('Error fetching domain');
    	}
      
         const getEmail = await fetch(`https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${apiKey}`);
         const emailData = await getEmail.json();
          res.json(emailData);
      } catch (error) {
      console.error('Error:', error);
          res.status(500).send('Error fetching data');
      }	
  }
  
 export { validateEmailController, emailfinder };