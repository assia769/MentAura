import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Session } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private platformId = inject(PLATFORM_ID);

  // --- SIGNALS D'ÉTAT DU TIMER ---
  activeTimerSession = signal<Session | null>(null);
  timerSeconds = signal<number>(0);
  
  private timerSessionStart = 0;
  private timerInterval?: ReturnType<typeof setInterval>;
  private expirationCallback?: () => void;

  // --- SIGNALS COMPUTED EXPORTÉS ---
  timerDisplay = computed(() => {
    const s = this.timerSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  timerPercent = computed(() => {
    const session = this.activeTimerSession();
    if (!session) return 0;
    const totalSec = (session.heuresPlanifiees ?? 1) * 3600;
    return Math.min(100, Math.round((this.timerSeconds() / totalSec) * 100));
  });

  constructor() {
    // Restauration automatique du chrono au démarrage global de l'app (si F5)
    if (isPlatformBrowser(this.platformId)) {
      this.restoreChronoState();
    }
  }

  startTimer(session: Session, onExpired: () => void): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stopTimer();

    this.expirationCallback = onExpired;
    this.activeTimerSession.set(session);
    this.timerSeconds.set(0);
    this.timerSessionStart = Date.now();

    // Persistance locale en cas de refresh global
    localStorage.setItem('mentaura_active_session', JSON.stringify(session));
    localStorage.setItem('mentaura_timer_start', this.timerSessionStart.toString());

    this.launchInterval(new Date(session.dateFin).getTime());
  }

  private launchInterval(endTime: number): void {
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - this.timerSessionStart) / 1000);
      this.timerSeconds.set(elapsed);

      // Vérification stricte du dépassement de temps
      if (now >= endTime) {
        this.triggerExpiration();
      }
    }, 1000);
  }

  /**
   * Centralise le déclenchement de la fin du temps
   */
  private triggerExpiration(): void {
    this.stopTimer();
    if (this.expirationCallback) {
      this.expirationCallback();
    } else {
      // Si aucun composant n'est là pour écouter (ex: navigation sur une autre page),
      // on nettoie le service pour éviter que le bandeau reste bloqué à l'écran.
      this.clear();
    }
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  clear(): void {
    this.stopTimer();
    this.activeTimerSession.set(null);
    this.timerSeconds.set(0);
    this.timerSessionStart = 0;
    this.expirationCallback = undefined;
    localStorage.removeItem('mentaura_active_session');
    localStorage.removeItem('mentaura_timer_start');
  }

  getElapsedHours(): number {
    if (!this.timerSessionStart) return 0;
    return ((Date.now() - this.timerSessionStart) / 1000) / 3600;
  }

  private restoreChronoState(): void {
    const savedSession = localStorage.getItem('mentaura_active_session');
    const savedStart = localStorage.getItem('mentaura_timer_start');

    if (savedSession && savedStart) {
      const sessionParsed = JSON.parse(savedSession) as Session;
      const startTime = parseInt(savedStart, 10);
      const endTime = new Date(sessionParsed.dateFin).getTime();
      const now = Date.now();

      // Si le temps de la session n'est pas encore dépassé, on relance le visuel
      if (now < endTime) {
        this.timerSessionStart = startTime;
        this.activeTimerSession.set(sessionParsed);
        
        const immediateElapsed = Math.floor((now - startTime) / 1000);
        this.timerSeconds.set(immediateElapsed);

        this.launchInterval(endTime);
      } else {
        // NOUVEAUTÉ : Si l'utilisateur revient sur l'app alors que le temps a expiré 
        // pendant son absence, on nettoie directement les données obsolètes.
        this.clear();
      }
    }
  }

  /**
   * Permet au composant de rattacher son callback d'expiration après un changement de page
   */
  registerExpirationCallback(onExpired: () => void): void {
    this.expirationCallback = onExpired;
    
    // Sécurité : Si le composant s'enregistre tardivement alors que le temps est déjà dépassé
    const session = this.activeTimerSession();
    if (session) {
      const endTime = new Date(session.dateFin).getTime();
      if (Date.now() >= endTime) {
        this.triggerExpiration();
      }
    }
  }
}