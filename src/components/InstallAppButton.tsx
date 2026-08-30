import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault?.();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (!installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
  };

  return (
    <button
      type="button"
      data-focusable
      data-nav-section="navbar"
      onClick={install}
      className="webos-install-control rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
      aria-label="Install Streamflix as an app"
    >
      Install
    </button>
  );
}
