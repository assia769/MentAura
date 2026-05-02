import { Component, Input, OnChanges, SimpleChanges, ElementRef, AfterViewInit, ViewChild } from '@angular/core'
import { CommonModule } from '@angular/common'

export interface WeekPoint {
  label:    string
  heures:   number
  realises: number
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnChanges, AfterViewInit {
  @Input() parMatiere: { matiereId: string; heures: number; progression: number }[] = []
  @Input() heuresPlanifiees = 0
  @Input() heuresRealisees  = 0

  @ViewChild('svgEl') svgEl!: ElementRef<SVGSVGElement>

  points:   WeekPoint[] = []
  planPath  = ''
  realPath  = ''
  maxY      = 1
  svgW      = 560
  svgH      = 160
  padL      = 36
  padR      = 16
  padT      = 16
  padB      = 36

  yTicks: { val: number; y: number }[] = []

  ngOnChanges(c: SimpleChanges) {
    if (c['parMatiere'] || c['heuresPlanifiees'] || c['heuresRealisees']) {
      this.build()
    }
  }

  ngAfterViewInit() { this.build() }

  private build() {
    const days    = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    const totalPlan = this.heuresPlanifiees || 0
    const totalReal = this.heuresRealisees  || 0

    const weights = [0.18, 0.16, 0.15, 0.17, 0.14, 0.12, 0.08]
    this.points = days.map((label, i) => ({
      label,
      heures:   parseFloat((totalPlan * weights[i]).toFixed(1)),
      realises: parseFloat((totalReal * weights[i]).toFixed(1))
    }))

    this.maxY = Math.max(...this.points.map(p => p.heures), 1)

    const W = this.svgW - this.padL - this.padR
    const H = this.svgH - this.padT - this.padB
    const xStep = W / (this.points.length - 1)

    const toX = (i: number) => this.padL + i * xStep
    const toY = (v: number) => this.padT + H - (v / this.maxY) * H

    const smooth = (pts: { x: number; y: number }[]) =>
      pts.map((p, i) => {
        if (i === 0) return `M ${p.x},${p.y}`
        const prev = pts[i - 1]
        const cpx  = (prev.x + p.x) / 2
        return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`
      }).join(' ')

    const planPts = this.points.map((p, i) => ({ x: toX(i), y: toY(p.heures) }))
    const realPts = this.points.map((p, i) => ({ x: toX(i), y: toY(p.realises) }))

    this.planPath = smooth(planPts)
    this.realPath = smooth(realPts)

    const step = this.maxY / 4
    this.yTicks = [0, 1, 2, 3, 4].map(n => ({
      val: parseFloat((n * step).toFixed(1)),
      y:   toY(n * step)
    }))
  }

  xPos(i: number): number {
    const W = this.svgW - this.padL - this.padR
    return this.padL + i * (W / (this.points.length - 1))
  }

  yPos(v: number): number {
    const H = this.svgH - this.padT - this.padB
    return this.padT + H - (v / this.maxY) * H
  }
}