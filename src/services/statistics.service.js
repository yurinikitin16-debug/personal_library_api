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

function groupChaptersByBookId(chapters) {
  const chaptersByBookId = new Map();

  chapters.forEach((chapter) => {
    const key = String(chapter.book_id);

    if (!chaptersByBookId.has(key)) {
      chaptersByBookId.set(key, []);
    }

    chaptersByBookId.get(key).push(chapter);
  });

  return chaptersByBookId;
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

function calculateLongestStreak(doneDates) {
  const sortedDates = [...new Set(doneDates.filter(Boolean))].sort();

  if (sortedDates.length === 0) {
    return 0;
  }

  let longestStreak = 1;
  let currentStreak = 1;

  for (let index = 1; index < sortedDates.length; index += 1) {
    if (sortedDates[index] === addDays(sortedDates[index - 1], 1)) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return longestStreak;
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

function groupCompletedByDay(completedProgressRows, activeChapterIds) {
  const countsByDay = new Map();

  completedProgressRows.forEach((progress) => {
    if (!activeChapterIds.has(progress.chapter_id)) {
      return;
    }

    countsByDay.set(
      progress.done_date,
      (countsByDay.get(progress.done_date) || 0) + 1
    );
  });

  return Array.from(countsByDay.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, completedChapters]) => ({
      date,
      completedChapters
    }));
}

function groupCompletedByMonth(completedByDay) {
  const countsByMonth = new Map();

  completedByDay.forEach((day) => {
    const month = day.date.slice(0, 7);

    countsByMonth.set(
      month,
      (countsByMonth.get(month) || 0) + day.completedChapters
    );
  });

  return Array.from(countsByMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, completedChapters]) => ({
      month,
      completedChapters
    }));
}

class StatisticsService {
  async getStatistics() {
    const series = await getRows('series', '?select=*&is_enabled=is.true&order=id.asc');
    const activeSeriesIds = new Set(series.map((seriesRow) => seriesRow.id));
    const allBooks = await getRows('book', '?select=*&is_enabled=is.true&order=book_order.asc');
    const books = allBooks.filter((book) => activeSeriesIds.has(book.series_id));
    const activeBookIds = new Set(books.map((book) => book.id));
    const allChapters = await getRows('chapter', '?select=*&is_enabled=is.true&order=chapter_order.asc');
    const chapters = allChapters.filter((chapter) => activeBookIds.has(chapter.book_id));
    const progressRows = await getRows('reading_progress', '?select=*&is_enabled=is.true');

    const chaptersByBookId = groupChaptersByBookId(chapters);
    const activeChapterIds = new Set(chapters.map((chapter) => chapter.id));
    const progressByChapterId = new Map(
      progressRows.map((progress) => [String(progress.chapter_id), progress])
    );
    const completedProgressRows = progressRows.filter((progress) => (
      progress.done_date && activeChapterIds.has(progress.chapter_id)
    ));

    const totalChapters = chapters.length;
    const completedChapters = chapters.filter((chapter) => {
      const progress = progressByChapterId.get(String(chapter.id));
      return Boolean(progress && progress.done_date);
    }).length;
    const completedByDay = groupCompletedByDay(completedProgressRows, activeChapterIds);

    return {
      totalChapters,
      completedChapters,
      overallProgressPercentage: calculateProgressPercentage(completedChapters, totalChapters),
      completedBooksCount: getCompletedBooksCount(books, chaptersByBookId, progressByChapterId),
      currentStreak: calculateCurrentStreak(completedProgressRows.map((progress) => progress.done_date)),
      longestStreak: calculateLongestStreak(completedProgressRows.map((progress) => progress.done_date)),
      progressBySeries: getProgressBySeries(series, books, chaptersByBookId, progressByChapterId),
      completedByMonth: groupCompletedByMonth(completedByDay),
      completedByDay
    };
  }
}

module.exports = new StatisticsService();
