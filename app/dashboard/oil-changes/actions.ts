'use server'

import { revalidatePath } from 'next/cache'
import { oilChangeSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import { oilChangeHistory } from '@/lib/db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { z } from 'zod'

export async function createOilChange(
  prevState: any,
  formData: FormData
) {
  try {
    const notes = formData.get('notes')
    const rawData = {
      changeDate: formData.get('changeDate'),
      fryerType: formData.get('fryerType'),
      notes: notes && typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    }

    const validatedData = oilChangeSchema.parse(rawData)

    // Calculate usage days automatically based on previous oil change history
    const lastChange = await db.query.oilChangeHistory.findFirst({
      where: and(
        eq(oilChangeHistory.fryerType, validatedData.fryerType),
        isNull(oilChangeHistory.deletedAt)
      ),
      orderBy: [desc(oilChangeHistory.changeDate)],
    })

    let usageDays = 0
    if (lastChange && lastChange.changeDate) {
      const daysDiff = Math.floor(
        (new Date(validatedData.changeDate).getTime() - new Date(lastChange.changeDate).getTime()) /
        (1000 * 60 * 60 * 24)
      )
      usageDays = Math.max(0, daysDiff)
    }

    // Insert oil change record
    await db.insert(oilChangeHistory).values({
      changeDate: validatedData.changeDate,
      fryerType: validatedData.fryerType,
      oilType: '해바라기씨유',
      quantity: '0',
      supplierName: '자동 기록',
      unitPrice: '0',
      previousOilUsage: null,
      usageDays: usageDays,
      notes: validatedData.notes,
    })

    revalidatePath('/dashboard/oil-changes')
    return { success: true, error: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('Error creating oil change:', error)
    return { success: false, error: '기름 교체 이력 등록 중 오류가 발생했습니다' }
  }
}

    const validatedData = oilChangeSchema.parse(rawData)

    // Calculate previous usage days if not provided
    let usageDays = validatedData.usageDays
    if (!usageDays && validatedData.previousOilUsage) {
      // Get the most recent oil change for the same fryer type
      const lastChange = await db.query.oilChangeHistory.findFirst({
        where: and(
          eq(oilChangeHistory.fryerType, validatedData.fryerType),
          isNull(oilChangeHistory.deletedAt)
        ),
        orderBy: [desc(oilChangeHistory.changeDate)],
      })

      if (lastChange && lastChange.changeDate) {
        const daysDiff = Math.floor(
          (new Date(validatedData.changeDate).getTime() - new Date(lastChange.changeDate).getTime()) /
          (1000 * 60 * 60 * 24)
        )
        usageDays = Math.max(0, daysDiff)
      }
    }

    // Insert oil change record
    await db.insert(oilChangeHistory).values({
      changeDate: validatedData.changeDate,
      fryerType: validatedData.fryerType,
      oilType: validatedData.oilType,
      quantity: validatedData.quantity,
      supplierName: validatedData.supplierName,
      unitPrice: validatedData.unitPrice,
      previousOilUsage: validatedData.previousOilUsage,
      usageDays: usageDays || null,
      notes: validatedData.notes,
    })

    revalidatePath('/dashboard/oil-changes')
    return { success: true, error: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('Error creating oil change:', error)
    return { success: false, error: '기름 교체 이력 등록 중 오류가 발생했습니다' }
  }
}

export async function getOilChanges(filters?: {
  startDate?: string
  endDate?: string
  fryerType?: string
}) {
  try {
    const conditions = [isNull(oilChangeHistory.deletedAt)]

    if (filters?.startDate) {
      conditions.push(sql`oil_change_history.change_date >= ${filters.startDate}`)
    }

    if (filters?.endDate) {
      conditions.push(sql`oil_change_history.change_date <= ${filters.endDate}`)
    }

    if (filters?.fryerType) {
      conditions.push(eq(oilChangeHistory.fryerType, filters.fryerType))
    }

    const results = await db
      .select()
      .from(oilChangeHistory)
      .where(and(...conditions))
      .orderBy(desc(oilChangeHistory.changeDate))
      .limit(100)

    return results
  } catch (error) {
    console.error('Error fetching oil changes:', error)
    return []
  }
}

export async function getOilChangeById(id: string) {
  try {
    const result = await db.query.oilChangeHistory.findFirst({
      where: and(eq(oilChangeHistory.id, id), isNull(oilChangeHistory.deletedAt)),
    })
    return result
  } catch (error) {
    console.error('Error fetching oil change:', error)
    return null
  }
}

export async function updateOilChange(
  prevState: any,
  formData: FormData,
  id: string
) {
  try {
    const notes = formData.get('notes')
    const rawData = {
      changeDate: formData.get('changeDate'),
      fryerType: formData.get('fryerType'),
      notes: notes && typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    }

    const validatedData = oilChangeSchema.parse(rawData)

    // Calculate usage days automatically based on previous oil change history (excluding current record)
    const previousChange = await db.query.oilChangeHistory.findFirst({
      where: and(
        eq(oilChangeHistory.fryerType, validatedData.fryerType),
        isNull(oilChangeHistory.deletedAt),
        sql`${oilChangeHistory.id} != ${id}`
      ),
      orderBy: [desc(oilChangeHistory.changeDate)],
    })

    let usageDays = 0
    if (previousChange && previousChange.changeDate) {
      const daysDiff = Math.floor(
        (new Date(validatedData.changeDate).getTime() - new Date(previousChange.changeDate).getTime()) /
        (1000 * 60 * 60 * 24)
      )
      usageDays = Math.max(0, daysDiff)
    }

    await db
      .update(oilChangeHistory)
      .set({
        changeDate: validatedData.changeDate,
        fryerType: validatedData.fryerType,
        usageDays: usageDays,
        notes: validatedData.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(oilChangeHistory.id, id), isNull(oilChangeHistory.deletedAt)))

    revalidatePath('/dashboard/oil-changes')
    return { success: true, error: undefined }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    console.error('Error updating oil change:', error)
    return { success: false, error: '기름 교체 이력 수정 중 오류가 발생했습니다' }
  }
}

export async function deleteOilChange(id: string) {
  try {
    await db
      .update(oilChangeHistory)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(oilChangeHistory.id, id))

    revalidatePath('/dashboard/oil-changes')
    return { success: true, error: undefined }
  } catch (error) {
    console.error('Error deleting oil change:', error)
    return { success: false, error: '기름 교체 이력 삭제 중 오류가 발생했습니다' }
  }
}

export async function getOilChangeStats() {
  try {
    // Get total oil changes in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentChanges = await db
      .select({
        count: sql`COUNT(*)`.mapWith(Number),
      })
      .from(oilChangeHistory)
      .where(
        and(
          isNull(oilChangeHistory.deletedAt),
          sql`oil_change_history.change_date >= ${thirtyDaysAgo.toISOString().split('T')[0]}`
        )
      )

    // Get last change date for each fryer type
    const lastChanges = await db.query.oilChangeHistory.findMany({
      where: isNull(oilChangeHistory.deletedAt),
      orderBy: [desc(oilChangeHistory.changeDate)],
      limit: 10,
    })

    const lastChangeByFryer = lastChanges.reduce((acc, change) => {
      if (!acc[change.fryerType] || new Date(change.changeDate) > new Date(acc[change.fryerType].changeDate)) {
        acc[change.fryerType] = change
      }
      return acc
    }, {} as Record<string, any>)

    return {
      recentChanges: recentChanges[0] || { count: 0 },
      lastChangeByFryer,
    }
  } catch (error) {
    console.error('Error fetching oil change stats:', error)
    return {
      recentChanges: { count: 0 },
      lastChangeByFryer: {},
    }
  }
}
      return acc
    }, {} as Record<string, any>)

    return {
      recentChanges: recentChanges[0] || { count: 0, totalCost: 0 },
      lastChangeByFryer,
    }
  } catch (error) {
    console.error('Error fetching oil change stats:', error)
    return {
      recentChanges: { count: 0, totalCost: 0 },
      lastChangeByFryer: {},
    }
  }
}