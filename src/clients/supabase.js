const axios = require('axios');
const { supabaseUrl, headers, validateSupabaseConfig } = require('../config/supabase');

function buildUrl(path, params = '') {
  validateSupabaseConfig();

  return `${supabaseUrl}/rest/v1/${path}${params}`;
}

async function get(path, params = '') {
  return axios.get(buildUrl(path, params), { headers, proxy: false });
}

async function post(path, payload) {
  return axios.post(
    buildUrl(path),
    Array.isArray(payload) ? payload : [payload],
    { headers: { ...headers, Prefer: 'return=representation' }, proxy: false }
  );
}

async function patch(path, filter, data) {
  return axios.patch(
    buildUrl(path, `?${filter}`),
    data,
    { headers: { ...headers, Prefer: 'return=representation' }, proxy: false }
  );
}

async function remove(path, filter) {
  return axios.delete(buildUrl(path, `?${filter}`), { headers, proxy: false });
}

module.exports = {
  get,
  post,
  patch,
  remove
};
