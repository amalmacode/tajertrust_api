/*** FOR LOCAL TESTING ** */

class EmailService {
  async sendVerificationEmail({ email, verifyLink, business_name }) {
    console.log('======================================');
    console.log('📧 DEV MODE - EMAIL NOT SENT');
    console.log('To:', email);
    console.log('Business:', business_name);
    console.log('Verification link:');
    console.log(verifyLink);
    console.log('======================================');

    return true;
  }
}

module.exports = new EmailService();


/*** WHEN PRODUCTION IS READY *** */
// const sgMail = require('@sendgrid/mail');

// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// class EmailService {
//   async sendVerificationEmail({ email, verifyLink, business_name }) {
//     await sgMail.send({
//       to: email,
//       from: process.env.SENDGRID_FROM_EMAIL,
//       subject: "Confirmez votre email - TajerTrust",
//       html: `
//         <h2>Bienvenue 👋</h2>
//         <p>Bonjour ${business_name}</p>
//         <a href="${verifyLink}">Confirmer</a>
//       `
//     });
//   }
// }

// module.exports = new EmailService();
