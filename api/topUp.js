import { createClient } from '@supabase/supabase-js';

// WARNING: Using hardcoded mock key for simplicity/demonstration purposes ONLY.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://liwjgydaiyzvqfxcjlsp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd2pneWRhaXl6dnFmeGNqbHNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDkzOTY3NiwiZXhwIjoyMDgwNTE1Njc2fQ.YxaE88jptcEiRa2y2EWSN9areeO5YL3DDKrMa-6KFuM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { userId, amount } = req.body;
    
    if (!userId || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Invalid user or amount provided.' });
    }

    try {
        const { data, error } = await supabase.rpc('top_up_funds_atomic', {
            user_id_input: userId,
            top_up_amount: parseFloat(amount)
        });

        if (error) {
            console.error('Supabase RPC Error:', error);
            return res.status(500).json({ 
                status: 'error', 
                message: error.message || 'Top-up failed due to a database error.'
            });
        }
        
        const result = data;
        return res.status(200).json(result);

    } catch (error) {
        console.error('Serverless Function Catch Error:', error);
        return res.status(500).json({ error: 'An unexpected server error occurred.' });
    }
};