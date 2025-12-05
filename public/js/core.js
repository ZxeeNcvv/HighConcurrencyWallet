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
    const isDebit = entryType === 'DEBIT';
    
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
 * Fetches the user's detailed transaction history from the ledger, joining the transactions and users tables.
 * @param {string} userId - The UUID of the logged-in user.
 * @returns {Array} A list of ledger entries with transaction and related user info.
 */
export const fetchTransactionHistory = async (userId) => {
    try {
        const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (accountError) throw new Error(accountError.message);
        const accountId = accountData.id;

        const { data: history, error: historyError } = await supabase
            .from('ledger_entries')
            .select(`
                *,
                transactions!inner ( 
                    transaction_type, 
                    initiated_by_user_id,
                    initiated_by_user:users!transactions_initiated_by_user_id_fkey ( email )
                )
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
 * Includes the final robust logic for labels and styling.
 * @param {Array} history - The list of ledger entries with transaction type.
 */
export const renderHistory = (history) => {
    // CRITICAL FIX: Ensure historyList is not null before proceeding
    if (!historyList) {
        console.error("Critical Error: HTML element with ID 'transaction-history-list' was not found.");
        return; 
    }
    
    historyList.innerHTML = ''; 
    
    if (!history || history.length === 0) {
        historyList.innerHTML = '<p class="text-muted">No transactions found.</p>';
        return;
    }

    try {
        history.forEach(entry => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');

            const entryType = entry.entry_type;
            const displayAmount = formatAmountForDisplay(entry.amount, entryType);
            
            // Robust Data Access
            const transaction = Array.isArray(entry.transactions) ? entry.transactions[0] : entry.transactions;
            const transactionType = transaction ? transaction.transaction_type : null;
            
            let relatedUser = null;
            if (transaction && transaction.initiated_by_user) {
                 relatedUser = Array.isArray(transaction.initiated_by_user) ? transaction.initiated_by_user[0] : transaction.initiated_by_user;
            }
            const relatedEmail = relatedUser ? relatedUser.email : 'Unknown User';

            let description = 'Unknown Transaction';
            let relatedPartyText = '';
            
            if (entryType === 'DEBIT') {
                description = `Transfer Out`;
                relatedPartyText = `Initiated By: ${relatedEmail}`;

            } else if (entryType === 'CREDIT') {
                if (transactionType === 'TOP_UP') {
                    description = 'Wallet Top Up';
                    relatedPartyText = 'From: System/Bank';
                } else if (transactionType === 'TRANSFER') {
                    description = 'Received Transfer';
                    relatedPartyText = `From: ${relatedEmail}`;
                } else {
                    description = 'Incoming Credit (Type Unknown)';
                    relatedPartyText = '';
                }
            }

            // --- RENDER HISTORY ITEM (Enhanced Structure for better CSS) ---
            listItem.innerHTML = `
                <div style="flex-grow: 1;">
                    <span class="font-weight-bold">${description}</span>
                    <small class="text-muted d-block">${relatedPartyText}</small>
                </div>
                ${displayAmount}
            `;
            
            historyList.appendChild(listItem);
        });

    } catch (error) {
        console.error('History Rendering Failed:', error);
        historyList.innerHTML = '<p class="text-danger">Error displaying history. Check console for details.</p>';
    }
};