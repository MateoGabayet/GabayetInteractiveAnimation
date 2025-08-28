"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Files:
 *   /public/gallery/svgs-inline/webapp00001.svg ... webapp00091.svg
 * Served at:
 *   /gallery/svgs-inline/webapp000NN.svg
 */
const PRIMARY_BASE = "/gallery/svgs-inline";
const FALLBACK_BASE = "/svgs-inline"; // optional fallback if some are there
const TOTAL_SVGS = 91;

// Soft cap for performance; "effectively unlimited" but prevents runaway growth.
const MAX_SHAPES = 5000;

const imageData = Array.from({ length: TOTAL_SVGS }, (_, i) => {
  const n = String(i + 1).padStart(5, "0");
  return `${PRIMARY_BASE}/webapp${n}.svg`;
});

export default function GalleryPage() {
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef(null);

  const [view, setView] = useState("gallery"); // "gallery" | "color" | "main"
  const [selectedSrc, setSelectedSrc] = useState(null);

  // Hue (applied as CSS filter; doesn't mutate SVGs)
  const [hue, setHue] = useState(0);
  const currentColor = `hsl(${hue} 100% 50%)`;

  // Track gallery scroll position so we can restore on return
  const scrollPosRef = useRef(0);

  // Main animation — +30% larger
  const elementSize = 260; // was 200
  // shape: {id, src, hue, addedAt, animState}
  const [shapes, setShapes] = useState([]);
  const animRef = useRef(null);
  const containerRef = useRef(null);

  const mainFont = '"Black Future", sans-serif';

  // -------- infinite loader --------
  const loadMore = useCallback(() => {
    const start = page * PAGE_SIZE;
    const next = imageData.slice(start, start + PAGE_SIZE);
    setItems((prev) => [...prev, ...next]);
    setPage((p) => p + 1);
    if (start + PAGE_SIZE >= imageData.length) setHasMore(false);
  }, [page]);

  useEffect(() => {
    loadMore();
  }, []); // first batch

  useEffect(() => {
    if (!hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    const node = loaderRef.current;
    if (node) obs.observe(node);
    return () => node && obs.unobserve(node);
  }, [hasMore, loadMore]);

  // Fallback path once
  function handleImageError(e) {
    const img = e.currentTarget;
    if (img.dataset.fallbackTried === "1") {
      img.style.opacity = "0.3";
      img.alt = "Missing / moved SVG (check path)";
      return;
    }
    img.dataset.fallbackTried = "1";
    img.src = img.src.replace(PRIMARY_BASE, FALLBACK_BASE);
  }

  // Add selected to main view — now spawn THREE shapes per choice
  const handleSelect = () => {
    if (!selectedSrc) return;

    const cw = containerRef.current?.clientWidth ?? window.innerWidth;
    const ch = containerRef.current?.clientHeight ?? window.innerHeight;

    const newShapes = Array.from({ length: 3 }, () => {
      const startX = Math.random() * (cw - elementSize);
      const startY = Math.random() * (ch - elementSize);
      const speed = 2 + Math.random() * 2;
      const direction = Math.random() * 360;
      const dx = speed * Math.cos((direction * Math.PI) / 180);
      const dy = speed * Math.sin((direction * Math.PI) / 180);
      const dAngle = (Math.random() * 2 - 1) * 2;
      return {
        id: Date.now() + Math.random(),
        src: selectedSrc,
        hue, // freeze current hue
        addedAt: Date.now(),
        animState: { x: startX, y: startY, dx, dy, angle: 0, dAngle },
      };
    });

    setShapes((prev) => {
      const merged = [...prev, ...newShapes];
      return merged.length > MAX_SHAPES
        ? merged.slice(merged.length - MAX_SHAPES)
        : merged;
    });

    setView("main");
  };

  // Animate (no time-based purge anymore)
  useEffect(() => {
    if (view !== "main") return;
    const step = () => {
      setShapes((prev) =>
        prev.map((s) => {
          let { x, y, dx, dy, angle, dAngle } = s.animState;
          const cw = containerRef.current?.clientWidth ?? window.innerWidth;
          const ch = containerRef.current?.clientHeight ?? window.innerHeight;
          x += dx;
          y += dy;
          angle += dAngle;
          if (x <= 0 || x + elementSize >= cw) {
            dx = -dx;
            x = Math.max(0, Math.min(x, cw - elementSize));
          }
          if (y <= 0 || y + elementSize >= ch) {
            dy = -dy;
            y = Math.max(0, Math.min(y, ch - elementSize));
          }
          return { ...s, animState: { x, y, dx, dy, angle, dAngle } };
        })
      );
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [view]);

  // When we return to the gallery, restore the previous scroll position
  useEffect(() => {
    if (view === "gallery") {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosRef.current);
      });
    }
  }, [view]);

  return (
    <main>
      {/* GALLERY — exactly 5 columns */}
      {view === "gallery" && (
        <div
          style={{
            padding: 16,
            backgroundColor: "#F9F6EE",
            minHeight: "100vh",
            color: "#222",
            fontFamily: mainFont,
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Artwork Gallery
          </h1>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            }}
          >
            {items.map((url) => (
              <button
                key={url}
                onClick={() => {
                  // remember current scroll before leaving gallery
                  scrollPosRef.current = window.scrollY;
                  setSelectedSrc(url);
                  setHue(0);
                  setView("color");
                }}
                style={{
                  overflow: "hidden",
                  borderRadius: 16,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                  padding: 0,
                  background: "transparent",
                  border: "none",
                }}
                aria-label={`Select ${url}`}
              >
                <img
                  src={url}
                  alt={url}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                  loading="lazy"
                  onError={handleImageError}
                />
              </button>
            ))}
          </div>

          {hasMore ? (
            <div ref={loaderRef} style={{ height: 40 }} />
          ) : (
            <p style={{ textAlign: "center", padding: 16 }}>— end —</p>
          )}
        </div>
      )}

      {/* COLOR PICKER — CSS hue-rotate; 30% bigger preview; larger outlined Back button */}
      {view === "color" && selectedSrc && (
        <div
          style={{
            backgroundColor: "#F9F6EE",
            minHeight: "100vh",
            padding: 32,
            color: "#222",
            fontFamily: mainFont,
          }}
        >
          <button
            onClick={() => setView("gallery")}
            style={{
              marginBottom: 16,
              padding: "12px 20px",
              borderRadius: 10,
              cursor: "pointer",
              color: "#000",
              fontWeight: 800,
              border: "2px solid #000",
              background: "transparent",
              fontSize: 16,
            }}
          >
            ← Back to Gallery
          </button>

          <h2
            style={{
              marginBottom: 8,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            HUE select
          </h2>

          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => setHue(parseInt(e.target.value, 10))}
              style={{ width: "100%", maxWidth: 500 }}
            />
            <div
              style={{
                marginTop: 8,
                width: 40,
                height: 20,
                borderRadius: 4,
                backgroundColor: currentColor,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            />
          </div>

          <div
            style={{
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            <button
              onClick={handleSelect}
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                cursor: "pointer",
                color: "#000",
                fontWeight: 800,
                border: "2px solid #000",
                background: "transparent",
                fontSize: 16,
              }}
            >
              Select
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              width: "100%",
              maxWidth: 780,
              aspectRatio: "1 / 1",
              maxHeight: "80vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {/* Preview with CSS hue-rotate (no SVG mutation) */}
            <img
              src={selectedSrc}
              alt="Preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                filter: `hue-rotate(${hue}deg)`,
              }}
              onError={handleImageError}
            />
          </div>
        </div>
      )}

      {/* MAIN — each shape uses its frozen hue via CSS filter; 75% opacity; 30% larger; bigger outlined Back button */}
      {view === "main" && (
        <div
          ref={containerRef}
          style={{
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            backgroundColor: "#F9F6EE",
            position: "relative",
          }}
        >
          <button
            onClick={() => setView("gallery")}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "12px 20px",
              borderRadius: 10,
              cursor: "pointer",
              zIndex: 1000,
              color: "#000",
              fontWeight: 800,
              border: "2px solid #000",
              background: "transparent",
              fontSize: 16,
            }}
          >
            ← Back to Gallery
          </button>

          {shapes.map((shape) => (
            <div
              key={shape.id}
              style={{
                position: "absolute",
                width: elementSize,
                height: elementSize,
                transform: `translate(${shape.animState.x}px, ${shape.animState.y}px) rotate(${shape.animState.angle}deg)`,
              }}
            >
              <img
                src={shape.src}
                alt="Art"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  opacity: 0.75,
                  filter: `hue-rotate(${shape.hue}deg)`,
                }}
                onError={handleImageError}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
