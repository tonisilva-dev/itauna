import { useState, useEffect } from 'react';
import { Building2, ImageIcon, FileText, Calendar, Bell, DollarSign, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryCarousel, type CarouselPhoto } from './GalleryCarousel';
import { DocumentsCarousel } from './DocumentsCarousel';
import { SchedulingCarousel, type SchedulingSlot } from './SchedulingCarousel';
import { EventsCarousel, type Event } from './EventsCarousel';
import { CommunicationsCarousel } from './CommunicationsCarousel';
import { SchedulingModal } from './SchedulingModal';
import { EventParticipationModal } from './EventParticipationModal';
import { ProfileModal } from './ProfileModal';
import { ModalContainer } from './ModalContainer';
import './CarouselNavigation.css';

// Fotos da galeria
const GALLERY_PHOTOS: CarouselPhoto[] = [
  { id: 0,  src: '/galeria/natureza/unnamed.webp',         caption: 'Lago ao entardecer',                 category: 'Natureza'       },
  { id: 1,  src: '/galeria/natureza/unnamed%20(1).webp',   caption: 'Pôr do sol no lago',                 category: 'Natureza'       },
  { id: 2,  src: '/galeria/natureza/unnamed%20(2).webp',   caption: 'Gansos no lago',                     category: 'Natureza'       },
  { id: 3,  src: '/galeria/natureza/unnamed%20(5).webp',   caption: 'Pelicanos na represa',               category: 'Natureza'       },
  { id: 4,  src: '/galeria/natureza/unnamed%20(8).webp',   caption: 'Vista panorâmica da região',         category: 'Natureza'       },
  { id: 5,  src: '/galeria/natureza/unnamed%20(9).webp',   caption: 'Lago e mata nativa',                 category: 'Natureza'       },
  { id: 6,  src: '/galeria/natureza/unnamed%20(12).webp',  caption: 'Campos verdes do entorno',           category: 'Natureza'       },
  { id: 7,  src: '/galeria/infraestrutura/unnamed%20(4).webp',                       caption: 'Portaria — entrada principal',       category: 'Infraestrutura' },
  { id: 8,  src: '/galeria/infraestrutura/unnamed%20(6).webp',                       caption: 'Sede do condomínio à noite',         category: 'Infraestrutura' },
  { id: 9,  src: '/galeria/infraestrutura/08afc961-4afa-4af0-a9ce-798057dac397.jpg', caption: 'Rua interna — paralelepípedo',       category: 'Infraestrutura' },
  { id: 10, src: '/galeria/infraestrutura/73e958d0-b633-471f-8850-70a91d5e8b33.jpg', caption: 'Acesso com vista para a cidade',     category: 'Infraestrutura' },
  { id: 11, src: '/galeria/infraestrutura/7f0cfdb0-2a54-454d-bcb9-c8259f85df4d.jpg', caption: 'Via interna arborizada',             category: 'Infraestrutura' },
  { id: 12, src: '/galeria/infraestrutura/8219977a-f662-4de0-b8c1-14b1f17ee4ec.jpg', caption: 'Alameda principal',                  category: 'Infraestrutura' },
  { id: 13, src: '/galeria/infraestrutura/b4b99e16-7b8b-49dc-825e-9007910465d2.jpg', caption: 'Avenida interna com paisagismo',     category: 'Infraestrutura' },
  { id: 14, src: '/galeria/natureza/unnamed%20(3).webp',   caption: 'Área de pesca e descanso',           category: 'Lazer'          },
  { id: 15, src: '/galeria/natureza/unnamed%20(11).webp',  caption: 'Calçada à beira do lago',            category: 'Lazer'          },
  { id: 16, src: '/galeria/lazer/unnamed%20(10).webp',     caption: 'Fogueira noturna',                   category: 'Lazer'          },
  { id: 17, src: '/galeria/esportes/bfa38d32-829f-46ba-8e8d-6e55d1a61893.jpg', caption: 'Quadra de futsal',                category: 'Esportes'       },
];

interface NavSlide {
  id: number;
  label: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  route: string;
  badge1: string;
  badge2: string;
  badge3: string;
}

const SLIDES: NavSlide[] = [
  {
    id: 0,
    label: 'Galeria',
    icon: <ImageIcon className="w-12 h-12" />,
    title: 'Galeria de Fotos',
    subtitle: 'Condomínio Itaúna',
    description: 'Conheça a beleza do nosso condomínio através de fotos da natureza, infraestrutura e lazer.',
    color: '#57d8ff',
    route: '/galeria',
    badge1: '🏞️ Natureza',
    badge2: '🏗️ Infraestrutura',
    badge3: '🎉 Eventos',
  },
  {
    id: 1,
    label: 'Documentos',
    icon: <FileText className="w-12 h-12" />,
    title: 'Documentos',
    subtitle: 'Registros Importantes',
    description: 'Acesse rateios, regulamentos, resoluções e documentos essenciais da administração.',
    color: '#5a84ff',
    route: '/documentos',
    badge1: '📋 Rateios',
    badge2: '📜 Regulamentos',
    badge3: '⚖️ Resoluções',
  },
  {
    id: 2,
    label: 'Agendamentos',
    icon: <Calendar className="w-12 h-12" />,
    title: 'Agendamentos',
    subtitle: 'Reserve Áreas Comuns',
    description: 'Agende salas de reunião, quadra de esportes e demais espaços do condomínio.',
    color: '#10b981',
    route: '/agendamentos',
    badge1: '📅 Disponível',
    badge2: '✅ Confirmado',
    badge3: '⏳ Pendente',
  },
  {
    id: 3,
    label: 'Comunicados',
    icon: <Bell className="w-12 h-12" />,
    title: 'Comunicados',
    subtitle: 'Mantenha-se Informado',
    description: 'Notícias, avisos e comunicações importantes da administração do condomínio.',
    color: '#f59e0b',
    route: '/comunicados',
    badge1: '🔔 Novidade',
    badge2: '⚠️ Importante',
    badge3: '📢 Geral',
  },
  {
    id: 4,
    label: 'Eventos',
    icon: <Building2 className="w-12 h-12" />,
    title: 'Eventos',
    subtitle: 'Atividades Sociais',
    description: 'Participe de eventos comunitários, festas, reuniões e atividades sociais.',
    color: '#8b5cf6',
    route: '/eventos',
    badge1: '🎊 Social',
    badge2: '🎭 Cultural',
    badge3: '🏅 Prêmios',
  },
  {
    id: 5,
    label: 'Minha Unidade',
    icon: <User className="w-12 h-12" />,
    title: 'Perfil e Unidade',
    subtitle: 'Dados Pessoais',
    description: 'Visualize e atualize seus dados, informações da sua chácara e preferências.',
    color: '#ef4444',
    route: '/perfil',
    badge1: '👤 Perfil',
    badge2: '🏠 Unidade',
    badge3: '⚙️ Preferências',
  },
];

export const CarouselNavigation = () => {
  const [cur, setCur] = useState(0);
  const [autoTimer, setAutoTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // Carrosséis
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [communicationsOpen, setCommunicationsOpen] = useState(false);

  // Modais
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [eventParticipationModalOpen, setEventParticipationModalOpen] = useState(false);
  const [selectedSchedulingSlot, setSelectedSchedulingSlot] = useState<SchedulingSlot | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const total = SLIDES.length;

  const posClass = (slideIdx: number) => {
    const diff = ((slideIdx - cur) % total + total) % total;
    if (diff === 0) return 'pos-active';
    if (diff === 1) return 'pos-next';
    if (diff === total - 1) return 'pos-prev';
    return diff <= Math.floor(total / 2) ? 'pos-far-next' : 'pos-far-prev';
  };

  const goTo = (idx: number) => {
    setCur(((idx % total) + total) % total);
    resetAuto();
  };

  const next = () => goTo(cur + 1);
  const prev = () => goTo(cur - 1);

  const startAuto = () => {
    setAutoTimer(setInterval(() => setCur((c) => (c + 1) % total), 5000));
  };

  const stopAuto = () => {
    if (autoTimer) clearInterval(autoTimer);
    setAutoTimer(null);
  };

  const resetAuto = () => {
    stopAuto();
    startAuto();
  };

  useEffect(() => {
    startAuto();
    return () => stopAuto();
  }, []);

  const handleSlideClick = (slideId: number) => {
    switch (slideId) {
      case 0: // Galeria
        setGalleryOpen(true);
        break;
      case 1: // Documentos
        setDocumentsOpen(true);
        break;
      case 2: // Agendamentos
        setSchedulingOpen(true);
        break;
      case 3: // Comunicados
        setCommunicationsOpen(true);
        break;
      case 4: // Eventos
        setEventsOpen(true);
        break;
      case 5: // Perfil
        setProfileModalOpen(true);
        break;
    }
  };

  return (
    <div className="carousel-wrapper">
      {/* Background orbs */}
      <div className="bg-orb">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>
      <div className="bg-grid" />
      <div className="bg-noise" />

      <div className="stage-wrap">
        {/* 3D Stage */}
        <div className="stage" onMouseEnter={stopAuto} onMouseLeave={startAuto}>
          {SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`slide ${posClass(idx)}`}
              onClick={() => {
                if (!posClass(idx).includes('active')) {
                  goTo(idx);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <span className="slide-label">{slide.label}</span>

              {/* Header */}
              <div className="panel-head">
                <div className="logo">
                  <span className="logo-mark" style={{ background: slide.color }} />
                  Itaúna
                </div>
                <div style={{ color: slide.color, fontSize: '11px', fontWeight: 700 }}>
                  {slide.label}
                </div>
              </div>

              {/* Body */}
              <div className="panel-body">
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ color: slide.color, flex: '0 0 auto' }}>
                    {slide.icon}
                  </div>
                  <div>
                    <p className="eyebrow">{slide.subtitle}</p>
                    <h2 className="section-h" style={{ color: '#fff' }}>
                      {slide.title}
                    </h2>
                  </div>
                </div>

                <p className="section-sub">{slide.description}</p>

                <button
                  onClick={() => handleSlideClick(slide.id)}
                  className="btn btn-primary"
                  style={{ marginTop: 'auto' }}
                >
                  Explorar
                </button>
              </div>

              {/* Badges */}
              <div className="panel-badges">
                <div className="badge-item">{slide.badge1}</div>
                <div className="badge-item">{slide.badge2}</div>
                <div className="badge-item">{slide.badge3}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="controls">
          <button className="ctrl-btn" onClick={prev}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="dots">
            {SLIDES.map((_, idx) => (
              <span
                key={idx}
                className={`dot ${idx === cur ? 'on' : ''}`}
                data-s={idx}
                onClick={() => goTo(idx)}
              />
            ))}
          </div>
          <button className="ctrl-btn" onClick={next}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CARROSSÉIS E MODAIS */}

      {/* Galeria - Carrossel */}
      <GalleryCarousel
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={GALLERY_PHOTOS}
      />

      {/* Documentos - Carrossel */}
      <DocumentsCarousel
        isOpen={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
      />

      {/* Agendamentos - Carrossel */}
      <SchedulingCarousel
        isOpen={schedulingOpen}
        onClose={() => setSchedulingOpen(false)}
        onSchedule={(slot) => {
          setSelectedSchedulingSlot(slot);
          setSchedulingModalOpen(true);
        }}
      />

      {/* Comunicados - Carrossel */}
      <CommunicationsCarousel
        isOpen={communicationsOpen}
        onClose={() => setCommunicationsOpen(false)}
      />

      {/* Eventos - Carrossel */}
      <EventsCarousel
        isOpen={eventsOpen}
        onClose={() => setEventsOpen(false)}
        onJoin={(event) => {
          setSelectedEvent(event);
          setEventParticipationModalOpen(true);
        }}
      />

      {/* Perfil - Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Agendamento - Modal */}
      {selectedSchedulingSlot && (
        <SchedulingModal
          isOpen={schedulingModalOpen}
          onClose={() => setSchedulingModalOpen(false)}
          slot={selectedSchedulingSlot}
        />
      )}

      {/* Participação em Evento - Modal */}
      {selectedEvent && (
        <EventParticipationModal
          isOpen={eventParticipationModalOpen}
          onClose={() => setEventParticipationModalOpen(false)}
          event={selectedEvent}
        />
      )}
    </div>
  );
};
