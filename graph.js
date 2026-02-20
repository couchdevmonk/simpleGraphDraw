class Graph {
    constructor() {
        this.vertices = [];
        this.edges = [];
        this.selectedVertex = null;
        this.vertexLabels = [];
        this.draggedVertex = null;
        this.vertexColors = []; // Store colors for each vertex
        this.vertexShapes = []; // Store shape for each vertex: 'circle'|'square'|'triangle'|'diamond'
        this.edgeLabels = []; // label for each edge, initially empty
        this.edgeColors = []; // color for each edge
        this.edgeStyles = []; // 'solid'|'dashed'|'dotted'
        this.edgeDirs = []; // per-edge direction: 'none'|'A->B'|'B->A'
        this.edgeMid = []; // boolean for mid? checkbox
    }

    addVertex(x, y, color = '#000000') {
        this.vertices.push({ x, y });
        this.vertexLabels.push(String.fromCharCode(97 + this.vertices.length - 1));
        this.vertexColors.push(color);
        this.vertexShapes.push('circle');
    }

    addEdge(startIdx, endIdx) {
        if (startIdx !== endIdx &&
            !this.edges.some(([s, e]) =>
                (s === startIdx && e === endIdx) || (s === endIdx && e === startIdx))) {
            this.edges.push([startIdx, endIdx]);
            this.edgeLabels.push('');
            this.edgeColors.push('#000000');
            this.edgeStyles.push('solid');
            this.edgeDirs.push('none');
            this.edgeMid.push(false);
            return true;
        }
        return false;
    }

    getVertexAtPos(x, y) {
        // Return the top-most vertex (last drawn) under the point
        // If radii array passed in, use per-vertex radius; otherwise use default 12
        return null; // fallback; actual hit testing done in GraphApp with computed radii
    }

    // Return index of edge near point (distance to segment less than threshold), prefer top-most (last added)
    getEdgeAtPos(x, y) {
        const thresh = 14; // pixels (increased sensitivity)
        for (let i = this.edges.length - 1; i >= 0; i--) {
            const [aIdx, bIdx] = this.edges[i];
            const a = this.vertices[aIdx];
            const b = this.vertices[bIdx];
            if (!a || !b) continue;
            const dist = distancePointToSegment({ x, y }, a, b);
            if (dist <= thresh) return i;
        }
        return null;
    }

    clear() {
        this.vertices = [];
        this.edges = [];
        this.selectedVertex = null;
        this.vertexLabels = [];
        this.draggedVertex = null;
        this.vertexColors = [];
        this.vertexShapes = [];
        this.edgeLabels = [];
        this.edgeColors = [];
        this.edgeStyles = [];
        this.edgeDirs = [];
        this.edgeMid = [];
    }

    getAdjacencyMatrix() {
        const matrix = Array(this.vertices.length).fill().map(() =>
            Array(this.vertices.length).fill(0));

        this.edges.forEach(([i, j]) => {
            matrix[i][j] = 1;
            matrix[j][i] = 1;
        });

        return matrix;
    }

    setVertexColor(vertexIdx, color) {
        if (vertexIdx >= 0 && vertexIdx < this.vertexColors.length) {
            this.vertexColors[vertexIdx] = color;
        }
    }

    setVertexShape(vertexIdx, shape) {
        if (vertexIdx >= 0 && vertexIdx < this.vertexShapes.length) {
            this.vertexShapes[vertexIdx] = shape;
        }
    }

    setVertexLabel(vertexIdx, label) {
        if (vertexIdx >= 0 && vertexIdx < this.vertexLabels.length) {
            this.vertexLabels[vertexIdx] = label;
        }
    }
}

class GraphApp {
    constructor() {
        this.canvas = document.getElementById('graph-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.graph = new Graph();
        this.mode = 'addVertex';
        this.currentColor = '#000000';
        this.statusMessage = '';
        this.statusTimeout = null;
    // per-vertex editing uses the vertex menu
    this.editingVertexIdx = null;
    this.editingEdgeIdx = null;
    this.history = [];
    this.historyIndex = -1; // points to latest saved snapshot
    this.vertexRadii = [];
    this.hoveredEdgeIdx = null;
    this.lastPNGDataURL = null;
    this.arrowActions = []; // temporary storage of arrows to draw on top
    this.savePreviewBlobUrl = null;
    this._dragging = false;

        this.initCanvas();
        this.setupEventListeners();
        this.updateMenu();
        this.render();

    // Save initial state
    this.pushHistory();

        window.addEventListener('resize', this.handleResize.bind(this));
    }

    initCanvas() {
        this.updateCanvasSize();
        // canvasOffset was removed — not used elsewhere
    }

    updateCanvasSize() {
        const headerHeight = document.getElementById('header').clientHeight;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - headerHeight;
    }

    handleResize() {
        this.updateCanvasSize();
        this.render();
    }

    setupEventListeners() {
        // Canvas events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Menu events
        document.querySelectorAll('[data-mode]').forEach(option => {
            option.addEventListener('click', (e) => {
                this.mode = e.currentTarget.dataset.mode;
                this.showStatus(`${this.mode.replace(/([A-Z])/g, ' $1').trim()} mode`);
                this.updateMenu();
                this.render();
            });
        });

        // Vertex menu buttons (apply/cancel)
        const vertexMenu = document.getElementById('vertex-menu');
        if (vertexMenu) {
            document.getElementById('vertex-apply-btn').addEventListener('click', () => {
                const name = document.getElementById('vertex-name-input').value.trim();
                const color = document.getElementById('vertex-color-input').value;
                const shape = document.getElementById('vertex-shape-select').value;
                if (this.editingVertexIdx !== null) {
                        if (name.length > 0) this.graph.setVertexLabel(this.editingVertexIdx, name);
                        this.graph.setVertexColor(this.editingVertexIdx, color);
                        this.graph.setVertexShape(this.editingVertexIdx, shape);
                        this.pushHistory();
                }
                vertexMenu.style.display = 'none';
                this.editingVertexIdx = null;
                this.render();
            });

            document.getElementById('vertex-cancel-btn').addEventListener('click', () => {
                vertexMenu.style.display = 'none';
                this.editingVertexIdx = null;
            });
        }

        // Edge menu buttons
        const edgeMenu = document.getElementById('edge-menu');
        if (edgeMenu) {
            document.getElementById('edge-apply-btn').addEventListener('click', () => {
                const label = document.getElementById('edge-label-input').value.trim();
                const color = document.getElementById('edge-color-input').value;
                const style = document.getElementById('edge-style-select').value;
                const dir = document.getElementById('edge-direction-select') ? document.getElementById('edge-direction-select').value : 'none';
                const mid = document.getElementById('edge-mid-checkbox') ? !!document.getElementById('edge-mid-checkbox').checked : false;
                if (this.editingEdgeIdx !== null) {
                        this.graph.edgeLabels[this.editingEdgeIdx] = label;
                        this.graph.edgeColors[this.editingEdgeIdx] = color;
                        this.graph.edgeStyles[this.editingEdgeIdx] = style;
                        this.graph.edgeDirs[this.editingEdgeIdx] = dir || 'none';
                        this.graph.edgeMid[this.editingEdgeIdx] = mid;
                        this.pushHistory();
                }
                edgeMenu.style.display = 'none';
                this.editingEdgeIdx = null;
                this.render();
            });

            document.getElementById('edge-cancel-btn').addEventListener('click', () => {
                edgeMenu.style.display = 'none';
                this.editingEdgeIdx = null;
            });
        }

        // Right-click (contextmenu) on canvas to open vertex or edge edit menu
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

        // Action buttons
        document.getElementById('save-data-btn').addEventListener('click', () => {
            // show preview before saving
            const content = this.buildSaveContent();
            this.showSavePreview(content, 'graph_data.txt');
        });

        document.getElementById('save-png-btn').addEventListener('click', () => {
            this.saveToPNG();
        });

        // PNG preview modal handlers
        const pngOverlay = document.getElementById('png-preview-overlay');
        if (pngOverlay) {
            const closeBtn = document.getElementById('png-close-btn');
            const closeBtn2 = document.getElementById('png-close-btn-2');
            const downloadLink = document.getElementById('png-download-link');
            const filenameInput = document.getElementById('png-filename-input');
            const copyBtn = document.getElementById('png-copy-btn');
            if (closeBtn) closeBtn.addEventListener('click', () => {
                pngOverlay.style.display = 'none';
                document.getElementById('png-preview').classList.remove('show');
            });
            if (closeBtn2) closeBtn2.addEventListener('click', () => {
                pngOverlay.style.display = 'none';
                document.getElementById('png-preview').classList.remove('show');
            });
            if (copyBtn) copyBtn.addEventListener('click', async () => {
                await this.copyPNGToClipboard();
            });
            if (downloadLink) {
                // download link will be updated in showPNGPreview
            }
            if (filenameInput) {
                filenameInput.addEventListener('input', () => {
                    const val = filenameInput.value.trim() || 'graph.png';
                    if (downloadLink) {
                        downloadLink.download = val;
                    }
                });
                filenameInput.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') {
                        // trigger download
                        if (downloadLink && downloadLink.href) {
                            downloadLink.click();
                        }
                    }
                });
            }

            // also hide when clicking outside preview box
            pngOverlay.addEventListener('click', (ev) => {
                if (ev.target === pngOverlay) {
                    pngOverlay.style.display = 'none';
                    document.getElementById('png-preview').classList.remove('show');
                }
            });

            // Esc to close
            document.addEventListener('keydown', (ev) => {
                if (ev.key === 'Escape' && pngOverlay.style.display === 'flex') {
                    pngOverlay.style.display = 'none';
                    document.getElementById('png-preview').classList.remove('show');
                }
            });
        }

        // Save preview modal handlers
        const saveOverlay = document.getElementById('save-preview-overlay');
        if (saveOverlay) {
            const closeBtn = document.getElementById('save-close-btn');
            const copyBtn = document.getElementById('save-copy-btn');
            const downloadLink = document.getElementById('save-download-link');
            const downloadBtn = document.getElementById('save-download-btn');
            const previewText = document.getElementById('save-preview-text');

            if (closeBtn) closeBtn.addEventListener('click', () => {
                saveOverlay.style.display = 'none';
            });
            if (copyBtn && previewText) copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(previewText.value);
                    this.showStatus('Copied to clipboard');
                } catch (err) {
                    this.showStatus('Copy failed');
                }
            });

            if (downloadBtn && downloadLink) {
                // download link will be set when showing preview
            }

            // click outside to close
            saveOverlay.addEventListener('click', (ev) => {
                if (ev.target === saveOverlay) saveOverlay.style.display = 'none';
            });

            // Esc to close (also for this overlay)
            document.addEventListener('keydown', (ev) => {
                if (ev.key === 'Escape' && saveOverlay.style.display === 'flex') {
                    saveOverlay.style.display = 'none';
                }
            });
        }

        const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
    const redoBtn = document.getElementById('redo-btn');
    if (redoBtn) redoBtn.addEventListener('click', () => this.redo());

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.graph.clear();
            this.pushHistory();
            this.showStatus("Graph cleared");
            this.render();
        });
    }

    handleMouseDown(e) {
        const { x, y } = this.getCanvasCoordinates(e);
        // compute vertex radii before hit-testing
        this.computeVertexRadii();
        const vertexIdx = this.getTopVertexAt(x, y);
        const edgeIdx = this.graph.getEdgeAtPos(x, y);

        if (this.mode === 'addVertex') {
            this.graph.addVertex(x, y, this.currentColor);
            this.pushHistory();
            this.showStatus("Vertex added");
        }
        else if (this.mode === 'addEdge') {
            if (vertexIdx !== null) {
                if (this.graph.selectedVertex === null) {
                    this.graph.selectedVertex = vertexIdx;
                } else {
                    if (this.graph.addEdge(this.graph.selectedVertex, vertexIdx)) {
                        this.pushHistory();
                        this.showStatus("Edge added");
                    }
                    this.graph.selectedVertex = null;
                }
            }
        }
        else if (this.mode === 'moveVertex') {
            if (vertexIdx !== null) {
                this.graph.draggedVertex = vertexIdx;
                this._dragging = false; // will set true on actual move
            }
        }

        // (no right-click global color picker anymore)

        this.render();
    }

    handleMouseUp() {
        // if a drag operation occurred, snapshot the resulting state for undo
        if (this.mode === 'moveVertex' && this.graph.draggedVertex !== null && this._dragging) {
            this.pushHistory();
        }
        this.graph.draggedVertex = null;
        this._dragging = false;
    }

    // History (undo) support: snapshot graph state
    pushHistory() {
        // trim any redo states
        if (this.historyIndex < this.history.length - 1) {
            this.history.splice(this.historyIndex + 1);
        }
        const snap = {
            vertices: JSON.parse(JSON.stringify(this.graph.vertices)),
            edges: JSON.parse(JSON.stringify(this.graph.edges)),
            vertexLabels: JSON.parse(JSON.stringify(this.graph.vertexLabels)),
            vertexColors: JSON.parse(JSON.stringify(this.graph.vertexColors)),
            vertexShapes: JSON.parse(JSON.stringify(this.graph.vertexShapes)),
            edgeLabels: JSON.parse(JSON.stringify(this.graph.edgeLabels)),
            edgeColors: JSON.parse(JSON.stringify(this.graph.edgeColors)),
            edgeStyles: JSON.parse(JSON.stringify(this.graph.edgeStyles)),
            edgeDirs: JSON.parse(JSON.stringify(this.graph.edgeDirs || [])),
            edgeMid: JSON.parse(JSON.stringify(this.graph.edgeMid || []))
        };
        // avoid pushing identical snapshot as the last one
        const snapStr = JSON.stringify(snap);
        const last = this.history[this.history.length - 1];
        if (last) {
            try {
                const lastStr = JSON.stringify(last);
                if (lastStr === snapStr) {
                    // nothing changed; don't add duplicate
                    return;
                }
            } catch (e) {
                // fall back to pushing if stringify fails
            }
        }
        this.history.push(snap);
        this.historyIndex = this.history.length - 1;
        // limit history size
        const MAX = 80;
        if (this.history.length > MAX) {
            this.history.shift();
            this.historyIndex = this.history.length - 1;
        }
    }

    undo() {
        if (this.historyIndex <= 0) {
            this.showStatus('Nothing to undo');
            return;
        }
        // restore previous snapshot and move index back
        const prev = this.history[this.historyIndex - 1];
        if (!prev) return;
        this.graph.vertices = JSON.parse(JSON.stringify(prev.vertices));
        this.graph.edges = JSON.parse(JSON.stringify(prev.edges));
        this.graph.vertexLabels = JSON.parse(JSON.stringify(prev.vertexLabels));
        this.graph.vertexColors = JSON.parse(JSON.stringify(prev.vertexColors));
        this.graph.vertexShapes = JSON.parse(JSON.stringify(prev.vertexShapes));
        this.graph.edgeLabels = JSON.parse(JSON.stringify(prev.edgeLabels));
        this.graph.edgeColors = JSON.parse(JSON.stringify(prev.edgeColors));
        this.graph.edgeStyles = JSON.parse(JSON.stringify(prev.edgeStyles));
    this.graph.edgeDirs = JSON.parse(JSON.stringify(prev.edgeDirs || []));
    this.graph.edgeMid = JSON.parse(JSON.stringify(prev.edgeMid || []));

        this.historyIndex -= 1;
        this.showStatus('Undo');
        this.render();
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) {
            this.showStatus('Nothing to redo');
            return;
        }
        const next = this.history[this.historyIndex + 1];
        if (!next) return;
        this.graph.vertices = JSON.parse(JSON.stringify(next.vertices));
        this.graph.edges = JSON.parse(JSON.stringify(next.edges));
        this.graph.vertexLabels = JSON.parse(JSON.stringify(next.vertexLabels));
        this.graph.vertexColors = JSON.parse(JSON.stringify(next.vertexColors));
        this.graph.vertexShapes = JSON.parse(JSON.stringify(next.vertexShapes));
        this.graph.edgeLabels = JSON.parse(JSON.stringify(next.edgeLabels));
        this.graph.edgeColors = JSON.parse(JSON.stringify(next.edgeColors));
        this.graph.edgeStyles = JSON.parse(JSON.stringify(next.edgeStyles));
    this.graph.edgeDirs = JSON.parse(JSON.stringify(next.edgeDirs || []));
    this.graph.edgeMid = JSON.parse(JSON.stringify(next.edgeMid || []));
        this.historyIndex += 1;
        this.showStatus('Redo');
        this.render();
    }

    // Compute per-vertex radii to fit label text and shape padding
    computeVertexRadii() {
        const radii = [];
        // Use the same font as rendering
        this.ctx.font = '12px Verdana';
        const padding = 8; // px horizontal padding
        const minR = 14;
        this.graph.vertexLabels.forEach((label, i) => {
            const text = String(label || '');
            const metrics = this.ctx.measureText(text);
            const textWidth = metrics.width || 0;
            // approximate text height as 12px
            const textHeight = 12;
            const r = Math.max(minR, Math.ceil(Math.max(textWidth / 2 + padding, textHeight / 2 + padding)));
            radii.push(r);
        });
        this.vertexRadii = radii;
    }

    // Compute intersection point of ray (from center going backwards toward `from`) with polygon edge AB
    _raySegmentIntersection(to, d, A, B) {
        // Solve d * t + (B-A) * s = to - A  for t >= 0, s in [0,1]
        const v = { x: B.x - A.x, y: B.y - A.y };
        const rhs = { x: to.x - A.x, y: to.y - A.y };
        const det = d.x * v.y - d.y * v.x;
        if (Math.abs(det) < 1e-9) return null;
        const t = (rhs.x * v.y - rhs.y * v.x) / det;
        const s = (d.x * rhs.y - d.y * rhs.x) / det;
        if (t >= 0 && s >= 0 && s <= 1) {
            return { x: to.x - d.x * t, y: to.y - d.y * t, t };
        }
        return null;
    }

    // Compute a boundary point on the shape boundary for the line from `from` -> `to`.
    computeBoundaryPoint(to, from, shape, r) {
        // unit direction from -> to
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1e-6) return { x: to.x, y: to.y };
        const ux = dx / dist; const uy = dy / dist;
        // circle fallback
        if (!shape || shape === 'circle') {
            return { x: to.x - ux * r, y: to.y - uy * r };
        }

        // Build polygon vertices for shape centered at `to`
        let verts = [];
        if (shape === 'square') {
            verts = [
                { x: to.x - r, y: to.y - r },
                { x: to.x + r, y: to.y - r },
                { x: to.x + r, y: to.y + r },
                { x: to.x - r, y: to.y + r }
            ];
        } else if (shape === 'diamond') {
            verts = [
                { x: to.x, y: to.y - r },
                { x: to.x - r, y: to.y },
                { x: to.x, y: to.y + r },
                { x: to.x + r, y: to.y }
            ];
        } else if (shape === 'triangle') {
            const H = 2 * r;
            const topY = to.y - (2 * H) / 3;
            const baseY = to.y + H / 3;
            verts = [
                { x: to.x, y: topY },
                { x: to.x - r, y: baseY },
                { x: to.x + r, y: baseY }
            ];
        } else {
            // unknown shape -> treat as circle
            return { x: to.x - ux * r, y: to.y - uy * r };
        }

        // ray direction (pointing backwards from center toward from)
        const d = { x: ux, y: uy };
        // find smallest positive t intersection among edges
        let best = null;
        for (let i = 0; i < verts.length; i++) {
            const A = verts[i];
            const B = verts[(i + 1) % verts.length];
            const hit = this._raySegmentIntersection(to, d, A, B);
            if (hit) {
                if (!best || hit.t < best.t) best = hit;
            }
        }
        if (best) return { x: best.x, y: best.y };
        // fallback to circle
        return { x: to.x - ux * r, y: to.y - uy * r };
    }

    // return index of top-most vertex under (x,y) using computed radii
    getTopVertexAt(x, y) {
        for (let i = this.graph.vertices.length - 1; i >= 0; i--) {
            const v = this.graph.vertices[i];
            if (!v) continue;
            const r = this.vertexRadii[i] || 14;
            const dx = v.x - x; const dy = v.y - y;
            if (Math.hypot(dx, dy) <= r) return i;
        }
        return null;
    }

    handleContextMenu(e) {
        const { x, y } = this.getCanvasCoordinates(e);
        this.computeVertexRadii();
        const vertexIdx = this.getTopVertexAt(x, y);
        const edgeIdx = this.graph.getEdgeAtPos(x, y);
    const vertexMenu = document.getElementById('vertex-menu');
    const edgeMenu = document.getElementById('edge-menu');
        // If both an edge and a vertex are detected, choose the one closer to the click.
        // Bias toward edge if click is close to the segment (helps when vertex radii are large).
        let target = null; // 'vertex'|'edge'
        if (vertexIdx === null && edgeIdx === null) return;
        if (vertexIdx !== null && edgeIdx === null) target = 'vertex';
        else if (vertexIdx === null && edgeIdx !== null) target = 'edge';
        else {
            // both present: compare distances
            const v = this.graph.vertices[vertexIdx];
            const distV = Math.hypot(v.x - x, v.y - y);
            const a = this.graph.vertices[this.graph.edges[edgeIdx][0]];
            const b = this.graph.vertices[this.graph.edges[edgeIdx][1]];
            const distE = distancePointToSegment({ x, y }, a, b);
            // choose edge if it's very close to the segment OR noticeably closer than the vertex
            if (distE <= 10 || distE < distV * 0.8) target = 'edge';
            else target = 'vertex';
        }

        if (target === 'vertex' && vertexMenu) {
            // Open vertex menu
            this.editingVertexIdx = vertexIdx;
            document.getElementById('vertex-name-input').value = this.graph.vertexLabels[vertexIdx];
            document.getElementById('vertex-color-input').value = this.graph.vertexColors[vertexIdx];
            document.getElementById('vertex-shape-select').value = this.graph.vertexShapes[vertexIdx] || 'circle';

            vertexMenu.style.display = 'block';
            const menuWidth = vertexMenu.offsetWidth || 200;
            const menuHeight = vertexMenu.offsetHeight || 140;
            let left = e.clientX;
            let top = e.clientY;
            if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8;
            if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight - 8;
            vertexMenu.style.left = `${left}px`;
            vertexMenu.style.top = `${top}px`;
            e.preventDefault();
            return;
        }

        if (target === 'edge' && edgeMenu) {
            this.editingEdgeIdx = edgeIdx;
            // Populate
            document.getElementById('edge-label-input').value = this.graph.edgeLabels[edgeIdx] || '';
            document.getElementById('edge-color-input').value = this.graph.edgeColors[edgeIdx] || '#000000';
            document.getElementById('edge-style-select').value = this.graph.edgeStyles[edgeIdx] || 'solid';
            // populate direction select, showing vertex labels for clarity
            const dirSelect = document.getElementById('edge-direction-select');
            if (dirSelect) {
                const aLabel = this.graph.vertexLabels[this.graph.edges[edgeIdx][0]] || 'A';
                const bLabel = this.graph.vertexLabels[this.graph.edges[edgeIdx][1]] || 'B';
                // update option text
                for (let i = 0; i < dirSelect.options.length; i++) {
                    const opt = dirSelect.options[i];
                    if (opt.value === 'A->B') opt.text = `${aLabel} → ${bLabel}`;
                    else if (opt.value === 'B->A') opt.text = `${bLabel} → ${aLabel}`;
                    else if (opt.value === 'mid') opt.text = 'Arrow (mid)';
                    else opt.text = 'None';
                }
                dirSelect.value = this.graph.edgeDirs[edgeIdx] || 'none';
            }
            const midCheckbox = document.getElementById('edge-mid-checkbox');
            if (midCheckbox) midCheckbox.checked = !!this.graph.edgeMid[edgeIdx];

            edgeMenu.style.display = 'block';
            const menuWidth = edgeMenu.offsetWidth || 220;
            const menuHeight = edgeMenu.offsetHeight || 120;
            let left = e.clientX;
            let top = e.clientY;
            if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8;
            if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight - 8;
            edgeMenu.style.left = `${left}px`;
            edgeMenu.style.top = `${top}px`;
            // show brief status to help debug edge clicks
            this.showStatus(`Edge ${edgeIdx} detected`);
            // also focus first input so keyboard events don't leak
            const edgeInput = document.getElementById('edge-label-input');
            if (edgeInput) edgeInput.focus();
            e.preventDefault();
            return;
        }
    }

    handleMouseMove(e) {
        if (this.graph.draggedVertex !== null && this.mode === 'moveVertex') {
            const { x, y } = this.getCanvasCoordinates(e);
            this.graph.vertices[this.graph.draggedVertex] = { x, y };
            this._dragging = true;
            this.render();
            return;
        }

        // otherwise we handle hover highlighting here (if not dragging)
        const { x, y } = this.getCanvasCoordinates(e);
        const edgeIdx = this.graph.getEdgeAtPos(x, y);
        if (edgeIdx !== this.hoveredEdgeIdx) {
            this.hoveredEdgeIdx = edgeIdx;
            this.canvas.style.cursor = edgeIdx !== null ? 'pointer' : 'default';
            this.render();
        }
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleKeyDown(e) {
        // Ignore shortcuts while typing in inputs or when a menu is open
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
        const vm = document.getElementById('vertex-menu');
        const em = document.getElementById('edge-menu');
        if ((vm && vm.style.display === 'block') || (em && em.style.display === 'block')) return;
        const key = e.key.toLowerCase();
        // Redo: Ctrl/Cmd+Shift+Z OR Ctrl/Cmd+Y; Undo: Ctrl/Cmd+Z
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'z') {
            this.redo();
            e.preventDefault();
        } else if ((e.ctrlKey || e.metaKey) && key === 'z') {
            this.undo();
            e.preventDefault();
        } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
            this.redo();
            e.preventDefault();
    } else {
            // single-key shortcuts
            if (key === 'v') {
                this.mode = 'addVertex';
                this.showStatus("Vertex mode");
            } else if (key === 'e') {
                this.mode = 'addEdge';
                this.showStatus("Edge mode");
            } else if (key === 'm') {
                this.mode = 'moveVertex';
                this.showStatus("Move vertex mode");
            } else if (key === 'c') {
                if (confirm('Clear the entire graph? This cannot be undone.')) {
                    this.graph.clear();
                    this.pushHistory();
                    this.showStatus("Graph cleared");
                }
            } else if (key === 's') {
                // open the save preview (same as clicking the Save Graph Data menu)
                const content = this.buildSaveContent();
                this.showSavePreview(content, 'graph_data.txt');
            } else if (key === 'p') {
                this.saveToPNG();
            } else if (key === 'u') {
                this.undo();
            } else if (key === 'r') {
                this.redo();
            }
        }
        this.updateMenu();
        this.render();
    }

    updateMenu() {
        // Update active mode
        document.querySelectorAll('[data-mode]').forEach(option => {
            option.classList.toggle('active', option.dataset.mode === this.mode);
        });
    }

    showStatus(message) {
        this.statusMessage = message;
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.style.display = 'block';

        clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(() => {
            statusElement.style.display = 'none';
        }, 2000);
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // compute radii for labels so shapes can size accordingly
        this.computeVertexRadii();

    // Draw edges first, using per-edge color/style (supports arrows), and collect arrow actions; draw labels at midpoints
        this.graph.edges.forEach((edge, idx) => {
            const [i, j] = edge;
            const v1 = this.graph.vertices[i];
            const v2 = this.graph.vertices[j];
            if (!v1 || !v2) return;
            const style = this.graph.edgeStyles[idx] || 'solid';
            const color = this.graph.edgeColors[idx] || 'black';
            // if hovered, draw subtle highlight (thicker, lighter)
            const isHovered = (idx === this.hoveredEdgeIdx);
            if (style === 'dotted') this.ctx.setLineDash([1, 6]);
            else if (style === 'dashed') this.ctx.setLineDash([8, 4]);
            else this.ctx.setLineDash([]);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = isHovered ? 4 : 2;
            this.ctx.beginPath();
            this.ctx.moveTo(v1.x, v1.y);
            this.ctx.lineTo(v2.x, v2.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            if (isHovered) {
                // faint glow: draw semi-transparent stroke on top
                this.ctx.strokeStyle = this.lightenColor(color, 30);
                this.ctx.globalAlpha = 0.6;
                this.ctx.lineWidth = 6;
                this.ctx.beginPath();
                this.ctx.moveTo(v1.x, v1.y);
                this.ctx.lineTo(v2.x, v2.y);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }
            // collect directional arrow actions from edgeDirs
            const dir = (this.graph.edgeDirs && this.graph.edgeDirs[idx]) || 'none';
            if (dir && dir !== 'none') {
                this.arrowActions.push({ idx, dir, v1, v2, color });
            }

            // Edge label at midpoint
            const mx = (v1.x + v2.x) / 2;
            const my = (v1.y + v2.y) / 2;
            const label = this.graph.edgeLabels[idx] || '';
            if (label && label.length > 0) {
                this.ctx.fillStyle = '#000000';
                this.ctx.font = '12px Verdana';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(label, mx, my - 10);
            }
        });

        // Draw vertices with white background and colored border; support shapes
        this.graph.vertices.forEach((vertex, i) => {
            let strokeColor = this.graph.vertexColors[i] || '#000000';
            if (i === this.graph.selectedVertex) {
                strokeColor = this.lightenColor(strokeColor, 20);
            } else if (i === this.graph.draggedVertex) {
                strokeColor = this.lightenColor(strokeColor, 40);
            }

            // Draw shape: white fill, colored stroke
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 2;
            const shape = this.graph.vertexShapes[i] || 'circle';
            const r = (this.vertexRadii && this.vertexRadii[i]) || 14;
            this.drawVertexShape(this.ctx, vertex.x, vertex.y, r, shape);

            // Highlight selection (outer ring)
            if (i === this.graph.selectedVertex || i === this.graph.draggedVertex) {
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(vertex.x, vertex.y, r + 6, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Vertex label (black text on white background)
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '12px Verdana';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.graph.vertexLabels[i], vertex.x, vertex.y);
        });

        // Draw collected arrowheads on top of vertices so they are visible at the node border
        const drawArrowOnTop = (ctx, from, to, color, dir, radiusTo, edgeIdx) => {
            // compute tip point placed at node border using exact shape intersection when possible
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 1) return;
            const ux = dx / dist;
            const uy = dy / dist;
            // determine target vertex index from edge and direction
            let targetIdx = null;
            if (typeof edgeIdx === 'number' && this.graph.edges[edgeIdx]) {
                const [aIdx, bIdx] = this.graph.edges[edgeIdx];
                targetIdx = (dir === 'A->B') ? bIdx : aIdx;
            }
            const shape = targetIdx !== null ? (this.graph.vertexShapes[targetIdx] || 'circle') : 'circle';
            const r = targetIdx !== null ? (this.vertexRadii[targetIdx] || radiusTo) : radiusTo;
            const tip = this.computeBoundaryPoint(to, from, shape, r);
            const tipX = tip.x;
            const tipY = tip.y;
            // base of arrow (size proportional to vertex radius)
            const size = Math.min(14, Math.max(6, r));
            const baseX = tipX - ux * size;
            const baseY = tipY - uy * size;
            // perpendicular vector
            const px = -uy;
            const py = ux;
            const half = size * 0.5;
            const p1x = baseX + px * half;
            const p1y = baseY + py * half;
            const p2x = baseX - px * half;
            const p2y = baseY - py * half;

            ctx.save();
            ctx.fillStyle = color || '#000';
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };

        // Draw a centered arrow at the midpoint of segment from->to with given visual size
        const drawMidArrow = (ctx, from, to, color, size) => {
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 1) return;
            const ux = dx / dist;
            const uy = dy / dist;
            // tip and base centered around midpoint
            const tipX = mx + ux * (size * 0.5);
            const tipY = my + uy * (size * 0.5);
            const baseX = mx - ux * (size * 0.5);
            const baseY = my - uy * (size * 0.5);
            const px = -uy;
            const py = ux;
            const half = size * 0.5;
            const p1x = baseX + px * half;
            const p1y = baseY + py * half;
            const p2x = baseX - px * half;
            const p2y = baseY - py * half;
            ctx.save();
            ctx.fillStyle = color || '#000';
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };

        if (this.arrowActions && this.arrowActions.length > 0) {
            this.arrowActions.forEach(a => {
                const { dir, v1, v2, color, idx } = a;
                const radii = this.vertexRadii || [];
                const r1 = radii[this.graph.edges[idx][0]] || 14;
                const r2 = radii[this.graph.edges[idx][1]] || 14;
                const midFlag = (this.graph.edgeMid && this.graph.edgeMid[idx]);
                    if (midFlag) {
                    // draw centered arrow at midpoint with same visual size as endpoint arrows
                    const mx = (v1.x + v2.x) / 2;
                    const my = (v1.y + v2.y) / 2;
                    // choose a size consistent with endpoint arrows (based on vertex radii)
                    const size = Math.min(14, Math.max(6, Math.max(r1, r2) + 2));
                    if (dir === 'A->B') {
                        drawMidArrow(this.ctx, v1, v2, color, size);
                    } else if (dir === 'B->A') {
                        drawMidArrow(this.ctx, v2, v1, color, size);
                    }
                } else {
                    // endpoint arrow placed at node border
                    if (dir === 'A->B') {
                        drawArrowOnTop(this.ctx, v1, v2, color, dir, r2 + 2, idx);
                    } else if (dir === 'B->A') {
                        drawArrowOnTop(this.ctx, v2, v1, color, dir, r1 + 2, idx);
                    }
                }
            });
        }
        // clear actions
        this.arrowActions = [];
    }

    drawVertexShape(ctx, x, y, r, shape) {
        ctx.beginPath();
        if (shape === 'circle') {
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (shape === 'square') {
            ctx.rect(x - r, y - r, r * 2, r * 2);
            ctx.fill();
            ctx.stroke();
        } else if (shape === 'triangle') {
            // Center an isosceles triangle so its centroid is at (x,y)
            const H = 2 * r; // height
            const topY = y - (2 * H) / 3; // top vertex
            const baseY = y + H / 3; // base vertices y
            ctx.moveTo(x, topY);
            ctx.lineTo(x - r, baseY);
            ctx.lineTo(x + r, baseY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (shape === 'diamond') {
            ctx.moveTo(x, y - r);
            ctx.lineTo(x - r, y);
            ctx.lineTo(x, y + r);
            ctx.lineTo(x + r, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            // default to circle
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;

        return `#${(
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1)}`;
    }

    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Return black or white depending on luminance
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }

    saveToFile() {
        // legacy: saving directly is replaced by preview flow; keep function for direct download if needed
        const content = this.buildSaveContent();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph_data.txt';
        a.click();
        URL.revokeObjectURL(url);
        this.showStatus("Graph data saved");
    }

    // Build the save content string (used for preview and save)
    buildSaveContent() {
        const matrix = this.graph.getAdjacencyMatrix();
        let content = "# simpleGraphDraw export\n";
        content += `# vertices: ${this.graph.vertices.length}\n`;
        content += "\nAdjacency Matrix:\n";
        matrix.forEach(row => {
            content += row.join(' ') + '\n';
        });

        content += "\nAdjacencies:\n";
        this.graph.edges.forEach(([i, j], idx) => {
            const style = this.graph.edgeStyles[idx] || '';
            const color = this.graph.edgeColors[idx] || '';
            const label = this.graph.edgeLabels[idx] || '';
            content += `${this.graph.vertexLabels[i]} - ${this.graph.vertexLabels[j]}`;
            if (label) content += ` | label: ${label}`;
            if (style) content += ` | style: ${style}`;
            if (color) content += ` | color: ${color}`;
            content += '\n';
        });

        content += "\nVertex Colors & Shapes:\n";
        this.graph.vertices.forEach((vertex, i) => {
            const shape = this.graph.vertexShapes[i] || '';
            const color = this.graph.vertexColors[i] || '';
            const label = this.graph.vertexLabels[i] || '';
            content += `${label}: color=${color}`;
            if (shape) content += ` | shape=${shape}`;
            content += '\n';
        });

        return content;
    }

    saveToPNG() {
        // Crop to graph bounding box + padding and export
        const vertices = this.graph.vertices;
        if (!vertices || vertices.length === 0) {
            this.showStatus("No vertices to export");
            return;
        }

        // ensure radii are up to date
        this.computeVertexRadii();
        const pad = 12; // pixels padding around bounding box

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        vertices.forEach((v, i) => {
            const r = (this.vertexRadii && this.vertexRadii[i]) || 14;
            if (v.x - r < minX) minX = v.x - r;
            if (v.y - r < minY) minY = v.y - r;
            if (v.x + r > maxX) maxX = v.x + r;
            if (v.y + r > maxY) maxY = v.y + r;
        });

        // include padding
        minX = Math.floor(minX - pad);
        minY = Math.floor(minY - pad);
        maxX = Math.ceil(maxX + pad);
        maxY = Math.ceil(maxY + pad);

        // clamp to canvas bounds
        minX = Math.max(0, minX);
        minY = Math.max(0, minY);
        maxX = Math.min(this.canvas.width, maxX);
        maxY = Math.min(this.canvas.height, maxY);

        const outW = Math.max(1, maxX - minX);
        const outH = Math.max(1, maxY - minY);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = outW;
        tempCanvas.height = outH;
        const tempCtx = tempCanvas.getContext('2d');

        // white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, outW, outH);

        const offsetX = -minX;
        const offsetY = -minY;

        // Draw edges (shifted) with per-edge style/color and labels
        this.graph.edges.forEach((edge, idx) => {
            const [i, j] = edge;
            const v1 = this.graph.vertices[i];
            const v2 = this.graph.vertices[j];
            if (!v1 || !v2) return;
            const style = this.graph.edgeStyles[idx] || 'solid';
            const color = this.graph.edgeColors[idx] || 'black';
            if (style === 'dotted') tempCtx.setLineDash([1, 6]);
            else if (style === 'dashed') tempCtx.setLineDash([8, 4]);
            else tempCtx.setLineDash([]);
            tempCtx.strokeStyle = color;
            tempCtx.lineWidth = 2;
            tempCtx.beginPath();
            tempCtx.moveTo(v1.x + offsetX, v1.y + offsetY);
            tempCtx.lineTo(v2.x + offsetX, v2.y + offsetY);
            tempCtx.stroke();
            tempCtx.setLineDash([]);
            // collect arrow actions for export canvas
            const dir = (this.graph.edgeDirs && this.graph.edgeDirs[idx]) || 'none';
            if (dir && dir !== 'none') {
                // store tip positions will be computed after vertices are drawn; save v1/v2 and idx
                this.arrowActions.push({ idx, dir, v1: { x: v1.x + offsetX, y: v1.y + offsetY }, v2: { x: v2.x + offsetX, y: v2.y + offsetY }, color });
            }

            // edge label
            const mx = (v1.x + v2.x) / 2 + offsetX;
            const my = (v1.y + v2.y) / 2 + offsetY;
            const label = this.graph.edgeLabels[idx] || '';
            if (label && label.length > 0) {
                tempCtx.fillStyle = '#000000';
                tempCtx.font = '12px Verdana';
                tempCtx.textAlign = 'center';
                tempCtx.textBaseline = 'middle';
                tempCtx.fillText(label, mx, my - 8);
            }
        });

        // Draw vertices (shifted) using computed radii
        this.graph.vertices.forEach((vertex, i) => {
            const strokeColor = this.graph.vertexColors[i] || '#000000';
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.strokeStyle = strokeColor;
            tempCtx.lineWidth = 2;
            const shape = this.graph.vertexShapes[i] || 'circle';
            const cx = vertex.x + offsetX;
            const cy = vertex.y + offsetY;
            const r = (this.vertexRadii && this.vertexRadii[i]) || 14;

            tempCtx.beginPath();
            if (shape === 'circle') {
                tempCtx.arc(cx, cy, r, 0, Math.PI * 2);
                tempCtx.fill();
                tempCtx.stroke();
            } else if (shape === 'square') {
                tempCtx.rect(cx - r, cy - r, r * 2, r * 2);
                tempCtx.fill();
                tempCtx.stroke();
            } else if (shape === 'triangle') {
                const H = 2 * r;
                const topY = cy - (2 * H) / 3;
                const baseY = cy + H / 3;
                tempCtx.moveTo(cx, topY);
                tempCtx.lineTo(cx - r, baseY);
                tempCtx.lineTo(cx + r, baseY);
                tempCtx.closePath();
                tempCtx.fill();
                tempCtx.stroke();
            } else if (shape === 'diamond') {
                tempCtx.moveTo(cx, cy - r);
                tempCtx.lineTo(cx - r, cy);
                tempCtx.lineTo(cx, cy + r);
                tempCtx.lineTo(cx + r, cy);
                tempCtx.closePath();
                tempCtx.fill();
                tempCtx.stroke();
            } else {
                tempCtx.arc(cx, cy, r, 0, Math.PI * 2);
                tempCtx.fill();
                tempCtx.stroke();
            }

            // Vertex label
            tempCtx.fillStyle = '#000000';
            tempCtx.font = '12px Verdana';
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            tempCtx.fillText(this.graph.vertexLabels[i], cx, cy);
        });

        // Draw arrowheads on top in temp canvas so they're visible
        if (this.arrowActions && this.arrowActions.length > 0) {
            const drawArrowTemp = (ctx, from, to, color, radiusTo, edgeIdx) => {
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1) return;
                const ux = dx / dist;
                const uy = dy / dist;
                // compute exact boundary tip when possible
                let tipX = to.x - ux * radiusTo;
                let tipY = to.y - uy * radiusTo;
                if (typeof edgeIdx === 'number' && this.graph.edges[edgeIdx]) {
                    const [aIdx, bIdx] = this.graph.edges[edgeIdx];
                    // decide target vertex index based on which `to` corresponds to
                    // we assume to corresponds to either aIdx or bIdx shifted earlier
                    // pick the closer one
                    const distA = Math.hypot(to.x - this.graph.vertices[aIdx].x, to.y - this.graph.vertices[aIdx].y);
                    const distB = Math.hypot(to.x - this.graph.vertices[bIdx].x, to.y - this.graph.vertices[bIdx].y);
                    const targetIdx = distA < distB ? aIdx : bIdx;
                    const shape = this.graph.vertexShapes[targetIdx] || 'circle';
                    const r = this.vertexRadii[targetIdx] || radiusTo;
                    const tip = this.computeBoundaryPoint(to, from, shape, r);
                    tipX = tip.x; tipY = tip.y;
                }
                const size = Math.min(14, Math.max(6, radiusTo));
                const baseX = tipX - ux * size;
                const baseY = tipY - uy * size;
                const px = -uy; const py = ux;
                const half = size * 0.5;
                const p1x = baseX + px * half; const p1y = baseY + py * half;
                const p2x = baseX - px * half; const p2y = baseY - py * half;
                ctx.save(); ctx.fillStyle = color || '#000'; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.closePath(); ctx.fill(); ctx.restore();
            };
            const drawMidArrowTemp = (ctx, from, to, color, size) => {
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1) return;
                const ux = dx / dist;
                const uy = dy / dist;
                const tipX = mx + ux * (size * 0.5);
                const tipY = my + uy * (size * 0.5);
                const baseX = mx - ux * (size * 0.5);
                const baseY = my - uy * (size * 0.5);
                const px = -uy; const py = ux;
                const half = size * 0.5;
                const p1x = baseX + px * half; const p1y = baseY + py * half;
                const p2x = baseX - px * half; const p2y = baseY - py * half;
                ctx.save(); ctx.fillStyle = color || '#000'; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.closePath(); ctx.fill(); ctx.restore();
            };
            // for each arrowAction in temp canvas, compute radii from vertexRadii
            this.arrowActions.forEach(a => {
                const { dir, v1, v2, idx, color } = a;
                const r1 = this.vertexRadii[this.graph.edges[idx][0]] || 14;
                const r2 = this.vertexRadii[this.graph.edges[idx][1]] || 14;
                const midFlag = (this.graph.edgeMid && this.graph.edgeMid[idx]);
                if (midFlag) {
                    const size = Math.min(14, Math.max(6, Math.max(r1, r2) + 2));
                    if (dir === 'A->B') drawMidArrowTemp(tempCtx, v1, v2, color, size);
                    else if (dir === 'B->A') drawMidArrowTemp(tempCtx, v2, v1, color, size);
                } else {
                    if (dir === 'A->B') drawArrowTemp(tempCtx, v1, v2, color, r2 + 2, idx);
                    else if (dir === 'B->A') drawArrowTemp(tempCtx, v2, v1, color, r1 + 2, idx);
                }
            });
            // clear after drawing on export canvas
            this.arrowActions = [];
        }

        // Prepare data URL and show preview modal instead of auto-download
        const dataURL = tempCanvas.toDataURL('image/png');
        this.lastPNGDataURL = dataURL;
        this.showPNGPreview(dataURL, `graph_${new Date().toISOString().slice(0, 10)}.png`);
        this.showStatus("PNG preview ready");
    }

    showPNGPreview(dataURL, filename = 'graph.png') {
        const overlay = document.getElementById('png-preview-overlay');
        const img = document.getElementById('png-preview-img');
        const downloadLink = document.getElementById('png-download-link');
        if (!overlay || !img || !downloadLink) {
            // fallback: force download
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = filename;
            a.click();
            return;
        }
        img.src = dataURL;
        downloadLink.href = dataURL;
        downloadLink.download = filename;
        const filenameInput = document.getElementById('png-filename-input');
        if (filenameInput) filenameInput.value = filename;
        overlay.style.display = 'flex';
        // small timeout to trigger CSS scale/opacity transition
        setTimeout(() => {
            const box = document.getElementById('png-preview');
            if (box) box.classList.add('show');
        }, 20);
    }

    async copyPNGToClipboard() {
        const dataURL = this.lastPNGDataURL || (document.getElementById('png-preview-img') || {}).src || '';
        if (!dataURL) {
            this.showStatus('No PNG to copy');
            return;
        }
        if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined') {
            this.showStatus('Clipboard image copy not supported');
            return;
        }

        try {
            const response = await fetch(dataURL);
            const blob = await response.blob();
            const mime = blob.type || 'image/png';
            await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
            this.showStatus('PNG copied to clipboard');
        } catch (err) {
            this.showStatus('PNG copy failed');
        }
    }

    showSavePreview(content, filename = 'graph_data.txt') {
        const overlay = document.getElementById('save-preview-overlay');
        const textarea = document.getElementById('save-preview-text');
        const downloadLink = document.getElementById('save-download-link');
        if (!overlay || !textarea || !downloadLink) {
            // fallback: download directly
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }
        textarea.value = content;
        // create blob url for download and assign
        if (this.savePreviewBlobUrl) URL.revokeObjectURL(this.savePreviewBlobUrl);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        this.savePreviewBlobUrl = url;
        downloadLink.href = url;
        downloadLink.download = filename;
        overlay.style.display = 'flex';
    }
}

// Initialize the app when the page loads
window.onload = () => new GraphApp();
// Helper: distance from point p to segment vw
function distancePointToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projx = v.x + t * (w.x - v.x);
    const projy = v.y + t * (w.y - v.y);
    return Math.hypot(p.x - projx, p.y - projy);
}

// Prevent context menu on right click when our custom menus are open
window.addEventListener('contextmenu', (e) => {
    const vm = document.getElementById('vertex-menu');
    const em = document.getElementById('edge-menu');
    if ((vm && vm.style.display === 'block') || (em && em.style.display === 'block')) {
        e.preventDefault();
    }
});
