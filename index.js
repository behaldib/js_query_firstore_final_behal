const admin = require('firebase-admin');
const functions = require('firebase-functions');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin and Firestore
admin.initializeApp();
const db = admin.firestore();

// Set SendGrid API key
sgMail.setApiKey('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');

// Directly including Twilio credentials
const twilioSid = 'AC42220a50c8dfd4b14f6656bb1db76700';
const twilioToken = 'ce18bc8275b4b7e6c645d20d35a7034d';
const twilioClient = new twilio(twilioSid, twilioToken);

exports.sendDealEmails = functions.firestore
  .document('deals/{dealId}')
  .onCreate(async (snap, context) => {
    const newDeal = snap.data();
    const { location, headline } = newDeal;

    //Twilio number and SendGrid verified sender email
    const fromPhoneNumber = '+18446700312'; // Replace with your Twilio phone number

    const subscribersSnapshot = await db.collection('subscribers')
      .where('watch_regions', 'array-contains-any', location)
      .get();

    if (subscribersSnapshot.empty) {
      console.log('No matching subscribers found.');
      return;
    }

    const notificationPromises = [];

    subscribersSnapshot.forEach(doc => {
      const subscriber = doc.data();
      // For SMS
      if (subscriber.phoneNumber) {
        const smsMessage = `New Travel Deal Alert for ${location.join(', ')}: ${headline}`;
        notificationPromises.push(
          twilioClient.messages.create({
            body: smsMessage,
            from: fromPhoneNumber,
            to: subscriber.phoneNumber,
          })
        );
        console.log(`Message sent to ${subscriber.phoneNumber}`);
      }
      sendEmail(subscriber.email_address, headline);
    });
    console.log('Emails sent to all matching subscribers.');
  });

function sendEmail(email, headline) {
  const msg = {
    to: email, // Change to your recipient
    from: 'dbehal@iu.edu', // Change to your verified sender
    subject: '[Divaye Behal] New Travel Deal Alert!',
    text: `A new travel deal has been posted: ${headline}`,
    html: `<strong>A new travel deal has been posted: ${headline}</strong>`,
  };

  sgMail.send(msg).then(() => {
    console.log(`Email sent to ${email}`);
  }).catch(error => {
    console.error(error);
  });
}
