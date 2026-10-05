import { useState, useEffect } from 'react';

export function useDataListener(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setVersion((v) => v + 1);
    };

    window.addEventListener('pn_data_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('pn_data_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return version;
}
