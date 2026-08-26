"use client";

import { useState } from "react";

export default function BuildGallery({ images }: { images: { src: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  function prev() {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setIndex((i) => (i + 1) % images.length);
  }

  return (
    <div className="gallery">
      <div className="gallery-main">
        <span className="gallery-count">{index + 1} / {images.length}</span>
        <button className="gallery-arrow prev" onClick={prev} aria-label="Previous photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
        </button>
        <button className="gallery-arrow next" onClick={next} aria-label="Next photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.src} alt={current.alt} />
      </div>
      <div className="gallery-thumbs">
        {images.map((img, i) => (
          <button
            className="gallery-thumb"
            key={img.src}
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1}`}
            style={{ padding: 0, background: "none", display: "block", width: "100%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.alt} />
          </button>
        ))}
      </div>
    </div>
  );
}
