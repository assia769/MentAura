export interface Invitation {
  _id:         string
  groupeId:    string
  groupeNom:   string
  inviteurId:  string
  inviteurNom?: string   // ← enrichi par le backend
  inviteEmail: string
  statut:      'pending' | 'accepted' | 'declined'
  expiresAt:   string
  createdAt:   string
}