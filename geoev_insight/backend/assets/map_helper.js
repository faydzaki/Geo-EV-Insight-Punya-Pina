/* GeoEV map lifecycle helpers. Save as assets/map_helpers.js. */
(function () {
    "use strict";
    const tileStates = new WeakMap();
    function status(text, tone) {
        if (!window.dash_clientside || !window.dash_clientside.set_props) return;
        window.dash_clientside.set_props("map-tiles-status", {
            children: text,
            className: "map-status map-status--" + tone
        });
    }
    window.geoEvMap = {
        tileLoading: function (event) {
            tileStates.set(event.target, { errors: 0 });
            status("Memuat peta dasar…", "loading");
        },
        tileError: function (event) {
            const state = tileStates.get(event.target) || { errors: 0 };
            state.errors += 1;
            tileStates.set(event.target, state);
            status("Gambar peta gagal dimuat. Periksa internet atau akses ke tile.openstreetmap.org, lalu muat ulang halaman.", "error");
        },
        tileComplete: function (event) {
            const state = tileStates.get(event.target) || { errors: 0 };
            if (state.errors) {
                status("Sebagian gambar peta gagal dimuat. Periksa internet atau akses ke tile.openstreetmap.org, lalu muat ulang halaman.", "error");
            } else {
                status("Peta dasar siap · OpenStreetMap", "ready");
            }
        }
    };

    // Leaflet must be notified when a hidden tab becomes visible or the grid changes width.
    // Observe the container instead of polling or recreating the map (which resets user zoom).
    let observed = null;
    let observer = null;
    let previousWidth = 0;
    let previousHeight = 0;
    let frame = null;
    function bindMap() {
        const map = document.getElementById("main-map");
        if (map === observed) return;
        if (observer) observer.disconnect();
        observed = map;
        previousWidth = previousHeight = 0;
        if (!map || !window.ResizeObserver) return;
        observer = new ResizeObserver(function (entries) {
            const box = entries[0].contentRect;
            if (box.width <= 0 || box.height <= 0) {
                previousWidth = previousHeight = 0;
                return;
            }
            if (Math.abs(box.width - previousWidth) < 1 && Math.abs(box.height - previousHeight) < 1) return;
            previousWidth = box.width;
            previousHeight = box.height;
            if (frame !== null) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(function () {
                frame = null;
                if (window.dash_clientside && window.dash_clientside.set_props) {
                    window.dash_clientside.set_props("main-map", { invalidateSize: Date.now() });
                }
            });
        });
        observer.observe(map);
    }
    function start() {
        bindMap();
        new MutationObserver(bindMap).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
})();
