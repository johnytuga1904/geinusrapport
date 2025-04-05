// Einfaches Testskript für die Funktion
const testFunction = async () => {
  try {
    const response = await fetch('https://zgwlrnfpyhhjjzdhrmhh.supabase.co/functions/v1/send-email-with-resend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Test E-Mail',
        text: 'Dies ist ein Test'
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Antwort:', data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Führen Sie die Funktion aus
testFunction();
