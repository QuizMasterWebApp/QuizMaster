import { useEffect, useState } from 'react';

export function useIsPortrait() {
  const getOrientation = () => window.innerHeight > window.innerWidth;
  const [isPortrait, setIsPortrait] = useState(getOrientation());

  useEffect(() => {
    const handleResize = () => setIsPortrait(getOrientation());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isPortrait;
}