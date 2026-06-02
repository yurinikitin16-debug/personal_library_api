const supabase = require('../clients/supabase');
const { createError } = require('../utils/errors');
const { mapCoverUrl } = require('../utils/cover-url');
const { mapSeries, mapSeriesDetails, mapSeriesProgress } = require('../mappers/series.mapper');

function encode(value) {
  return encodeURIComponent(value);
}

function getProgress(totalChapters, completedChapters) {
  return {
    totalChapters,
    completedChapters,
    progressPercentage: totalChapters === 0
      ? 0
      : Math.round((completedChapters / totalChapters) * 100)
  };
}

function mapBookProgress(book, chapters, progressByChapterId) {
  const bookChapters = chapters.filter((chapter) => chapter.book_id === book.id);
  const completedChapters = bookChapters.filter((chapter) => {
    const progress = progressByChapterId.get(String(chapter.id));
    return Boolean(progress && progress.done_date);
  }).length;

  return {
    id: book.id,
    seriesId: book.series_id,
    title: book.title,
    author: book.author,
    bookOrder: book.book_order,
    pages: book.pages,
    coverUrl: mapCoverUrl(book.cover_url),
    ...getProgress(bookChapters.length, completedChapters)
  };
}

function isBookCompleted(book, chapters, progressByChapterId) {
  const bookChapters = chapters.filter((chapter) => chapter.book_id === book.id);

  if (bookChapters.length === 0) {
    return false;
  }

  return bookChapters.every((chapter) => {
    const progress = progressByChapterId.get(String(chapter.id));
    return Boolean(progress && progress.done_date);
  });
}

function toIdList(rows) {
  return rows.map((row) => encode(row.id)).join(',');
}

async function getRows(path, params) {
  const response = await supabase.get(path, params);
  return response.data;
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

async function getSeriesOrThrow(id) {
  const rows = await getRows('series', `?select=*&id=eq.${encode(id)}&is_enabled=is.true`);

  if (rows.length === 0) {
    throw createError('SERIES_NOT_FOUND', 'Series not found', 404);
  }

  return rows[0];
}

class SeriesService {
  async createSeries(data) {
    const response = await supabase.post('series', {
      name: data.name,
      cover_url: data.coverUrl || null,
      is_enabled: true
    });

    return mapSeries(response.data[0]);
  }

  async getAllSeriesWithProgress() {
    const series = await getRows('series', '?select=*&is_enabled=is.true&order=id.asc');

    if (series.length === 0) {
      return [];
    }

    const books = await getRows(
      'book',
      `?select=*&series_id=in.(${toIdList(series)})&is_enabled=is.true`
    );
    const chapters = books.length === 0
      ? []
      : await getRows('chapter', `?select=*&book_id=in.(${toIdList(books)})&is_enabled=is.true`);
    const progressByChapterId = await getProgressByChapterIds(chapters.map((chapter) => chapter.id));

    return series.map((seriesRow) => {
      const seriesBooks = books.filter((book) => book.series_id === seriesRow.id);
      const seriesBookIds = new Set(seriesBooks.map((book) => book.id));
      const seriesChapters = chapters.filter((chapter) => seriesBookIds.has(chapter.book_id));
      const completedChapters = seriesChapters.filter((chapter) => {
        const progress = progressByChapterId.get(String(chapter.id));
        return Boolean(progress && progress.done_date);
      }).length;

      return mapSeriesProgress(
        seriesRow,
        {
          ...getProgress(seriesChapters.length, completedChapters),
          booksCount: seriesBooks.length,
          completedBooksCount: seriesBooks.filter((book) => (
            isBookCompleted(book, chapters, progressByChapterId)
          )).length
        }
      );
    });
  }

  async getSeriesDetails(id) {
    const series = await getSeriesOrThrow(id);
    const books = await getRows(
      'book',
      `?select=*&series_id=eq.${encode(id)}&is_enabled=is.true&order=book_order.asc`
    );
    const chapters = books.length === 0
      ? []
      : await getRows('chapter', `?select=*&book_id=in.(${toIdList(books)})&is_enabled=is.true`);
    const progressByChapterId = await getProgressByChapterIds(chapters.map((chapter) => chapter.id));

    return mapSeriesDetails(
      series,
      books.map((book) => mapBookProgress(book, chapters, progressByChapterId))
    );
  }

  async updateSeries(id, data) {
    await getSeriesOrThrow(id);

    const response = await supabase.patch(
      'series',
      `id=eq.${encode(id)}`,
      {
        name: data.name,
        cover_url: data.coverUrl || null
      }
    );

    return mapSeries(response.data[0]);
  }

  async deleteSeries(id) {
    await getSeriesOrThrow(id);
    await supabase.patch('series', `id=eq.${encode(id)}`, { is_enabled: false });
  }
}

module.exports = new SeriesService();
