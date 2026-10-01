import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ImageGalleryProps {
  images: string[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-[16/9] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
        Không có hình ảnh
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Main Image Area: large, rounded-xl, takes ~70% width or max-w-4xl */}
      <div className="relative w-full lg:w-[75%] aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden shadow-lg group">
        <img
          src={images[currentIndex]}
          alt={`Hình ảnh ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-all duration-300"
          referrerPolicy="no-referrer"
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Hình trước"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-navy-900/60 text-white hover:bg-gold-500 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Hình kế tiếp"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-navy-900/60 text-white hover:bg-gold-500 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Counter Badge */}
        <div className="absolute bottom-3 right-3 px-3 py-1 bg-navy-900/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/10">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Row */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 overflow-x-auto py-1 max-w-full">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-gold-500 shadow-md scale-105'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
