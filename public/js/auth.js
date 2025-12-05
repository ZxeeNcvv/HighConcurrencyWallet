import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

// IMPORTANT: Using your provided Supabase credentials
const SUPABASE_URL = "https://liwjgydaiyzvqfxcjlsp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd2pneWRhaXl6dnFmeGNqbHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Mzk2NzYsImV4cCI6MjA4MDUxNTY3Nn0.8S6e2Q2WW70-z9ljIwyzN9JYDZ2SwFmQo-nKhcMhv3Q";

// Initialize the Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Supabase Authentication Functions
 */

export const signUpUser = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            // Include user metadata to save the full name
            data: { full_name: fullName } 
        }
    });

    if (error) {
        // Handle common errors like user already registered
        throw new Error(error.message);
    }
    
    // NOTE: Supabase requires email confirmation by default. 
    // For a school project, you might temporarily disable email confirmation in Supabase settings.

    // After successful auth, we need to insert the user into our 'users' table
    if (data.user) {
        const { error: insertError } = await supabase
            .from('users')
            .insert({ 
                id: data.user.id, 
                email: data.user.email, 
                full_name: fullName 
            });
        
        if (insertError) {
            console.error('Error inserting user into DB:', insertError);
            // In a real app, you might try to delete the auth user here.
            throw new Error('Sign up failed: Could not create user record.');
        }

        // Also create an account/wallet for the new user
        const { error: accountError } = await supabase
            .from('accounts')
            .insert({ user_id: data.user.id, currency: 'PHP', balance: 0.00 });

        if (accountError) {
            console.error('Error creating account:', accountError);
            throw new Error('Sign up failed: Could not create wallet account.');
        }
    }

    return data;
};

export const signInUser = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        throw new Error(error.message);
    }
    return data;
};

export const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Logout error:', error.message);
    }
};

export const getActiveSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};