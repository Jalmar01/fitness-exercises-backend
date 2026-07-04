import z from 'zod';

export const categorySchema = z.object({
    name: z.string().min(2).max(50),
    description: z.string().nullable().optional()
});

export const validatePartialCategory = (input) => {
    return categorySchema.partial().safeParse(input)
}
