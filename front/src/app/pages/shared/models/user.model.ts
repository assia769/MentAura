export interface UserProfile {
  _id: string
  nom: string
  prenom: string
  email: string
  bio?: string
  avatarUrl?: string
  role: 'admin' | 'student'
  isActive: boolean
  score?: number
  createdAt: string
  updatedAt: string
}

export interface Subject {
  _id: string
  userId: string
  nom: string
  couleur: string
  priorite: 'haute' | 'moyenne' | 'faible'
  totalHeuresEtudiees: number
  createdAt: string
  updatedAt: string
}

export interface AvailabilitySlot {
  jourSemaine: 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim'
  heureDebut: string
  heureFin: string
  recurrente: boolean
}