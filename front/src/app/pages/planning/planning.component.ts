import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PlanningService } from '../shared/services/planning.service';
import { ObjectifService } from '../shared/services/objectif.service';
import { ProfileService } from '../shared/services/profile.service';
import { TimerService } from '../shared/services/timer.service';
import { Session, Objectif, Subject, AvailabilitySlot, CreateObjectifPayload } from '../shared/models';
import { environment } from '../../../environments/environment';

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(wn).padStart(2, '0')}`;
}

function shiftWeek(s: string, delta: number): string {
  const [y, w] = s.split('-W').map(Number);
  const j4 = new Date(y, 0, 4);
  const dow = j4.getDay() || 7;
  const base = new Date(j4);
  base.setDate(j4.getDate() - (dow - 1) + (w - 1) * 7 + delta * 7);
  return getISOWeek(base);
}

function weekDay(week: string, idx: number): Date {
  const [y, w] = week.split('-W').map(Number);
  const j4 = new Date(y, 0, 4);
  const dow = j4.getDay() || 7;
  const d = new Date(j4);
  d.setDate(j4.getDate() - (dow - 1) + (w - 1) * 7 + idx);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAY_LABELS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.scss']
})
export class PlanningComponent implements OnInit, OnDestroy {
  private planningSvc = inject(PlanningService);
  private objectifSvc = inject(ObjectifService);
  private profileSvc  = inject(ProfileService);
  protected timerSvc  = inject(TimerService);
  private http        = inject(HttpClient);
  private platformId  = inject(PLATFORM_ID);
  private api         = environment.apiUrl;

  wizardMode = signal(false);
  step       = signal<1 | 2 | 3>(1);

  sessions  = signal<Session[]>([]);
  objectifs = signal<Objectif[]>([]);
  subjects  = signal<Subject[]>([]);

  loading    = signal(true);
  saving     = signal(false);
  generating = signal(false);
  toast      = signal('');

  currentWeek = signal(getISOWeek(new Date()));

  // Étape 1: Ajout rapide de matière/projet
  quickSubjectName  = '';
  quickSubjectColor = '#4e54c8';

  // Step 1: Grille dispo
  availGrid = signal<Record<string, boolean>>({});

  // Step 2: Formulaire d'objectifs
  showObjForm    = signal(false);
  objFormErr     = signal('');
  newObjPriorite = signal<'haute' | 'moyenne' | 'faible'>('moyenne');
  newObj: CreateObjectifPayload = { matiereId: '', heuresParSemaine: 2, deadline: '', freqNotifJours: 3 };

  // Modal Session manuelle
  showSessModal = signal(false);
  sessErr       = signal('');
  sessErrDate   = signal('');
  sessErrTime   = signal('');
  newSess = { matiereId: '', date: '', heureDebut: '', heureFin: '' };

  // Rafraîchissement réactif de l'heure courante
  currentTimeTick = signal(Date.now());
  private clockInterval?: ReturnType<typeof setInterval>;
  private sessionPollInterval?: ReturnType<typeof setInterval>;
  private notifiedSessions = new Set<string>();

  readonly DAYS = [
    { key: 'lun', label: 'LUN', index: 0 },
    { key: 'mar', label: 'MAR', index: 1 },
    { key: 'mer', label: 'MER', index: 2 },
    { key: 'jeu', label: 'JEU', index: 3 },
    { key: 'ven', label: 'VEN', index: 4 },
    { key: 'sam', label: 'SAM', index: 5 },
    { key: 'dim', label: 'DIM', index: 6 }
  ];

  readonly HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

  // --- SIGNALS CALCULÉS (COMPUTED) ---
  sessionDays = computed(() => {
    const result: { label: string; sessions: Session[] }[] = [];
    const currentWeekValue = this.currentWeek();
    const allSessions = this.sessions();

    for (let i = 0; i < 7; i++) {
      const date = weekDay(currentWeekValue, i);
      const daySess = allSessions.filter(s => {
        const d = new Date(s.dateDebut);
        return (d.getDay() === 0 ? 6 : d.getDay() - 1) === i;
      });
      if (daySess.length > 0) {
        result.push({
          label:    this.fmtDayHeader(date),
          sessions: daySess.sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
        });
      }
    }
    return result;
  });

  tomorrowDate = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  maxWeekDate = computed(() => {
    const sunday = weekDay(this.currentWeek(), 6);
    return sunday.toISOString().split('T')[0];
  });

  weekRangeLabel = computed(() => {
    const mon = weekDay(this.currentWeek(), 0);
    const sun = weekDay(this.currentWeek(), 6);
    return `${this.shortDate(mon)} → ${this.shortDate(sun)}`;
  });

  selectedSubject = computed(() => {
    return this.subjects().find(s => s._id === this.newObj.matiereId);
  });

  selCount = computed(() => {
    return Object.values(this.availGrid()).filter(Boolean).length;
  });

  get activeTimerSession() { return this.timerSvc.activeTimerSession; }
  get timerDisplay() { return this.timerSvc.timerDisplay(); }
  get timerPercent() { return this.timerSvc.timerPercent(); }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();

    this.timerSvc.registerExpirationCallback(() => this.onTimerExpired());

    this.clockInterval = setInterval(() => {
      this.currentTimeTick.set(Date.now());
    }, 10000);

    this.sessionPollInterval = setInterval(() => {
      const now = Date.now();
      this.sessions().forEach(s => {
        if (s.statut !== 'planifiee') return;
        const diff = new Date(s.dateDebut).getTime() - now;
        if (diff > 0 && diff <= 5 * 60 * 1000 && !this.notifiedSessions.has(s._id)) {
          this.notifiedSessions.add(s._id);
          this.http.post(`${this.api}/api/notifications`, {
            type:    'rappel_session',
            titre:   'Session dans 5 min',
            contenu: `Ta session "${s.titre || s.matiere?.nom}" commence incessamment.`
          }).subscribe();
        }
      });
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.sessionPollInterval) clearInterval(this.sessionPollInterval);
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      obj:   this.objectifSvc.getObjectifs().pipe(catchError(() => of({ objectifs: [] as Objectif[] }))),
      subj:  this.profileSvc.getSubjects().pipe(catchError(() => of({ subjects: [] as Subject[] }))),
      avail: this.profileSvc.getAvailability().pipe(catchError(() => of({ availability: [] as AvailabilitySlot[] }))),
      sess:  this.planningSvc.getSessions({ semaine: this.currentWeek() }).pipe(catchError(() => of({ sessions: [] as Session[] })))
    }).subscribe({
      next: ({ obj, subj, avail, sess }) => {
        this.objectifs.set(obj.objectifs);
        this.subjects.set(subj.subjects);
        this.sessions.set(sess.sessions);
        this.buildGrid(avail.availability);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadSessions(): void {
    this.planningSvc.getSessions({ semaine: this.currentWeek() }).subscribe({
      next: r => this.sessions.set(r.sessions),
      error: () => {}
    });
  }

  prevWeek(): void { this.currentWeek.set(shiftWeek(this.currentWeek(), -1)); this.loadSessions(); }
  nextWeek(): void { this.currentWeek.set(shiftWeek(this.currentWeek(),  1)); this.loadSessions(); }

  addQuickSubject(): void {
    if (!this.quickSubjectName.trim()) {
      this.showToast('Veuillez spécifier le nom du projet/matière');
      return;
    }

    this.profileSvc.addSubject({
      nom: this.quickSubjectName.trim(),
      couleur: this.quickSubjectColor,
      priorite: 'moyenne',
      totalHeuresEtudiees: 0
    }).subscribe({
      next: (res: { subject: Subject }) => {
        this.subjects.update(list => [...list, res.subject]);
        this.quickSubjectName = '';
        this.showToast(`Matière "${res.subject.nom}" ajoutée !`);
      },
      error: () => this.showToast("Erreur lors de la création de la matière")
    });
  }

  private buildGrid(slots: AvailabilitySlot[]): void {
    const g: Record<string, boolean> = {};
    for (const s of slots) {
      const sh = parseInt(s.heureDebut);
      const eh = parseInt(s.heureFin) || 24;
      for (let h = sh; h < eh; h++) {
        if (h < 7 || h > 22) continue;
        g[`${s.jourSemaine}-${String(h).padStart(2, '0')}:00`] = true;
      }
    }
    this.availGrid.set(g);
  }

  toggle(day: string, hour: string): void {
    const k = `${day}-${hour}`;
    this.availGrid.update(g => ({ ...g, [k]: !g[k] }));
  }

  isSel(day: string, hour: string): boolean {
    return !!this.availGrid()[`${day}-${hour}`];
  }

  private toSlots(): AvailabilitySlot[] {
    const result: AvailabilitySlot[] = [];
    for (const day of this.DAYS) {
      const hours = this.HOURS.filter(h => this.availGrid()[`${day.key}-${h}`]);
      if (!hours.length) continue;
      let start = hours[0];
      let prev  = parseInt(hours[0]);
      for (let i = 1; i <= hours.length; i++) {
        const cur = i < hours.length ? parseInt(hours[i]) : -1;
        if (cur !== prev + 1) {
          const endH = prev + 1;
          result.push({
            jourSemaine: day.key as AvailabilitySlot['jourSemaine'],
            heureDebut:  start,
            heureFin:    `${String(endH).padStart(2, '0')}:00`,
            recurrente:  true
          });
          if (i < hours.length) { start = hours[i]; prev = parseInt(hours[i]); }
        } else { prev = cur; }
      }
    }
    return result;
  }

  // ✅ CORRECTION : saveAvailability navigue vers l'étape 3 uniquement dans le callback
  //    de succès — plus de step.set() dans le template pour cette action.
  saveAvailability(): void {
    this.saving.set(true);
    this.profileSvc.updateAvailability(this.toSlots()).subscribe({
      next: () => {
        this.saving.set(false);
        this.step.set(3); // ← Navigation ici UNIQUEMENT, après confirmation serveur
        this.showToast('Disponibilités sauvegardées');
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Erreur de sauvegarde');
      }
    });
  }

  addObjectif(): void {
    this.objFormErr.set('');
    if (!this.newObj.matiereId || !this.newObj.deadline) {
      this.objFormErr.set('Matière et date limite sont obligatoires.');
      return;
    }

    const selectedDeadline = new Date(this.newObj.deadline + 'T23:59:59');
    const endOfWeek = new Date(this.maxWeekDate() + 'T23:59:59');
    if (selectedDeadline.getTime() > endOfWeek.getTime()) {
      this.objFormErr.set(`La date limite ne peut pas dépasser la fin de cette semaine (${this.fmtDeadline(this.maxWeekDate())}).`);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(this.newObj.deadline + 'T00:00:00') <= today) {
      this.objFormErr.set('La deadline doit être une date future.');
      return;
    }

    const payload = { ...this.newObj, priorite: this.newObjPriorite() };

    this.objectifSvc.createObjectif(payload).subscribe({
      next: res => {
        this.objectifs.update(l => [res.objectif, ...l]);
        this.showObjForm.set(false);
        this.objFormErr.set('');
        this.newObj = { matiereId: '', heuresParSemaine: 2, deadline: '', freqNotifJours: 3 };
        this.newObjPriorite.set('moyenne');
        this.showToast('Objectif ajouté');
      },
      error: () => this.showToast("Erreur lors de la création de l'objectif")
    });
  }

  removeObjectif(id: string): void {
    this.objectifSvc.deleteObjectif(id).subscribe({
      next:  () => this.objectifs.update(l => l.filter(o => o._id !== id)),
      error: () => this.showToast('Erreur suppression objectif')
    });
  }

  generate(): void {
    if (!this.objectifs().length) { this.showToast('Ajoutez au moins un objectif'); return; }
    this.generating.set(true);
    this.planningSvc.generateSessions({ semaine: this.currentWeek(), dureeMaxSession: 90 }).subscribe({
      next: res => {
        this.generating.set(false);
        if (!res.nbCreees) {
          this.showToast(res.message ?? 'Aucun créneau disponible');
        } else {
          this.sessions.set(res.sessions);
          this.showToast(`${res.nbCreees} session(s) générée(s) !`);
        }
      },
      error: () => { this.generating.set(false); this.showToast('Erreur de génération'); }
    });
  }

  openSessModal(): void {
    this.sessErr.set('');
    this.sessErrDate.set('');
    this.sessErrTime.set('');
    this.newSess = { matiereId: '', date: '', heureDebut: '', heureFin: '' };
    this.showSessModal.set(true);
  }

  createSession(): void {
    this.sessErr.set('');
    this.sessErrDate.set('');
    this.sessErrTime.set('');

    const { matiereId, date, heureDebut, heureFin } = this.newSess;
    if (!matiereId || !date || !heureDebut || !heureFin) {
      this.sessErr.set('Tous les champs sont obligatoires.');
      return;
    }

    let hasError = false;
    const dateDebut = new Date(`${date}T${heureDebut}`);
    if (dateDebut.getTime() < Date.now()) {
      this.sessErrDate.set("La date de début ne peut pas être dans le passé.");
      hasError = true;
    }

    const [sh, sm] = heureDebut.split(':').map(Number);
    const [eh, em] = heureFin.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    const duration = endMin - startMin;

    if (duration <= 0) {
      this.sessErrTime.set("L'heure de fin doit être après l'heure de début.");
      hasError = true;
    }

    if (hasError) return;

    const subject = this.subjects().find(s => s._id === matiereId);
    this.planningSvc.createSession({
      matiereId,
      titre:      subject?.nom ?? 'Session',
      dateDebut:  `${date}T${heureDebut}`,
      dateFin:    `${date}T${heureFin}`,
      notes:      '',
      isPartagee: false
    }).subscribe({
      next: res => {
        this.sessions.update(l => [...l, res.session]);
        this.showSessModal.set(false);
        this.showToast('Session ajoutée');
      },
      error: (err: { status: number }) => this.sessErr.set(
        err.status === 409 ? 'Ce créneau est déjà occupé.' : 'Erreur lors de la création.'
      )
    });
  }

  removeSession(id: string): void {
    this.planningSvc.deleteSession(id).subscribe({
      next:  () => {
        this.sessions.update(l => l.filter(s => s._id !== id));
        this.showToast('Session supprimée');
      },
      error: () => this.showToast('Erreur suppression session')
    });
  }

  canStartSession(s: Session): boolean {
    if (s.statut !== 'planifiee' || this.activeTimerSession()) return false;
    const startTime = new Date(s.dateDebut).getTime();
    const now = this.currentTimeTick();
    const diffInMs = startTime - now;
    return diffInMs >= 0 && diffInMs <= 300000;
  }

  onDemarrer(session: Session): void {
    const enriched: Session = { ...session, statut: 'en_cours' };
    this.sessions.update(l => l.map(s => s._id === session._id ? enriched : s));
    this.showToast('Session démarrée !');

    this.timerSvc.startTimer(enriched, () => this.onTimerExpired());

    this.planningSvc.startSession(session._id).subscribe({
      next: () => {},
      error: () => {
        this.timerSvc.clear();
        this.sessions.update(l => l.map(s => s._id === session._id ? session : s));
        this.showToast('Erreur au démarrage');
      }
    });
  }

  private onTimerExpired(): void {
    const session = this.timerSvc.activeTimerSession();
    if (!session) return;

    const heuresRealisees = this.timerSvc.getElapsedHours();

    this.planningSvc.completeSession(session._id, heuresRealisees).subscribe({
      next: res => {
        const statut: string = res.statut ?? (res.session?.statut ?? 'realisee');
        const points = res.pointsGagnes ?? 0;

        const msg = statut === 'realisee'
          ? `Session terminée ! +${points} points 🎉`
          : 'Session non réalisée (temps d\'étude insuffisant)';

        this.timerSvc.clear();
        this.showToast(msg);
        this.loadSessions();
      },
      error: () => this.showToast('Erreur lors de la clôture de la session')
    });
  }

  getProgression(obj: Objectif): number {
    const realisees = this.sessions().filter(s => s.matiereId === obj.matiereId && s.statut === 'realisee');
    const heuresRealisees = realisees.reduce((sum, s) => sum + (s.heuresPlanifiees ?? 1), 0);
    return Math.min(100, Math.round((heuresRealisees / (obj.heuresParSemaine || 1)) * 100));
  }

  openWizard():  void { this.step.set(1); this.wizardMode.set(true); }
  closeWizard(): void { this.wizardMode.set(false); }

  isPast(s: Session): boolean {
    return s.statut === 'realisee' || s.statut === 'non_realisee' || new Date(s.dateFin).getTime() < Date.now();
  }

  fmtTime(d: string): string {
    const t = new Date(d);
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  }

  fmtDayHeader(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${DAY_LABELS[(date.getDay() + 6) % 7]} ${dd}/${mm}`;
  }

  private shortDate(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  fmtDeadline(d: string): string {
    const t = new Date(d);
    return `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}`;
  }

  prioColor(p: string | undefined): string {
    return p === 'haute' ? '#ff6b6b' : p === 'moyenne' ? '#C9A84C' : '#00f5ff';
  }

  prioLabel(p: string | undefined): string {
    return p === 'haute' ? 'Haute' : p === 'moyenne' ? 'Moyenne' : 'Faible';
  }

  progColor(n: number): string {
    return n >= 80 ? '#00ff88' : n >= 50 ? '#C9A84C' : '#00f5ff';
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3500);
  }
}