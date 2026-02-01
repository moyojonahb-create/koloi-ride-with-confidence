/**
 * Push notification utilities
 * Note: Full web push requires a VAPID key and push_subscriptions table
 * For now, we use browser Notification API as fallback
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("[Push] Notifications not supported");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("[Push] Notifications permission denied");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function enablePush(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error("Notifications permission not granted.");
  }
  
  // For now, we just enable browser notifications
  // Full web push with VAPID keys can be added later
  console.log("[Push] Browser notifications enabled");
  return true;
}

export async function disablePush(): Promise<void> {
  // Web push unsubscription would go here
  console.log("[Push] Push notifications disabled");
}
