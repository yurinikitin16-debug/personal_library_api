function mapChapter(row) {
  return {
    id: row.id,
    bookId: row.book_id,
    chapterOrder: row.chapter_order,
    title: row.title,
    pages: row.pages
  };
}

function mapChapterWithProgress(row, progress) {
  return {
    ...mapChapter(row),
    scheduledDate: progress ? progress.scheduled_date : null,
    doneDate: progress ? progress.done_date : null,
    completed: Boolean(progress && progress.done_date)
  };
}

module.exports = {
  mapChapter,
  mapChapterWithProgress
};
