const supabase = require('../clients/supabase');
const { createError } = require('../utils/errors');
const { mapChapter, mapChapterWithProgress } = require('../mappers/chapter.mapper');

function encode(value) {
  return encodeURIComponent(value);
}

function toChapterRow(bookId, data) {
  return {
    book_id: bookId,
    chapter_order: data.chapterOrder,
    title: data.title,
    pages: data.pages || null,
    is_enabled: true
  };
}

function toChapterPatch(data) {
  return {
    chapter_order: data.chapterOrder,
    title: data.title,
    pages: data.pages || null
  };
}

async function getRows(path, params) {
  const response = await supabase.get(path, params);
  return response.data;
}

async function getBookOrThrow(bookId) {
  const rows = await getRows('book', `?select=id&id=eq.${encode(bookId)}&is_enabled=is.true`);

  if (rows.length === 0) {
    throw createError('BOOK_NOT_FOUND', 'Book not found', 404);
  }
}

async function getChapterOrThrow(id) {
  const rows = await getRows('chapter', `?select=*&id=eq.${encode(id)}&is_enabled=is.true`);

  if (rows.length === 0) {
    throw createError('CHAPTER_NOT_FOUND', 'Chapter not found', 404);
  }

  return rows[0];
}

async function getProgressByChapterIds(chapterIds) {
  if (chapterIds.length === 0) {
    return new Map();
  }

  const rows = await getRows(
    'reading_progress',
    `?select=*&chapter_id=in.(${chapterIds.map(encode).join(',')})&is_enabled=is.true`
  );

  return new Map(rows.map((row) => [String(row.chapter_id), row]));
}

class ChaptersService {
  async createChapter(bookId, data) {
    await getBookOrThrow(bookId);

    const response = await supabase.post('chapter', toChapterRow(bookId, data));

    return mapChapter(response.data[0]);
  }

  async createChaptersBulk(bookId, chapters) {
    await getBookOrThrow(bookId);

    const rows = chapters.map((chapter) => toChapterRow(bookId, chapter));
    const response = await supabase.post('chapter', rows);

    return response.data.map(mapChapter);
  }

  async getChaptersByBook(bookId) {
    await getBookOrThrow(bookId);

    const chapters = await getRows(
      'chapter',
      `?select=*&book_id=eq.${encode(bookId)}&is_enabled=is.true&order=chapter_order.asc`
    );
    const progressByChapterId = await getProgressByChapterIds(chapters.map((chapter) => chapter.id));

    return chapters.map((chapter) => mapChapterWithProgress(
      chapter,
      progressByChapterId.get(String(chapter.id))
    ));
  }

  async updateChapter(id, data) {
    await getChapterOrThrow(id);

    const response = await supabase.patch(
      'chapter',
      `id=eq.${encode(id)}`,
      toChapterPatch(data)
    );

    return mapChapter(response.data[0]);
  }

  async deleteChapter(id) {
    await getChapterOrThrow(id);
    await supabase.patch('chapter', `id=eq.${encode(id)}`, { is_enabled: false });
  }
}

module.exports = new ChaptersService();
