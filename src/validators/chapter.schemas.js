const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const bookIdParamSchema = z.object({
  bookId: z.coerce.number().int().positive()
});

const chapterPayloadSchema = z.object({
  chapterOrder: z.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  pages: z.number().int().positive().nullable().optional()
});

const bulkCreateChaptersSchema = z.object({
  chapters: z.array(chapterPayloadSchema).min(1).max(500)
});

module.exports = {
  idParamSchema,
  bookIdParamSchema,
  createChapterSchema: chapterPayloadSchema,
  updateChapterSchema: chapterPayloadSchema,
  bulkCreateChaptersSchema
};
