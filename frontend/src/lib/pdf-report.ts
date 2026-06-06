import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ════════════════════════════════════════════════════════════════
   Gerador de relatórios PDF — Condomínio Chácaras Itaúna
   Vetorial, profissional, imprimível. Texto selecionável, < 100 KB.
   ════════════════════════════════════════════════════════════════ */

const CONDO = 'Condomínio Chácaras Itaúna';

/* Paleta (RGB) alinhada à identidade do app */
const C = {
  navy:   [13, 20, 35] as [number, number, number],
  cyan:   [6, 182, 212] as [number, number, number],
  teal:   [15, 118, 110] as [number, number, number],
  text:   [31, 41, 55] as [number, number, number],
  muted:  [107, 114, 128] as [number, number, number],
  line:   [229, 231, 235] as [number, number, number],
  card:   [247, 249, 252] as [number, number, number],
  green:  [16, 185, 129] as [number, number, number],
  amber:  [245, 158, 11] as [number, number, number],
  red:    [239, 68, 68] as [number, number, number],
  blue:   [59, 130, 246] as [number, number, number],
  white:  [255, 255, 255] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface ReportMeta {
  title: string;
  subtitle?: string;
  period: string;
  generatedBy?: string;
}

export interface KpiCard {
  label: string;
  value: string;
  accent?: [number, number, number];
}

export interface BarDatum {
  label: string;
  value: number;
}

const nowStamp = () =>
  new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export class ReportBuilder {
  private doc: jsPDF;
  private y: number;
  private meta: ReportMeta;

  constructor(meta: ReportMeta) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.meta = meta;
    this.y = 0;
    this.drawHeader();
  }

  /* ── Cabeçalho de marca ── */
  private drawHeader() {
    const d = this.doc;
    // Faixa navy
    d.setFillColor(...C.navy);
    d.rect(0, 0, PAGE_W, 30, 'F');
    // Acento ciano
    d.setFillColor(...C.cyan);
    d.rect(0, 30, PAGE_W, 1.2, 'F');

    // Nome do condomínio (eyebrow)
    d.setTextColor(...C.cyan);
    d.setFont('helvetica', 'bold');
    d.setFontSize(8);
    d.text(CONDO.toUpperCase(), MARGIN, 11);

    // Título do relatório
    d.setTextColor(...C.white);
    d.setFont('helvetica', 'bold');
    d.setFontSize(16);
    d.text(this.meta.title, MARGIN, 20);

    // Subtítulo
    if (this.meta.subtitle) {
      d.setTextColor(200, 210, 225);
      d.setFont('helvetica', 'normal');
      d.setFontSize(9);
      d.text(this.meta.subtitle, MARGIN, 26);
    }

    // Bloco direito: período + emissão
    d.setFontSize(8);
    d.setTextColor(180, 195, 215);
    d.setFont('helvetica', 'normal');
    d.text(`Período: ${this.meta.period}`, PAGE_W - MARGIN, 13, { align: 'right' });
    d.text(`Emitido em: ${nowStamp()}`, PAGE_W - MARGIN, 18, { align: 'right' });
    if (this.meta.generatedBy) {
      d.text(`Por: ${this.meta.generatedBy}`, PAGE_W - MARGIN, 23, { align: 'right' });
    }

    this.y = 42;
  }

  /* ── Garante espaço; quebra página se necessário ── */
  private ensureSpace(h: number) {
    if (this.y + h > PAGE_H - 18) {
      this.doc.addPage();
      this.y = MARGIN + 4;
    }
  }

  /* ── Título de seção ── */
  sectionTitle(text: string) {
    this.ensureSpace(14);
    const d = this.doc;
    d.setFillColor(...C.cyan);
    d.rect(MARGIN, this.y - 3.5, 3, 5, 'F');
    d.setTextColor(...C.text);
    d.setFont('helvetica', 'bold');
    d.setFontSize(12);
    d.text(text, MARGIN + 6, this.y + 1);
    this.y += 9;
  }

  /* ── Linha de cards KPI ── */
  kpiRow(cards: KpiCard[]) {
    const d = this.doc;
    const n = cards.length;
    const gap = 4;
    const w = (CONTENT_W - gap * (n - 1)) / n;
    const h = 22;
    this.ensureSpace(h + 4);

    cards.forEach((c, i) => {
      const x = MARGIN + i * (w + gap);
      const accent = c.accent ?? C.cyan;
      // Card
      d.setFillColor(...C.card);
      d.roundedRect(x, this.y, w, h, 2, 2, 'F');
      // Barra de acento no topo
      d.setFillColor(...accent);
      d.roundedRect(x, this.y, w, 1.6, 0.8, 0.8, 'F');
      // Valor
      d.setTextColor(...C.text);
      d.setFont('helvetica', 'bold');
      d.setFontSize(16);
      d.text(c.value, x + 4, this.y + 11);
      // Label
      d.setTextColor(...C.muted);
      d.setFont('helvetica', 'normal');
      d.setFontSize(7.5);
      d.text(c.label.toUpperCase(), x + 4, this.y + 17);
    });

    this.y += h + 6;
  }

  /* ── Tabela ── */
  table(head: string[], body: (string | number)[][]) {
    this.ensureSpace(20);
    autoTable(this.doc, {
      startY: this.y,
      head: [head],
      body: body.map(r => r.map(c => String(c))),
      margin: { left: MARGIN, right: MARGIN },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.2, textColor: C.text },
      headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
      tableLineColor: C.line,
      tableLineWidth: 0.1,
    });
    this.y = (this.doc as any).lastAutoTable.finalY + 8;
  }

  /* ── Gráfico de barras vertical ── */
  barChart(data: BarDatum[], opts?: { height?: number; color?: [number, number, number]; labelEvery?: number; valueFormat?: (v: number) => string }) {
    const d = this.doc;
    const h = opts?.height ?? 48;
    const color = opts?.color ?? C.cyan;
    const labelEvery = opts?.labelEvery ?? 1;
    const fmt = opts?.valueFormat ?? ((v: number) => String(v));
    this.ensureSpace(h + 14);

    const baseY = this.y + h;
    const maxVal = Math.max(...data.map(b => b.value), 1);
    const slot = CONTENT_W / data.length;
    const barW = Math.min(slot * 0.62, 14);

    // Linha base
    d.setDrawColor(...C.line);
    d.setLineWidth(0.2);
    d.line(MARGIN, baseY, MARGIN + CONTENT_W, baseY);

    data.forEach((b, i) => {
      const cx = MARGIN + i * slot + slot / 2;
      const barH = (b.value / maxVal) * (h - 4);
      const x = cx - barW / 2;
      const yTop = baseY - barH;
      // Barra
      d.setFillColor(...color);
      d.roundedRect(x, yTop, barW, barH, 0.6, 0.6, 'F');
      // Valor no topo (só se houver valor e espaço)
      if (b.value > 0 && barH > 5) {
        d.setTextColor(...C.muted);
        d.setFont('helvetica', 'normal');
        d.setFontSize(6);
        d.text(fmt(b.value), cx, yTop - 1.2, { align: 'center' });
      }
      // Label eixo X
      if (i % labelEvery === 0) {
        d.setTextColor(...C.muted);
        d.setFont('helvetica', 'normal');
        d.setFontSize(6.5);
        d.text(b.label, cx, baseY + 4, { align: 'center' });
      }
    });

    this.y = baseY + 10;
  }

  /* ── Parágrafo de texto ── */
  paragraph(text: string) {
    const d = this.doc;
    d.setTextColor(...C.muted);
    d.setFont('helvetica', 'normal');
    d.setFontSize(9);
    const lines = d.splitTextToSize(text, CONTENT_W);
    this.ensureSpace(lines.length * 4.5 + 3);
    d.text(lines, MARGIN, this.y);
    this.y += lines.length * 4.5 + 4;
  }

  /* ── Rodapé em todas as páginas + salvar ── */
  save(filename: string) {
    const d = this.doc;
    const pages = d.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      d.setPage(p);
      d.setDrawColor(...C.line);
      d.setLineWidth(0.2);
      d.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
      d.setFontSize(7);
      d.setTextColor(...C.muted);
      d.setFont('helvetica', 'normal');
      d.text(`${CONDO} · Documento confidencial`, MARGIN, PAGE_H - 8);
      d.text(`Página ${p} de ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
    }
    d.save(filename);
  }
}

export const REPORT_COLORS = C;
