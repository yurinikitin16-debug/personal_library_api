import { Hono } from 'hono';
import { cors } from 'hono/cors';

import supabaseConfig from './config/supabase.js';
import booksService from './services/books.service.js';
import chaptersService from './services/chapters.service.js';
import dashboardService from './services/dashboard.service.js';
import readingProgressService from './services/reading-progress.service.js';
import seriesService from './services/series.service.js';
import statisticsService from './services/statistics.service.js';
import bookSchemas from './validators/book.schemas.js';
import chapterSchemas from './validators/chapter.schemas.js';
import progressSchemas from './validators/progress.schemas.js';
import seriesSchemas from './validators/series.schemas.js';
import { z } from 'zod';

const { setSupabaseConfig } = supabaseConfig;

const app = new Hono();

function createErrorResponse(error) {
  const status = error.status || error.response?.status || 500;
  const data = error.response?.data;

  return {
    status,
    body: {
      errorCode: error.errorCode || data?.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || data?.message || 'Internal server error',
      details: error.details || data || null
    }
  };
}

function validate(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    const error = new Error('Invalid request data');
    error.errorCode = 'VALIDATION_ERROR';
    error.status = 400;
    error.details = result.error.flatten();
    throw error;
  }

  return result.data;
}

async function getJsonBody(context) {
  if (!context.req.header('content-type')?.includes('application/json')) {
    return {};
  }

  return context.req.json();
}

function bindSupabaseEnv(context, next) {
  setSupabaseConfig({
    supabaseUrl: context.env.SUPABASE_URL,
    supabaseApiKey: context.env.SUPABASE_API_KEY,
    supabaseAnonKey: context.env.SUPABASE_ANON_KEY
  });

  return next();
}

app.use('*', bindSupabaseEnv);
app.use('*', async (context, next) => cors({
  origin: context.env.CLIENT_ORIGIN || 'http://localhost:4200'
})(context, next));

app.onError((error, context) => {
  const response = createErrorResponse(error);
  return context.json(response.body, response.status);
});

app.notFound((context) => context.json({
  errorCode: 'RESOURCE_NOT_FOUND',
  message: 'Route not found',
  details: null
}, 404));

app.get('/api/health', (context) => context.json({
  status: 'ok',
  service: 'personal-library-api'
}));

app.post('/api/series', async (context) => {
  const data = validate(seriesSchemas.createSeriesSchema, await getJsonBody(context));
  const series = await seriesService.createSeries(data);
  return context.json(series, 201);
});

app.get('/api/series', async (context) => {
  const series = await seriesService.getAllSeriesWithProgress();
  return context.json(series);
});

app.post('/api/series/:id/books', async (context) => {
  const params = validate(seriesSchemas.idParamSchema, context.req.param());
  const data = validate(bookSchemas.createBookSchema, await getJsonBody(context));
  const book = await booksService.createBook(params.id, data);
  return context.json(book, 201);
});

app.get('/api/series/:id/books', async (context) => {
  const params = validate(seriesSchemas.idParamSchema, context.req.param());
  const books = await booksService.getBooksBySeries(params.id);
  return context.json(books);
});

app.get('/api/series/:id', async (context) => {
  const params = validate(seriesSchemas.idParamSchema, context.req.param());
  const series = await seriesService.getSeriesDetails(params.id);
  return context.json(series);
});

app.put('/api/series/:id', async (context) => {
  const params = validate(seriesSchemas.idParamSchema, context.req.param());
  const data = validate(seriesSchemas.updateSeriesSchema, await getJsonBody(context));
  const series = await seriesService.updateSeries(params.id, data);
  return context.json(series);
});

app.delete('/api/series/:id', async (context) => {
  const params = validate(seriesSchemas.idParamSchema, context.req.param());
  await seriesService.deleteSeries(params.id);
  return context.body(null, 204);
});

app.post('/api/books/series/:seriesId', async (context) => {
  const params = validate(bookSchemas.seriesIdParamSchema, context.req.param());
  const data = validate(bookSchemas.createBookSchema, await getJsonBody(context));
  const book = await booksService.createBook(params.seriesId, data);
  return context.json(book, 201);
});

app.get('/api/books/series/:seriesId', async (context) => {
  const params = validate(bookSchemas.seriesIdParamSchema, context.req.param());
  const books = await booksService.getBooksBySeries(params.seriesId);
  return context.json(books);
});

app.post('/api/books/:id/chapters/bulk', async (context) => {
  const params = validate(bookSchemas.idParamSchema, context.req.param());
  const data = validate(chapterSchemas.bulkCreateChaptersSchema, await getJsonBody(context));
  const chapters = await chaptersService.createChaptersBulk(params.id, data.chapters);
  return context.json(chapters, 201);
});

app.post('/api/books/:id/chapters', async (context) => {
  const params = validate(bookSchemas.idParamSchema, context.req.param());
  const data = validate(chapterSchemas.createChapterSchema, await getJsonBody(context));
  const chapter = await chaptersService.createChapter(params.id, data);
  return context.json(chapter, 201);
});

app.get('/api/books/:id/chapters', async (context) => {
  const params = validate(bookSchemas.idParamSchema, context.req.param());
  const chapters = await chaptersService.getChaptersByBook(params.id);
  return context.json(chapters);
});

app.put('/api/books/:id', async (context) => {
  const params = validate(bookSchemas.idParamSchema, context.req.param());
  const data = validate(bookSchemas.updateBookSchema, await getJsonBody(context));
  const book = await booksService.updateBook(params.id, data);
  return context.json(book);
});

app.delete('/api/books/:id', async (context) => {
  const params = validate(bookSchemas.idParamSchema, context.req.param());
  await booksService.deleteBook(params.id);
  return context.body(null, 204);
});

app.post('/api/chapters/book/:bookId', async (context) => {
  const params = validate(chapterSchemas.bookIdParamSchema, context.req.param());
  const data = validate(chapterSchemas.createChapterSchema, await getJsonBody(context));
  const chapter = await chaptersService.createChapter(params.bookId, data);
  return context.json(chapter, 201);
});

app.get('/api/chapters/book/:bookId', async (context) => {
  const params = validate(chapterSchemas.bookIdParamSchema, context.req.param());
  const chapters = await chaptersService.getChaptersByBook(params.bookId);
  return context.json(chapters);
});

app.put('/api/chapters/:id', async (context) => {
  const params = validate(chapterSchemas.idParamSchema, context.req.param());
  const data = validate(chapterSchemas.updateChapterSchema, await getJsonBody(context));
  const chapter = await chaptersService.updateChapter(params.id, data);
  return context.json(chapter);
});

app.delete('/api/chapters/:id', async (context) => {
  const params = validate(chapterSchemas.idParamSchema, context.req.param());
  await chaptersService.deleteChapter(params.id);
  return context.body(null, 204);
});

app.post('/api/reading-progress/chapters/:chapterId/schedule', async (context) => {
  const params = validate(progressSchemas.chapterIdParamSchema, context.req.param());
  const data = validate(progressSchemas.scheduleChapterSchema, await getJsonBody(context));
  const progress = await readingProgressService.scheduleChapter(params.chapterId, data.scheduledDate);
  return context.json(progress);
});

app.put('/api/reading-progress/chapters/:chapterId/schedule', async (context) => {
  const params = validate(progressSchemas.chapterIdParamSchema, context.req.param());
  const data = validate(progressSchemas.rescheduleChapterSchema, await getJsonBody(context));
  const progress = await readingProgressService.rescheduleChapter(params.chapterId, data.scheduledDate);
  return context.json(progress);
});

app.post('/api/reading-progress/chapters/:chapterId/read', async (context) => {
  const params = validate(progressSchemas.chapterIdParamSchema, context.req.param());
  const data = validate(progressSchemas.markChapterReadSchema, await getJsonBody(context));
  const progress = await readingProgressService.markChapterAsRead(params.chapterId, data.doneDate);
  return context.json(progress);
});

app.delete('/api/reading-progress/chapters/:chapterId/read', async (context) => {
  const params = validate(progressSchemas.chapterIdParamSchema, context.req.param());
  const progress = await readingProgressService.unmarkChapterAsRead(params.chapterId);
  return context.json(progress);
});

app.get('/api/reading-progress/plan', async (context) => {
  const plan = await readingProgressService.getReadingPlan();
  return context.json(plan);
});

app.get('/api/reading-progress/plan/next-date', async (context) => {
  const nextDate = await readingProgressService.getNextPlanDate();
  return context.json(nextDate);
});

app.post('/api/reading-progress/plan/books', async (context) => {
  const data = validate(progressSchemas.planBookSchema, await getJsonBody(context));
  const plannedBook = await readingProgressService.planBook(data.bookId, data.startDate);
  return context.json(plannedBook, 201);
});

app.get('/api/reading-progress/today', async (context) => {
  const chapter = await readingProgressService.getTodayChapter();
  return context.json(chapter);
});

app.get('/api/reading-progress/calendar', async (context) => {
  const calendar = await readingProgressService.getCalendarData();
  return context.json(calendar);
});

app.get('/api/dashboard', async (context) => {
  const summary = await dashboardService.getSummary();
  return context.json(summary);
});

app.get('/api/dashboard/summary', async (context) => {
  const summary = await dashboardService.getSummary();
  return context.json(summary);
});

app.get('/api/statistics', async (context) => {
  const statistics = await statisticsService.getStatistics();
  return context.json(statistics);
});

export default app;
