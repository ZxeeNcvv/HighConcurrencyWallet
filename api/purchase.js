// File: api/purchase.js (Vercel Serverless Function)

import { createClient } from '@supabase/supabase-js';

// Load environment variables (Vercel automatically handles these)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://liwjgydaiyzvqfxcjlsp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd2pneWRhaXl6dnFmeGNqbHNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzOTY3NiwiZXhwIjoyMDgwNTE1Njc2fQ.YxaE88jptcEiRa2y2EWSN9areeO5YL3DDKrMa-6KFuM';


// Initialize Supabase client with the Service Role Key for elevated privileges
// This key allows us to securely call database functions.
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async (req, res) => {
    // Check for POST request
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    }

    // Deconstruct the required parameters from the frontend request body
    const { buyerId, merchantEmail, amount } = req.body;

    // Basic data validation
    if (!buyerId || !merchantEmail || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ status: 'error', message: 'Invalid buyer, merchant email, or amount provided.' });
    }

    try {
        // Call the atomic PostgreSQL function
        const { data, error } = await supabaseAdmin.rpc('purchase_from_merchant_atomic', {
            buyer_id_input: buyerId,
            merchant_email_input: merchantEmail,
            purchase_amount: amount,
        });

        if (error) {
            console.error('PostgreSQL Error:', error);
            // Return a 400 error if the function fails (e.g., insufficient funds, merchant not found)
            return res.status(400).json({ 
                status: 'error', 
                message: error.message || 'Database function failed.' 
            });
        }

        // The RPC function returns a JSON object (e.g., { status: 'success', ... })
        return res.status(200).json(data);

    } catch (error) {
        console.error('Serverless Function Error:', error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error during transaction processing.' });
    }
};