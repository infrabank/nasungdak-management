'use client'

/**
 * Dashboard Loading Skeleton
 *
 * Neo-Brutalism styled loading state with Framer Motion animations.
 * Shows skeleton placeholders for the main dashboard content.
 */

import { motion } from 'framer-motion'
import { shimmer, staggerContainer, staggerItem } from '@/lib/animations'

export default function DashboardLoading() {
  return (
    <motion.div initial="initial" animate="animate" variants={staggerContainer}>
      {/* Page Header Skeleton */}
      <motion.div className="mb-6" variants={staggerItem}>
        <motion.div
          className="h-9 w-40 border-2 border-brutal-black/20 bg-brutal-black/10"
          variants={shimmer}
        />
        <motion.div
          className="mt-2 h-5 w-48 border-2 border-brutal-black/20 bg-brutal-black/10"
          variants={shimmer}
        />
      </motion.div>

      {/* Summary Cards Skeleton */}
      <motion.div
        className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
        variants={staggerContainer}
      >
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="h-28 border-3 border-brutal-black/30 bg-brutal-white p-4"
            variants={staggerItem}
          >
            <motion.div
              className="mb-3 h-4 w-24 bg-brutal-black/10"
              variants={shimmer}
            />
            <motion.div
              className="mb-2 h-8 w-32 bg-brutal-black/10"
              variants={shimmer}
            />
            <motion.div
              className="h-3 w-16 bg-brutal-black/10"
              variants={shimmer}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions Skeleton */}
      <motion.div className="mb-8" variants={staggerItem}>
        <motion.div
          className="mb-4 h-6 w-24 border-2 border-brutal-black/20 bg-brutal-black/10"
          variants={shimmer}
        />
        <motion.div
          className="grid grid-cols-2 gap-3 lg:grid-cols-5"
          variants={staggerContainer}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="h-20 border-3 border-brutal-black/30 bg-brutal-white p-4"
              variants={staggerItem}
            >
              <motion.div
                className="mb-2 h-4 w-20 bg-brutal-black/10"
                variants={shimmer}
              />
              <motion.div
                className="h-3 w-28 bg-brutal-black/10"
                variants={shimmer}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Recent Activity Skeleton */}
      <motion.div
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        variants={staggerContainer}
      >
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            className="border-3 border-brutal-black/30 bg-brutal-white p-6"
            variants={staggerItem}
          >
            <motion.div
              className="mb-4 h-5 w-24 bg-brutal-black/10"
              variants={shimmer}
            />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <motion.div
                  key={j}
                  className="flex items-center justify-between border-b border-brutal-black/10 py-2"
                  variants={staggerItem}
                >
                  <div>
                    <motion.div
                      className="mb-1 h-4 w-32 bg-brutal-black/10"
                      variants={shimmer}
                    />
                    <motion.div
                      className="h-3 w-20 bg-brutal-black/10"
                      variants={shimmer}
                    />
                  </div>
                  <motion.div
                    className="h-5 w-16 bg-brutal-black/10"
                    variants={shimmer}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
