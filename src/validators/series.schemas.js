const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const seriesPayloadSchema = z.object({
  name: z.string().trim().min(1).max(255),
  coverUrl: z.string().trim().url().nullable().optional()
});

module.exports = {
  idParamSchema,
  createSeriesSchema: seriesPayloadSchema,
  updateSeriesSchema: seriesPayloadSchema
};
