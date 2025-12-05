import { signInUser, signUpUser, signOutUser, getActiveSession, getCurrentUser } from './auth.js';
import { fetchBalance, fetchTransactionHistory, renderHistory } from './core.js';
import { transferFunds, topUpWallet } from './api.js';

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

const transactionForm = document.getElementById('transaction-form');
const transactionTitle = document.getElementById('transaction-title');
const transRecipientInput = document.getElementById('trans-recipient');
const transAmountInput = document.getElementById('trans-amount');
const transSubmitBtn = document.getElementById('trans-submit-btn');
const transactionMessage = document.getElementById('transaction-message');
const modalCloseBtn = transactionView.querySelector('.close-btn');

let isSignUp = false;
let currentTransactionType = null;
let currentUser = null;


// --- VIEW HANDLERS ---

const showView = (viewElement) => {
    // Hide all main views
    [authView, dashboardView, transactionView].forEach(view => {
        view.style.display = 'none';
    });

    if (viewElement === transactionView) {
        // Handle modal display
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
        
        // Load and display core data
        const balance = await fetchBalance(user.id);
        balanceDisplay.textContent = `${balance} PHP`;

        const history = await fetchTransactionHistory(user.id);
        renderHistory(history);
    } else {
        showView(authView);
        logoutBtn.style.display = 'none';
    }
};

// --- AUTH HANDLERS ---

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
            isSignUp = false; // Switch back to login after successful sign up
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


// --- TRANSACTION HANDLERS ---

const openTransactionModal = (type) => {
    currentTransactionType = type;
    transactionForm.reset();
    transactionMessage.textContent = '';
    transactionMessage.classList.remove('error', 'success');

    if (type === 'TRANSFER') {
        transactionTitle.textContent = 'Transfer Funds';
        transRecipientInput.style.display = 'block';
        transRecipientInput.setAttribute('required', 'required');
    } else if (type === 'TOP_UP') {
        transactionTitle.textContent = 'Top Up Wallet';
        transRecipientInput.style.display = 'none';
        transRecipientInput.removeAttribute('required');
    }
    // Note: Merchant Purchase logic would be similar, perhaps requiring a merchant ID

    showView(transactionView);
};

document.getElementById('show-transfer-btn').addEventListener('click', () => openTransactionModal('TRANSFER'));
document.getElementById('show-topup-btn').addEventListener('click', () => openTransactionModal('TOP_UP'));
modalCloseBtn.addEventListener('click', () => updateDashboard()); // Close and refresh dashboard


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
            
            // Calls the Vercel Serverless Function (api/transfer.js)
            result = await transferFunds(currentUser.id, recipientEmail, amount);

        } else if (currentTransactionType === 'TOP_UP') {
            // Calls the Vercel Serverless Function (api/topUp.js)
            result = await topUpWallet(currentUser.id, amount);

        } else {
            throw new Error("Invalid transaction type.");
        }

        transactionMessage.textContent = `${result.message || 'Transaction successful!'} ID: ${result.transaction_id || 'N/A'}`;
        transactionMessage.classList.add('success');
        transactionForm.reset();

        // Refresh dashboard after a short delay to allow database triggers to complete
        setTimeout(updateDashboard, 1500); 

    } catch (error) {
        // Display the specific error message from the server/database
        transactionMessage.textContent = `Error: ${error.message}`;
        transactionMessage.classList.add('error');
    } finally {
        transSubmitBtn.disabled = false;
    }
});


// --- INITIALIZATION ---

// Use Supabase's built-in listener to handle session changes (e.g., refreshing the page)
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        updateDashboard();
    } else if (event === 'SIGNED_OUT') {
        updateDashboard();
    }
});

// Initial check on load
updateDashboard();