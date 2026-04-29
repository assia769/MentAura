export interface GroupEtude {
  _id: string
  nom: string
  createurId: string
  membres: {
    userId: string
    role: 'admin' | 'membre'
    joinedAt: string
  }[]
  maxMembres: number
  isPublic: boolean
  codeInvitation: string
  createdAt: string
}