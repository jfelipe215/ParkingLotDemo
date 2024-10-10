import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Define types for GridCell and PathPoint
type GridCell = {
  occupied: boolean;
  highlighted: boolean;
  reserved?: boolean; // Optional property
  goal?: boolean; // Optional property for goal cell
};

type PathPoint = {
  row: number;
  col: number;
  path: PathPoint[]; // Keep track of the path taken
};

const ROWS = 4;
const COLS = 10;
const entrance = { row: 0, col: 0 }; // Main parking lot entrance
const pedestrianEntrance: PathPoint = { row: ROWS - 1, col: COLS - 1, path: [] }; // Pedestrian entrance for nearest spot preference

const App = () => {
  // Set random spots to occupied/empty 
  const createGrid = (): GridCell[][] => {
    const grid: GridCell[][] = [];
    for (let row = 0; row < ROWS; row++) {
      const rowArray: GridCell[] = [];
      for (let col = 0; col < COLS; col++) {
        rowArray.push({ occupied: Math.random() < 0.3, highlighted: false });
      }
      grid.push(rowArray);
    }
    return grid;
  };

  const [grid, setGrid] = useState<GridCell[][]>(createGrid());
  const [reservedSpot, setReservedSpot] = useState<PathPoint | null>(null); // Store reserved spot

  // Function to highlight the path
  const highlightPath = (path: PathPoint[]) => {
    const newGrid = grid.map((row, rIdx) =>
      row.map((cell, cIdx) => ({
        ...cell,
        highlighted: path.some(p => p.row === rIdx && p.col === cIdx),
      }))
    );
    setGrid(newGrid);
  };

  // Set the goal parking spot
  const setGoalSpot = (goalRow: number, goalCol: number) => {
    setGrid((prevGrid) =>
      prevGrid.map((row, rIdx) =>
        row.map((cell, cIdx) => ({
          ...cell,
          goal: rIdx === goalRow && cIdx === goalCol,
        }))
      )
    );
  };

  // Pathfinding function that can pass through occupied spots
  const findPathToSpot = (goalSpot: PathPoint) => {
    const queue: PathPoint[] = [{ row: entrance.row, col: entrance.col, path: [] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { row, col, path } = queue.shift()!; // Use non-null assertion since we are sure there is an item

      // Skip already visited spots
      if (visited.has(`${row}-${col}`)) continue;
      visited.add(`${row}-${col}`);

      // Check if this spot is the goal and unoccupied
      if (row === goalSpot.row && col === goalSpot.col && !grid[row][col].occupied) {
        highlightPath([...path, goalSpot]); // Highlight path to the goal
        setGoalSpot(goalSpot.row, goalSpot.col); // Set reserved spot as goal
        return; // Exit the function
      }

      // Explore adjacent cells even if occupied
      const directions = [
        { dr: -1, dc: 0 }, // up
        { dr: 1, dc: 0 }, // down
        { dr: 0, dc: -1 }, // left
        { dr: 0, dc: 1 } // right
      ];

      for (const { dr, dc } of directions) {
        const newRow = row + dr;
        const newCol = col + dc;

        if (
          newRow >= 0 && newRow < ROWS &&
          newCol >= 0 && newCol < COLS &&
          !visited.has(`${newRow}-${newCol}`)
        ) {
          queue.push({ row: newRow, col: newCol, path: [...path, { row, col }] }); //type errors that do not impede build
        }
      }
    }
  };
  const findNearestEmptySpot = (): PathPoint | null => {
    const queue: PathPoint[] = [{ ...pedestrianEntrance, path: [] }];
    const visited = new Set<string>();
  
    while (queue.length > 0) {
      const { row, col, path } = queue.shift()!;
  
      if (visited.has(`${row}-${col}`)) continue;
      visited.add(`${row}-${col}`);
  
      // Check if this spot is empty and return it if so
      if (!grid[row][col].occupied) {
        return { row, col, path };
      }
  
      // Explore adjacent cells
      const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 }
      ];
  
      for (const { dr, dc } of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
  
        if (
          newRow >= 0 && newRow < ROWS &&
          newCol >= 0 && newCol < COLS &&
          !visited.has(`${newRow}-${newCol}`)
        ) {
          queue.push({ row: newRow, col: newCol, path: [...path, { row, col }] }); //type errors that do not impede build
        }
      }
    }
  
    return null; // Return null if no empty spot is found
  };
  
  // Update the button press handler to find the nearest empty spot around the pedestrian entrance
  const goToNearestSpotNearPedestrian = () => {
    const nearestEmptySpot = findNearestEmptySpot();
    if (nearestEmptySpot) {
      findPathToSpot(nearestEmptySpot);
    }
  };
  // Function to reserve a spot
  const reserveSpot = (row: number, col: number) => {
    // Check if the spot is not occupied and not already reserved
    if (!grid[row][col].occupied && !grid[row][col].reserved) {
      // Create a new grid with the reserved spot highlighted
      const newGrid = grid.map((gridRow, rIdx) =>
        gridRow.map((cell, cIdx) => ({
          ...cell,
          reserved: rIdx === row && cIdx === col, // Mark the spot as reserved
          highlighted: rIdx === row && cIdx === col // Change color to blue immediately
        }))
      );
  
      setGrid(newGrid); // Update the grid state
      setReservedSpot({ row, col, path: [] }); // Store reserved spot
    }
  };

  // Function to navigate to the reserved spot
  const goToReservedSpot = () => {
    if (reservedSpot) {
      findPathToSpot(reservedSpot); // Highlight path to the reserved spot
    }
  };
//the render chunk: pedestrian exit button uses goToNearestSpotNearPedestrian
//                  reservation button uses goToReservedSpot
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parking Lot Demo</Text>
      <View style={styles.grid}>
        {grid.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell, colIndex) => (
              <TouchableOpacity
                key={colIndex}
                style={[
                  styles.cell,
                  cell.occupied ? styles.occupied : (cell.reserved ? styles.reserved : styles.unoccupied),
                  cell.highlighted ? styles.path : null,
                  cell.goal ? styles.goal : null
                ]}
                onPress={() => reserveSpot(rowIndex, colIndex)} // Reserve the spot on click
              >
                {rowIndex === entrance.row && colIndex === entrance.col ? (
                  <Text style={styles.entrance}>E</Text>
                ) : rowIndex === pedestrianEntrance.row && colIndex === pedestrianEntrance.col ? (
                  <Text style={styles.pedestrianEntrance}>P</Text>
                ) : null}
              </TouchableOpacity>
            ))} 
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.button} onPress={goToNearestSpotNearPedestrian}>
        <Text style={styles.buttonText}>Find Nearest Spot to Pedestrian Entrance</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={goToReservedSpot} disabled={!reservedSpot}>  
        <Text style={styles.buttonText}>{reservedSpot ? 'Go to Reserved Spot' : 'Click an Open Spot to Reserve'}</Text>
      </TouchableOpacity>
    </View>
  );
};


//basic stylesheet: more robust UI after rendering 3D map from vector file input 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  grid: {
    flexDirection: 'column'
  },
  row: {
    flexDirection: 'row'
  },
  cell: {
    width: 30,
    height: 30,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4
  },
  unoccupied: {
    backgroundColor: '#e0f7e9'
  },
  occupied: {
    backgroundColor: '#f9d7d5'
  },
  reserved: {
    backgroundColor: '#4287f5' // Change color for reserved spots
  },
  path: {
    backgroundColor: '#4287f5'
  },
  goal: {
    backgroundColor: '#0000ff'
  },
  entrance: {
    color: '#000',
    fontWeight: 'bold'
  },
  pedestrianEntrance: {
    color: '#ff00ff',
    fontWeight: 'bold'
  },
  button: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#4287f5',
    borderRadius: 5
  },
  buttonText: {
    color: '#fff',
    fontSize: 16
  }
});

export default App;
