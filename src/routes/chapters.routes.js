const express = require('express');

const asyncHandler = require('../utils/async-handler');
const validate = require('../utils/validate');
const chaptersService = require('../services/chapters.service');
const {
  idParamSchema,
  bookIdParamSchema,
  createChapterSchema,
  updateChapterSchema
} = require('../validators/chapter.schemas');

const router = express.Router();

router.post('/book/:bookId', asyncHandler(async function(req, res) {
  const params = validate(bookIdParamSchema, req.params);
  const data = validate(createChapterSchema, req.body);
  const chapter = await chaptersService.createChapter(params.bookId, data);

  res.status(201).json(chapter);
}));

router.get('/book/:bookId', asyncHandler(async function(req, res) {
  const params = validate(bookIdParamSchema, req.params);
  const chapters = await chaptersService.getChaptersByBook(params.bookId);

  res.json(chapters);
}));

router.put('/:id', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const data = validate(updateChapterSchema, req.body);
  const chapter = await chaptersService.updateChapter(params.id, data);

  res.json(chapter);
}));

router.delete('/:id', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  await chaptersService.deleteChapter(params.id);

  res.status(204).send();
}));

module.exports = router;
