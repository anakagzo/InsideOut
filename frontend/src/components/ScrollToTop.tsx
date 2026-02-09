import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 👇 Scroll to top whenever the route path changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant', // use 'smooth' if you prefer animation
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
