import { motion } from 'framer-motion'
import { Dumbbell } from 'lucide-react'

export default function AppSplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="h-screen flex flex-col items-center justify-center gap-4 bg-surface"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
          <Dumbbell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-fg-primary">Fitness Library</h1>
          <p className="text-xs text-fg-muted">by Vũ Hải</p>
        </div>
      </div>

      {/* Tiny spinner */}
      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </motion.div>
  )
}
