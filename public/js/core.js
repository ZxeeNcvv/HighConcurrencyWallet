// File: public/js/core.js

import { supabase } from './auth.js'; 

const historyList = document.getElementById('transaction-history-list');

/**
 * Helper function to format the amount with color and sign based on entry type.
 * @param {string|number} amount - The transaction amount.
 * @param {string} entryType - The ledger entry type ('DEBIT' or 'CREDIT').
 * @returns {string} HTML string with formatted amount and CSS class.
 */
const formatAmountForDisplay = (amount, entryType) => {
    // Determine if the entry is a DEBIT (money leaving the user's account)
    const isDebit = entryType === 'DEBIT';
    
    // Apply formatting: '-' and red for DEBIT, '+' and green for CREDIT
    const prefix = isDebit ? '-' : '+';
    const colorClass = isDebit ? 'text-danger' : 'text-success'; 

    const formattedAmount = parseFloat(amount).toFixed(2);
    
    return `<span class="${colorClass}">${prefix}${formattedAmount} PHP</span>`;
};

/**
 * Fetches the current user's account balance.
 * @param {string} userId - The UUID of the logged-in user.
 * @returns {number} The current balance.
 */
export const fetchBalance = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('accounts')
            .select('balance')
            .eq('user_id', userId)
            .single();

        if (error) throw new Error(error.message);

        return data ? parseFloat(data.balance).toFixed(2) : '0.00';
    } catch (error) {
        console.error('Error fetching balance:', error.message);
        return 'N/A';
    }
};

/**
 * Fetches the user's detailed transaction history from the ledger, joining with the transactions table
 * to get the high-level transaction type (TOP_UP or TRANSFER).
 * @param {string} userId - The UUID of the logged-in user.
 * @returns {Array} A list of ledger entries with the associated transaction type.
 */
export const fetchTransactionHistory = async (userId) => {
    try {
        // 1. Get the account ID for the user
        const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (accountError) throw new Error(accountError.message);
        const accountId = accountData.id;

        // 2. Fetch ledger entries AND JOIN to the transactions table to get the transaction_type
        const { data: history, error: historyError } = await supabase
            .from('ledger_entries')
            .select(`
                *,
                transactions ( transaction_type )
            `)
            .eq('account_id', accountId)
            .order('created_at', { ascending: false });

        if (historyError) throw new Error(historyError.message);

        return history;

    } catch (error) {
        console.error('Error fetching history:', error.message);
        return [];
    }
};

/**
 * Renders the fetched transaction history to the dashboard list.
 * Applies conditional styling (red/- for debit, green/+ for credit) and specific descriptions.
 * @param {Array} history - The list of ledger entries with transaction type.
 */
export const renderHistory = (history) => {
    historyList.innerHTML = ''; // Clear existing history
    
    if (!history || history.length === 0) {
        historyList.innerHTML = '<p class="text-muted">No transactions found.</p>';
        return;
    }

    history.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

        const entryType = entry.entry_type; // 'CREDIT' or 'DEBIT'
        const displayAmount = formatAmountForDisplay(entry.amount, entryType);
        
        // Get the transaction type from the joined table data
        const transactionType = entry.transactions ? entry.transactions.transaction_type : null;

        let description = 'Unknown Transaction';
        
        if (entryType === 'DEBIT') {
            // Money left the user's account (always a Transfer Out)
            description = `Transfer Out`;
        } else if (entryType === 'CREDIT') {
            // Money entered the user's account (Top Up or Transfer In)
            if (transactionType === 'TOP_UP') {
                description = 'Wallet Top Up';
            } else if (transactionType === 'TRANSFER') {
                // This is the 'Receive' action you requested!
                description = 'Received Transfer';
            }
        }

        listItem.innerHTML = `
            <div>
                <span class="font-weight-bold">${description}</span>
                <small class="text-muted d-block">Trans. ID: ${entry.transaction_id}</small>
            </div>
            ${displayAmount}
        `;
        
        historyList.appendChild(listItem);
    });
};