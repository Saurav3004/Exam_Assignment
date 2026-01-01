import * as z from "zod"

export const SignupSchema = z.object({
    name:  z.string(),
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(["Teacher","Student"])
})

export const LoginSchema = z.object({
    email:z.email(),
    password:z.string()
})

export const CreateClassSchema = z.object({
    className:z.string()
})

export const AddStudentSchema = z.object({
    studentId:z.string()
})

export const AttendanceSchema = z.object({
    classId:z.string()
})