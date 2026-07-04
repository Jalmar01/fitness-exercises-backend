import z from 'zod';

export const exerciseSchema = z.object({
    name: z.string().min(3).max(25),
    instructions: z.string().nullable().optional(),
    benefits:z.string().nullable().optional(),
    category_id: z.string().uuid()
});


export const validatePartialSchemas = (input) => {
    return exerciseSchema.partial().safeParse(input)
}

export const exerciseMuscleSchema = z.object({
    muscle_id: z.string().uuid(),
    role: z.enum(['primary', 'secondary']),
})

export const validatePartialExerciseMuscle = (input) => {
    return exerciseMuscleSchema.partial().safeParse(input)
}