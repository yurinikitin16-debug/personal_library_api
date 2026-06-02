const { mapCoverUrl } = require('../utils/cover-url');

function mapBook(row) {
  return {
    id: row.id,
    seriesId: row.series_id,
    title: row.title,
    author: row.author,
    bookOrder: row.book_order,
    pages: row.pages,
    coverUrl: mapCoverUrl(row.cover_url)
  };
}

module.exports = {
  mapBook
};
