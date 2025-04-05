// Einfaches Skript zum Testen der Funktion
const testFunction = async () => {
  try {
    const response = await fetch('https://zgwlrnfpyhhjjzdhrmhh.supabase.co/functions/v1/send-email-with-resend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Fügen Sie hier Ihren Bearer-Token ein, falls erforderlich
        // 'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify({
        to: 'flaviospacenomads@gmail.com',
        subject: 'Test E-Mail mit Resend',
        text: 'Dies ist eine Test-E-Mail',
        reportData: {
          client: 'Test Kunde',
          month: 'April',
          year: '2025',
          totalHours: 10,
          employeeName: 'Test Mitarbeiter',
          entries: [
            {
              date: '2025-04-05',
              project: 'Test Projekt',
              description: 'Test Beschreibung',
              hours: 5
            }
          ]
        },
        format: 'excel'
      })
    });

    const data = await response.json();
    console.log('Antwort:', data);
  } catch (error) {
    console.error('Fehler:', error);
  }
};

// Führen Sie die Funktion aus
testFunction();
