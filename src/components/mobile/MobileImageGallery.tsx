import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface MobileImageGalleryProps {
  images: string[];
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
}

export const MobileImageGallery: React.FC<MobileImageGalleryProps> = ({
  images,
  isOpen,
  initialIndex = 0,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCurrentIndex(initialIndex);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
        <button 
          onClick={onClose}
          className="text-white p-2 -mr-2 bg-black/20 rounded-full"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 w-full h-full">
        <Swiper
          initialSlide={initialIndex}
          modules={[Navigation, Pagination]}
          onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
          className="w-full h-full"
          spaceBetween={20}
        >
          {images.map((src, idx) => (
            <SwiperSlide key={idx} className="flex items-center justify-center">
              <img 
                src={src} 
                alt={`Image ${idx + 1}`} 
                className="w-full max-h-screen object-contain"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
