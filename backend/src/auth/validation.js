'use strict';

const { z } = require('zod');

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const phoneSchema = z.string().trim().min(7).max(25).regex(/^[0-9+()\-\s]+$/);

const registerAgentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  password: z.string().min(12).max(128)
    .refine((value) => /[a-z]/.test(value), 'Password must include a lowercase letter.')
    .refine((value) => /[A-Z]/.test(value), 'Password must include an uppercase letter.')
    .refine((value) => /\d/.test(value), 'Password must include a number.')
}).strict();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128)
}).strict();

module.exports = { registerAgentSchema, loginSchema };