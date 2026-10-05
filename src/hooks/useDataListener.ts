import { useState, useEffect } from 'react';
import { DATA_CHANGED_EVENT } from '@/services/dataStorage';

export function useDataListener(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setVersion((v) => v + 1);
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, handleUpdate);
    };
  }, []);

  return version;
}
