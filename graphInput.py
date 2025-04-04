import pygame
import numpy as np
import os
import datetime
from pygame import gfxdraw


# Initialize pygame
pygame.init()

# Constants
WIDTH, HEIGHT = 1000, 1000
HEADER_HEIGHT = 50  # Space for the heading
CANVAS_HEIGHT = HEIGHT - HEADER_HEIGHT
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
GRAY = (200,200,200)
VERTEX_RADIUS = 10
UIFONT = pygame.font.SysFont('tahoma', 14)
FONT = pygame.font.SysFont('', 14)
headerFONT = pygame.font.SysFont('tahoma', 30)
STATUS_DURATION = 120  # frames (2 seconds at 60 FPS)
STATUS_FADE_TIME = 30  # frames (0.5 seconds)

# Set up the display
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("simpleGraphDraw by hm0nk")
clock = pygame.time.Clock()
screen.fill((255, 255, 255))
pygame.display.update()



class Graph:
    def __init__(self):
        self.vertices = []  # List of vertex positions
        self.edges = []     # List of tuples (start_idx, end_idx)
        self.adj_matrix = np.array([], dtype=int)  # Adjacency matrix
        self.selected_vertex = None
        self.vertex_labels = []  # Labels for vertices (A, B, C, ...)

    def add_vertex(self, pos):
        """Add a vertex at the given position"""
        self.vertices.append(pos)
        # A, B, C, ...
        self.vertex_labels.append(chr(65 + len(self.vertices) - 1))

        # Update adjacency matrix
        if len(self.vertices) == 1:
            self.adj_matrix = np.zeros((1, 1), dtype=int)
        else:
            # Add a new row and column to the adjacency matrix
            new_matrix = np.zeros(
                (len(self.vertices), len(self.vertices)), dtype=int)
            new_matrix[:-1, :-1] = self.adj_matrix
            self.adj_matrix = new_matrix

    def add_edge(self, start_idx, end_idx):
        """Add an edge between two vertices"""
        if start_idx != end_idx and (start_idx, end_idx) not in self.edges and (end_idx, start_idx) not in self.edges:
            self.edges.append((start_idx, end_idx))
            self.adj_matrix[start_idx][end_idx] = 1
            self.adj_matrix[end_idx][start_idx] = 1

    def get_vertex_at_pos(self, pos):
        """Check if there's a vertex at the given position"""
        for i, vertex in enumerate(self.vertices):
            distance = ((vertex[0] - pos[0]) ** 2 +
                        (vertex[1] - pos[1]) ** 2) ** 0.5
            if distance <= VERTEX_RADIUS:
                return i
        return None

    def save_to_file(self, filename="graph_data.txt"):
        """Save the graph data and adjacency matrix to a file"""
        with open(filename, 'w') as f:
            # f.write("Vertices:\n")
            # for i, (x, y) in enumerate(self.vertices):
            #     f.write(f"{self.vertex_labels[i]}: ({x}, {y})\n")

            f.write("\nAdjacency Matrix:\n")
            for row in self.adj_matrix:
                f.write(" ".join(map(str, row)))
                f.write("\n")

            f.write("\nAdjacencies:\n")
            for start, end in self.edges:
                f.write(
                    f"{self.vertex_labels[start]} - {self.vertex_labels[end]}\n")

    def save_to_png(surface, graph, filename="graph_snapshot.png"):
        """Save the current graph visualization as a PNG image"""
        try:
            # Create a temporary surface to render the graph
            graph_surface = pygame.Surface((WIDTH, HEIGHT))
            graph_surface.fill(WHITE)

            # Draw all graph components
            # 1. Draw edges
            for start_idx, end_idx in graph.edges:
                start_x, start_y = graph.vertices[start_idx]
                end_x, end_y = graph.vertices[end_idx]
                pygame.draw.aaline(graph_surface, BLACK,
                                (start_x, start_y + HEADER_HEIGHT),
                                (end_x, end_y + HEADER_HEIGHT))

            # 2. Draw vertices
            for i, (x, y) in enumerate(graph.vertices):
                color = BLUE if i == graph.selected_vertex else BLACK
                pygame.draw.circle(graph_surface, color,
                                (x, y + HEADER_HEIGHT), VERTEX_RADIUS)

                label = FONT.render(graph.vertex_labels[i], True, WHITE)
                graph_surface.blit(label,
                                (x - label.get_width()//2,
                                    y + HEADER_HEIGHT - label.get_height()//2))

            # Add watermark
            timestamp = FONT.render(datetime.datetime.now().strftime(
                "%Y-%m-%d"), True, (200, 200, 200))
            graph_surface.blit(timestamp, (WIDTH - timestamp.get_width() - 10,
                                        HEIGHT - timestamp.get_height() - 10))
            # Save to file
            pygame.image.save(graph_surface, filename)
            return f"Graph saved as {filename}"
        except Exception as e:
            return f"Error saving image: {str(e)}"

            

    def clear(self):
        """Clear all vertices, edges, and adjacency matrix"""
        self.vertices = []
        self.edges = []
        self.adj_matrix = np.array([], dtype=int)
        self.selected_vertex = None
        self.vertex_labels = []
    
def draw_header(surface, title, status_message=None, status_alpha=255):
    """Draw header with title and status message"""
    # Header background
    # pygame.draw.rect(surface, GRAY, (0, 0, WIDTH, HEADER_HEIGHT))

    # Title text
    title_surface = headerFONT.render(title, True, BLACK)
    title_rect = title_surface.get_rect(
        center=(WIDTH//2, HEADER_HEIGHT//2))
    surface.blit(title_surface, title_rect)

    # # Separator line
    # pygame.draw.line(surface, BLACK, (0, HEADER_HEIGHT),
    #                     (WIDTH, HEADER_HEIGHT), 2)


# Add this with your other constants at the top of the file
ICON_SIZE = 20  # Size of icons in pixels


def create_icons():
    """Create icon surfaces for status messages"""
    icons = {}

    # Save icon (floppy disk)
    save_icon = pygame.Surface((ICON_SIZE, ICON_SIZE), pygame.SRCALPHA)
    pygame.draw.rect(save_icon, BLACK, (5, 3, 10, 14), 2)  # Disk body
    pygame.draw.rect(save_icon, BLACK, (3, 5, 14, 2))     # Disk shutter
    icons["save"] = save_icon

    # Clear icon (circle with X)
    clear_icon = pygame.Surface((ICON_SIZE, ICON_SIZE), pygame.SRCALPHA)
    pygame.draw.circle(clear_icon, BLACK, (ICON_SIZE//2,
                       ICON_SIZE//2), ICON_SIZE//2 - 2, 2)
    pygame.draw.line(clear_icon, BLACK, (6, 6), (ICON_SIZE-6, ICON_SIZE-6), 2)
    pygame.draw.line(clear_icon, BLACK, (6, ICON_SIZE-6), (ICON_SIZE-6, 6), 2)
    icons["clear"] = clear_icon

    # Info icon (circle with 'i')
    info_icon = pygame.Surface((ICON_SIZE, ICON_SIZE), pygame.SRCALPHA)
    pygame.draw.circle(info_icon, BLACK, (ICON_SIZE//2,
                       ICON_SIZE//2), ICON_SIZE//2 - 2, 2)
    small_font = pygame.font.SysFont('Arial', 14, bold=True)
    i_text = small_font.render("i", True, BLACK)
    info_icon.blit(i_text, (ICON_SIZE//2 - i_text.get_width() //
                   2, ICON_SIZE//2 - i_text.get_height()//2))
    icons["info"] = info_icon

    return icons


# Initialize icons (do this after pygame.init() but before main loop)
ICONS = create_icons()


def draw_status(surface, message, alpha=255, animation_progress=1.0):
    """Draw status message with centered text in its box"""
    if not message or alpha <= 0:
        return

    # Prepare text surface
    status_surface = FONT.render(message, True, BLACK)
    status_surface.set_alpha(alpha)

    # Select appropriate icon
    icon_key = ("save" if "saved" in message.lower() else
                "clear" if "clear" in message.lower() else
                "info")
    icon = ICONS[icon_key]
    icon.set_alpha(alpha)

    # Calculate box dimensions
    box_padding = 15  # Space around content
    box_height = max(ICON_SIZE, status_surface.get_height()) + 10
    box_width = status_surface.get_width() + ICON_SIZE + box_padding * 2 + \
        10  # 10=space between icon/text

    # Final position (bottom right)
    final_box_x = WIDTH - box_width - 20
    final_box_y = HEIGHT - box_height - 20

    # Apply animation (slide from right)
    if animation_progress < 1.0:
        offset = (1 - animation_progress) * 100
        final_box_x += offset

    # Draw background box (with rounded corners)
    bg_rect = pygame.Rect(
        final_box_x, final_box_y,
        box_width, box_height
    )
    pygame.draw.rect(surface, (245, 245, 245), bg_rect, border_radius=8)
    pygame.draw.rect(surface, (200, 200, 200), bg_rect, 1, border_radius=8)

    # Calculate centered positions for icon and text
    content_width = ICON_SIZE + 10 + status_surface.get_width()
    start_x = final_box_x + (box_width - content_width) // 2

    icon_x = start_x
    icon_y = final_box_y + (box_height - ICON_SIZE) // 2

    text_x = start_x + ICON_SIZE + 10
    text_y = final_box_y + (box_height - status_surface.get_height()) // 2

    # Draw icon and text (centered vertically in box)
    surface.blit(icon, (icon_x, icon_y))
    surface.blit(status_surface, (text_x, text_y))


def get_next_filename():
    """Generate sequential filenames"""
    counter = 1
    while True:
        filename = f"graph_{counter:03d}.png"
        if not os.path.exists(filename):
            return filename
        counter += 1

def main():
    graph=Graph()
    running=True
    mode="add_vertex"  # or "add_edge"

    status_message = None
    status_counter = 0

    instructions = {
        "add_vertex": ["V: Vertex mode (current)", "E: Edge mode"],
        "add_edge": ["V: Vertex mode", "E: Edge mode (current)"],
    }
    base_instructions = [
        "Left click: Add vertex/edge",
        "S: Save graph to file",
        "C: Clear the board",
        "P: Save as PNG"
    ]
    instruction_surfaces = []
    for text in instructions:
        text_surface = FONT.render(text, True, BLACK)
        instruction_surfaces.append(text_surface)
    
    # Create screenshots directory
    if not os.path.exists("screenshots"):
        os.makedirs("screenshots")

    while running:
        screen.fill(WHITE)

        # Update status message timer
        if status_message and status_counter > 0:
            status_counter -= 1
            status_alpha = min(255, (status_counter / STATUS_FADE_TIME) * 255)
        else:
            status_message = None

        # Draw header with status
        draw_header(screen, "simpleGraphDraw")

        if status_message:
            current_alpha = min(255, (status_counter / STATUS_FADE_TIME) * 255)
            draw_status(screen, status_message, current_alpha)

        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_v:
                    mode = "add_vertex"
                elif event.key == pygame.K_e:
                    mode = "add_edge"
                elif event.key == pygame.K_s:
                    graph.save_to_file()
                    status_message = "Graph saved to graph_data.txt."
                    status_counter = STATUS_DURATION
                elif event.key == pygame.K_c:
                    graph.clear()
                    status_message = "Board cleared!"
                    status_counter = STATUS_DURATION
                elif event.key == pygame.K_p:  # P for "print" screenshot
                    filename = os.path.join("screenshots", get_next_filename())
                    status_message = graph.save_to_png(graph, filename)
                    status_counter = STATUS_DURATION

            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Left click
                    pos = pygame.mouse.get_pos()
                    # Adjust for header when adding vertices
                    canvas_pos = (pos[0], pos[1] - HEADER_HEIGHT)

                    if mode == "add_vertex":
                        # Only add vertices in the canvas area
                        if pos[1] > HEADER_HEIGHT:
                            graph.add_vertex(canvas_pos)

                    elif mode == "add_edge":
                        # Check for clicks in canvas area only
                        if pos[1] > HEADER_HEIGHT:
                            vertex_idx = graph.get_vertex_at_pos(canvas_pos)
                            if vertex_idx is not None:
                                if graph.selected_vertex is None:
                                    graph.selected_vertex = vertex_idx
                                else:
                                    graph.add_edge(graph.selected_vertex, vertex_idx)
                                    graph.selected_vertex = None

        # Draw edges
        for start_idx, end_idx in graph.edges:
            start_x, start_y = graph.vertices[start_idx]
            end_x, end_y = graph.vertices[end_idx]
            # Apply header offset when drawing
            pygame.draw.aaline(screen, BLACK,
                               (start_x, start_y + HEADER_HEIGHT),
                               (end_x, end_y + HEADER_HEIGHT))

        # Draw vertices
        for i, (x, y) in enumerate(graph.vertices):
            color = BLUE if i == graph.selected_vertex else BLACK
            pygame.draw.circle(screen, color, (x, y + HEADER_HEIGHT), VERTEX_RADIUS)

            # Draw vertex label
            label=FONT.render(graph.vertex_labels[i], True, WHITE)
            screen.blit(label, (x - label.get_width()//2, y +HEADER_HEIGHT - label.get_height()//2))
        
        # Draw instructions (optimized)
        y_pos =  10
        for text in instructions[mode] + base_instructions:
            text_surface = UIFONT.render(text, True, BLACK)
            screen.blit(text_surface, (10, y_pos))
            y_pos += 25


        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    main()
