const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'amaldotrading@gmail.com',
    pass: 'yszy wsfr dhyb sbaa'
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

const mailOptions = {
  from: 'amaldotrading@gmail.com',
  to: 'amalatselling@gmail.com',
  subject: 'Test Email from Node.js',
  text: 'If you’re seeing this, it worked!'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log("Error:", error);
  }
  console.log('Email sent:', info.response);
});