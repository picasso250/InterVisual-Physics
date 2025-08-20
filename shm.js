// my_physics_simulations/shm/shm.js

const canvas = document.getElementById('shmCanvas');
const ctx = canvas.getContext('2d');
const infoDiv = document.getElementById('info');

// Get control panel elements
const massSlider = document.getElementById('massSlider');
const massValueSpan = document.getElementById('massValue');
const springConstantSlider = document.getElementById('springConstantSlider');
const springConstantValueSpan = document.getElementById('springConstantValue');
const resetButton = document.getElementById('resetButton');

// Get data display elements
const timeSpan = document.getElementById('timeValue');
const positionSpan = document.getElementById('positionValue');
const velocitySpan = document.getElementById('velocityValue');
const accelerationSpan = document.getElementById('accelerationValue');
const kineticEnergySpan = document.getElementById('kineticEnergyValue');
const potentialEnergySpan = document.getElementById('potentialEnergyValue');
const totalEnergySpan = document.getElementById('totalEnergyValue');

// --- Physics Variables ---
let mass = 5; // kg
let springConstant = 2; // N/m
let positionX; // current position of the mass (center)
let velocityX = 0;
let accelerationX = 0;
let time = 0;
const dt = 0.05; // Time step for simulation (seconds per frame)

// --- Simulation Constants ---
const floorY = canvas.height * 0.7; // Y-coordinate of the floor/ground
const equilibriumXOffset = 200; // Offset from the left wall for equilibrium position
let equilibriumX; // Absolute X-coordinate of equilibrium position
const wallWidth = 20;
const wallHeight = 200;
const massWidth = 60;
const massHeight = 60;
const springCoilCount = 10; // Number of coils for spring drawing
const springCoilHeight = 15; // Height of each spring coil

// --- Animation state ---
let isAnimating = false; // Is the simulation running?
let isDragging = false; // Is the mass being dragged?
let dragOffsetX; // Offset from mass center to mouse pointer during drag
let animationFrameId; // To store requestAnimationFrame ID

// --- Arrow drawing parameters ---
const arrowHeadSize = 8;
const arrowHeadAngle = Math.PI / 6;
const forceScale = 0.5; // Scale for force arrow length
const velocityScale = 10; // Scale for velocity arrow length
const accelerationScale = 10; // Scale for acceleration arrow length
const maxArrowLength = 100; // Max length for dynamic arrows

// --- Helper: Draw an arrow ---
function drawArrow(x1, y1, x2, y2, color, lineWidth, label = null, labelOffsetX = 0, labelOffsetY = 0) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowHeadSize * Math.cos(angle - arrowHeadAngle), y2 - arrowHeadSize * Math.sin(angle - arrowHeadAngle));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowHeadSize * Math.cos(angle + arrowHeadAngle), y2 - arrowHeadSize * Math.sin(angle + arrowHeadAngle));
    ctx.stroke();

    if (label) {
        ctx.font = `bold 14px Segoe UI`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x2 + labelOffsetX, y2 + labelOffsetY);
    }
}

// --- Helper: Draw the spring ---
function drawSpring(startX, endX, y) {
    const springLength = endX - startX;
    if (springLength <= 0) return; // Don't draw if length is zero or negative

    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;

    // Wall attachment
    ctx.moveTo(startX, y);

    // Coils
    const coilSegmentLength = springLength / springCoilCount;
    for (let i = 0; i <= springCoilCount; i++) {
        const x = startX + i * coilSegmentLength;
        const offset = (i % 2 === 0) ? springCoilHeight : -springCoilHeight;
        if (i === 0 || i === springCoilCount) {
             // For start/end, make coils flat to connect to wall/mass
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y + offset);
        }
    }
    ctx.stroke();
}

// --- Canvas Resizing ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    equilibriumX = wallWidth + equilibriumXOffset;
    resetSimulation(false); // Reset without reinitializing physics params
}

// --- Reset Simulation State ---
function resetSimulation(resetParams = true) {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    isAnimating = false;
    isDragging = false;
    time = 0;

    if (resetParams) {
        mass = parseFloat(massSlider.value);
        springConstant = parseFloat(springConstantSlider.value);
    }

    // Default starting position for dragging
    positionX = equilibriumX + massWidth / 2 + 100; // Start a bit to the right of equilibrium
    velocityX = 0;
    accelerationX = 0;

    draw(); // Draw initial state
    updateDataDisplay(); // Update data display for initial state
    infoDiv.textContent = "拖拽振子设置初始位置，点击画布开始模拟。";
}

// --- Initialize Controls ---
function initializeControls() {
    massSlider.value = mass;
    springConstantSlider.value = springConstant;
    massValueSpan.textContent = mass.toFixed(1);
    springConstantValueSpan.textContent = springConstant.toFixed(1);

    massSlider.addEventListener('input', (e) => {
        mass = parseFloat(e.target.value);
        massValueSpan.textContent = mass.toFixed(1);
        // If not animating, just update display. If animating, next reset will use new value.
        if (!isAnimating) updateDataDisplay();
    });

    springConstantSlider.addEventListener('input', (e) => {
        springConstant = parseFloat(e.target.value);
        springConstantValueSpan.textContent = springConstant.toFixed(1);
        if (!isAnimating) updateDataDisplay();
    });

    resetButton.addEventListener('click', () => resetSimulation(true));
}

// --- Update Data Display ---
function updateDataDisplay() {
    // Calculate energies
    const displacement = positionX - equilibriumX;
    const kineticEnergy = 0.5 * mass * velocityX * velocityX;
    const potentialEnergy = 0.5 * springConstant * displacement * displacement;
    const totalEnergy = kineticEnergy + potentialEnergy;

    timeSpan.textContent = time.toFixed(2);
    positionSpan.textContent = displacement.toFixed(2); // Display displacement from equilibrium
    velocitySpan.textContent = velocityX.toFixed(2);
    accelerationSpan.textContent = accelerationX.toFixed(2);
    kineticEnergySpan.textContent = kineticEnergy.toFixed(2);
    potentialEnergySpan.textContent = potentialEnergy.toFixed(2);
    totalEnergySpan.textContent = totalEnergy.toFixed(2);
}

// --- Drawing Function ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the ground
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width, floorY);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the wall
    ctx.fillStyle = '#444';
    ctx.fillRect(0, floorY - wallHeight, wallWidth, wallHeight);

    // Draw equilibrium line
    ctx.beginPath();
    ctx.setLineDash([5, 5]); // Dashed line
    ctx.moveTo(equilibriumX, floorY - wallHeight);
    ctx.lineTo(equilibriumX, floorY);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
    ctx.font = '12px Arial';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('平衡位置', equilibriumX, floorY - wallHeight - 10);

    // Draw the spring
    const springAttachX = wallWidth;
    const springAttachY = floorY - massHeight / 2; // Attach to the center of the mass vertically
    drawSpring(springAttachX, positionX - massWidth / 2, springAttachY);

    // Draw the mass
    ctx.fillStyle = '#007bff';
    ctx.fillRect(positionX - massWidth / 2, floorY - massHeight, massWidth, massHeight);
    ctx.strokeStyle = '#0056b3';
    ctx.lineWidth = 2;
    ctx.strokeRect(positionX - massWidth / 2, floorY - massHeight, massWidth, massHeight);

    // Draw force arrow (F = ma)
    const force = mass * accelerationX;
    const forceArrowLength = Math.min(Math.abs(force) * forceScale, maxArrowLength);
    if (forceArrowLength > 0.1) {
        const forceDir = Math.sign(force);
        drawArrow(
            positionX, springAttachY + 20, // Start below mass
            positionX + forceDir * forceArrowLength, springAttachY + 20,
            '#dc3545', 2, 'F',
            forceDir * 10, // labelOffsetX
            (forceDir === 1 ? -15 : 15) // labelOffsetY (adjust if arrow is left/right)
        );
    }

    // Draw velocity arrow
    const velocityArrowLength = Math.min(Math.abs(velocityX) * velocityScale, maxArrowLength);
    if (velocityArrowLength > 0.1) {
        const velocityDir = Math.sign(velocityX);
        drawArrow(
            positionX, springAttachY - 20, // Start above mass
            positionX + velocityDir * velocityArrowLength, springAttachY - 20,
            '#28a745', 2, 'V',
            velocityDir * 10, // labelOffsetX
            (velocityDir === 1 ? -15 : 15) // labelOffsetY
        );
    }

    // Draw acceleration arrow
    const accelerationArrowLength = Math.min(Math.abs(accelerationX) * accelerationScale, maxArrowLength);
    if (accelerationArrowLength > 0.1) {
        const accelerationDir = Math.sign(accelerationX);
        drawArrow(
            positionX, springAttachY, // Start from mass center
            positionX + accelerationDir * accelerationArrowLength, springAttachY,
            '#ffc107', 2, 'A',
            accelerationDir * 10, // labelOffsetX
            (accelerationDir === 1 ? -15 : 15) // labelOffsetY
        );
    }

    updateDataDisplay();
}

// --- Physics Update ---
function update() {
    time += dt;

    const displacement = positionX - equilibriumX;
    // F = -kx, a = F/m = - (k/m) * x_displacement
    accelerationX = -(springConstant / mass) * displacement;

    // Euler integration (simple, but can accumulate error over time)
    velocityX += accelerationX * dt;
    positionX += velocityX * dt;

    // Stop if it goes off screen (shouldn't happen with ideal SHM, but as a safeguard)
    if (positionX < -massWidth || positionX > canvas.width + massWidth) {
        cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        infoDiv.textContent = "模拟结束 (振子移出屏幕)，点击重置。";
    }
}

// --- Animation Loop ---
function animate() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(animate);
}

// --- Mouse Events for Dragging ---
function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function handleMouseDown(event) {
    const mousePos = getMousePos(event);
    const massLeft = positionX - massWidth / 2;
    const massRight = positionX + massWidth / 2;
    const massTop = floorY - massHeight;
    const massBottom = floorY;

    // Check if mouse is within mass boundaries
    if (mousePos.x > massLeft && mousePos.x < massRight &&
        mousePos.y > massTop && mousePos.y < massBottom) {
        
        isDragging = true;
        cancelAnimationFrame(animationFrameId); // Stop animation if dragging
        isAnimating = false;
        velocityX = 0; // Reset velocity when dragging starts
        accelerationX = 0;
        time = 0; // Reset time if we're setting new initial conditions
        dragOffsetX = mousePos.x - positionX; // Calculate offset from center of mass

        infoDiv.textContent = "拖拽振子设置初始位置。";
    }
}

function handleMouseMove(event) {
    if (isDragging) {
        const mousePos = getMousePos(event);
        // Update mass position based on mouse X, maintaining offset
        // Ensure mass doesn't go through the wall
        positionX = Math.max(wallWidth + massWidth / 2, mousePos.x - dragOffsetX);
        draw(); // Redraw to show immediate drag effect
    }
}

function handleMouseUp() {
    if (isDragging) {
        isDragging = false;
        infoDiv.textContent = "点击画布开始模拟。";
        draw(); // Final draw after drag
        updateDataDisplay(); // Update data based on final drag position
    }
}

function handleCanvasClick() {
    if (!isAnimating && !isDragging) {
        isAnimating = true;
        infoDiv.textContent = "模拟进行中...";
        animate(); // Start animation
    } else if (isAnimating) {
        // If already animating, click can pause it
        cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        infoDiv.textContent = "模拟暂停。点击画布继续。";
    }
}


// --- Event Listeners ---
window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseUp); // End drag if mouse leaves canvas
canvas.addEventListener('click', handleCanvasClick); // Click to start/pause

// Initial setup
initializeControls();
resizeCanvas(); // Set initial canvas size and draw everything for the first time
resetSimulation(true); // Ensure initial state is correctly set and drawn on load