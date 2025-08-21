// my_physics_simulations/shm/shm.js
import { drawArrow } from './drawing_utils.js';
import DataDisplay from './data_display.js';
import ControlsManager from './controls_manager.js'; // IMPORT NEW MODULE

const canvas = document.getElementById('shmCanvas');
const ctx = canvas.getContext('2d');
const infoDiv = document.getElementById('info');
const controlsContainer = document.getElementById('controls'); // Get controls container
const dataDisplayContainer = document.getElementById('dataDisplay');

// REMOVE old slider/span element getters

// NEW: Read colors from CSS custom properties for canvas drawing
const style = getComputedStyle(document.documentElement);
const getColor = (varName) => style.getPropertyValue(varName).trim();
const colors = {
    displacement: getColor('--color-x'),
    velocity: getColor('--color-v'),
    acceleration: getColor('--color-a'),
    force: getColor('--color-f'),
    time: getColor('--color-time'),
    ground: getColor('--muted'),
    wall: getColor('--text'),
    spring: getColor('--muted'),
    massFill: getColor('--panel'),
    massStroke: getColor('--text'),
    equilibrium: getColor('--border')
};


const dataDisplayConfig = [
    { key: 'time', label: '时间 (t)', className: 'color-time', initialValue: '0.00 s' },
    { key: 'displacement', label: '位置 (X)', className: 'color-x', initialValue: '0.00 m' },
    { key: 'velocity', label: '速度 (V)', className: 'color-v', initialValue: '0.00 m/s' },
    { key: 'acceleration', label: '加速度 (A)', className: 'color-a', initialValue: '0.00 m/s²' },
    { key: 'force', label: '力 (F)', className: 'color-f', initialValue: '0.00 N' }
];
const dataDisplay = new DataDisplay(dataDisplayContainer, dataDisplayConfig);


// --- 物理变量 ---
let mass = 5; // kg
let springConstant = 2; // N/m
let positionX; // 质量块的当前位置 (中心)
let velocityX = 0;
let accelerationX = 0;
let time = 0;
const dt = 0.05; // 模拟的时间步长 (每帧秒数)

// --- Controls Setup ---
const controlsConfig = [
    { type: 'title', text: '简谐运动控制' },
    { type: 'slider', key: 'mass', label: '质量 (m):', min: 0.5, max: 10, step: 0.1, initialValue: mass, unit: ' kg', precision: 1 },
    { type: 'slider', key: 'springConstant', label: '弹簧常数 (k):', min: 0.1, max: 10, step: 0.1, initialValue: springConstant, unit: ' N/m', precision: 1 },
    { type: 'button', text: '重置', onClick: () => resetSimulation(true) }
];

function onControlsUpdate(key, value) {
    if (key === 'mass') {
        mass = value;
    } else if (key === 'springConstant') {
        springConstant = value;
    }

    // Update simulation state if not currently running
    if (!isAnimating) {
        const currentDisplacement = positionX - equilibriumX;
        accelerationX = -(springConstant / mass) * currentDisplacement;
        draw();
    }
    updateDataDisplay(); // Always update display
}

const controlsManager = new ControlsManager(controlsContainer, controlsConfig, onControlsUpdate);

// --- 模拟常量 ---
const floorY = canvas.height * 0.7;
let equilibriumX;
const wallWidth = 20;
const wallHeight = 200;
const massWidth = 60;
const massHeight = 60;
const springCoilCount = 20;
const springCoilHeight = 15;

// --- 动画状态 ---
let isAnimating = false;
let isDragging = false;
let dragOffsetX;
let animationFrameId;

// --- 箭头绘图参数 ---
const arrowHeadSize = 8;
const arrowHeadAngle = Math.PI / 6;
const forceScale = 0.5;
const velocityScale = 0.5;
const accelerationScale = 2;
const maxArrowLength = 600;
const arrowLabelFixedYOffset = -5;
const arrowLabelMagnitudeXOffset = 10;
const ARROW_DRAW_THRESHOLD = 0.001;

// --- 图表常量和变量 (No changes here) ---
const graphHeight = 200;
const displacementGraphScale = 1;
const velocityGraphScale = 1.5;
const accelerationGraphScale = 2.5;
const forceGraphScale = 0.5;
const timeScale = 50;

let displacementHistory = [];
let velocityHistory = [];
let accelerationHistory = [];
let forceHistory = [];
let timeHistory = [];


// --- 辅助函数：绘制弹簧 (Updated to use themed color) ---
function drawSpring(startX, endX, y) {
    const springLength = endX - startX;
    if (springLength <= 0) return;

    ctx.beginPath();
    ctx.strokeStyle = colors.spring; // THEMED
    ctx.lineWidth = 2;
    ctx.moveTo(startX, y);

    const coilSegmentLength = springLength / springCoilCount;
    for (let i = 0; i <= springCoilCount; i++) {
        const x = startX + i * coilSegmentLength;
        const offset = (i % 2 === 0) ? springCoilHeight : -springCoilHeight;
        if (i === 0 || i === springCoilCount) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y + offset);
        }
    }
    ctx.stroke();
}

// --- 辅助函数：绘制虚线 (Updated to use themed color by default) ---
function drawDashedLine(ctx, x1, y1, x2, y2, dash = [], color = colors.equilibrium, width = 1) {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
}


// --- 绘制图表函数 (Updated to use themed colors) ---
function drawGraphs() {
    const timeGraphOriginX = wallWidth;
    const timeGraphEndX = canvas.width * (2 / 3);
    const timeGraphCenterY = canvas.height / 2;
    const currentGraphPlotWidth = timeGraphEndX - timeGraphOriginX;
    if (currentGraphPlotWidth <= 0) return;

    drawDashedLine(ctx, timeGraphOriginX, timeGraphCenterY, timeGraphEndX, timeGraphCenterY, [], colors.ground, 1);
    drawDashedLine(ctx, timeGraphEndX, timeGraphCenterY - graphHeight / 2, timeGraphEndX, timeGraphCenterY + graphHeight / 2, [5, 5], colors.equilibrium, 1);

    ctx.font = '14px Segoe UI';
    ctx.fillStyle = colors.ground;
    ctx.textAlign = 'center';
    ctx.fillText('时间 (s)', timeGraphEndX + 40, timeGraphCenterY);
    ctx.fillText('当前时间', timeGraphEndX, timeGraphCenterY + 20);

    ctx.textAlign = 'left';
    ctx.font = '12px Segoe UI';
    const labelXOffsetFromEnd = 10;
    const labelYOffsetStart = timeGraphCenterY - graphHeight / 2;
    ctx.fillStyle = colors.displacement; ctx.fillText('x', timeGraphEndX + labelXOffsetFromEnd, labelYOffsetStart + 20);
    ctx.fillStyle = colors.velocity; ctx.fillText('v', timeGraphEndX + labelXOffsetFromEnd, labelYOffsetStart + 40);
    ctx.fillStyle = colors.acceleration; ctx.fillText('a', timeGraphEndX + labelXOffsetFromEnd, labelYOffsetStart + 60);
    ctx.fillStyle = colors.force; ctx.fillText('F', timeGraphEndX + labelXOffsetFromEnd, labelYOffsetStart + 80);

    ctx.lineWidth = 1.5;
    const maxVisibleTimeSpan = currentGraphPlotWidth / timeScale;
    const minTimeToShow = time - maxVisibleTimeSpan;
    let startIndex = 0;
    while (startIndex < timeHistory.length && timeHistory[startIndex] < minTimeToShow) {
        startIndex++;
    }

    if (timeHistory.length - startIndex > 1) {
        const drawCurve = (dataArray, scale, color) => {
            ctx.strokeStyle = color;
            ctx.beginPath();
            let firstPointDrawn = false;
            for (let i = startIndex; i < timeHistory.length; i++) {
                const x = timeGraphEndX - (time - timeHistory[i]) * timeScale;
                const y = timeGraphCenterY - dataArray[i] * scale;
                if (!firstPointDrawn) { ctx.moveTo(x, y); firstPointDrawn = true; }
                else { ctx.lineTo(x, y); }
            }
            ctx.stroke();
        };
        drawCurve(displacementHistory, displacementGraphScale, colors.displacement);
        drawCurve(velocityHistory, velocityGraphScale, colors.velocity);
        drawCurve(accelerationHistory, accelerationGraphScale, colors.acceleration);
        drawCurve(forceHistory, forceGraphScale, colors.force);
    }
    
    if (timeHistory.length > 0) {
        const currentPointX = timeGraphEndX;
        const latestDisplacement = displacementHistory[displacementHistory.length - 1];
        const latestVelocity = velocityHistory[velocityHistory.length - 1];
        const latestAcceleration = accelerationHistory[accelerationHistory.length - 1];
        const latestForce = forceHistory[forceHistory.length - 1];
        const pointRadius = 4;
        const drawPoint = (value, scale, color) => {
            const y = timeGraphCenterY - value * scale;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(currentPointX, y, pointRadius, 0, Math.PI * 2);
            ctx.fill();
        };
        drawPoint(latestDisplacement, displacementGraphScale, colors.displacement);
        drawPoint(latestVelocity, velocityGraphScale, colors.velocity);
        drawPoint(latestAcceleration, accelerationGraphScale, colors.acceleration);
        drawPoint(latestForce, forceGraphScale, colors.force);
    }
}


function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    equilibriumX = canvas.width / 3;
    resetSimulation(false);
}

function resetSimulation(resetParams = true) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    isAnimating = false;
    isDragging = false;
    time = 0;

    displacementHistory = [];
    velocityHistory = [];
    accelerationHistory = [];
    forceHistory = [];
    timeHistory = [];

    if (resetParams) {
        // These variables are now the source of truth, updated by ControlsManager
        mass = controlsManager.getValue('mass');
        springConstant = controlsManager.getValue('springConstant');
    }

    const L0 = equilibriumX - wallWidth;
    if (L0 > 0) { positionX = equilibriumX + Math.min(100, 0.5 * L0); }
    else { positionX = equilibriumX + 50; }
    positionX = Math.max(positionX, wallWidth + massWidth / 2);
    velocityX = 0;
    const initialDisplacement = positionX - equilibriumX;
    accelerationX = -(springConstant / mass) * initialDisplacement;

    draw();
    updateDataDisplay();
    infoDiv.textContent = "拖拽振子设置初始位置，点击画布开始模拟。";
}


// REMOVE initializeControls() function

function updateDataDisplay() {
    const displacement = positionX - equilibriumX;
    const currentForce = -springConstant * displacement;
    dataDisplay.update({
        time: time.toFixed(2) + ' s',
        displacement: displacement.toFixed(2) + ' m',
        velocity: velocityX.toFixed(2) + ' m/s',
        acceleration: accelerationX.toFixed(2) + ' m/s²',
        force: currentForce.toFixed(2) + ' N'
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width, floorY);
    ctx.strokeStyle = colors.ground;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = colors.wall;
    ctx.fillRect(0, floorY - wallHeight, wallWidth, wallHeight);

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(equilibriumX, floorY - wallHeight);
    ctx.lineTo(equilibriumX, floorY);
    ctx.strokeStyle = colors.equilibrium;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '12px Segoe UI';
    ctx.fillStyle = colors.muted;
    ctx.textAlign = 'center';
    ctx.fillText('平衡位置', equilibriumX, floorY - wallHeight - 10);

    const springAttachX = wallWidth;
    const springAttachY = floorY - massHeight / 2;
    drawSpring(springAttachX, positionX - massWidth / 2, springAttachY);

    ctx.fillStyle = colors.massFill;
    ctx.fillRect(positionX - massWidth / 2, floorY - massHeight, massWidth, massHeight);
    ctx.strokeStyle = colors.massStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(positionX - massWidth / 2, floorY - massHeight, massWidth, massHeight);

    const displacementForForce = positionX - equilibriumX;
    const force = -springConstant * displacementForForce;
    if (Math.abs(force) > ARROW_DRAW_THRESHOLD) {
        const forceDir = Math.sign(force);
        const forceArrowLength = Math.min(Math.max(2, Math.abs(force) * forceScale), maxArrowLength);
        drawArrow(ctx, positionX, springAttachY + 20, positionX + forceDir * forceArrowLength, springAttachY + 20, colors.force, 2, arrowHeadSize, arrowHeadAngle, 'F', forceDir * arrowLabelMagnitudeXOffset, arrowLabelFixedYOffset);
    }
    if (Math.abs(velocityX) > ARROW_DRAW_THRESHOLD) {
        const velocityDir = Math.sign(velocityX);
        const velocityArrowLength = Math.min(Math.max(2, Math.abs(velocityX) * velocityScale), maxArrowLength);
        drawArrow(ctx, positionX, springAttachY - 20, positionX + velocityDir * velocityArrowLength, springAttachY - 20, colors.velocity, 2, arrowHeadSize, arrowHeadAngle, 'v', velocityDir * arrowLabelMagnitudeXOffset, arrowLabelFixedYOffset);
    }
    if (Math.abs(accelerationX) > ARROW_DRAW_THRESHOLD) {
        const accelerationDir = Math.sign(accelerationX);
        const accelerationArrowLength = Math.min(Math.max(2, Math.abs(accelerationX) * accelerationScale), maxArrowLength);
        drawArrow(ctx, positionX, springAttachY, positionX + accelerationDir * accelerationArrowLength, springAttachY, colors.acceleration, 2, arrowHeadSize, arrowHeadAngle, 'a', accelerationDir * arrowLabelMagnitudeXOffset, arrowLabelFixedYOffset);
    }

    drawGraphs();
    updateDataDisplay();
}

// --- The rest of the JS file remains unchanged ---

function update() {
    time += dt;
    const displacement = positionX - equilibriumX;
    accelerationX = -(springConstant / mass) * displacement;
    velocityX += accelerationX * dt;
    positionX += velocityX * dt;

    const currentForce = -springConstant * displacement;
    displacementHistory.push(displacement);
    velocityHistory.push(velocityX);
    accelerationHistory.push(accelerationX);
    forceHistory.push(currentForce);
    timeHistory.push(time);

    const graphTrimOriginX = wallWidth;
    const graphTrimEndX = canvas.width * (2 / 3);
    const effectiveGraphWidthForTrimming = graphTrimEndX - graphTrimOriginX;
    const maxVisibleTimeSpan = effectiveGraphWidthForTrimming / timeScale;
    const minTimeToShow = time - maxVisibleTimeSpan - dt * 2;
    while (timeHistory.length > 0 && timeHistory[0] < minTimeToShow) {
        displacementHistory.shift();
        velocityHistory.shift();
        accelerationHistory.shift();
        forceHistory.shift();
        timeHistory.shift();
    }

    if (positionX < -massWidth || positionX > canvas.width + massWidth) {
        cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        infoDiv.textContent = "模拟结束 (振子移出屏幕)，点击重置。";
    }
}

function animate() {
    update();
    draw();
    if (isAnimating) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function handleMouseDown(event) {
    const mousePos = getMousePos(event);
    const massLeft = positionX - massWidth / 2;
    const massRight = positionX + massWidth / 2;
    const massTop = floorY - massHeight;
    const massBottom = floorY;
    if (mousePos.x > massLeft && mousePos.x < massRight && mousePos.y > massTop && mousePos.y < massBottom) {
        isDragging = true;
        cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        velocityX = 0;
        accelerationX = 0;
        time = 0;
        dragOffsetX = mousePos.x - positionX;
        infoDiv.textContent = "拖拽振子设置初始位置。";
    }
}

function handleMouseMove(event) {
    if (isDragging) {
        const mousePos = getMousePos(event);
        let desiredPositionX = mousePos.x - dragOffsetX;
        const L0 = equilibriumX - wallWidth;
        const wallCollisionLimitX = wallWidth + massWidth / 2;
        const maxStretchDisplacement = 2 * L0;
        const maxCompressionDisplacement = Math.min(maxStretchDisplacement, equilibriumX - wallCollisionLimitX);
        const maxAllowedX = equilibriumX + L0 - massWidth / 2;
        const minAllowedX = equilibriumX - maxCompressionDisplacement;
        let finalPositionX = desiredPositionX;
        let stopDrag = false;
        let message = "";

        if (desiredPositionX > maxAllowedX) {
            finalPositionX = maxAllowedX;
            stopDrag = true;
            message = "警告：拉伸量超过限制，拖拽停止！";
        } else if (desiredPositionX < minAllowedX) {
            finalPositionX = minAllowedX;
            stopDrag = true;
            if (Math.abs(finalPositionX - wallCollisionLimitX) < 0.001) {
                message = "警告：振子不能穿透墙壁，拖拽停止！";
            }
        }
        
        positionX = finalPositionX;
        const currentDisplacement = positionX - equilibriumX;
        accelerationX = -(springConstant / mass) * currentDisplacement;

        if (stopDrag) {
            isDragging = false;
            infoDiv.textContent = message;
            velocityX = 0;
        }
        draw();
    }
}

function handleMouseUp() {
    if (isDragging) {
        isDragging = false;
        infoDiv.textContent = "点击画布开始模拟。";
        const currentDisplacement = positionX - equilibriumX;
        accelerationX = -(springConstant / mass) * currentDisplacement;
        draw();
        updateDataDisplay();
    }
}

function handleCanvasClick() {
    if (!isAnimating && !isDragging) {
        isAnimating = true;
        infoDiv.textContent = "模拟进行中...";
        animate();
    } else if (isAnimating) {
        cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        infoDiv.textContent = "模拟暂停。点击画布继续。";
    }
}

window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseUp);
canvas.addEventListener('click', handleCanvasClick);

// REMOVE initializeControls() call

// Initial setup calls
resizeCanvas();
resetSimulation(true);