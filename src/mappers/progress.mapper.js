const { mapCoverUrl } = require('../utils/cover-url');

function mapReadingProgress(row) {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    scheduledDate: row.scheduled_date,
    doneDate: row.done_date,
    completed: Boolean(row.done_date)
  };
}

function mapReadingPlanItem(progress, context) {
  return {
    progressId: progress.id,
    chapterId: context.chapter.id,
    chapterTitle: context.chapter.title,
    chapterOrder: context.chapter.chapter_order,
    bookId: context.book.id,
    bookTitle: context.book.title,
    bookCoverUrl: mapCoverUrl(context.book.cover_url),
    bookOrder: context.book.book_order,
    seriesId: context.series.id,
    seriesName: context.series.name,
    scheduledDate: progress.scheduled_date,
    doneDate: progress.done_date,
    completed: Boolean(progress.done_date)
  };
}

function mapCalendarDay(date, scheduled, completed) {
  return {
    date,
    scheduled,
    completed
  };
}

module.exports = {
  mapReadingProgress,
  mapReadingPlanItem,
  mapCalendarDay
};
