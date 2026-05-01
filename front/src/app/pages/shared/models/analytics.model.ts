export interface UserStats {
  userId?:           string
  semaine:           string
  heuresPlanifiees:  number
  heuresRealisees:   number
  tauxCompletion:    number
  sessionsTotales:   number
  sessionsRealisees: number
  streakJours:       number
  parMatiere: {
    matiereId:   string
    heures:      number
    progression: number
  }[]
}

export interface AnalyticsOverview {
  heuresPlanifiees:  number
  heuresRealisees:   number
  tauxCompletion:    number
  streakJours:       number
  totalMatieres:     number
  totalSessions:     number
  sessionsRealisees: number
  totalGroupes:      number
}

export interface SubjectStats {
  _id:                 string
  nom:                 string
  couleur:             string
  priorite:            'haute' | 'moyenne' | 'faible'
  totalHeuresEtudiees: number
  heuresRealisees:     number
  totalSessions:       number
  sessionsRealisees:   number
}