/**
 * Combined Context Providers
 * 
 * This file exports all context providers for easy consumption.
 * Use AppProviders to wrap your app with all necessary contexts.
 */

// Re-export all contexts
export { AuthProvider, useAuthContext } from './AuthContext';
export { BusinessProvider, useBusiness } from './BusinessContext';
export { InventoryProvider, useInventoryContext } from './InventoryContext';

// Re-export supabase client
export { supabase } from './supabase';
