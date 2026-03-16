'use client'

export default function CookieSettingsButton() {
  function openSettings() {
    localStorage.removeItem('svhose_cookie_consent')
    window.dispatchEvent(new CustomEvent('svhose:open-cookie-settings'))
  }

  return (
    <button
      onClick={openSettings}
      className="hover:text-[#f5f5f0] transition-colors"
    >
      Cookie-Einstellungen
    </button>
  )
}
