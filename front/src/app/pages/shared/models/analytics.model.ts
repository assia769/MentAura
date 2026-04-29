export interface UserStats {
  userId: string
  semaine: string
  heuresPlanifiees: number
  heuresRealisees: number
  tauxCompletion: number
  sessionsTotales: number
  sessionsRealisees: number
  streakJours: number
  parMatiere: {
    matiereId: string
    heures: number
    progression: number
  }[]
}