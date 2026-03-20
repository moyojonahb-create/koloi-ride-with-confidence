/** No-op wrapper — swipe-back removed for instant navigation */
export default function SwipeBack({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
