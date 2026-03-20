import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/** No-op wrapper — transitions removed for instant navigation */
const PageTransition = ({ children }: PageTransitionProps) => {
  return <div className="min-h-[100dvh]">{children}</div>;
};

export default PageTransition;
