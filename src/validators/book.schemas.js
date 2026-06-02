const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const seriesIdParamSchema = z.object({
  seriesId: z.coerce.number().int().positive()
});

const bookPayloadSchema = z.object({
  title: z.string().trim().min(1).max(255),
  author: z.string().trim().max(255).nullable().optional(),
  bookOrder: z.number().int().positive(),
  pages: z.number().int().positive().nullable().optional(),
  coverUrl: z.string().trim().url().nullable().optional()
});

module.exports = {
  idParamSchema,
  seriesIdParamSchema,
  createBookSchema: bookPayloadSchema,
  updateBookSchema: bookPayloadSchema
};
