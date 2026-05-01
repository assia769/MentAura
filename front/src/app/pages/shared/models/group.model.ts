export interface GroupEtude {
  _id: string
  nom: string
  createurId: string
  membres: {
    userId: string
    role: 'admin' | 'membre'
    joinedAt: string
    nom?: string
  }[]
  maxMembres: number
  isPublic: boolean
  codeInvitation: string
  createdAt: string
}
export interface Message {
  userId: string;
  nom?: string; // Optionnel si tu récupères le nom
  contenu: string;
  createdAt: string;
}

export interface GroupActivity {
  type: 'join' | 'session' | 'system';
  message: string;
  date: string;
}