const { z } = require('zod');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const chapterIdParamSchema = z.object({
  chapterId: z.coerce.number().int().positive()
});

const planBookSchema = z.object({
  bookId: z.number().int().positive(),
  startDate: dateSchema
});

const scheduleChapterSchema = z.object({
  scheduledDate: dateSchema
});

const rescheduleChapterSchema = z.object({
  scheduledDate: dateSchema.nullable()
});

const markChapterReadSchema = z.object({
  doneDate: dateSchema.optional()
});

module.exports = {
  chapterIdParamSchema,
  planBookSchema,
  scheduleChapterSchema,
  rescheduleChapterSchema,
  markChapterReadSchema
};
