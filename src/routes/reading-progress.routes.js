const express = require('express');

const asyncHandler = require('../utils/async-handler');
const validate = require('../utils/validate');
const readingProgressService = require('../services/reading-progress.service');
const {
  chapterIdParamSchema,
  markChapterReadSchema,
  planBookSchema,
  rescheduleChapterSchema,
  scheduleChapterSchema
} = require('../validators/progress.schemas');

const router = express.Router();

router.post('/chapters/:chapterId/schedule', asyncHandler(async function(req, res) {
  const params = validate(chapterIdParamSchema, req.params);
  const data = validate(scheduleChapterSchema, req.body);
  const progress = await readingProgressService.scheduleChapter(params.chapterId, data.scheduledDate);

  res.json(progress);
}));

router.put('/chapters/:chapterId/schedule', asyncHandler(async function(req, res) {
  const params = validate(chapterIdParamSchema, req.params);
  const data = validate(rescheduleChapterSchema, req.body);
  const progress = await readingProgressService.rescheduleChapter(params.chapterId, data.scheduledDate);

  res.json(progress);
}));

router.post('/chapters/:chapterId/read', asyncHandler(async function(req, res) {
  const params = validate(chapterIdParamSchema, req.params);
  const data = validate(markChapterReadSchema, req.body);
  const progress = await readingProgressService.markChapterAsRead(params.chapterId, data.doneDate);

  res.json(progress);
}));

router.delete('/chapters/:chapterId/read', asyncHandler(async function(req, res) {
  const params = validate(chapterIdParamSchema, req.params);
  const progress = await readingProgressService.unmarkChapterAsRead(params.chapterId);

  res.json(progress);
}));

router.get('/plan', asyncHandler(async function(req, res) {
  const plan = await readingProgressService.getReadingPlan();

  res.json(plan);
}));

router.get('/plan/next-date', asyncHandler(async function(req, res) {
  const nextDate = await readingProgressService.getNextPlanDate();

  res.json(nextDate);
}));

router.post('/plan/books', asyncHandler(async function(req, res) {
  const data = validate(planBookSchema, req.body);
  const plannedBook = await readingProgressService.planBook(data.bookId, data.startDate);

  res.status(201).json(plannedBook);
}));

router.get('/today', asyncHandler(async function(req, res) {
  const chapter = await readingProgressService.getTodayChapter();

  res.json(chapter);
}));

router.get('/calendar', asyncHandler(async function(req, res) {
  const calendar = await readingProgressService.getCalendarData();

  res.json(calendar);
}));

module.exports = router;
