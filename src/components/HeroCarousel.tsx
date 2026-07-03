import topCarousel from '../assets/top-carousel.png';
import bottomCarousel from '../assets/bottom-carousel.png';

interface HeroCarouselProps {
  position: 'top' | 'bottom';
}

const IMAGES = {
  top: topCarousel,
  bottom: bottomCarousel,
};

const EDGE_FADE_CLASS = {
  top: 'bg-gradient-to-t',
  bottom: 'bg-gradient-to-b',
};

const DIRECTION_CLASS = {
  top: '',
  bottom: '[animation-direction:reverse]',
};

export default function HeroCarousel({ position }: HeroCarouselProps) {
  const image = IMAGES[position];

  return (
    <div className="relative flex-1 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Scrolling row — rendered twice back-to-back so the loop is seamless */}
      <div
        className={`flex w-max h-full animate-marquee motion-reduce:animate-none will-change-transform opacity-50 ${DIRECTION_CLASS[position]}`}
      >
        <img src={image} alt="" className="h-full w-auto shrink-0" />
        <img src={image} alt="" className="h-full w-auto shrink-0" />
      </div>

      {/* Fade into the page background at the top/bottom and side edges */}
      <div className={`absolute inset-0 ${EDGE_FADE_CLASS[position]} from-surface via-transparent to-transparent`} />
      <div className="absolute inset-0 bg-gradient-to-r from-surface via-transparent to-surface" />
    </div>
  );
}
