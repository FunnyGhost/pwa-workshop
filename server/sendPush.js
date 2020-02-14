const webpush = require('web-push');

(async () => {
  webpush.setGCMAPIKey(process.env.FIREBASE_SERVER_API_KEY);
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_FOR_SUBJECT}`,
    process.env.FIREBASE_WEB_PUSH_PUBLIC_VAPID_KEY,
    process.env.FIREBASE_WEB_PUSH_PRIVATE_VAPID_KEY
  );

  // This is the output of calling JSON.stringify on a PushSubscription you receive on your client
  // Copy paste the console log of push subscription from the receiver client here
  const pushSubscription = {
    endpoint:
      'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABeRrV1J7S_8x6m2GXh6NFI-KRaUlou_L86bh0Fbs8GUEYgG4S9ZKIa7EIGFQvFSWDa-rktx0gGikAxUZ39i-E0VBrIbon6rOu_ElfJhJKDZq2UTpSXQu_GmBHLPtZ2IE0mwceRePvj_Q6xngNHIBar5czPThlCuFpEtc8fIg9XyYV0ZBA',
    keys: {
      auth: 'RU24gAvGYC0Sc2-RAFgcew',
      p256dh:
        'BLqIEvto4zMejcqOaiJQKwgB9O_awjBr004wR0S1LrrQWmYDNkrzSac87OliUKvNtVE-kOdrL08e_iftORc-3LU'
    }
  };

  const notificationPayload = {
    notification: {
      title: 'Session is about the start 🏃‍♀️',
      body: '"Community Interaction" by Gino Giraffe is starting in Hall 3.',
      icon: 'assets/pwa/manifest-icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now()
      },
      actions: [
        {
          action: 'reply',
          type: 'text',
          title: "What's your name? 👇",
          placeholder: 'Respond to organizers'
        }
      ]
    }
  };

  try {
    // Send the push notification
    await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload));
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
