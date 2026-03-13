const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {

  async sendVerificationEmail({ email, verifyLink, business_name }) {
    try {
      const { data, error } = await resend.emails.send({
        from: "TajerTrust <noreply@tajertrust.com>", // must use your verified domain
        to: email,
        subject: "Verify your TajerTrust account",
        text: `Hello ${business_name}, verify your account: ${verifyLink}`,
        html: `
          <h2>Verify your email</h2>
          <p>Hello <b>${business_name}</b>,</p>
          <p>Please verify your TajerTrust account by clicking below:</p>
          <p>
            <a href="${verifyLink}" 
               style="background:#2563eb;color:white;padding:10px 18px;text-decoration:none;border-radius:6px;">
               Verify Email
            </a>
          </p>
          <p>If the button doesn't work:</p>
          <p>${verifyLink}</p>
        `
      });

      if (error) {
        console.error("❌ Resend error:", error);
        throw new Error(error.message);
      }

      console.log("📧 Email sent:", data.id);
      return true;

    } catch (err) {
      console.error("❌ EMAIL ERROR:", err.message);
      throw err;
    }
  }

}

module.exports = new EmailService();


// USE NODEMAILER FO TESTING : DIGITAL OCEAN DOESNT4 ACCEPT SMTP GMAIL
// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false,
    
//   }
// });

// // Verify SMTP connection once at startup
// transporter.verify()
//   .then(() => console.log("✅ SMTP connection verified"))
//   .catch(err => console.error("❌ SMTP connection error:", err));

// class EmailService {

//   async sendVerificationEmail({ email, verifyLink, business_name }) {
//     try {

//       const info = await transporter.sendMail({
//         from: `"TajerTrust" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: "Verify your TajerTrust account",
//         text: `Hello ${business_name}, verify your account: ${verifyLink}`,
//         html: `
//           <h2>Verify your email</h2>
//           <p>Hello <b>${business_name}</b>,</p>
//           <p>Please verify your TajerTrust account by clicking below:</p>
//           <p>
//             <a href="${verifyLink}" 
//                style="background:#2563eb;color:white;padding:10px 18px;text-decoration:none;border-radius:6px;">
//                Verify Email
//             </a>
//           </p>
//           <p>If the button doesn't work:</p>
//           <p>${verifyLink}</p>
//         `
//       });

//       console.log("📧 Email sent:", info.messageId);
//       return true;

//     } catch (err) {

//       console.error("❌ EMAIL ERROR:", err.message);

//       if (err.message.includes("534") || err.message.includes("Username and Password not accepted")) {
//         console.error("💡 Gmail App Password incorrect.");
//       } else if (err.message.includes("ECONNREFUSED")) {
//         console.error("💡 SMTP connection refused.");
//       } else if (err.message.includes("ETIMEDOUT")) {
//         console.error("💡 SMTP timeout. Try port 465.");
//       }

//       throw err;
//     }
//   }

// }

// module.exports = new EmailService();




/*** FOR LOCAL TESTING ** */

// class EmailService {
//   async sendVerificationEmail({ email, verifyLink, business_name }) {
//     console.log('======================================');
//     console.log('📧 DEV MODE - EMAIL NOT SENT');
//     console.log('To:', email);
//     console.log('Business:', business_name);
//     console.log('Verification link:');
//     console.log(verifyLink);
//     console.log('======================================');

//     return true;
//   }
// }

// module.exports = new EmailService();






/*** WHEN PRODUCTION IS READY WITH SENDGRID *** */
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
