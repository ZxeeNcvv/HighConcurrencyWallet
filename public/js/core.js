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
 * Fetches the user's detailed transaction history from the ledger, joining the transactions and users tables.
 * This complex query fetches the high-level transaction type (TOP_UP/TRANSFER) and the email of the initiator.
 * @param {string} userId - The UUID of the logged-in user.
 * @returns {Array} A list of ledger entries with transaction and related user info.
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

        // 2. Fetch ledger entries and perform deep joins
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
 * Applies conditional styling (red/- for debit, green/+ for credit) and specific descriptions
 * including the related sender/recipient information.
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
        
        // Safely access the joined transaction data
        const transaction = Array.isArray(entry.transactions) ? entry.transactions[0] : entry.transactions;
        const transactionType = transaction ? transaction.transaction_type : null;
        
        // Safely access the related user's email data
        let relatedUser = null;
        if (transaction && transaction.initiated_by_user) {
             relatedUser = Array.isArray(transaction.initiated_by_user) ? transaction.initiated_by_user[0] : transaction.initiated_by_user;
        }
        const relatedEmail = relatedUser ? relatedUser.email : 'Unknown User';

        let description = 'Unknown Transaction';
        let relatedPartyText = '';
        
        if (entryType === 'DEBIT') {
            // DEBIT = Money leaving this user (Transfer Out)
            description = `Transfer Out`;
            // The related email is the initiator's email (Sender), but here we assume the initiator 
            // is the one sending the money, so we use the initiator's email as the 'From' party context.
            // For DEBIT, we want to show the recipient's identity, but since that's not easily joined, 
            // we use the initiator's email (which is better than nothing).
            relatedPartyText = `Initiated By: ${relatedEmail}`;

        } else if (entryType === 'CREDIT') {
            // CREDIT = Money entering this user (Top Up or Transfer In)
            if (transactionType === 'TOP_UP') {
                description = 'Wallet Top Up';
                relatedPartyText = 'From: System/Bank';
            } else if (transactionType === 'TRANSFER') {
                // This is the 'Receive' action you requested!
                description = 'Received Transfer';
                relatedPartyText = `From: ${relatedEmail}`;
            } else {
                description = 'Incoming Credit'; // Fallback for safety
            }
        }

        // --- RENDER HISTORY ITEM ---
        listItem.innerHTML = `
            <div style="flex-grow: 1;">
                <span class="font-weight-bold">${description}</span>
                <small class="text-muted d-block">${relatedPartyText}</small>
            </div>
            ${displayAmount}
        `;
        
        historyList.appendChild(listItem);
    });
};