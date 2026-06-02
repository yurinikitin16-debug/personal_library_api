const supabase = require('../clients/supabase');
const { createError } = require('../utils/errors');
const { mapBook } = require('../mappers/book.mapper');

function encode(value) {
  return encodeURIComponent(value);
}

function toBookRow(seriesId, data) {
  return {
    series_id: seriesId,
    title: data.title,
    author: data.author || null,
    book_order: data.bookOrder,
    pages: data.pages || null,
    cover_url: data.coverUrl || null,
    is_enabled: true
  };
}

function toBookPatch(data) {
  return {
    title: data.title,
    author: data.author || null,
    book_order: data.bookOrder,
    pages: data.pages || null,
    cover_url: data.coverUrl || null
  };
}

async function getRows(path, params) {
  const response = await supabase.get(path, params);
  return response.data;
}

async function getSeriesOrThrow(seriesId) {
  const rows = await getRows('series', `?select=id&id=eq.${encode(seriesId)}&is_enabled=is.true`);

  if (rows.length === 0) {
    throw createError('SERIES_NOT_FOUND', 'Series not found', 404);
  }
}

async function getBookOrThrow(id) {
  const rows = await getRows('book', `?select=*&id=eq.${encode(id)}&is_enabled=is.true`);

  if (rows.length === 0) {
    throw createError('BOOK_NOT_FOUND', 'Book not found', 404);
  }

  return rows[0];
}

class BooksService {
  async createBook(seriesId, data) {
    await getSeriesOrThrow(seriesId);

    const response = await supabase.post('book', toBookRow(seriesId, data));

    return mapBook(response.data[0]);
  }

  async getBooksBySeries(seriesId) {
    await getSeriesOrThrow(seriesId);

    const rows = await getRows(
      'book',
      `?select=*&series_id=eq.${encode(seriesId)}&is_enabled=is.true&order=book_order.asc`
    );

    return rows.map(mapBook);
  }

  async updateBook(id, data) {
    await getBookOrThrow(id);

    const response = await supabase.patch(
      'book',
      `id=eq.${encode(id)}`,
      toBookPatch(data)
    );

    return mapBook(response.data[0]);
  }

  async deleteBook(id) {
    await getBookOrThrow(id);
    await supabase.patch('book', `id=eq.${encode(id)}`, { is_enabled: false });
  }
}

module.exports = new BooksService();
