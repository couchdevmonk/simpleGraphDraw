import pygame
import numpy as np
import os
import datetime
from pygame import gfxdraw

# Initialize pygame
pygame.init()

# Constants
WIDTH, HEIGHT = 1000, 1000
HEADER_HEIGHT = 50
CANVAS_HEIGHT = HEIGHT - HEADER_HEIGHT
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
GRAY = (200, 200, 200)
VERTEX_RADIUS = 10
FONT_SIZE = 16
STATUS_DURATION = 120
STATUS_FADE_TIME = 30

# Font setup
try:
    FONT = pygame.font.SysFont('verdana', FONT_SIZE)
    HEADER_FONT = pygame.font.SysFont('verdana', 30)
except:
    FONT = pygame.font.Font(None, FONT_SIZE)
    HEADER_FONT = pygame.font.Font(None, 30)

# Set up display
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("simpleGraphDraw by hm0nk")
clock = pygame.time.Clock()

class Graph:
    def __init__(self):
        self.vertices = []
        self.edges = []
        self.adj_matrix = np.array([], dtype=int)
        self.selected_vertex = None
        self.vertex_labels = []

    def add_vertex(self, pos):
        self.vertices.append(pos)
        self.vertex_labels.append(chr(65 + len(self.vertices) - 1))
        
        if len(self.vertices) == 1:
            self.adj_matrix = np.zeros((1, 1), dtype=int)
        else:
            new_matrix = np.zeros((len(self.vertices), len(self.vertices)), dtype=int)
            new_matrix[:-1, :-1] = self.adj_matrix
            self.adj_matrix = new_matrix

    def add_edge(self, start_idx, end_idx):
        if (start_idx != end_idx and 
            (start_idx, end_idx) not in self.edges and 
            (end_idx, start_idx) not in self.edges):
            self.edges.append((start_idx, end_idx))
            self.adj_matrix[start_idx][end_idx] = 1
            self.adj_matrix[end_idx][start_idx] = 1
            return True
        return False

    def get_vertex_at_pos(self, pos):
        for i, vertex in enumerate(self.vertices):
            distance = ((vertex[0] - pos[0]) ** 2 + (vertex[1] - pos[1]) ** 2) ** 0.5
            if distance <= VERTEX_RADIUS:
                return i
        return None

    def save_to_file(self, filename="graph_data.txt"):
        with open(filename, 'w') as f:
            f.write("Adjacency Matrix:\n")
            for row in self.adj_matrix:
                f.write(" ".join(map(str, row)) + "\n")
            
            f.write("\nAdjacencies:\n")
            for start, end in self.edges:
                f.write(f"{self.vertex_labels[start]} - {self.vertex_labels[end]}\n")

    def clear(self):
        self.vertices = []
        self.edges = []
        self.adj_matrix = np.array([], dtype=int)
        self.selected_vertex = None
        self.vertex_labels = []

def save_to_png(graph, filename="graph_snapshot.png"):
    try:
        surface = pygame.Surface((WIDTH, HEIGHT))
        surface.fill(WHITE)
        
        # Draw edges
        for start_idx, end_idx in graph.edges:
            start_x, start_y = graph.vertices[start_idx]
            end_x, end_y = graph.vertices[end_idx]
            pygame.draw.aaline(surface, BLACK, 
                              (start_x, start_y + HEADER_HEIGHT),
                              (end_x, end_y + HEADER_HEIGHT))

        # Draw vertices with proper labels
        for i, (x, y) in enumerate(graph.vertices):
            color = BLUE if i == graph.selected_vertex else BLACK
            pygame.draw.circle(surface, color, 
                             (x, y + HEADER_HEIGHT), VERTEX_RADIUS)
            
            label = FONT.render(graph.vertex_labels[i], True, WHITE)
            label_rect = label.get_rect(center=(x, y + HEADER_HEIGHT))
            surface.blit(label, label_rect)

        # Add watermark
        timestamp = FONT.render(datetime.datetime.now().strftime("%Y-%m-%d"), 
                              True, (200, 200, 200))
        surface.blit(timestamp, (WIDTH - timestamp.get_width() - 10,
                               HEIGHT - timestamp.get_height() - 10))
        
        pygame.image.save(surface, filename)
        return f"Graph saved as {filename}"
    except Exception as e:
        return f"Error saving image: {str(e)}"

def draw_header(surface, title):
    pygame.draw.rect(surface, GRAY, (0, 0, WIDTH, HEADER_HEIGHT))
    title_surface = HEADER_FONT.render(title, True, BLACK)
    title_rect = title_surface.get_rect(center=(WIDTH//2, HEADER_HEIGHT//2))
    surface.blit(title_surface, title_rect)

def show_status(surface, message, alpha=255):
    if not message or alpha <= 0:
        return
    
    status_surface = FONT.render(message, True, BLACK)
    status_surface.set_alpha(alpha)
    
    # Simple status in bottom right
    status_rect = status_surface.get_rect(
        bottomright=(WIDTH - 20, HEIGHT - 20))
    
    # Background
    bg_rect = status_rect.inflate(20, 10)
    pygame.draw.rect(surface, (245, 245, 245), bg_rect, border_radius=5)
    pygame.draw.rect(surface, (200, 200, 200), bg_rect, 1, border_radius=5)
    
    surface.blit(status_surface, status_rect)

def get_next_filename():
    counter = 1
    while True:
        filename = f"graph_{counter:03d}.png"
        if not os.path.exists(filename):
            return filename
        counter += 1

def main():
    graph = Graph()
    running = True
    mode = "add_vertex"  # Modes: "add_vertex", "add_edge", "move_vertex"
    status_message = ""
    status_counter = 0
    dragged_vertex = None  # Track which vertex is being dragged
    
    # ... (keep your existing initialization code)

    while running:
        screen.fill(WHITE)
        
        # Handle status message fading
        if status_message and status_counter > 0:
            status_counter -= 1
            status_alpha = min(255, (status_counter / STATUS_FADE_TIME) * 255)
        else:
            status_message = ""
        
        # Draw header
        draw_header(screen, "simpleGraphDraw")
        
        # Draw status
        if status_message:
            show_status(screen, status_message, status_alpha)
        
        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_v:
                    mode = "add_vertex"
                    status_message = "Vertex mode"
                    status_counter = STATUS_DURATION
                    dragged_vertex = None  # Cancel any dragging
                elif event.key == pygame.K_e:
                    mode = "add_edge"
                    status_message = "Edge mode"
                    status_counter = STATUS_DURATION
                    dragged_vertex = None  # Cancel any dragging
                elif event.key == pygame.K_m:  # New move mode
                    mode = "move_vertex"
                    status_message = "Move vertex mode"
                    status_counter = STATUS_DURATION
                elif event.key == pygame.K_s:
                    graph.save_to_file()
                    status_message = "Graph data saved"
                    status_counter = STATUS_DURATION
                elif event.key == pygame.K_c:
                    graph.clear()
                    status_message = "Graph cleared"
                    status_counter = STATUS_DURATION
                elif event.key == pygame.K_p:
                    filename = os.path.join("screenshots", get_next_filename())
                    status_message = save_to_png(graph, filename)
                    status_counter = STATUS_DURATION
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Left click
                    pos = pygame.mouse.get_pos()
                    canvas_pos = (pos[0], pos[1] - HEADER_HEIGHT)
                    
                    if mode == "add_vertex":
                        if pos[1] > HEADER_HEIGHT:
                            graph.add_vertex(canvas_pos)
                    
                    elif mode == "add_edge":
                        if pos[1] > HEADER_HEIGHT:
                            vertex_idx = graph.get_vertex_at_pos(canvas_pos)
                            if vertex_idx is not None:
                                if graph.selected_vertex is None:
                                    graph.selected_vertex = vertex_idx
                                else:
                                    if graph.add_edge(graph.selected_vertex, vertex_idx):
                                        status_message = "Edge added"
                                        status_counter = STATUS_DURATION
                                    graph.selected_vertex = None
                    
                    elif mode == "move_vertex":
                        if pos[1] > HEADER_HEIGHT:
                            vertex_idx = graph.get_vertex_at_pos(canvas_pos)
                            if vertex_idx is not None:
                                dragged_vertex = vertex_idx
            
            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1:  # Left click release
                    dragged_vertex = None
            
            elif event.type == pygame.MOUSEMOTION:
                if dragged_vertex is not None and mode == "move_vertex":
                    pos = pygame.mouse.get_pos()
                    if pos[1] > HEADER_HEIGHT:
                        # Update vertex position while dragging
                        graph.vertices[dragged_vertex] = (pos[0], pos[1] - HEADER_HEIGHT)
        
        # Draw edges first (so they appear behind vertices)
        for start_idx, end_idx in graph.edges:
            start_x, start_y = graph.vertices[start_idx]
            end_x, end_y = graph.vertices[end_idx]
            pygame.draw.aaline(screen, BLACK,
                             (start_x, start_y + HEADER_HEIGHT),
                             (end_x, end_y + HEADER_HEIGHT))
        
        # Draw vertices
        for i, (x, y) in enumerate(graph.vertices):
            # Different color for dragged vertex
            color = BLUE if i == graph.selected_vertex else (100, 100, 255) if i == dragged_vertex else BLACK
            
            pygame.draw.circle(screen, color, (x, y + HEADER_HEIGHT), VERTEX_RADIUS)
            
            # Highlight selection
            if i == graph.selected_vertex or i == dragged_vertex:
                pygame.draw.circle(screen, RED, (x, y + HEADER_HEIGHT), 
                                  VERTEX_RADIUS + 2, 2)
            
            # Draw label
            label = FONT.render(graph.vertex_labels[i], True, WHITE)
            label_rect = label.get_rect(center=(x, y + HEADER_HEIGHT))
            screen.blit(label, label_rect)
        
        # Update instructions to include move mode
        instructions = [
            "Left click: Add vertex/edge/move",
            f"V: {'Vertex mode (current)' if mode == 'add_vertex' else 'Vertex mode'}",
            f"E: {'Edge mode (current)' if mode == 'add_edge' else 'Edge mode'}",
            f"M: {'Move mode (current)' if mode == 'move_vertex' else 'Move mode'}",
            "S: Save graph data",
            "C: Clear board",
            "P: Save as PNG"
        ]
        
        y_pos = HEADER_HEIGHT + 10
        for text in instructions:
            text_surface = FONT.render(text, True, BLACK)
            screen.blit(text_surface, (10, y_pos))
            y_pos += text_surface.get_height() + 5
        
        pygame.display.flip()
        clock.tick(60)

if __name__ == "__main__":
    main()
    pygame.quit()