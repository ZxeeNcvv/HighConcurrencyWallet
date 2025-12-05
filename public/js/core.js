import { supabase } from './auth.js';

/**
 * CORE FUNCTIONALITY: Fetch and Render User Data
 */

// Fetches the user's current balance from the 'accounts' table
export const fetchBalance = async (userId) => {
    const { data, error } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching balance:', error);
        return 'Error';
    }
    // Format the balance to two decimal places
    return parseFloat(data.balance).toFixed(2);
};


// Fetches the user's transaction history from the 'transactions' table
export const fetchTransactionHistory = async (userId) => {
    // 1. Get the account ID for the user
    const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (accountError) {
        console.error('Error fetching account ID:', accountError);
        return [];
    }

    const accountId = accountData.id;

    // 2. Fetch all transactions related to this account (either initiated by user or related to their account)
    const { data: transactions, error: historyError } = await supabase
        .from('transactions')
        .select('*')
        // Filter for transactions initiated by the user OR transactions specifically related to their account
        .or(`initiated_by_user_id.eq.${userId},related_account_id.eq.${accountId}`)
        .order('created_at', { ascending: false })
        .limit(10); // Display only the last 10

    if (historyError) {
        console.error('Error fetching history:', historyError);
        return [];
    }

    return transactions;
};


// Renders the transaction history into the HTML table
export const renderHistory = (transactions) => {
    const historyBody = document.getElementById('history-body');
    historyBody.innerHTML = '';

    if (transactions.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="4">No transactions found.</td></tr>';
        return;
    }

    transactions.forEach(tx => {
        const row = historyBody.insertRow();
        
        const dateCell = row.insertCell(0);
        const typeCell = row.insertCell(1);
        const amountCell = row.insertCell(2);
        const statusCell = row.insertCell(3);

        dateCell.textContent = new Date(tx.created_at).toLocaleDateString();
        typeCell.textContent = tx.transaction_type.replace('_', ' ');
        amountCell.textContent = `${tx.amount} PHP`;
        statusCell.textContent = tx.status;
        
        // Color code for visual clarity
        if (tx.transaction_type.includes('SEND') || tx.transaction_type.includes('PURCHASE')) {
             amountCell.style.color = '#dc3545'; // Red for negative movement
        } else if (tx.transaction_type.includes('RECEIVE') || tx.transaction_type.includes('TOP_UP')) {
             amountCell.style.color = '#28a745'; // Green for positive movement
        }
    });
};