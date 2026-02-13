# simpleGraphDraw
A simple python code to visually draw a graph and get the corresponding adjacency matrix.

The program uses pyGame to make a canvas to draw vertices and edges on it. It also comes with a barebones UI to change modes between vertex addition or edge addition along with the features to save the adjacency matrix in a file or save the graph as a PNG file.

Web version available at: [https://couchdevmonk.github.io/simpleGraphDraw](https://couchdevmonk.github.io/simpleGraphDraw/)

~#### Packages used (python version not maintained anymore)~
~1. pyGame~
~2. numPy~
~3. os~
~4. datetime~

#### Featues
1. Add vertices or edges (toggle mode)
2. Clear the board
3. Save the underlying adjacency matrix and corresponding adjacencies in a text file
4. Save the graph as a PNG snapshot
5. Ability to move the vertices and the corresponding edges
6. Change vertex and edges styles, which includes changing labels, colors and for edges adding directions, dashed and dotted.

#### Possible future features (web version)
- [ ] Add curved edges
- [ ] Add global grid and snapping (toggles on the top-right) (planned for v1.6)
- [ ] Add infinite canvas (planned for v1.6)
- [ ] Add LaTeX compatibility to vertex labels (planned for v1.7)
- [ ] Add tikz support (planned for v1.7)
- [x] ~Ability to move the vertices and the corresponding edges~ 
- [x] ~Make a web version~
