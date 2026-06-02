const express = require('express');

const asyncHandler = require('../utils/async-handler');
const validate = require('../utils/validate');
const booksService = require('../services/books.service');
const seriesService = require('../services/series.service');
const {
  createBookSchema
} = require('../validators/book.schemas');
const {
  idParamSchema,
  createSeriesSchema,
  updateSeriesSchema
} = require('../validators/series.schemas');

const router = express.Router();

router.post('/', asyncHandler(async function(req, res) {
  const data = validate(createSeriesSchema, req.body);
  const series = await seriesService.createSeries(data);

  res.status(201).json(series);
}));

router.get('/', asyncHandler(async function(req, res) {
  const series = await seriesService.getAllSeriesWithProgress();

  res.json(series);
}));

router.get('/:id', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const series = await seriesService.getSeriesDetails(params.id);

  res.json(series);
}));

router.post('/:id/books', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const data = validate(createBookSchema, req.body);
  const book = await booksService.createBook(params.id, data);

  res.status(201).json(book);
}));

router.get('/:id/books', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const books = await booksService.getBooksBySeries(params.id);

  res.json(books);
}));

router.put('/:id', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  const data = validate(updateSeriesSchema, req.body);
  const series = await seriesService.updateSeries(params.id, data);

  res.json(series);
}));

router.delete('/:id', asyncHandler(async function(req, res) {
  const params = validate(idParamSchema, req.params);
  await seriesService.deleteSeries(params.id);

  res.status(204).send();
}));

module.exports = router;
