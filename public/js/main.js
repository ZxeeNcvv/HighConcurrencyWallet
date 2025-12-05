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

// --- Global Variables (Only simple state) ---
let isSignUp = false;
let currentTransactionType = null;
let currentUser = null;

// --- DOM References (Initialized later in DOMContentLoaded) ---
let authView, dashboardView, transactionView, logoutBtn;
let authForm, authSubmitBtn, authMessage, toggleAuthLink, authNameInput;
let balanceDisplay;
let showHistoryBtn, historyListContainer, modalContentBody;
let transactionForm, transactionTitle, transRecipientInput, transAmountInput, transSubmitBtn, transactionMessage, modalCloseBtn;


// --- VIEW HANDLERS ---

const showView = (viewElement) => {
    // Hide all main views
    [authView, dashboardView, transactionView].forEach(view => {
        if (view) view.style.display = 'none'; // Safe check
    });

    if (viewElement) viewElement.style.display = 'block';
};

const updateDashboard = async () => {
    const user = await getCurrentUser();
    if (user) {
        currentUser = user;
        showView(dashboardView);
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        const balance = await fetchBalance(user.id);
        if (balanceDisplay) balanceDisplay.textContent = `${balance} PHP`;

        const history = await fetchTransactionHistory(user.id);
        renderHistory(history); 

    } else {
        showView(authView);
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
};

// --- AUTH HANDLERS ---

const handleAuthToggle = (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    authNameInput.style.display = isSignUp ? 'block' : 'none';
    authSubmitBtn.textContent = isSignUp ? 'Sign Up' : 'Login';
    toggleAuthLink.textContent = isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up';
    authMessage.textContent = '';
};

const handleAuthSubmit = async (e) => {
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
};

const handleLogout = async () => {
    await signOutUser();
    updateDashboard();
};


// --- TRANSACTION/HISTORY HANDLERS ---

const openTransactionModal = (type) => {
    currentTransactionType = type;
    transactionForm.reset();
    transactionMessage.textContent = '';
    transactionMessage.classList.remove('error', 'success');
    
    // 1. Reset Modal Body (CRITICAL FOR MODAL REUSE)
    if (modalContentBody) {
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
            historyListContainer.style.display = 'block';
        }
    }
    
    showView(transactionView);
}

const handleTransactionSubmit = async (e) => {
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
};


// --- FINAL INITIALIZATION BLOCK (CRITICAL: All listeners and references set here) ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Assign all DOM elements now that the document is ready
    authView = document.getElementById('auth-view');
    dashboardView = document.getElementById('dashboard-view');
    transactionView = document.getElementById('transaction-view');
    logoutBtn = document.getElementById('logout-btn');

    authForm = document.getElementById('auth-form');
    authSubmitBtn = document.getElementById('auth-submit-btn');
    authMessage = document.getElementById('auth-message');
    toggleAuthLink = document.getElementById('toggle-auth');
    authNameInput = document.getElementById('auth-name');

    balanceDisplay = document.getElementById('current-balance');

    showHistoryBtn = document.getElementById('show-history-btn');
    historyListContainer = document.getElementById('history-list-container');
    modalContentBody = document.getElementById('modal-content-body');
    
    transactionForm = document.getElementById('transaction-form');
    transactionTitle = document.getElementById('transaction-title');
    transRecipientInput = document.getElementById('trans-recipient');
    transAmountInput = document.getElementById('trans-amount');
    transSubmitBtn = document.getElementById('trans-submit-btn');
    const showTransferBtn = document.getElementById('show-transfer-btn');
    const showTopupBtn = document.getElementById('show-topup-btn');
    const showPurchaseBtn = document.getElementById('show-purchase-btn'); // New
    transactionMessage = document.getElementById('transaction-message');
    modalCloseBtn = transactionView ? transactionView.querySelector('.close-btn') : null;


    // 2. Attach all event listeners
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (toggleAuthLink) toggleAuthLink.addEventListener('click', handleAuthToggle);
    if (transactionForm) transactionForm.addEventListener('submit', handleTransactionSubmit);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => updateDashboard());

    // Transaction Buttons
    if (showTransferBtn) showTransferBtn.addEventListener('click', () => openTransactionModal('TRANSFER'));
    if (showTopupBtn) showTopupBtn.addEventListener('click', () => openTransactionModal('TOP_UP'));
    if (showPurchaseBtn) showPurchaseBtn.addEventListener('click', () => openTransactionModal('PURCHASE')); // Merchant
    if (showHistoryBtn) showHistoryBtn.addEventListener('click', openHistoryModal); 


    // 3. Start state tracking
    supabase.auth.onAuthStateChange((event, session) => { 
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            updateDashboard();
        } else if (event === 'SIGNED_OUT') {
            updateDashboard();
        }
    });

    updateDashboard(); // Initial check
});