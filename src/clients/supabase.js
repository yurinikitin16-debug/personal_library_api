const {
  getHeaders,
  getSupabaseConfig,
  validateSupabaseConfig
} = require('../config/supabase');

function buildUrl(path, params = '') {
  validateSupabaseConfig();
  const { supabaseUrl } = getSupabaseConfig();

  return `${supabaseUrl}/rest/v1/${path}${params}`;
}

async function parseResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data && data.message ? data.message : 'Supabase request failed');
    error.response = {
      status: response.status,
      data
    };
    throw error;
  }

  return {
    data
  };
}

async function get(path, params = '') {
  const response = await fetch(buildUrl(path, params), {
    method: 'GET',
    headers: getHeaders()
  });

  return parseResponse(response);
}

async function post(path, payload) {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: getHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(Array.isArray(payload) ? payload : [payload])
  });

  return parseResponse(response);
}

async function patch(path, filter, data) {
  const response = await fetch(buildUrl(path, `?${filter}`), {
    method: 'PATCH',
    headers: getHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(data)
  });

  return parseResponse(response);
}

async function remove(path, filter) {
  const response = await fetch(buildUrl(path, `?${filter}`), {
    method: 'DELETE',
    headers: getHeaders()
  });

  return parseResponse(response);
}

module.exports = {
  get,
  post,
  patch,
  remove
};
