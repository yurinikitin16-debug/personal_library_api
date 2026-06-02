const express = require('express');

const asyncHandler = require('../utils/async-handler');
const validate = require('../utils/validate');
const booksService = require('../services/books.service');
const chaptersService = require('../services/chapters.service');
const {
  idParamSchema,
  seriesIdParamSchema,
  createBookSchema,
  updateBookSchema
} = require('../validators/book.schemas');
const {
  bulkCreateChaptersSchema,
  createChapterSchema
} = require('../validators/chapter.schemas');

const router = express.Router();

router.post('/series/:seriesId', asyncHandler(async function(req, res) {
  const params = validate(seriesIdParamSchema, req.params);
  const data = validate(createBookSchema, req.body);
  const book = await booksService.createBook(params.seriesId, data);

  res.status(201).json(book);
}));

router.get('/series/:seriesId', asyncHandler(async function(req, res) {
  const params = validate(seriesIdParamSchema, req.params);
  const books = await booksService.getBooksBySeries(params.seriesId);

  res.json(books);
}));

router.post('/:id/chapters/bulk', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const data = validate(bulkCreateChaptersSchema, req.body);
  const chapters = await chaptersService.createChaptersBulk(params.id, data.chapters);

  res.status(201).json(chapters);
}));

router.post('/:id/chapters', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const data = validate(createChapterSchema, req.body);
  const chapter = await chaptersService.createChapter(params.id, data);

  res.status(201).json(chapter);
}));

router.get('/:id/chapters', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const chapters = await chaptersService.getChaptersByBook(params.id);

  res.json(chapters);
}));

router.put('/:id', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const data = validate(updateBookSchema, req.body);
  const book = await booksService.updateBook(params.id, data);

  res.json(book);
}));

router.delete('/:id', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  await booksService.deleteBook(params.id);

  res.status(204).send();
}));

module.exports = router;
