// File: public/js/main.js

import { 
    signInUser, 
    signUpUser, 
    signOutUser, 
    getActiveSession, 
    getCurrentUser, 
    supabase 
} from './auth.js'; 
import { fetchBalance, fetchTransactionHistory, renderHistory } from './core.js';
import { transferFunds, topUpWallet, purchaseFromMerchant } from './api.js';

// --- DOM ELEMENTS ---
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const transactionView = document.getElementById('transaction-view');
const logoutBtn = document.getElementById('logout-btn');

const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authMessage = document.getElementById('auth-message');
const toggleAuthLink = document.getElementById('toggle-auth');
const authNameInput = document.getElementById('auth-name');

const balanceDisplay = document.getElementById('current-balance');

// HISTORY ELEMENTS
const showHistoryBtn = document.getElementById('show-history-btn');
const historyListContainer = document.getElementById('history-list-container');
const modalContentBody = document.getElementById('modal-content-body');
const transactionForm = document.getElementById('transaction-form');
const transactionMessage = document.getElementById('transaction-message');

// TRANSACTION ELEMENTS
const transactionTitle = document.getElementById('transaction-title');
const transRecipientInput = document.getElementById('trans-recipient');
const transAmountInput = document.getElementById('trans-amount');
const transSubmitBtn = document.getElementById('trans-submit-btn');
const modalCloseBtn = transactionView.querySelector('.close-btn');

let isSignUp = false;
let currentTransactionType = null;
let currentUser = null;


// --- VIEW HANDLERS (UNCHANGED) ---

const showView = (viewElement) => {
    // Hide all main views
    [authView, dashboardView, transactionView].forEach(view => {
        view.style.display = 'none';
    });

    if (viewElement === transactionView) {
        viewElement.style.display = 'block';
    } else {
        viewElement.style.display = 'block';
    }
};

const updateDashboard = async () => {
    const user = await getCurrentUser();
    if (user) {
        currentUser = user;
        showView(dashboardView);
        logoutBtn.style.display = 'block';
        
        const balance = await fetchBalance(user.id);
        balanceDisplay.textContent = `${balance} PHP`;

        const history = await fetchTransactionHistory(user.id);
        renderHistory(history); 

    } else {
        showView(authView);
        logoutBtn.style.display = 'none';
    }
};

// --- AUTH HANDLERS (UNCHANGED) ---

toggleAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    authNameInput.style.display = isSignUp ? 'block' : 'none';
    authSubmitBtn.textContent = isSignUp ? 'Sign Up' : 'Login';
    toggleAuthLink.textContent = isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up';
    authMessage.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = '';
    authMessage.classList.remove('error', 'success');
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const fullName = authNameInput.value;

    try {
        if (isSignUp) {
            await signUpUser(email, password, fullName);
            authMessage.textContent = 'Sign up successful! You can now log in.';
            authMessage.classList.add('success');
            isSignUp = false; 
            authNameInput.style.display = 'none';
            authSubmitBtn.textContent = 'Login';
            toggleAuthLink.textContent = 'Need an account? Sign Up';
        } else {
            await signInUser(email, password);
            authForm.reset();
            updateDashboard();
        }
    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.classList.add('error');
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOutUser();
    updateDashboard();
});


// --- TRANSACTION/HISTORY HANDLERS ---

const openTransactionModal = (type) => {
    currentTransactionType = type;
    transactionForm.reset();
    transactionMessage.textContent = '';
    transactionMessage.classList.remove('error', 'success');
    
    if (transactionForm && modalContentBody) {
        modalContentBody.innerHTML = '';
        modalContentBody.appendChild(transactionForm);
        modalContentBody.appendChild(transactionMessage);
        transactionForm.style.display = 'block';
    }


    if (type === 'TRANSFER') {
        transactionTitle.textContent = 'Transfer Funds';
        transRecipientInput.style.display = 'block';
        transRecipientInput.setAttribute('placeholder', 'Recipient Email');
        transRecipientInput.setAttribute('required', 'required');

    } else if (type === 'TOP_UP') {
        transactionTitle.textContent = 'Top Up Wallet';
        transRecipientInput.style.display = 'none';
        transRecipientInput.removeAttribute('required');

    } else if (type === 'PURCHASE') {
        transactionTitle.textContent = 'Merchant Purchase';
        transRecipientInput.style.display = 'block';
        transRecipientInput.setAttribute('placeholder', 'Merchant Email');
        transRecipientInput.setAttribute('required', 'required');
    }

    showView(transactionView);
};


const openHistoryModal = () => {
    transactionTitle.textContent = 'Transaction History';
    
    // 1. Clear modal body
    if (modalContentBody) {
        modalContentBody.innerHTML = '';
        // 2. Move the pre-rendered history list from the dashboard into the modal body
        if (historyListContainer) {
            modalContentBody.appendChild(historyListContainer);
            historyListContainer.style.display = 'block'; // Make history visible inside modal
        }
    }
    
    // 3. Show the modal
    showView(transactionView);
}


// Event listeners
document.getElementById('show-transfer-btn').addEventListener('click', () => openTransactionModal('TRANSFER'));
document.getElementById('show-topup-btn').addEventListener('click', () => openTransactionModal('TOP_UP'));
document.getElementById('show-history-btn').addEventListener('click', openHistoryModal); 

// <<< THE MISSING LINE: CONNECTING THE PURCHASE BUTTON >>>
document.getElementById('show-purchase-btn').addEventListener('click', () => openTransactionModal('PURCHASE'));


transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    transactionMessage.textContent = 'Processing...';
    transactionMessage.classList.remove('error', 'success');
    transSubmitBtn.disabled = true;

    const amount = parseFloat(transAmountInput.value);
    
    try {
        let result;
        if (!currentUser) throw new Error("User session not found.");
        
        if (currentTransactionType === 'TRANSFER') {
            const recipientEmail = transRecipientInput.value;
            if (!recipientEmail) throw new Error("Recipient email is required.");
            
            result = await transferFunds(currentUser.id, recipientEmail, amount);

        } else if (currentTransactionType === 'TOP_UP') {
            result = await topUpWallet(currentUser.id, amount);

        } else if (currentTransactionType === 'PURCHASE') {
            const merchantEmail = transRecipientInput.value;
            if (!merchantEmail) throw new Error("Merchant email is required.");

            result = await purchaseFromMerchant(currentUser.id, merchantEmail, amount);

        } else {
            throw new Error("Invalid transaction type.");
        }

        transactionMessage.textContent = `${result.message || 'Transaction successful!'} ID: ${result.transaction_id || 'N/A'}`;
        transactionMessage.classList.add('success');
        transactionForm.reset();

        setTimeout(updateDashboard, 1500); 

    } catch (error) {
        transactionMessage.textContent = `Error: ${error.message}`;
        transactionMessage.classList.add('error');
    } finally {
        transSubmitBtn.disabled = false;
    }
});

// --- FINAL INITIALIZATION BLOCK (UNCHANGED) ---
document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => { 
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            updateDashboard();
        } else if (event === 'SIGNED_OUT') {
            updateDashboard();
        }
    });

    updateDashboard(); // Initial check
});