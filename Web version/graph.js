class Graph {
    constructor() {
        this.vertices = [];
        this.edges = [];
        this.selectedVertex = null;
        this.vertexLabels = [];
        this.draggedVertex = null;
    }

    addVertex(x, y) {
        this.vertices.push({ x, y });
        this.vertexLabels.push(String.fromCharCode(65 + this.vertices.length - 1));
    }

    addEdge(startIdx, endIdx) {
        if (startIdx !== endIdx &&
            !this.edges.some(([s, e]) =>
                (s === startIdx && e === endIdx) || (s === endIdx && e === startIdx))) {
            this.edges.push([startIdx, endIdx]);
            return true;
        }
        return false;
    }

    getVertexAtPos(x, y) {
        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            const distance = Math.sqrt((vertex.x - x) ** 2 + (vertex.y - y) ** 2);
            if (distance <= 10) {  // VERTEX_RADIUS
                return i;
            }
        }
        return null;
    }

    clear() {
        this.vertices = [];
        this.edges = [];
        this.selectedVertex = null;
        this.vertexLabels = [];
        this.draggedVertex = null;
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
}

class GraphApp {
    constructor() {
        this.canvas = document.getElementById('graph-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.graph = new Graph();
        this.mode = 'addVertex';
        this.statusMessage = '';
        this.statusTimeout = null;

        this.initCanvas();
        this.setupEventListeners();
        this.updateInstructions();
        this.render();

        window.addEventListener('resize', this.handleResize.bind(this));
    }

    initCanvas() {
        this.updateCanvasSize();

        // Set initial offset to account for header
        this.canvasOffset = {
            top: document.getElementById('header').clientHeight,
            left: 0
        };
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
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleMouseDown(e) {
        const { x, y } = this.getCanvasCoordinates(e);

        if (this.mode === 'addVertex') {
            this.graph.addVertex(x, y);
            this.showStatus("Vertex added");
        }
        else if (this.mode === 'addEdge') {
            const vertexIdx = this.graph.getVertexAtPos(x, y);
            if (vertexIdx !== null) {
                if (this.graph.selectedVertex === null) {
                    this.graph.selectedVertex = vertexIdx;
                } else {
                    if (this.graph.addEdge(this.graph.selectedVertex, vertexIdx)) {
                        this.showStatus("Edge added");
                    }
                    this.graph.selectedVertex = null;
                }
            }
        }
        else if (this.mode === 'moveVertex') {
            const vertexIdx = this.graph.getVertexAtPos(x, y);
            if (vertexIdx !== null) {
                this.graph.draggedVertex = vertexIdx;
            }
        }

        this.render();
    }

    handleMouseUp() {
        this.graph.draggedVertex = null;
    }

    handleMouseMove(e) {
        if (this.graph.draggedVertex !== null && this.mode === 'moveVertex') {
            const { x, y } = this.getCanvasCoordinates(e);
            this.graph.vertices[this.graph.draggedVertex] = { x, y };
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
        switch (e.key.toLowerCase()) {
            case 'v':
                this.mode = 'addVertex';
                this.showStatus("Vertex mode");
                break;
            case 'e':
                this.mode = 'addEdge';
                this.showStatus("Edge mode");
                break;
            case 'm':
                this.mode = 'moveVertex';
                this.showStatus("Move vertex mode");
                break;
            case 'c':
                this.graph.clear();
                this.showStatus("Graph cleared");
                break;
            case 's':
                this.saveToFile();
                this.showStatus("Graph data saved");
                break;
            case 'p':
                this.saveToPNG();
                break;
        }
        this.updateInstructions();
        this.render();
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

    updateInstructions() {
        const instructions = [
            "<span class='key'>Left click</span>: Add vertex/edge/move",
            `<span class='key'>V</span>: ${this.mode === 'addVertex' ? '<b>Vertex mode</b>' : 'Vertex mode'}`,
            `<span class='key'>E</span>: ${this.mode === 'addEdge' ? '<b>Edge mode</b>' : 'Edge mode'}`,
            `<span class='key'>M</span>: ${this.mode === 'moveVertex' ? '<b>Move mode</b>' : 'Move mode'}`,
            "<span class='key'>S</span>: Save graph data",
            "<span class='key'>C</span>: Clear board",
            "<span class='key'>P</span>: Save as PNG"
        ];

        document.getElementById('instructions').innerHTML = instructions.join('<br>');
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw edges first
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.graph.edges.forEach(([i, j]) => {
            const v1 = this.graph.vertices[i];
            const v2 = this.graph.vertices[j];
            this.ctx.beginPath();
            this.ctx.moveTo(v1.x, v1.y);
            this.ctx.lineTo(v2.x, v2.y);
            this.ctx.stroke();
        });

        // Draw vertices
        this.graph.vertices.forEach((vertex, i) => {
            // Vertex circle
            let color;
            if (i === this.graph.selectedVertex) {
                color = 'blue';
            } else if (i === this.graph.draggedVertex) {
                color = '#6464ff'; // Light blue for dragged vertex
            } else {
                color = 'black';
            }

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(vertex.x, vertex.y, 10, 0, Math.PI * 2);
            this.ctx.fill();

            // Highlight selection
            if (i === this.graph.selectedVertex || i === this.graph.draggedVertex) {
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(vertex.x, vertex.y, 12, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Vertex label
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Verdana';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.graph.vertexLabels[i], vertex.x, vertex.y);
        });
    }

    saveToFile() {
        const matrix = this.graph.getAdjacencyMatrix();
        let content = "Adjacency Matrix:\n";
        matrix.forEach(row => {
            content += row.join(' ') + '\n';
        });

        content += "\nAdjacencies:\n";
        this.graph.edges.forEach(([i, j]) => {
            content += `${this.graph.vertexLabels[i]} - ${this.graph.vertexLabels[j]}\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'graph_data.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    saveToPNG() {
        // Create a temporary canvas for PNG export
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw edges
        tempCtx.strokeStyle = 'black';
        tempCtx.lineWidth = 2;
        this.graph.edges.forEach(([i, j]) => {
            const v1 = this.graph.vertices[i];
            const v2 = this.graph.vertices[j];
            tempCtx.beginPath();
            tempCtx.moveTo(v1.x, v1.y);
            tempCtx.lineTo(v2.x, v2.y);
            tempCtx.stroke();
        });

        // Draw vertices
        this.graph.vertices.forEach((vertex, i) => {
            // Vertex circle
            tempCtx.fillStyle = i === this.graph.selectedVertex ? 'blue' : 'black';
            tempCtx.beginPath();
            tempCtx.arc(vertex.x, vertex.y, 10, 0, Math.PI * 2);
            tempCtx.fill();

            // Vertex label
            tempCtx.fillStyle = 'white';
            tempCtx.font = '16px Verdana';
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            tempCtx.fillText(this.graph.vertexLabels[i], vertex.x, vertex.y);
        });

        // Add watermark
        tempCtx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        tempCtx.font = '14px Verdana';
        tempCtx.textAlign = 'right';
        tempCtx.textBaseline = 'bottom';
        tempCtx.fillText(new Date().toLocaleDateString(), tempCanvas.width - 10, tempCanvas.height - 10);

        // Trigger download
        const link = document.createElement('a');
        link.download = `graph_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();

        this.showStatus("Graph saved as PNG");
    }
}

// Initialize the app when the page loads
window.onload = () => new GraphApp();