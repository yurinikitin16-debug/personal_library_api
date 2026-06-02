const supabase = require('../clients/supabase');
const { createError } = require('../utils/errors');
const { addDays, getTodayDateString } = require('../utils/date');
const {
  mapCalendarDay,
  mapReadingPlanItem,
  mapReadingProgress
} = require('../mappers/progress.mapper');

function encode(value) {
  return encodeURIComponent(value);
}

function toIdList(rows) {
  return rows.map((row) => encode(row.id)).join(',');
}

async function getRows(path, params) {
  const response = await supabase.get(path, params);
  return response.data;
}

async function getChapterOrThrow(chapterId) {
  const rows = await getRows('chapter', `?select=*&id=eq.${encode(chapterId)}&is_enabled=is.true`);

  if (rows.length === 0) {
    throw createError('CHAPTER_NOT_FOUND', 'Chapter not found', 404);
  }

  return rows[0];
}

async function getBookOrThrow(bookId) {
  const rows = await getRows('book', `?select=*&id=eq.${encode(bookId)}&is_enabled=is.true`);

  if (rows.length === 0) {
    throw createError('BOOK_NOT_FOUND', 'Book not found', 404);
  }

  return rows[0];
}

async function getProgressByChapterId(chapterId) {
  const rows = await getRows(
    'reading_progress',
    `?select=*&chapter_id=eq.${encode(chapterId)}&is_enabled=is.true`
  );

  return rows[0] || null;
}

async function getScheduledProgressByDate(scheduledDate) {
  const rows = await getRows(
    'reading_progress',
    `?select=*&scheduled_date=eq.${encode(scheduledDate)}&is_enabled=is.true`
  );

  return rows[0] || null;
}

async function getScheduledProgressRowsByDates(dates) {
  if (dates.length === 0) {
    return [];
  }

  return getRows(
    'reading_progress',
    `?select=*&scheduled_date=in.(${dates.map(encode).join(',')})&is_enabled=is.true`
  );
}

async function getProgressRowsByChapterIds(chapterIds) {
  if (chapterIds.length === 0) {
    return [];
  }

  return getRows(
    'reading_progress',
    `?select=*&chapter_id=in.(${chapterIds.map(encode).join(',')})&is_enabled=is.true`
  );
}

async function assertScheduleDateIsFree(scheduledDate, chapterId) {
  if (!scheduledDate) {
    return;
  }

  const existing = await getScheduledProgressByDate(scheduledDate);

  if (existing && existing.chapter_id !== chapterId) {
    throw createError(
      'SCHEDULE_DATE_TAKEN',
      'Another chapter is already scheduled for this date',
      409
    );
  }
}

async function createProgress(chapterId, data) {
  const response = await supabase.post('reading_progress', {
    chapter_id: chapterId,
    scheduled_date: data.scheduledDate || null,
    done_date: data.doneDate || null,
    is_enabled: true
  });

  return response.data[0];
}

async function patchProgressByChapterId(chapterId, data) {
  const response = await supabase.patch(
    'reading_progress',
    `chapter_id=eq.${encode(chapterId)}`,
    data
  );

  return response.data[0];
}

async function getActiveChaptersByBook(bookId) {
  return getRows(
    'chapter',
    `?select=*&book_id=eq.${encode(bookId)}&is_enabled=is.true&order=chapter_order.asc`
  );
}

function mapById(rows) {
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function getContextByChapterIds(chapterIds, activeOnly = true) {
  if (chapterIds.length === 0) {
    return new Map();
  }

  const activeFilter = activeOnly ? '&is_enabled=is.true' : '';
  const chapters = await getRows(
    'chapter',
    `?select=*&id=in.(${chapterIds.map(encode).join(',')})${activeFilter}`
  );
  const books = chapters.length === 0
    ? []
    : await getRows('book', `?select=*&id=in.(${chapters.map((chapter) => encode(chapter.book_id)).join(',')})${activeFilter}`);
  const series = books.length === 0
    ? []
    : await getRows('series', `?select=*&id=in.(${books.map((book) => encode(book.series_id)).join(',')})${activeFilter}`);

  const booksById = mapById(books);
  const seriesById = mapById(series);

  return new Map(chapters.map((chapter) => {
    const book = booksById.get(String(chapter.book_id));
    const seriesRow = book ? seriesById.get(String(book.series_id)) : null;

    return [String(chapter.id), {
      chapter,
      book,
      series: seriesRow
    }];
  }));
}

async function mapProgressRowsToPlanItems(progressRows, activeOnly = true) {
  const contextByChapterId = await getContextByChapterIds(
    progressRows.map((progress) => progress.chapter_id),
    activeOnly
  );

  return progressRows
    .map((progress) => {
      const context = contextByChapterId.get(String(progress.chapter_id));

      if (!context || !context.book || !context.series) {
        return null;
      }

      return mapReadingPlanItem(progress, context);
    })
    .filter(Boolean);
}

class ReadingProgressService {
  async scheduleChapter(chapterId, scheduledDate) {
    await getChapterOrThrow(chapterId);
    await assertScheduleDateIsFree(scheduledDate, chapterId);

    const existing = await getProgressByChapterId(chapterId);
    const progress = existing
      ? await patchProgressByChapterId(chapterId, { scheduled_date: scheduledDate })
      : await createProgress(chapterId, { scheduledDate });

    return mapReadingProgress(progress);
  }

  async markChapterAsRead(chapterId, doneDate) {
    await getChapterOrThrow(chapterId);

    const existing = await getProgressByChapterId(chapterId);
    const progress = existing
      ? await patchProgressByChapterId(chapterId, { done_date: doneDate || getTodayDateString() })
      : await createProgress(chapterId, { doneDate: doneDate || getTodayDateString() });

    return mapReadingProgress(progress);
  }

  async unmarkChapterAsRead(chapterId) {
    await getChapterOrThrow(chapterId);

    const existing = await getProgressByChapterId(chapterId);

    if (!existing) {
      return {
        chapterId,
        scheduledDate: null,
        doneDate: null,
        completed: false
      };
    }

    const progress = await patchProgressByChapterId(chapterId, { done_date: null });

    return mapReadingProgress(progress);
  }

  async rescheduleChapter(chapterId, scheduledDate) {
    await getChapterOrThrow(chapterId);
    await assertScheduleDateIsFree(scheduledDate, chapterId);

    const existing = await getProgressByChapterId(chapterId);
    const progress = existing
      ? await patchProgressByChapterId(chapterId, { scheduled_date: scheduledDate })
      : await createProgress(chapterId, { scheduledDate });

    return mapReadingProgress(progress);
  }

  async getReadingPlan() {
    const progressRows = await getRows(
      'reading_progress',
      '?select=*&scheduled_date=not.is.null&is_enabled=is.true&order=scheduled_date.asc'
    );

    return mapProgressRowsToPlanItems(progressRows);
  }

  async getNextPlanDate() {
    const progressRows = await getRows(
      'reading_progress',
      '?select=scheduled_date&scheduled_date=not.is.null&is_enabled=is.true&order=scheduled_date.desc&limit=1'
    );

    if (progressRows.length === 0) {
      return {
        nextDate: getTodayDateString()
      };
    }

    return {
      nextDate: addDays(progressRows[0].scheduled_date, 1)
    };
  }

  async planBook(bookId, startDate) {
    const book = await getBookOrThrow(bookId);
    const chapters = await getActiveChaptersByBook(bookId);

    if (chapters.length === 0) {
      throw createError('BOOK_HAS_NO_CHAPTERS', 'Book has no chapters to plan', 400);
    }

    const chapterIds = chapters.map((chapter) => chapter.id);
    const existingBookProgressRows = await getProgressRowsByChapterIds(chapterIds);

    if (existingBookProgressRows.some((progress) => progress.scheduled_date)) {
      throw createError('BOOK_ALREADY_PLANNED', 'Book already has scheduled chapters', 409);
    }

    const plannedDates = chapters.map((chapter, index) => addDays(startDate, index));
    const conflictingRows = await getScheduledProgressRowsByDates(plannedDates);
    const conflictingRowsForOtherChapters = conflictingRows.filter((progress) => (
      !chapterIds.includes(progress.chapter_id)
    ));

    if (conflictingRowsForOtherChapters.length > 0) {
      throw createError(
        'PLAN_DATES_TAKEN',
        'One or more dates are already scheduled for another chapter',
        409,
        {
          dates: conflictingRowsForOtherChapters.map((progress) => progress.scheduled_date)
        }
      );
    }

    const existingProgressByChapterId = new Map(
      existingBookProgressRows.map((progress) => [String(progress.chapter_id), progress])
    );
    const progressRows = [];

    for (let index = 0; index < chapters.length; index += 1) {
      const chapter = chapters[index];
      const scheduledDate = plannedDates[index];
      const existing = existingProgressByChapterId.get(String(chapter.id));

      const progress = existing
        ? await patchProgressByChapterId(chapter.id, { scheduled_date: scheduledDate })
        : await createProgress(chapter.id, { scheduledDate });

      progressRows.push(progress);
    }

    const plannedItems = await mapProgressRowsToPlanItems(progressRows);

    return {
      bookId: book.id,
      bookTitle: book.title,
      startDate,
      endDate: plannedDates[plannedDates.length - 1],
      chaptersPlanned: plannedItems.length,
      items: plannedItems
    };
  }

  async getTodayChapter() {
    const today = getTodayDateString();
    const progressRows = await getRows(
      'reading_progress',
      `?select=*&scheduled_date=eq.${encode(today)}&done_date=is.null&is_enabled=is.true&limit=1`
    );

    if (progressRows.length === 0) {
      return null;
    }

    const items = await mapProgressRowsToPlanItems(progressRows);

    return items[0] || null;
  }

  async getCalendarData() {
    const progressRows = await getRows(
      'reading_progress',
      '?select=*&is_enabled=is.true&or=(scheduled_date.not.is.null,done_date.not.is.null)&order=scheduled_date.asc'
    );
    const planItems = await mapProgressRowsToPlanItems(progressRows, false);
    const byDate = new Map();

    planItems.forEach((item) => {
      if (item.scheduledDate) {
        if (!byDate.has(item.scheduledDate)) {
          byDate.set(item.scheduledDate, { scheduled: [], completed: [] });
        }

        byDate.get(item.scheduledDate).scheduled.push(item);
      }

      if (item.doneDate) {
        if (!byDate.has(item.doneDate)) {
          byDate.set(item.doneDate, { scheduled: [], completed: [] });
        }

        byDate.get(item.doneDate).completed.push(item);
      }
    });

    return Array.from(byDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, value]) => mapCalendarDay(date, value.scheduled, value.completed));
  }
}

module.exports = new ReadingProgressService();
