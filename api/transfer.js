// api/transfer.js

import { createClient } from '@supabase/supabase-js';

// NOTE: It is assumed your environment variables are configured in Vercel.
// Using hardcoded key here for completeness, but use process.env in production.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://liwjgydaiyzvqfxcjlsp.supabase.co';
// WARNING: Using hardcoded mock key for simplicity/demonstration purposes ONLY.
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd2pneWRhaXl6dnFmeGNqbHNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzOTY3NiwiZXhwIjoyMDgwNTE1Njc2fQ.YxaE88jptcEiRa2y2EWSN9areeO5YL3DDKrMa-6KFuM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Use module.exports for maximum compatibility with Vercel's Node.js runtime
module.exports = async (req, res) => {
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
            sender_id_input: senderId,
            recipient_email_input: recipientEmail,
            transfer_amount: parseFloat(amount)
        });

        if (error) {
            console.error('Supabase RPC Error:', error.message);
            // The database function returns SQLERRM on failure
            return res.status(400).json({ // Using 400 for database validation/constraint errors
                status: 'error',
                message: error.message || 'Transaction failed due to a database error.'
            });
        }
        
        // Return the JSON result from the RPC call
        const result = data;
        return res.status(200).json(result);

    } catch (error) {
        console.error('Serverless Function Catch Error:', error.message);
        return res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
};