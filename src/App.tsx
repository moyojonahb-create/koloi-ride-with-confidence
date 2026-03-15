import { useEffect, useState } from "react";

function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <h1 style={{ color: "#1d4ed8", fontSize: "42px", fontWeight: "bold" }}>Voyex</h1>
    </div>
  );
}

function HomePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h2>App loaded successfully</h2>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return showSplash ? <SplashScreen /> : <HomePage />;
}