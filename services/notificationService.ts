// Notification service supporting browser Web Notifications API
// Displays notifications visible even when user is on another browser tab or application.

const TIMER_ICON_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

export const APP_DEFAULT_TITLE = 'FocusFlow';

export type TimerStatus = 'initial' | 'running' | 'paused' | 'completed' | 'stopped';

/**
 * Updates the browser tab title according to the timer state:
 * - Initial / Stopped: FocusFlow
 * - Running: 24:32 • FocusFlow
 * - Paused: ⏸ 12:45 • FocusFlow
 * - Completed: FocusFlow
 */
export const setTimerTabTitle = (
  status: TimerStatus,
  timeLeftSeconds?: number
) => {
  if (typeof document === 'undefined') return;

  stopTitleFlashing();

  if (status === 'running' && typeof timeLeftSeconds === 'number' && timeLeftSeconds > 0) {
    const m = Math.floor(timeLeftSeconds / 60);
    const s = timeLeftSeconds % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    document.title = `${timeStr} • ${APP_DEFAULT_TITLE}`;
  } else if (status === 'paused' && typeof timeLeftSeconds === 'number' && timeLeftSeconds > 0) {
    const m = Math.floor(timeLeftSeconds / 60);
    const s = timeLeftSeconds % 60;
    const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    document.title = `⏸ ${timeStr} • ${APP_DEFAULT_TITLE}`;
  } else {
    // Initial, Stopped, or Completed
    document.title = APP_DEFAULT_TITLE;
  }
};

let titleBlinkInterval: number | null = null;
let originalTitle = typeof document !== 'undefined' ? document.title : APP_DEFAULT_TITLE;

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) {
    console.warn('HTML5 Notification API is not supported in this browser.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Failed to request notification permission:', error);
    return Notification.permission;
  }
};

/**
 * Flash tab title if the document is in the background
 */
export const startTitleFlashing = (alertText: string = '🔔 Timer Done! • FocusFlow') => {
  if (typeof document === 'undefined') return;

  if (!titleBlinkInterval) {
    originalTitle = document.title || 'FocusFlow';
    let isAlert = true;

    titleBlinkInterval = window.setInterval(() => {
      document.title = isAlert ? alertText : originalTitle;
      isAlert = !isAlert;
    }, 1000);

    const stopHandler = () => {
      stopTitleFlashing();
      window.removeEventListener('focus', stopHandler);
      document.removeEventListener('visibilitychange', stopHandler);
    };

    window.addEventListener('focus', stopHandler);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        stopHandler();
      }
    });
  }
};

export const stopTitleFlashing = () => {
  if (titleBlinkInterval) {
    clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
    if (typeof document !== 'undefined') {
      document.title = originalTitle;
    }
  }
};

/**
 * Play a high-contrast sound chime
 */
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Two-tone cheerful chime
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playTone(587.33, 0, 0.4); // D5
    playTone(880.00, 0.2, 0.6); // A5
    playTone(1174.66, 0.4, 1.2); // D6
  } catch (e) {
    console.warn('Notification audio playback failed:', e);
  }
};

export const formatDuration = (duration?: number | string): string => {
  if (duration === undefined || duration === null) {
    return '25 minutes';
  }
  if (typeof duration === 'number') {
    return `${duration} ${duration === 1 ? 'minute' : 'minutes'}`;
  }
  const trimmed = duration.trim();
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return `${num} ${num === 1 ? 'minute' : 'minutes'}`;
  }
  return trimmed;
};

/**
 * Dispatches a native desktop notification when the timer completes.
 * Visible across tabs and other desktop applications.
 */
export const sendTimerCompletedNotification = (duration: number | string = 25) => {
  const formattedDuration = formatDuration(duration);
  const displayTitle = '🎉 Focus Complete!';
  const messageBody = `You focused for ${formattedDuration}. Great job!`;

  // 1. Play chime
  playNotificationChime();

  // 2. Ensure tab title is clean FocusFlow as requested (avoids leaving a stale message in tab title)
  setTimerTabTitle('completed');

  // 3. Dispatch native browser notification
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const notification = new Notification(displayTitle, {
        body: messageBody,
        icon: TIMER_ICON_SVG,
        badge: TIMER_ICON_SVG,
        tag: 'focusflow-focus-timer',
        renotify: true,
        requireInteraction: true, // Remains on screen in Windows/macOS/Linux until user dismisses or clicks!
      });

      const autoCloseTimer = setTimeout(() => {
        try {
          notification.close();
        } catch (e) {
          // Ignore if already closed
        }
      }, 3000);

      notification.onclick = () => {
        clearTimeout(autoCloseTimer);
        try {
          window.focus();
        } catch (e) {
          // Ignore if browser prevents programmatic window.focus
        }
        stopTitleFlashing();
        notification.close();
      };
    } catch (err) {
      console.warn('Error creating Notification instance:', err);
    }
  }
};

/**
 * Send a quick test notification to confirm it displays correctly
 */
export const sendTestNotification = async (): Promise<boolean> => {
  let permission = getNotificationPermission();
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission === 'granted') {
    sendTimerCompletedNotification(25);
    return true;
  }
  return false;
};
