const express = require('express');
const cors = require('cors');

const { createError } = require('./utils/errors');
const seriesRouter = require('./routes/series.routes');
const booksRouter = require('./routes/books.routes');
const chaptersRouter = require('./routes/chapters.routes');
const readingProgressRouter = require('./routes/reading-progress.routes');
const dashboardRouter = require('./routes/dashboard.routes');
const statisticsRouter = require('./routes/statistics.routes');

const errorHandler = require('./middleware/error-handler');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200'
}));
app.use(express.json());

app.get('/api/health', function(req, res) {
  res.json({
    status: 'ok',
    service: 'personal-library-api'
  });
});

app.use('/api/series', seriesRouter);
app.use('/api/books', booksRouter);
app.use('/api/chapters', chaptersRouter);
app.use('/api/reading-progress', readingProgressRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/statistics', statisticsRouter);

app.use(function(req, res, next) {
  next(createError('RESOURCE_NOT_FOUND', 'Route not found', 404));
});

app.use(errorHandler);

module.exports = app;
