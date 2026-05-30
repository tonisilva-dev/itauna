import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';

export interface DocumentItem {
  id: number;
  type: 'rateios' | 'regulamentos' | 'resolucoes' | 'atas';
  title: string;
  description: string;
  date: string;
  fileName: string;
  url: string;
  icon: string;
}

interface DocumentsCarouselProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (doc: DocumentItem) => void;
}

const DOCUMENTS: DocumentItem[] = [
  {
    id: 1,
    type: 'rateios',
    title: 'Rateio Maio 2026',
    description: 'Despesas e contribuições do mês',
    date: '2026-05-01',
    fileName: 'rateio-maio-2026.pdf',
    url: '#',
    icon: '📊',
  },
  {
    id: 2,
    type: 'rateios',
    title: 'Rateio Abril 2026',
    description: 'Despesas e contribuições do mês',
    date: '2026-04-01',
    fileName: 'rateio-abril-2026.pdf',
    url: '#',
    icon: '📊',
  },
  {
    id: 3,
    type: 'regulamentos',
    title: 'Regulamento Interno',
    description: 'Normas e regras do condomínio',
    date: '2024-01-15',
    fileName: 'regulamento-interno.pdf',
    url: '#',
    icon: '📋',
  },
  {
    id: 4,
    type: 'resolucoes',
    title: 'Resolução 2026/01',
    description: 'Assembleia Geral Ordinária',
    date: '2026-01-20',
    fileName: 'resolucao-2026-01.pdf',
    url: '#',
    icon: '⚖️',
  },
  {
    id: 5,
    type: 'atas',
    title: 'Ata AGO 2026',
    description: 'Assembleia Geral Ordinária',
    date: '2026-01-20',
    fileName: 'ata-ago-2026.pdf',
    url: '#',
    icon: '📝',
  },
];

const TYPES = ['Todas', 'Rateios', 'Regulamentos', 'Resoluções', 'Atas'];

export const DocumentsCarousel = ({ isOpen, onClose, onEdit }: DocumentsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [type, setType] = useState('Todas');

  if (!isOpen) return null;

  const filtered = DOCUMENTS.filter(
    (d) => type === 'Todas' || d.type === type.toLowerCase()
  );

  const current = filtered[currentIndex % filtered.length];
  const typeEmoji = {
    rateios: '📊',
    regulamentos: '📋',
    resolucoes: '⚖️',
    atas: '📝',
  };

  const next = () => setCurrentIndex((c) => (c + 1) % filtered.length);
  const prev = () => setCurrentIndex((c) => (c - 1 + filtered.length) % filtered.length);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl"
        style={{ overflowY: 'auto', maxHeight: '100%', paddingBottom: '4px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Document Card */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.008)), linear-gradient(160deg, rgba(13,20,35,.95), rgba(8,13,24,.97))',
            border: '1px solid rgba(125,157,224,.12)',
            borderRadius: '28px',
            overflow: 'hidden',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)',
            boxShadow: '0 32px 96px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.055)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 'clamp(20px, 5vw, 40px) clamp(16px, 5vw, 40px) 0',
              background: `linear-gradient(135deg, rgba(87,216,255,.08), rgba(90,132,255,.05))`,
            }}
          >
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>
              {typeEmoji[current.type as keyof typeof typeEmoji]}
            </div>
            <p
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#57d8ff',
                marginBottom: '12px',
              }}
            >
              {current.type.replace('_', ' ')}
            </p>
            <h2
              style={{
                fontSize: 'clamp(26px, 3.8vw, 36px)',
                fontWeight: 900,
                letterSpacing: '-0.045em',
                lineHeight: 1.08,
                color: '#fff',
                marginBottom: '12px',
              }}
            >
              {current.title}
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                color: 'rgba(255,255,255,.6)',
                lineHeight: 1.72,
                marginBottom: '40px',
              }}
            >
              {current.description}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '0 clamp(16px, 5vw, 40px) clamp(20px, 4vw, 40px)' }}>
            <div
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(125,157,224,.1)',
                borderRadius: '18px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '6px' }}>
                    Arquivo
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                    {current.fileName}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginTop: '6px' }}>
                    Data: {new Date(current.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <a
                  href={current.url}
                  download
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #72e3ff, #669dff)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#07101c',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(76,164,255,.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (onEdit) onEdit(current);
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #72e3ff, #669dff)',
                  color: '#07101c',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 36px rgba(87,216,255,.42)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                Visualizar
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '11px',
                  border: '1px solid rgba(255,255,255,.09)',
                  background: 'rgba(255,255,255,.04)',
                  color: '#d3dff6',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(87,216,255,.28)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.09)';
                }}
              >
                Fechar
              </button>
            </div>
          </div>

          {/* Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: 'rgba(255,255,255,.04)',
              borderTop: '1px solid rgba(255,255,255,.04)',
            }}
          >
            <div
              style={{
                minHeight: '56px',
                background: 'rgba(255,255,255,.018)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                color: '#e7f0fe',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              📄 PDF
            </div>
            <div
              style={{
                minHeight: '56px',
                background: 'rgba(255,255,255,.018)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                color: '#e7f0fe',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              ⬇️ Download
            </div>
            <div
              style={{
                minHeight: '56px',
                background: 'rgba(255,255,255,.018)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                color: '#e7f0fe',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              🔐 Seguro
            </div>
          </div>
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setCurrentIndex(0);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: t === type ? '#57d8ff' : 'rgba(255,255,255,.08)',
                color: t === type ? '#0a0f1e' : 'rgba(255,255,255,.6)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (t !== type) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (t !== type) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)';
                }
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '28px',
            marginTop: '24px',
          }}
        >
          <button
            onClick={prev}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              cursor: 'pointer',
              border: '1px solid rgba(125,157,224,.22)',
              background: 'rgba(255,255,255,.04)',
              color: '#57d8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.24s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(87,216,255,.16)';
              (e.currentTarget as HTMLElement).style.borderColor = '#57d8ff';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(87,216,255,.38)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,157,224,.22)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {filtered.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: idx === currentIndex ? '#57d8ff' : 'rgba(255,255,255,.2)',
                  border: '1px solid rgba(87,216,255,.28)',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              cursor: 'pointer',
              border: '1px solid rgba(125,157,224,.22)',
              background: 'rgba(255,255,255,.04)',
              color: '#57d8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.24s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(87,216,255,.16)';
              (e.currentTarget as HTMLElement).style.borderColor = '#57d8ff';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(87,216,255,.38)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125,157,224,.22)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
