import { supabase } from './supabase';

export async function fetchTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_id, amount, status, created_at');

  if (error) {
    console.error('Error fetching transactions:', error.message);
    throw error;
  }

  return data;
}

export async function fetchUserProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, user_name, risk_score, status');

  if (error) {
    console.error('Error fetching user profiles:', error.message);
    throw error;
  }

  return data;
}

export async function fetchFraudAlerts() {
  const { data, error } = await supabase
    .from('fraud_alerts')
    .select('id, transaction_id, risk_level, reason, discovered_at');

  if (error) {
    console.error('Error fetching fraud alerts:', error.message);
    throw error;
  }

  return data;
}

export async function fetchHighRiskView() {
  const { data, error } = await supabase
    .from('high_risk_transactions_view')
    .select('*');

  if (error) {
    console.error('Error fetching high risk view:', error.message);
    throw error;
  }

  return data;
}

export async function fetchSystemLogs() {
  const { data, error } = await supabase
    .from('logs')
    .select('id, event_type, message, created_at');

  if (error) {
    console.error('Error fetching system logs:', error.message);
    throw error;
  }

  return data;
}
