// Browser-meldingen voor water-herinneringen. Werkt zolang de app open is
// (ook op de achtergrond). Echte push bij volledig gesloten app vereist een
// pushserver en is op statische hosting niet betrouwbaar — daarom richten we
// ons op betrouwbare in-app + achtergrond-tab meldingen.

export function notificatiesBeschikbaar(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificatieStatus(): NotificationPermission {
  return notificatiesBeschikbaar() ? Notification.permission : 'denied'
}

export async function vraagNotificaties(): Promise<boolean> {
  if (!notificatiesBeschikbaar()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const r = await Notification.requestPermission()
    return r === 'granted'
  } catch {
    return false
  }
}

export async function toonMelding(titel: string, body: string, tag?: string): Promise<void> {
  if (!notificatiesBeschikbaar() || Notification.permission !== 'granted') return
  const icon = `${import.meta.env.BASE_URL}icon.svg`
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(titel, { body, tag, icon })
      return
    }
  } catch {
    /* val terug op Notification */
  }
  try {
    new Notification(titel, { body, tag, icon })
  } catch {
    /* niets */
  }
}
