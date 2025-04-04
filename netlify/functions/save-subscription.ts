import { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  // Hanya terima POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Received request:', event.body);
    const { subscription } = JSON.parse(event.body || '{}');

    if (!subscription) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Missing subscription data' }),
      };
    }

    // Simpan subscription ke memory (temporary)
    console.log('Subscription saved:', subscription);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Subscription saved successfully' }),
    };
  } catch (error) {
    console.error('Error saving subscription:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to save subscription' }),
    };
  }
};

export { handler }; 