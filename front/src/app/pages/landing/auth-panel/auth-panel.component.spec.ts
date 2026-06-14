import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of, throwError } from 'rxjs'

import { AuthPanelComponent } from './auth-panel.component'
import { AuthService } from '../../../core/services/auth.service'

const mockGrecaptcha = {
  render:      jest.fn().mockReturnValue(0),
  getResponse: jest.fn().mockReturnValue('captcha-token-mock'),
  reset:       jest.fn(),
}

Object.defineProperty(window, 'grecaptcha', {
  value:    mockGrecaptcha,
  writable: true,
})

const authServiceStub = {
  login:     jest.fn(),
  verifyMfa: jest.fn(),
  register:  jest.fn(),
}

const routerStub = {
  navigate: jest.fn(),
}

async function createComponent(): Promise<{ fixture: ComponentFixture<AuthPanelComponent>, component: AuthPanelComponent }> {
  await TestBed.configureTestingModule({
    imports: [AuthPanelComponent],
    providers: [
      { provide: AuthService, useValue: authServiceStub },
      { provide: Router,      useValue: routerStub },
    ],
  }).compileComponents()

  const fixture   = TestBed.createComponent(AuthPanelComponent)
  const component = fixture.componentInstance
  component.loginCaptchaWidgetId    = 0
  component.registerCaptchaWidgetId = 0
  fixture.detectChanges()
  return { fixture, component }
}

describe('AuthPanelComponent', () => {

  beforeEach(() => {
    jest.clearAllMocks()
    mockGrecaptcha.getResponse.mockReturnValue('captcha-token-mock')
  })

  describe('Initialisation', () => {
    it('doit créer le composant', async () => {
      const { component } = await createComponent()
      expect(component).toBeTruthy()
    })

    it('affiche l\'onglet login par défaut', async () => {
      const { component } = await createComponent()
      expect(component.currentTab).toBe('login')
    })

    it('loading, errorMsg et successMsg sont vides au démarrage', async () => {
      const { component } = await createComponent()
      expect(component.loading).toBeFalsy()
      expect(component.errorMsg).toBe('')
      expect(component.successMsg).toBe('')
    })
  })

  describe('switchTab()', () => {
    it('change currentTab vers register', async () => {
      const { component } = await createComponent()
      component.switchTab('register')
      expect(component.currentTab).toBe('register')
    })

    it('remet errorMsg et successMsg à vide', async () => {
      const { component } = await createComponent()
      component.errorMsg   = 'une erreur'
      component.successMsg = 'un succès'
      component.switchTab('register')
      expect(component.errorMsg).toBe('')
      expect(component.successMsg).toBe('')
    })

    it('émet tabChange avec le bon onglet', async () => {
      const { component } = await createComponent()
      const spy = jest.spyOn(component.tabChange, 'emit')
      component.switchTab('register')
      expect(spy).toHaveBeenCalledWith('register')
    })

    it('masque le formulaire MFA lors du changement d\'onglet', async () => {
      const { component } = await createComponent()
      component.showMfa = true
      component.switchTab('login')
      expect(component.showMfa).toBe(false)
    })
  })

  describe('onLogin() — validations', () => {
    it('affiche une erreur si email vide', async () => {
      const { component } = await createComponent()
      component.loginEmail    = ''
      component.loginPassword = 'password123'
      component.onLogin()
      expect(component.errorMsg).toBe('Email et mot de passe requis')
      expect(authServiceStub.login).not.toHaveBeenCalled()
    })

    it('affiche une erreur si mot de passe vide', async () => {
      const { component } = await createComponent()
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = ''
      component.onLogin()
      expect(component.errorMsg).toBe('Email et mot de passe requis')
    })

    it('affiche une erreur si captcha non validé', async () => {
      const { component } = await createComponent()
      mockGrecaptcha.getResponse.mockReturnValue('')
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = 'password123'
      component.onLogin()
      expect(component.errorMsg).toBe('Veuillez valider le captcha')
      expect(authServiceStub.login).not.toHaveBeenCalled()
    })
  })

  describe('onLogin() — connexion réussie (ahmed.bennani@student.ma)', () => {
    it('appelle auth.login avec les bons arguments', async () => {
      const { component } = await createComponent()
      authServiceStub.login.mockReturnValue(of({ role: 'student', userId: 'u1' }))
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = 'password123'
      component.onLogin()
      expect(authServiceStub.login).toHaveBeenCalledWith(
        'ahmed.bennani@student.ma', 'password123', 'captcha-token-mock'
      )
    })

    it('remet loading à false après succès', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.login.mockReturnValue(of({ role: 'student' }))
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = 'password123'
      component.onLogin()
      tick()
      expect(component.loading).toBe(false)
    }))

    it('ne bascule pas vers MFA si mfaRequired absent', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.login.mockReturnValue(of({ role: 'student', userId: 'u1' }))
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = 'password123'
      component.onLogin()
      tick()
      expect(component.showMfa).toBe(false)
    }))
  })

  describe('onLogin() — MFA requis', () => {
    it('affiche le formulaire MFA si mfaRequired:true', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.login.mockReturnValue(of({ mfaRequired: true, userId: 'u1' }))
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = 'password123'
      component.onLogin()
      tick()
      expect(component.showMfa).toBe(true)
      expect(component.pendingUser).toEqual({ mfaRequired: true, userId: 'u1' })
    }))
  })

  describe('onLogin() — erreur serveur', () => {
    it('affiche le message d\'erreur du backend', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.login.mockReturnValue(
        throwError(() => ({ error: { error: 'Identifiants invalides' } }))
      )
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = 'mauvais_mdp'
      component.onLogin()
      tick()
      expect(component.errorMsg).toBe('Identifiants invalides')
      expect(component.loading).toBe(false)
    }))

    it('affiche message générique si pas de détail d\'erreur', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.login.mockReturnValue(throwError(() => ({})))
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = 'password123'
      component.onLogin()
      tick()
      expect(component.errorMsg).toBe('Erreur de connexion')
    }))

    it('réinitialise le captcha après une erreur', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.login.mockReturnValue(
        throwError(() => ({ error: { error: 'Compte verrouillé' } }))
      )
      component.loginEmail    = 'ahmed.bennani@student.ma'
      component.loginPassword = 'password123'
      component.onLogin()
      tick()
      expect(mockGrecaptcha.reset).toHaveBeenCalledWith(0)
    }))
  })

  describe('onVerifyMfa()', () => {
    it('affiche une erreur si code MFA vide', async () => {
      const { component } = await createComponent()
      component.mfaCode = ''
      component.onVerifyMfa()
      expect(component.errorMsg).toBe('Code MFA invalide (6 chiffres)')
      expect(authServiceStub.verifyMfa).not.toHaveBeenCalled()
    })

    it('affiche une erreur si code MFA != 6 chiffres', async () => {
      const { component } = await createComponent()
      component.mfaCode = '123'
      component.onVerifyMfa()
      expect(component.errorMsg).toBe('Code MFA invalide (6 chiffres)')
    })

    it('appelle auth.verifyMfa avec userId et code corrects', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.verifyMfa.mockReturnValue(of({ accessToken: 'tok' }))
      component.pendingUser = { userId: 'u1' }
      component.mfaCode     = '123456'
      component.onVerifyMfa()
      tick()
      expect(authServiceStub.verifyMfa).toHaveBeenCalledWith('u1', '123456')
    }))

    it('affiche l\'erreur si code MFA incorrect', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.verifyMfa.mockReturnValue(
        throwError(() => ({ error: { error: 'Code MFA incorrect' } }))
      )
      component.pendingUser = { userId: 'u1' }
      component.mfaCode     = '000000'
      component.onVerifyMfa()
      tick()
      expect(component.errorMsg).toBe('Code MFA incorrect')
      expect(component.loading).toBe(false)
    }))
  })

  describe('onRegister() — validations', () => {
    it('affiche une erreur si un champ est manquant', async () => {
      const { component } = await createComponent()
      component.regNom      = 'Bennani'
      component.regPrenom   = ''
      component.regEmail    = 'ahmed.bennani@student.ma'
      component.regPassword = 'password123'
      component.onRegister()
      expect(component.errorMsg).toBe('Tous les champs sont requis')
    })

    it('affiche une erreur si mot de passe < 8 caractères', async () => {
      const { component } = await createComponent()
      component.regNom      = 'Bennani'
      component.regPrenom   = 'Ahmed'
      component.regEmail    = 'ahmed.bennani@student.ma'
      component.regPassword = '123'
      component.onRegister()
      expect(component.errorMsg).toBe('Mot de passe trop court (min 8 caractères)')
    })

    it('affiche une erreur si captcha non validé', async () => {
      const { component } = await createComponent()
      mockGrecaptcha.getResponse.mockReturnValue('')
      component.regNom      = 'Bennani'
      component.regPrenom   = 'Ahmed'
      component.regEmail    = 'ahmed.bennani@student.ma'
      component.regPassword = 'password123'
      component.onRegister()
      expect(component.errorMsg).toBe('Veuillez valider le captcha')
    })
  })

  describe('onRegister() — inscription réussie (ahmed.bennani@student.ma)', () => {
    it('navigue vers /check-email avec l\'email', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.register.mockReturnValue(of({}))
      component.regNom      = 'Bennani'
      component.regPrenom   = 'Ahmed'
      component.regEmail    = 'ahmed.bennani@student.ma'
      component.regPassword = 'password123'
      component.onRegister()
      tick()
      expect(routerStub.navigate).toHaveBeenCalledWith(
        ['/check-email'],
        { state: { email: 'ahmed.bennani@student.ma' } }
      )
    }))

    it('vide les champs du formulaire après succès', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.register.mockReturnValue(of({}))
      component.regNom      = 'Bennani'
      component.regPrenom   = 'Ahmed'
      component.regEmail    = 'ahmed.bennani@student.ma'
      component.regPassword = 'password123'
      component.onRegister()
      tick()
      expect(component.regNom).toBe('')
      expect(component.regPrenom).toBe('')
      expect(component.regEmail).toBe('')
      expect(component.regPassword).toBe('')
    }))

    it('remet loading à false après succès', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.register.mockReturnValue(of({}))
      component.regNom      = 'Bennani'
      component.regPrenom   = 'Ahmed'
      component.regEmail    = 'ahmed.bennani@student.ma'
      component.regPassword = 'password123'
      component.onRegister()
      tick()
      expect(component.loading).toBe(false)
    }))
  })

  describe('onRegister() — erreur serveur', () => {
    it('affiche le message d\'erreur du backend', fakeAsync(async () => {
      const { component } = await createComponent()
      authServiceStub.register.mockReturnValue(
        throwError(() => ({ error: { error: 'Email déjà utilisé' } }))
      )
      component.regNom      = 'Bennani'
      component.regPrenom   = 'Ahmed'
      component.regEmail    = 'ahmed.bennani@student.ma'
      component.regPassword = 'password123'
      component.onRegister()
      tick()
      expect(component.errorMsg).toBe('Email déjà utilisé')
    }))
  })

  describe('checkStrength()', () => {
    it('score 0 pour un mot de passe vide', async () => {
      const { component } = await createComponent()
      component.checkStrength('')
      expect(component.strength).toBe(0)
    })

    it('score 1 pour longueur >= 8 seulement', async () => {
      const { component } = await createComponent()
      component.checkStrength('abcdefgh')
      expect(component.strength).toBe(1)
    })

    it('score 4 pour mdp fort (longueur + maj + chiffre + spécial)', async () => {
      const { component } = await createComponent()
      component.checkStrength('Admin2026!')
      expect(component.strength).toBe(4)
    })
  })

  describe('getStrengthLabel()', () => {
    it('retourne "Faible" pour score 0', async () => {
      const { component } = await createComponent()
      component.strength = 0
      expect(component.getStrengthLabel()).toBe('Faible')
    })

    it('retourne "Fort" pour score 3', async () => {
      const { component } = await createComponent()
      component.strength = 3
      expect(component.getStrengthLabel()).toBe('Fort')
    })

    it('retourne "Très fort" pour score 4', async () => {
      const { component } = await createComponent()
      component.strength = 4
      expect(component.getStrengthLabel()).toBe('Très fort')
    })
  })

  describe('togglePw()', () => {
    it('bascule le type de password vers text', async () => {
      const { component } = await createComponent()
      const input = { type: 'password' } as HTMLInputElement
      component.togglePw(input)
      expect(input.type).toBe('text')
    })

    it('bascule le type de text vers password', async () => {
      const { component } = await createComponent()
      const input = { type: 'text' } as HTMLInputElement
      component.togglePw(input)
      expect(input.type).toBe('password')
    })
  })
})