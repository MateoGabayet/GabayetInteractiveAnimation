"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// List of SVGs in /public/svgs — full list preserved
const imageData = [
  "/svgs/Stencil00007.svg",
  "/svgs/Stencil00242.svg",
  "/svgs/Stencil00245.svg",
  "/svgs/Stencil00246.svg",
  "/svgs/Stencil00247.svg",
  "/svgs/Stencil00248.svg",
  "/svgs/Stencil00249.svg",
  "/svgs/Stencil00250.svg",
  "/svgs/Stencil00251.svg",
  "/svgs/Stencil00252.svg",
  "/svgs/Stencil00253.svg",
  "/svgs/Stencil00254.svg",
  "/svgs/Stencil00255.svg",
  "/svgs/Untitled 1.svg",
  "/svgs/Untitled 2.svg",
  "/svgs/Untitled 3.svg",
  "/svgs/Untitled 4.svg",
  "/svgs/Untitled 5.svg",
  "/svgs/Untitled 6.svg",
  "/svgs/Untitled 7.svg",
  "/svgs/Untitled 8.svg",
  "/svgs/Untitled 9.svg",
  "/svgs/Untitled 10.svg",
  "/svgs/Untitled 11.svg",
  "/svgs/Untitled 12.svg",
  "/svgs/Untitled 13.svg",
  "/svgs/Untitled 14.svg",
  "/svgs/Untitled 15.svg",
  "/svgs/Untitled 16.svg",
  "/svgs/Untitled 17.svg",
  "/svgs/Untitled 18.svg",
  "/svgs/Untitled 19.svg",
  "/svgs/Untitled 21.svg",
  "/svgs/Untitled 22.svg",
  "/svgs/Untitled 23.svg",
  "/svgs/Untitled 24.svg",
  "/svgs/Untitled 25.svg",
  "/svgs/Untitled 26.svg",
  "/svgs/Untitled 27.svg",
  "/svgs/Untitled 28.svg",
  "/svgs/Untitled 29.svg",
  "/svgs/Untitled 30.svg",
  "/svgs/Untitled 31.svg",
  "/svgs/Untitled 32.svg",
  "/svgs/Untitled 33.svg",
  "/svgs/Untitled 34.svg",
  "/svgs/Untitled 35.svg",
  "/svgs/Untitled 36.svg",
  "/svgs/Untitled 37.svg",
  "/svgs/Untitled 38.svg",
  "/svgs/Untitled 39.svg",
  "/svgs/Untitled 40.svg",
  "/svgs/Untitled 41.svg",
  "/svgs/Untitled 42.svg",
  "/svgs/Untitled 43.svg",
  "/svgs/Untitled 44.svg",
  "/svgs/Untitled 45.svg",
  "/svgs/Untitled 46.svg",
  "/svgs/Untitled 47.svg",
  "/svgs/Untitled 49.svg",
  "/svgs/Untitled 50.svg",
  "/svgs/Untitled 51.svg",
  "/svgs/Untitled 52.svg",
  "/svgs/Untitled 53.svg",
  "/svgs/Untitled 54.svg",
  "/svgs/Untitled 55.svg",
  "/svgs/Untitled 56.svg",
  "/svgs/Untitled 57.svg",
  "/svgs/Untitled 58.svg",
  "/svgs/Untitled 59.svg",
  "/svgs/Untitled-1.svg",
  "/svgs/Untitled-2.svg",
  "/svgs/Untitled-3.svg",
  "/svgs/Untitled-4.svg",
  "/svgs/Untitled-5.svg",
  "/svgs/Untitled-6.svg",
  "/svgs/Untitled-7.svg",
  "/svgs/Untitled-8.svg",
  "/svgs/Untitled-9.svg",
  "/svgs/Untitled-10.svg",
  "/svgs/Untitled-11.svg",
  "/svgs/Untitled-12.svg",
  "/svgs/Untitled-13.svg",
  "/svgs/Untitled-14.svg",
  "/svgs/Untitled-15.svg",
  "/svgs/Untitled-16.svg",
  "/svgs/Untitled-17.svg",
  "/svgs/Untitled-18.svg",
  "/svgs/Untitled-19.svg",
];

export default function GalleryPage() {
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef(null);

  const [view, setView] = useState("gallery"); // "gallery", "color", or "main"
  const [selected, setSelected] = useState(null);

  // Hue slider and derived colours
  const [pendingHue, setPendingHue] = useState(0);
  const [pendingColor, setPendingColor] = useState("#ff0000");
  const [appliedColor, setAppliedColor] = useState("#ff0000");

  // Shapes array: each selected item becomes an animated shape
  const elementSize = 200;
  const [shapes, setShapes] = useState([]);
  const animRef = useRef(null);
  const containerRef = useRef(null);

  // Use "Black Future" font (or fallback) if defined in your CSS
  const mainFont = '"Black Future", sans-serif';

  const loadMore = useCallback(() => {
    const start = page * PAGE_SIZE;
    const next = imageData.slice(start, start + PAGE_SIZE);
    setItems((prev) => [...prev, ...next]);
    setPage((p) => p + 1);
    if (start + PAGE_SIZE >= imageData.length) {
      setHasMore(false);
    }
  }, [page]);

  // Load initial items
  useEffect(() => {
    loadMore();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    const node = loaderRef.current;
    if (node) observer.observe(node);
    return () => node && observer.unobserve(node);
  }, [hasMore, loadMore]);

  // Convert HSL to hex for the hue slider
  function hslToHex(h, s = 100, l = 50) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const colour = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * colour)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  // Handle hue changes – updates pending colours
  const handleHueChange = (e) => {
    const newHue = parseInt(e.target.value, 10);
    setPendingHue(newHue);
    setPendingColor(hslToHex(newHue, 100, 50));
  };

  // Apply button sets the colour used in the SVG preview
  const handleApply = () => {
    setAppliedColor(pendingColor);
  };

  // Select button: create a new shape and enter main view
  const handleSelect = () => {
    if (!selected) return;
    const containerWidth =
      containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight =
      containerRef.current?.clientHeight || window.innerHeight;
    const startX = Math.random() * (containerWidth - elementSize);
    const startY = Math.random() * (containerHeight - elementSize);
    const speed = 2 + Math.random() * 2; // between 2 and 4 px per frame
    const direction = Math.random() * 360;
    const dx = speed * Math.cos((direction * Math.PI) / 180);
    const dy = speed * Math.sin((direction * Math.PI) / 180);
    const rotationSpeed = (Math.random() * 2 - 1) * 2; // -2 to 2 deg/frame

    const shape = {
      id: Date.now(),
      svg: selected,
      color: appliedColor,
      animState: {
        x: startX,
        y: startY,
        dx,
        dy,
        angle: 0,
        dAngle: rotationSpeed,
      },
    };
    setShapes((prev) => [...prev, shape]);
    setView("main");
  };

  // Bouncing animation effect – updates all shapes
  useEffect(() => {
    if (view !== "main") return;
    const update = () => {
      setShapes((prevShapes) =>
        prevShapes.map((shape) => {
          let { x, y, dx, dy, angle, dAngle } = shape.animState;
          const containerWidth =
            containerRef.current?.clientWidth || window.innerWidth;
          const containerHeight =
            containerRef.current?.clientHeight || window.innerHeight;

          // update position
          x += dx;
          y += dy;
          angle += dAngle;

          // bounce off edges
          if (x <= 0 || x + elementSize >= containerWidth) {
            dx = -dx;
            x = Math.max(0, Math.min(x, containerWidth - elementSize));
          }
          if (y <= 0 || y + elementSize >= containerHeight) {
            dy = -dy;
            y = Math.max(0, Math.min(y, containerHeight - elementSize));
          }

          return {
            ...shape,
            animState: { x, y, dx, dy, angle, dAngle },
          };
        })
      );
      animRef.current = requestAnimationFrame(update);
    };
    animRef.current = requestAnimationFrame(update);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [view]);

  return (
    <main>
      {/* Gallery view */}
      {view === "gallery" && (
        <div
          style={{
            padding: 16,
            backgroundColor: "#F9F6EE",
            minHeight: "100vh",
            color: "#222222",
            fontFamily: mainFont,
          }}
        >
          {/* Centered page title */}
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
              gridTemplateColumns:
                "repeat(auto-fill, minmax(160px, 1fr))",
            }}
          >
            {items.map((url, idx) => (
              <div
                key={idx}
                style={{
                  overflow: "hidden",
                  borderRadius: 16,
                  boxShadow:
                    "0 4px 14px rgba(0, 0, 0, 0.1)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelected(url);
                  setView("color");
                }}
              >
                <img
                  src={url}
                  alt={`Artwork ${idx}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {hasMore ? (
            <div ref={loaderRef} style={{ height: 40 }} />
          ) : (
            <p
              style={{
                textAlign: "center",
                padding: 16,
              }}
            >
              — end —
            </p>
          )}
        </div>
      )}

      {/* Colour picker (Hue select) view */}
      {view === "color" && selected && (
        <div
          style={{
            backgroundColor: "#F9F6EE",
            minHeight: "100vh",
            padding: 32,
            color: "#222222",
            fontFamily: mainFont,
          }}
        >
          <button
            onClick={() => setView("gallery")}
            style={{
              marginBottom: 16,
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ← Back to Gallery
          </button>

          {/* Updated heading */}
          <h2
            style={{
              marginBottom: 8,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            HUE select
          </h2>

          {/* Hue slider – 0 to 360 degrees */}
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <input
              type="range"
              min="0"
              max="360"
              value={pendingHue}
              onChange={handleHueChange}
              style={{
                width: "100%",
                maxWidth: 500,
              }}
            />
            {/* Show the pending colour swatch */}
            <div
              style={{
                marginTop: 8,
                width: 40,
                height: 20,
                borderRadius: 4,
                backgroundColor: pendingColor,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            />
          </div>

          {/* Apply and Select buttons */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <button
              onClick={handleApply}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                marginRight: 8,
              }}
            >
              Apply
            </button>

            <button
              onClick={handleSelect}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Select
            </button>
          </div>

          {/* Centered preview of the SVG using a mask */}
          <div
            style={{
              marginTop: 16,
              width: "100%",
              maxWidth: 600,
              aspectRatio: "1 / 1",
              maxHeight: "80vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {selected && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: appliedColor,
                  WebkitMaskImage: `url(${selected})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskImage: `url(${selected})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Main animation view */}
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
          {/* Button to return to gallery */}
          <button
            onClick={() => setView("gallery")}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
              zIndex: 1000,
            }}
          >
            ← Back to Gallery
          </button>

          {/* Render all bouncing shapes */}
          {shapes.map((shape) => (
            <div
              key={shape.id}
              style={{
                position: "absolute",
                width: elementSize,
                height: elementSize,
                backgroundColor: shape.color,
                WebkitMaskImage: `url(${shape.svg})`,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskImage: `url(${shape.svg})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                transform: `translate(${shape.animState.x}px, ${shape.animState.y}px) rotate(${shape.animState.angle}deg)`,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}