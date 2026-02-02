'use server'

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, '이메일을 입력해주세요')
      .email('올바른 이메일 형식이 아닙니다'),
    name: z
      .string()
      .min(1, '이름을 입력해주세요')
      .max(100, '이름이 너무 깁니다'),
    phone: z
      .string()
      .optional()
      .transform((val) => val || null),
    password: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
      .max(100, '비밀번호가 너무 깁니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

export interface SignupState {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

export async function signup(
  _prevState: SignupState | null,
  formData: FormData
): Promise<SignupState> {
  try {
    const rawData = {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    }

    // Validate input
    const result = signupSchema.safeParse(rawData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      return {
        success: false,
        error: '입력 정보를 확인해주세요',
        fieldErrors,
      }
    }

    const { email, name, phone, password } = result.data

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })

    if (existingUser) {
      return {
        success: false,
        error: '이미 등록된 이메일입니다',
        fieldErrors: { email: '이미 등록된 이메일입니다' },
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      phone,
      isActive: true,
    })

    return { success: true }
  } catch (error) {
    console.error('Signup error:', error)
    return {
      success: false,
      error: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }
}
