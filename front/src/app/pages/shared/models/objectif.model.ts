export interface Objectif {
  _id: string
  userId: string
  matiereId: string
  heuresParSemaine: number
  deadline: string
  statut: 'actif' | 'atteint' | 'abandonne'
  progression: number
  freqNotifJours: number
  createdAt: string
  updatedAt: string
  matiere?: {
    _id: string
    nom: string
    couleur: string
    priorite: 'haute' | 'moyenne' | 'faible'
  }
}

export interface CreateObjectifPayload {
  matiereId: string
  heuresParSemaine: number
  deadline: string
  freqNotifJours?: number
}
