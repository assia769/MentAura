export interface Session {
  _id: string
  userId: string
  matiereId: string
  titre: string
  dateDebut: string
  dateFin: string
  dureeMax: number
  statut: 'planifiee' | 'en_cours' | 'realisee' | 'non_realisee' 
  heuresPlanifiees: number
  heuresRealisees: number
  isPartagee: boolean
  notes: string
  genereeAutomatiquement: boolean
  createdAt: string
  matiere?: {
    nom: string
    couleur: string
    priorite: 'haute' | 'moyenne' | 'faible'
  }
}

export interface SessionFilters {
  semaine: string
  statut?: string
  matiereId?: string
}

export interface GeneratePayload {
  semaine: string
  dureeMaxSession: number
}
