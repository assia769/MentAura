import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-floating-orb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-orb.component.html',
  styleUrls: ['./floating-orb.component.scss']
})
export class FloatingOrbComponent implements AfterViewInit, OnDestroy {
  @ViewChild('orbCanvas') orbCanvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animId!: number;
  private particles: Particle[] = [];
  private mouse = { x: 0, y: 0 };
  private time = 0;

  words = ['Focus.', 'Create.', 'Evolve.'];
  currentWord = 0;
  private wordInterval!: any;

  ngAfterViewInit(): void {
    this.initCanvas();
    this.startWordCycle();
    window.addEventListener('mousemove', this.onMouseMove);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    clearInterval(this.wordInterval);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.orbCanvas.nativeElement.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  };

  private initCanvas(): void {
    const canvas = this.orbCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resize(canvas);
    this.spawnParticles();
    this.loop();
    window.addEventListener('resize', () => this.resize(canvas));
  }

  private resize(canvas: HTMLCanvasElement): void {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  private spawnParticles(): void {
    const canvas = this.orbCanvas.nativeElement;
    this.particles = Array.from({ length: 60 }, () => new Particle(canvas.width, canvas.height));
  }

  private loop = (): void => {
    const canvas = this.orbCanvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.time += 0.008;

    // Central orb glow
    const cx = canvas.width * 0.5 + Math.sin(this.time * 0.7) * 18;
    const cy = canvas.height * 0.5 + Math.cos(this.time * 0.5) * 14;
    this.drawOrb(cx, cy);

    // Particles
    this.particles.forEach(p => {
      p.update(this.mouse, this.time);
      p.draw(this.ctx);
    });

    this.animId = requestAnimationFrame(this.loop);
  };

  private drawOrb(cx: number, cy: number): void {
    const ctx = this.ctx;

    // Outer diffuse ring
    const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
    g1.addColorStop(0, 'rgba(201,168,76,0.07)');
    g1.addColorStop(0.5, 'rgba(201,168,76,0.04)');
    g1.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 220, 0, Math.PI * 2);
    ctx.fillStyle = g1;
    ctx.fill();

    // Inner glow
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    g2.addColorStop(0, 'rgba(201,168,76,0.22)');
    g2.addColorStop(0.6, 'rgba(201,168,76,0.06)');
    g2.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.fillStyle = g2;
    ctx.fill();

    // Orbiting ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.time * 0.4);
    ctx.strokeStyle = 'rgba(201,168,76,0.18)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Second ring counter-rotate
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.time * 0.25);
    ctx.strokeStyle = 'rgba(201,168,76,0.10)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 18]);
    ctx.beginPath();
    ctx.arc(0, 0, 155, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private startWordCycle(): void {
    this.wordInterval = setInterval(() => {
      this.currentWord = (this.currentWord + 1) % this.words.length;
    }, 2200);
  }
}

class Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;

  constructor(w: number, h: number) {
    this.x = this.baseX = Math.random() * w;
    this.y = this.baseY = Math.random() * h;
    this.size = Math.random() * 1.5 + 0.3;
    this.opacity = Math.random() * 0.4 + 0.05;
    this.speed = Math.random() * 0.008 + 0.003;
    this.angle = Math.random() * Math.PI * 2;
  }

  update(mouse: { x: number; y: number }, t: number): void {
    // Drift
    this.angle += this.speed;
    this.x = this.baseX + Math.sin(this.angle + t) * 18;
    this.y = this.baseY + Math.cos(this.angle * 0.7 + t) * 14;

    // Mouse repulsion
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 80) {
      const force = (80 - dist) / 80;
      this.x += (dx / dist) * force * 6;
      this.y += (dy / dist) * force * 6;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201,168,76,${this.opacity})`;
    ctx.fill();
  }
}