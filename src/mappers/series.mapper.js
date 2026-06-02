const { mapCoverUrl } = require('../utils/cover-url');

function mapSeries(row) {
  return {
    id: row.id,
    name: row.name,
    coverUrl: mapCoverUrl(row.cover_url)
  };
}

function mapSeriesProgress(row, progress) {
  return {
    ...mapSeries(row),
    totalChapters: progress.totalChapters,
    completedChapters: progress.completedChapters,
    progressPercentage: progress.progressPercentage,
    booksCount: progress.booksCount,
    completedBooksCount: progress.completedBooksCount
  };
}

function mapSeriesDetails(row, books) {
  return {
    ...mapSeries(row),
    books
  };
}

module.exports = {
  mapSeries,
  mapSeriesProgress,
  mapSeriesDetails
};
