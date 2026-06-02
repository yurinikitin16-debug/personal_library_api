let envPath = null;

if (typeof __dirname !== 'undefined') {
  const path = require('path');

  envPath = path.resolve(__dirname, '../../.env');

  require('dotenv').config({
    path: envPath,
    quiet: true
  });
}

let supabaseUrl = (typeof process !== 'undefined' && process.env ? process.env.SUPABASE_URL || '' : '').trim();
let supabaseApiKey = (
  typeof process !== 'undefined' && process.env
    ? process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY || ''
    : ''
).trim();

function setSupabaseConfig(config) {
  supabaseUrl = (config.supabaseUrl || supabaseUrl || '').trim();
  supabaseApiKey = (config.supabaseApiKey || config.supabaseAnonKey || supabaseApiKey || '').trim();
}

function getSupabaseConfig() {
  return {
    supabaseUrl,
    supabaseApiKey
  };
}

function getHeaders(extraHeaders = {}) {
  return {
    apikey: supabaseApiKey,
    Authorization: `Bearer ${supabaseApiKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  };
}

function validateSupabaseConfig() {
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    throw new Error('SUPABASE_URL is missing or invalid');
  }

  if (!supabaseApiKey) {
    throw new Error('SUPABASE_API_KEY is missing');
  }
}

module.exports = {
  envPath,
  getHeaders,
  getSupabaseConfig,
  setSupabaseConfig,
  validateSupabaseConfig
};
