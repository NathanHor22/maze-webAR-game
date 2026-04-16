/**
 * CONTROLS MODULE
 * 
 * Handles the 4 directional button controls
 * Buttons are screen-anchored (don't move with AR content)
 */

type Direction = 'up' | 'down' | 'left' | 'right';
type MoveCallback = (direction: Direction) => void;

/**
 * Initialize button controls
 * @param onMove - Callback function called when a valid move is made
 */
export function initControls(onMove: MoveCallback) {
  // Get button elements
  const btnUp = document.getElementById('btn-up') as HTMLButtonElement;
  const btnDown = document.getElementById('btn-down') as HTMLButtonElement;
  const btnLeft = document.getElementById('btn-left') as HTMLButtonElement;
  const btnRight = document.getElementById('btn-right') as HTMLButtonElement;
  
  // Attach event listeners for each button
  
  // UP BUTTON
  btnUp.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleMove('up');
  });
  btnUp.addEventListener('mousedown', () => handleMove('up'));
  
  // DOWN BUTTON
  btnDown.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleMove('down');
  });
  btnDown.addEventListener('mousedown', () => handleMove('down'));
  
  // LEFT BUTTON
  btnLeft.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleMove('left');
  });
  btnLeft.addEventListener('mousedown', () => handleMove('left'));
  
  // RIGHT BUTTON
  btnRight.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleMove('right');
  });
  btnRight.addEventListener('mousedown', () => handleMove('right'));
  
  /**
   * Handle a move attempt in a direction
   */
  function handleMove(direction: Direction) {
    onMove(direction);
  }
  
  console.log('🎮 Controls initialized');
}
