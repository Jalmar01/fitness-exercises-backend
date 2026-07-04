import z from 'zod';

export const muscleSchema = z.object({
    name: z.string().min(2).max(25),
});

export const validatePartialMuscle = (input) => {
    return muscleSchema.partial().safeParse(input)
}
