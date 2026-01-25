export function speak(text: string) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  // Stop any current speech to prevent overlaps
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.volume = 1.0;

  window.speechSynthesis.speak(utter);
}
