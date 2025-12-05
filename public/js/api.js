// Function to make secure calls to our Vercel Serverless API endpoints
const callServerApi = async (endpoint, data) => {
    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        // Vercel function should return JSON
        const result = await response.json();

        if (!response.ok || result.status === 'error') {
            // Handle HTTP errors or application-specific errors returned by the serverless function
            const message = result.message || result.error || 'Unknown API error occurred.';
            throw new Error(`Transaction failed: ${message}`);
        }

        return result;

    } catch (error) {
        console.error(`Error calling ${endpoint}:`, error.message);
        throw error;
    }
};

/**
 * CORE FUNCTIONS: Call the serverless endpoints for critical transactions.
 * These functions require the user's ID (or other token) to be passed securely.
 */

// Function to call /api/transfer.js
export const transferFunds = async (senderId, recipientEmail, amount) => {
    return callServerApi('transfer', { senderId, recipientEmail, amount });
};

// Function to call /api/topUp.js
export const topUpWallet = async (userId, amount) => {
    // In a real application, this would integrate with a payment gateway.
    return callServerApi('topUp', { userId, amount });
};

// Function to call /api/purchase.js (Implementation for Merchant Purchase)
export const purchaseFromMerchant = async (buyerId, merchantEmail, amount) => {
    // Note: The Vercel endpoint should map this call to the 'purchase_from_merchant_atomic' RPC.
    return callServerApi('purchase', { buyerId, merchantEmail, amount });
};

// Export the centralized caller
export default callServerApi;