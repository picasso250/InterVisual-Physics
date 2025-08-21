// File: `projectile_motion.js`
import { drawArrow } from './drawing_utils.js';
import DataDisplay from './data_display.js';
import ControlsManager from './controls_manager.js'; // IMPORT NEW MODULE

const canvas = document.getElementById('gravityCanvas');
const ctx = canvas.getContext('2d');
const infoDiv = document.getElementById('info');
const controlsContainer = document.getElementById('controls'); // Renamed for clarity
const explanationDiv = document.getElementById('explanation');
const dataDisplayContainer = document.getElementById('dataDisplayContainer');

// REMOVE old slider/span element getters


// NEW: Read colors from CSS custom properties for canvas drawing
const style = getComputedStyle(document.documentElement);
const getColor = (varName) => style.getPropertyValue(varName).trim();
const colors = {
    vx: getColor('--color-vx'),
    vy: getColor('--color-vy'),
    v: getColor('--color-v'),
    g: getColor('--color-g'),
    trajectory: getColor('--border'),
    ground: getColor('--muted'),
    ballStroke: getColor('--text')
};

const displayFieldsConfig = [
    { key: 'time', label: '时间 (t)', className: 'color-g', initialValue: '0.0 s' },
    { key: 'vx', label: '水平速度 (Vx)', className: 'color-vx', initialValue: '0.00 m/s' },
    { key: 'vy', label: '垂直速度 (Vy)', className: 'color-vy', initialValue: '0.00 m/s' },
    { key: 'v', label: '合速度 (V)', className: 'color-v', initialValue: '0.00 m/s' },
    { key: 'height', label: '高度 (H)', initialValue: '0.00 m' },
    { key: 'distance', label: '水平距离 (X)', initialValue: '0.00 m' },
    { key: 'gravity', label: '重力加速度 (G)', className: 'color-g', initialValue: '0.00 m/s²' }
];

const dataDisplay = new DataDisplay(dataDisplayContainer, displayFieldsConfig);

let ball = { x: 0, y: 0, radius: 8 };
let gravity = 0.15;
let initialSpeed = 13;
const horizonOffset = 30;

const arrowHeadSize = 6;
const arrowHeadAngle = Math.PI / 6;
const gravityArrowLength = 30;
const speedScale = 3.5;
const maxSpeedArrowLength = 111;

let vx = 0;
let vy = 0;
let animationFrameId;
let isAnimating = false;
let isTimeReversalMode = false;
let ballHistory = [];
let historyIndex = 0;
let time = 0;
let minHistoryX = Infinity;
let maxHistoryX = -Infinity;


// --- Controls Setup ---
// ENHANCED: Add `unit` and `precision` for better display formatting in ControlsManager.
const controlsConfig = [
    { type: 'slider', key: 'gravity', label: '重力加速度:', min: 0.05, max: 0.5, step: 0.01, initialValue: gravity, unit: ' m/s²', precision: 2 },
    { type: 'slider', key: 'initialSpeed', label: '初始速度:', min: 5, max: 25, step: 1, initialValue: initialSpeed, unit: ' m/s', precision: 0 }
];

function onControlsUpdate(key, value) {
    if (key === 'gravity') {
        gravity = value;
        // Update data display immediately if not animating
        if (!isAnimating) updateDataDisplay();
    } else if (key === 'initialSpeed') {
        initialSpeed = value;
    }
}

const controlsManager = new ControlsManager(controlsContainer, controlsConfig, onControlsUpdate);

// REMOVE initializeControls() function


function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!isAnimating && !isTimeReversalMode) {
        ball.x = ball.radius + 30;
        ball.y = canvas.height - ball.radius - horizonOffset;
        draw();
    } else if (isTimeReversalMode) {
        if (ballHistory.length > 0) {
            handleMouseMove({ clientX: ball.x });
        }
    } else {
        draw();
    }
}

function resetBall() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    isAnimating = true;
    isTimeReversalMode = false;
    ballHistory = [];
    historyIndex = 0;
    time = 0;
    minHistoryX = Infinity;
    maxHistoryX = -Infinity;
    ball.x = ball.radius + 30;
    ball.y = canvas.height - ball.radius - horizonOffset;
    
    // Use the manager to get the latest value
    const currentInitialSpeed = controlsManager.getValue('initialSpeed');
    vx = currentInitialSpeed * Math.cos(Math.PI / 4);
    vy = -currentInitialSpeed * Math.sin(Math.PI / 4);
    
    infoDiv.textContent = "点击任意位置重新开始";
    document.querySelectorAll('.ui-panel').forEach(p => p.classList.remove('hidden'));
    explanationDiv.classList.add('hidden');
    animate();
}

function updateDataDisplay() {
    // gravityValueSpan.textContent = gravity.toFixed(2); // REMOVE
    const currentGravity = controlsManager.getValue('gravity'); // GET from manager
    const currentHeightRaw = (canvas.height - horizonOffset) - (ball.y + ball.radius);
    const initialBallX = ball.radius + 30;
    const currentDistanceRaw = ball.x - initialBallX;
    const combinedSpeedRaw = Math.sqrt(vx * vx + vy * vy);
    const dataToDisplay = {
        time: time.toFixed(1) + ' s',
        vx: vx.toFixed(2) + ' m/s',
        vy: vy.toFixed(2) + ' m/s',
        v: combinedSpeedRaw.toFixed(2) + ' m/s',
        height: Math.max(0, currentHeightRaw).toFixed(2) + ' m',
        distance: Math.max(0, currentDistanceRaw).toFixed(2) + ' m',
        gravity: currentGravity.toFixed(2) + ' m/s²' // Use value from manager
    };
    dataDisplay.update(dataToDisplay);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(0, canvas.height - horizonOffset);
    ctx.lineTo(canvas.width, canvas.height - horizonOffset);
    ctx.strokeStyle = colors.ground; // THEMED
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();

    if (isTimeReversalMode && ballHistory.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = colors.trajectory; // THEMED
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(ballHistory[0].x, ballHistory[0].y);
        for (let i = 1; i < ballHistory.length; i++) {
            ctx.lineTo(ballHistory[i].x, ballHistory[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = style.getPropertyValue('--panel').trim(); // THEMED
    ctx.fill();
    ctx.strokeStyle = colors.ballStroke; // THEMED
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.closePath();

    drawArrow(ctx, ball.x, ball.y, ball.x, ball.y + gravityArrowLength, colors.g, 1.5, arrowHeadSize, arrowHeadAngle, 'G', 15, 0); // THEMED

    if (!isTimeReversalMode) {
        const speedMagnitude = Math.sqrt(vx * vx + vy * vy);
        if (speedMagnitude > 0.1) {
            const len = Math.min(speedMagnitude * speedScale, maxSpeedArrowLength);
            const angle = Math.atan2(vy, vx);
            const tipX = ball.x + len * Math.cos(angle);
            const tipY = ball.y + len * Math.sin(angle);
            let vLabelOffsetY = (vy > 0 && Math.abs(vx) < 0.5) ? 15 : -15;
            drawArrow(ctx, ball.x, ball.y, tipX, tipY, colors.v, 1.5, arrowHeadSize, arrowHeadAngle, 'V', 0, vLabelOffsetY); // THEMED
        }
    } else {
        const scaledVx = Math.min(Math.abs(vx) * speedScale, maxSpeedArrowLength) * Math.sign(vx);
        const scaledVy = Math.min(Math.abs(vy) * speedScale, maxSpeedArrowLength) * Math.sign(vy);

        const pBall = { x: ball.x, y: ball.y };
        const pEndVx = { x: pBall.x + scaledVx, y: pBall.y };
        const pEndVy = { x: pBall.x + scaledVx, y: pBall.y + scaledVy };

        if (Math.abs(vx) > 0.1) drawArrow(ctx, pBall.x, pBall.y, pEndVx.x, pEndVx.y, colors.vx, 1.5, arrowHeadSize, arrowHeadAngle, 'Vx', 0, vy < 0 ? 15 : -15); // THEMED
        if (Math.abs(vy) > 0.1) drawArrow(ctx, pEndVx.x, pEndVx.y, pEndVy.x, pEndVy.y, colors.vy, 1.5, arrowHeadSize, arrowHeadAngle, 'Vy', 15, 0); // THEMED
        if (Math.sqrt(vx * vx + vy * vy) > 0.1) drawArrow(ctx, pBall.x, pBall.y, pEndVy.x, pEndVy.y, colors.v, 1.5, arrowHeadSize, arrowHeadAngle, 'V', 0, vy < 0 ? -15 : 15); // THEMED
    }
    updateDataDisplay();
}

function update() {
    time++;
    ballHistory.push({ x: ball.x, y: ball.y, vx: vx, vy: vy, time: time });
    vy += gravity;
    ball.x += vx;
    ball.y += vy;

    if (ball.y + ball.radius >= canvas.height - horizonOffset) {
        ball.y = canvas.height - horizonOffset - ball.radius;
        ballHistory.push({ x: ball.x, y: ball.y, vx: 0, vy: 0, time: time });
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        isTimeReversalMode = true;
        vx = 0;
        vy = 0;
        historyIndex = ballHistory.length - 1;
        minHistoryX = Math.min(...ballHistory.map(p => p.x));
        maxHistoryX = Math.max(...ballHistory.map(p => p.x));
        infoDiv.textContent = "时间回溯：移动鼠标查看速度分解";
        // document.querySelectorAll('.ui-panel').forEach(p => p.classList.add('hidden'));
        explanationDiv.classList.remove('hidden');
        dataDisplayContainer.classList.remove('hidden');
        draw();
        return;
    }

    if (ball.x > canvas.width + ball.radius * 2 || ball.x < -ball.radius * 2) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        isTimeReversalMode = false;
        ballHistory = [];
        time = 0;
        minHistoryX = Infinity;
        maxHistoryX = -Infinity;
        infoDiv.textContent = "小球飞出屏幕，点击重新开始";
        draw();
    }
}

function animate() {
    if (isAnimating) {
        update();
        if (!isTimeReversalMode) {
            draw();
            animationFrameId = requestAnimationFrame(animate);
        }
    }
}

function handleMouseMove(event) {
    if (!isTimeReversalMode || ballHistory.length === 0) return;
    const desiredBallX = Math.max(0, Math.min(event.clientX, canvas.width));
    let closestIndex = 0;
    if (minHistoryX !== maxHistoryX) {
        let minDiff = Infinity;
        for (let i = 0; i < ballHistory.length; i++) {
            const diff = Math.abs(ballHistory[i].x - desiredBallX);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }
    } else {
        closestIndex = ballHistory.length - 1;
    }
    historyIndex = closestIndex;
    const state = ballHistory[historyIndex];
    Object.assign(ball, { x: state.x, y: state.y });
    vx = state.vx;
    vy = state.vy;
    time = state.time;
    draw();
}

// UPDATE event listeners section

document.addEventListener('click', () => resetBall());
window.addEventListener('resize', resizeCanvas);
document.addEventListener('mousemove', handleMouseMove);

// REMOVE old slider event listeners

// Initial setup calls
resizeCanvas();
updateDataDisplay();