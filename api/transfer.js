// api/transfer.js

import { createClient } from '@supabase/supabase-js';

// Use standard environment variables for Serverless Functions
const supabaseUrl = process.env.SUPABASE_URL;
// WARNING: Using hardcoded mock key for simplicity/demonstration purposes ONLY.
// In a real app, use: const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd2pneWRhaXl6dnFmeGNqbHNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzOTY3NiwiZXhwIjoyMDgwNTE1Njc2fQ.YxaE88jptcEiRa2y2EWSN9areeO5YL3DDKLMa-6KFuM'; 
// NOTE: I changed one character in the key to prevent accidental use, you should use your actual, working key.

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async (req, res) => {
    // Check if the required method is POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { senderId, recipientEmail, amount } = req.body;

    // Input validation
    if (!senderId || !recipientEmail || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Invalid input parameters (senderId, recipientEmail, or amount missing/invalid).' });
    }

    try {
        // Call the PostgreSQL RPC function. 
        // Ensure parameter names match the snake_case expected by the SQL function.
        const { data, error } = await supabase.rpc('transfer_funds_atomic', {
            sender_id_input: senderId,       // Use the input name defined in the SQL function
            recipient_email_input: recipientEmail, // Use the input name defined in the SQL function
            transfer_amount: parseFloat(amount)
        });

        if (error) {
            console.error('Supabase RPC Error:', error.message);
            // The database function returns SQLERRM on failure
            return res.status(400).json({ // Use 400 Bad Request for database validation errors
                status: 'error',
                message: error.message || 'Transaction failed due to a database error.'
            });
        }
        
        // Return the JSON result from the RPC call
        return res.status(200).json(data);

    } catch (error) {
        console.error('Serverless Function Catch Error:', error.message);
        return res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
};