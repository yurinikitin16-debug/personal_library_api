const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');

require('dotenv').config({
  path: envPath,
  quiet: true
});

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseApiKey = (process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

const headers = {
  apikey: supabaseApiKey,
  Authorization: `Bearer ${supabaseApiKey}`,
  'Content-Type': 'application/json'
};

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
  supabaseUrl,
  supabaseApiKey,
  headers,
  validateSupabaseConfig
};
