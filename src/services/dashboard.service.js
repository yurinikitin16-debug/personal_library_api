const supabase = require('../clients/supabase');
const { addDays, getTodayDateString } = require('../utils/date');
const { calculateProgressPercentage } = require('../utils/progress');

async function getRows(path, params) {
  const response = await supabase.get(path, params);
  return response.data;
}

function mapById(rows) {
  return new Map(rows.map((row) => [String(row.id), row]));
}

function mapChapterContext(chapter, book, series, progress) {
  if (!chapter || !book || !series) {
    return null;
  }

  return {
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chapterOrder: chapter.chapter_order,
    bookId: book.id,
    bookTitle: book.title,
    bookOrder: book.book_order,
    seriesId: series.id,
    seriesName: series.name,
    scheduledDate: progress ? progress.scheduled_date : null,
    doneDate: progress ? progress.done_date : null,
    completed: Boolean(progress && progress.done_date)
  };
}

function calculateCurrentStreak(doneDates) {
  const uniqueDates = new Set(doneDates.filter(Boolean));

  if (uniqueDates.size === 0) {
    return 0;
  }

  const today = getTodayDateString();
  const startDate = uniqueDates.has(today)
    ? today
    : addDays(today, -1);

  if (!uniqueDates.has(startDate)) {
    return 0;
  }

  let streak = 0;
  let cursor = startDate;

  while (uniqueDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function getCompletedBooksCount(books, chaptersByBookId, progressByChapterId) {
  return books.filter((book) => {
    const chapters = chaptersByBookId.get(String(book.id)) || [];

    if (chapters.length === 0) {
      return false;
    }

    return chapters.every((chapter) => {
      const progress = progressByChapterId.get(String(chapter.id));
      return Boolean(progress && progress.done_date);
    });
  }).length;
}

function getCurrentReadingChapter(chapters, booksById, seriesById, progressByChapterId) {
  const sortedChapters = [...chapters].sort((left, right) => {
    const leftBook = booksById.get(String(left.book_id));
    const rightBook = booksById.get(String(right.book_id));
    const leftSeriesId = leftBook ? leftBook.series_id : 0;
    const rightSeriesId = rightBook ? rightBook.series_id : 0;

    return leftSeriesId - rightSeriesId
      || (leftBook ? leftBook.book_order : 0) - (rightBook ? rightBook.book_order : 0)
      || left.chapter_order - right.chapter_order;
  });

  const chapter = sortedChapters.find((item) => {
    const progress = progressByChapterId.get(String(item.id));
    return !progress || !progress.done_date;
  });

  if (!chapter) {
    return null;
  }

  const book = booksById.get(String(chapter.book_id));
  const series = book ? seriesById.get(String(book.series_id)) : null;
  const progress = progressByChapterId.get(String(chapter.id));

  return mapChapterContext(chapter, book, series, progress);
}

function getTodayPlannedChapter(progressRows, chaptersById, booksById, seriesById) {
  const today = getTodayDateString();
  const progress = progressRows.find((item) => (
    item.scheduled_date === today
    && !item.done_date
    && chaptersById.has(String(item.chapter_id))
  ));

  if (!progress) {
    return null;
  }

  const chapter = chaptersById.get(String(progress.chapter_id));
  const book = chapter ? booksById.get(String(chapter.book_id)) : null;
  const series = book ? seriesById.get(String(book.series_id)) : null;

  return mapChapterContext(chapter, book, series, progress);
}

function getProgressBySeries(series, books, chaptersByBookId, progressByChapterId) {
  return series.map((seriesRow) => {
    const seriesBooks = books.filter((book) => book.series_id === seriesRow.id);
    const seriesChapters = seriesBooks.flatMap((book) => chaptersByBookId.get(String(book.id)) || []);
    const completedChapters = seriesChapters.filter((chapter) => {
      const progress = progressByChapterId.get(String(chapter.id));
      return Boolean(progress && progress.done_date);
    }).length;

    return {
      seriesId: seriesRow.id,
      seriesName: seriesRow.name,
      totalChapters: seriesChapters.length,
      completedChapters,
      progressPercentage: calculateProgressPercentage(completedChapters, seriesChapters.length)
    };
  });
}

class DashboardService {
  async getSummary() {
    const series = await getRows('series', '?select=*&is_enabled=is.true&order=id.asc');
    const activeSeriesIds = new Set(series.map((seriesRow) => seriesRow.id));
    const allBooks = await getRows('book', '?select=*&is_enabled=is.true&order=book_order.asc');
    const books = allBooks.filter((book) => activeSeriesIds.has(book.series_id));
    const activeBookIds = new Set(books.map((book) => book.id));
    const allChapters = await getRows('chapter', '?select=*&is_enabled=is.true&order=chapter_order.asc');
    const chapters = allChapters.filter((chapter) => activeBookIds.has(chapter.book_id));
    const progressRows = await getRows('reading_progress', '?select=*&is_enabled=is.true');

    const booksById = mapById(books);
    const seriesById = mapById(series);
    const chaptersById = mapById(chapters);
    const progressByChapterId = new Map(
      progressRows.map((progress) => [String(progress.chapter_id), progress])
    );
    const chaptersByBookId = new Map();

    chapters.forEach((chapter) => {
      const key = String(chapter.book_id);

      if (!chaptersByBookId.has(key)) {
        chaptersByBookId.set(key, []);
      }

      chaptersByBookId.get(key).push(chapter);
    });

    const totalChapters = chapters.length;
    const completedChapters = chapters.filter((chapter) => {
      const progress = progressByChapterId.get(String(chapter.id));
      return Boolean(progress && progress.done_date);
    }).length;

    return {
      totalChapters,
      completedChapters,
      overallProgressPercentage: calculateProgressPercentage(completedChapters, totalChapters),
      currentStreak: calculateCurrentStreak(progressRows.map((progress) => progress.done_date)),
      completedBooksCount: getCompletedBooksCount(books, chaptersByBookId, progressByChapterId),
      currentReadingChapter: getCurrentReadingChapter(chapters, booksById, seriesById, progressByChapterId),
      todayPlannedChapter: getTodayPlannedChapter(progressRows, chaptersById, booksById, seriesById),
      progressBySeries: getProgressBySeries(series, books, chaptersByBookId, progressByChapterId)
    };
  }
}

module.exports = new DashboardService();
