// board.jsx
import React from 'react';

/*
  Board component:
    props:
      - size (number) => board dimension, e.g. 20
      - squares (2D data) => array of objects describing each square
         or an object mapping { "x,y": { hasShip, hasResource, ... } }
*/

export default function Board({ size, squares, onCellClick }) {
  // Generate rows [0..size-1]
  const rows = [];
  for (let y = 1; y <= size; y++) {
    const rowCells = [];
    for (let x = 1; x <= size; x++) {
      const key = `${x},${y}`;
      const cellData = squares[key] || {};
      // Decide the CSS class
      let cellClass = 'board-cell';
      if (cellData.numShips && cellData.numShips > 1) {
        cellClass += ' multiple-ships';
      } else if (cellData.numShips === 1) {
        cellClass += ' ship';
      }
      if (cellData.hasResource) {
        // Maybe color it differently or combine classes
        cellClass += ' resource';
      }

      // The text is either number of ships or empty
      const cellText = cellData.numShips && cellData.numShips > 1
        ? cellData.numShips
        : '';

      rowCells.push(
        <div
          key={key}
          className={cellClass}
          onClick={() => onCellClick(x,y)}
        >
          <span className="cell-text">
            {cellText}
          </span>
        </div>
      );
    }
    rows.push(
      <div className="board-row" key={`row-${y}`}>
        {rowCells}
      </div>
    );
  }

  return (
    <div className="board-container">
      {rows}
    </div>
  );
}