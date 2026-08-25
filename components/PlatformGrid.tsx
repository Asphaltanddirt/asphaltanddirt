export default function PlatformGrid() {
  return (
    <div className="platform-grid">
      <div className="platform">
        <div className="platform-left">
          <div className="platform-icon" style={{ background: "#1DB954", color: "#fff" }}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
          Spotify
        </div>
      </div>
      <div className="platform">
        <div className="platform-left">
          <div className="platform-icon" style={{ background: "#9b3fe0", color: "#fff" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13a9 9 0 0 1 18 0" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" /></svg>
          </div>
          Apple Podcasts
        </div>
      </div>
      <div className="platform">
        <div className="platform-left">
          <div className="platform-icon" style={{ background: "#00A8E1", color: "#fff" }}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
          Amazon Music
        </div>
      </div>
      <div className="platform">
        <div className="platform-left">
          <div className="platform-icon" style={{ background: "#FF0000", color: "#fff" }}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </div>
          YouTube
        </div>
        <span className="badge-outline" style={{ color: "#ff4a1f" }}>Live</span>
      </div>
    </div>
  );
}
