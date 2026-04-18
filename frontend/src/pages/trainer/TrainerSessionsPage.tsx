import { PulseNav } from '../../components/landing/PulseNav'
import { PulseFooter } from '../../components/landing/PulseFooter'
import { TrainerSchedule } from '../../components/trainer/TrainerSchedule'
import { useTrainerSessions } from '../../hooks/useTrainerSessions'
import { useAuthStore } from '../../store/authStore'
import { usePageMeta } from '../../hooks/usePageMeta'

export function TrainerSessionsPage() {
  usePageMeta({ title: 'GymFlow | My Schedule', description: 'Your upcoming personal training sessions and group classes.' })

  const { user } = useAuthStore()
  const { trainerSchedule, trainerScheduleLoading, trainerScheduleError } = useTrainerSessions()

  const trainerName = trainerSchedule?.trainerName ?? (user?.email?.split('@')[0] ?? '')

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-white">
      <PulseNav authed userName={trainerName} />

      <main
        className="relative flex-1 px-10 pb-14 pt-10"
        style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}
      >
        <TrainerSchedule
          trainerName={trainerName}
          ptSessions={trainerSchedule?.ptSessions ?? []}
          groupClasses={trainerSchedule?.groupClasses ?? []}
          stats={trainerSchedule?.stats ?? { ptCount: 0, classCount: 0, total: 0 }}
          loading={trainerScheduleLoading}
          error={trainerScheduleError}
        />
      </main>

      <PulseFooter />
    </div>
  )
}
