// my_physics_simulations/shm/shm.js

// 导入通用的绘图工具函数
import { drawArrow } from './drawing_utils.js'; // 确保路径正确

const canvas = document.getElementById('shmCanvas');
const ctx = canvas.getContext('2d');
const infoDiv = document.getElementById('info');

// 获取控制面板元素
const massSlider = document.getElementById('massSlider');
const massValueSpan = document.getElementById('massValue');
const springConstantSlider = document.getElementById('springConstantSlider');
const springConstantValueSpan = document.getElementById('springConstantValue');
const resetButton = document.getElementById('resetButton');

// 获取实时数据面板元素
const timeSpan = document.getElementById('timeValue');
const positionSpan = document.getElementById('positionValue');
const velocitySpan = document.getElementById('velocityValue');
const accelerationSpan = document.getElementById('accelerationValue');
const kineticEnergySpan = document.getElementById('kineticEnergyValue');
const potentialEnergySpan = document.getElementById('potentialEnergyValue');
const totalEnergySpan = document.getElementById('totalEnergyValue');

// --- 物理变量 ---
let mass = 5; // kg
let springConstant = 2; // N/m
let positionX; // 质量块的当前位置 (中心)
let velocityX = 0;
let accelerationX = 0;
let time = 0;
const dt = 0.05; // 模拟的时间步长 (每帧秒数)

// --- 模拟常量 ---
const floorY = canvas.height * 0.7; // 地面/地板的Y坐标
// const equilibriumXOffset = 200; // 距离左墙壁的平衡位置偏移量 // 已移除，平衡位置现在基于屏幕宽度
let equilibriumX; // 平衡位置的绝对X坐标
const wallWidth = 20;
const wallHeight = 200;
const massWidth = 60;
const massHeight = 60;
const springCoilCount = 10; // 弹簧线圈的数量
const springCoilHeight = 15; // 每个弹簧线圈的高度

// --- 动画状态 ---
let isAnimating = false; // 模拟是否正在运行
let isDragging = false; // 质量块是否正在被拖拽
let dragOffsetX; // 拖拽时鼠标指针到质量块中心的偏移量
let animationFrameId; // 存储 requestAnimationFrame 的ID

// --- 箭头绘图参数 ---
const arrowHeadSize = 8;
const arrowHeadAngle = Math.PI / 6;
const forceScale = 0.5; // 力箭头长度的比例
const velocityScale = 0.5; // 速度箭头长度的比例
const accelerationScale = 2; // 加速度箭头长度的比例
const maxArrowLength = 600; // 动态箭头的最大长度
const arrowLabelFixedYOffset = -5; // 箭头标签固定的Y方向偏移量 (负值表示在箭头上方)
const arrowLabelMagnitudeXOffset = 10; // 箭头标签X方向偏移的绝对值

// --- 箭头绘制阈值 ---
const ARROW_DRAW_THRESHOLD = 0.001; // 如果力的绝对值小于此阈值，则不绘制箭头

// --- 辅助函数：绘制弹簧 ---
function drawSpring(startX, endX, y) {
    const springLength = endX - startX;
    if (springLength <= 0) return; // 如果长度为零或负，则不绘制

    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;

    // 连接到墙壁
    ctx.moveTo(startX, y);

    // 线圈
    const coilSegmentLength = springLength / springCoilCount;
    for (let i = 0; i <= springCoilCount; i++) {
        const x = startX + i * coilSegmentLength;
        const offset = (i % 2 === 0) ? springCoilHeight : -springCoilHeight;
        if (i === 0 || i === springCoilCount) {
             // 对于起点/终点，线圈变平以连接到墙壁/质量块
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y + offset);
        }
    }
    ctx.stroke();
}

// --- 画布大小调整 ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // 更新：平衡线应该在屏幕1/3处
    equilibriumX = canvas.width / 3;
    resetSimulation(false); // 重置，但不重新初始化物理参数
}

// --- 重置模拟状态 ---
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

    // 设置拖拽的默认起始位置，确保在合理范围内
    const L0 = equilibriumX - wallWidth; // 弹簧的自然长度 (墙壁到平衡位置的距离)
    // 初始位置设为平衡位置右侧，或平衡位置与墙壁距离的某个比例 (避免初始化时就超出拖拽限制)
    if (L0 > 0) {
        positionX = equilibriumX + Math.min(100, 0.5 * L0); // 初始位移为100px或0.5*L0，取较小值
    } else { 
        positionX = equilibriumX + 50; // 备用值
    }
    
    // 确保初始位置不会让质量块穿透墙壁
    positionX = Math.max(positionX, wallWidth + massWidth / 2);

    velocityX = 0;
    // 根据新的 positionX 计算初始加速度
    const initialDisplacement = positionX - equilibriumX;
    accelerationX = -(springConstant / mass) * initialDisplacement;

    draw(); // 绘制初始状态
    updateDataDisplay(); // 更新初始状态的数据显示
    infoDiv.textContent = "拖拽振子设置初始位置，点击画布开始模拟。";
}

// --- 初始化控制器 ---
function initializeControls() {
    massSlider.value = mass;
    springConstantSlider.value = springConstant;
    massValueSpan.textContent = mass.toFixed(1);
    springConstantValueSpan.textContent = springConstant.toFixed(1);

    massSlider.addEventListener('input', (e) => {
        mass = parseFloat(e.target.value);
        massValueSpan.textContent = mass.toFixed(1);
        // 如果没有在动画，只更新显示。如果在动画，下一次重置会使用新值。
        // 但为了让改变立即生效在静止状态，需要重新计算加速度并绘制
        if (!isAnimating) {
            const currentDisplacement = positionX - equilibriumX;
            accelerationX = -(springConstant / mass) * currentDisplacement; // 重新计算加速度
            draw(); // 重新绘制
        }
        updateDataDisplay();
    });

    springConstantSlider.addEventListener('input', (e) => {
        springConstant = parseFloat(e.target.value);
        springConstantValueSpan.textContent = springConstant.toFixed(1);
        // 如果没有在动画，只更新显示。为了让改变立即生效在静止状态，需要重新计算加速度并绘制
        if (!isAnimating) {
            const currentDisplacement = positionX - equilibriumX;
            accelerationX = -(springConstant / mass) * currentDisplacement; // 重新计算加速度
            draw(); // 重新绘制
        }
        updateDataDisplay();
    });

    resetButton.addEventListener('click', () => resetSimulation(true));
}

// --- 更新数据面板 ---
function updateDataDisplay() {
    // 计算能量
    const displacement = positionX - equilibriumX;
    const kineticEnergy = 0.5 * mass * velocityX * velocityX;
    const potentialEnergy = 0.5 * springConstant * displacement * displacement;
    const totalEnergy = kineticEnergy + potentialEnergy;

    timeSpan.textContent = time.toFixed(2);
    positionSpan.textContent = displacement.toFixed(2); // 显示相对于平衡位置的位移
    velocitySpan.textContent = velocityX.toFixed(2);
    accelerationSpan.textContent = accelerationX.toFixed(2);
    kineticEnergySpan.textContent = kineticEnergy.toFixed(2);
    potentialEnergySpan.textContent = potentialEnergy.toFixed(2);
    totalEnergySpan.textContent = totalEnergy.toFixed(2);
}

// --- 绘图函数 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制地面
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width, floorY);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制墙壁
    ctx.fillStyle = '#444';
    ctx.fillRect(0, floorY - wallHeight, wallWidth, wallHeight);

    // 绘制平衡线
    ctx.beginPath();
    ctx.setLineDash([5, 5]); // 虚线
    ctx.moveTo(equilibriumX, floorY - wallHeight);
    ctx.lineTo(equilibriumX, floorY);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]); // 重置实线
    ctx.font = '12px Arial';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('平衡位置', equilibriumX, floorY - wallHeight - 10);

    // 绘制弹簧
    const springAttachX = wallWidth;
    const springAttachY = floorY - massHeight / 2; // 垂直连接到质量块的中心
    drawSpring(springAttachX, positionX - massWidth / 2, springAttachY);

    // 绘制质量块
    ctx.fillStyle = '#CCCCCC'; // 浅灰色内核
    ctx.fillRect(positionX - massWidth / 2, floorY - massHeight, massWidth, massHeight);
    ctx.strokeStyle = '#000000'; // 黑色边框
    ctx.lineWidth = 2;
    ctx.strokeRect(positionX - massWidth / 2, floorY - massHeight, massWidth, massHeight);

    // 绘制力箭头 (F = ma)
    const force = mass * accelerationX;
    // 当力的绝对值大于阈值时才绘制箭头
    if (Math.abs(force) > ARROW_DRAW_THRESHOLD) {
        const forceDir = Math.sign(force); // 方向：1 (右), -1 (左), 0 (无)
        const forceArrowLength = Math.min(Math.max(2, Math.abs(force) * forceScale), maxArrowLength); 
        drawArrow(
            ctx,
            positionX, springAttachY + 20, // 箭头起点：质量块下方
            positionX + forceDir * forceArrowLength, springAttachY + 20, // 箭头终点
            '#dc3545', 2,
            arrowHeadSize, arrowHeadAngle,
            'F', // 标签
            forceDir * arrowLabelMagnitudeXOffset, // 标签X偏移，根据方向调整
            arrowLabelFixedYOffset // 标签Y偏移，固定值
        );
    }

    // 绘制速度箭头
    // 当速度的绝对值大于阈值时才绘制箭头
    if (Math.abs(velocityX) > ARROW_DRAW_THRESHOLD) {
        const velocityDir = Math.sign(velocityX); // 方向：1 (右), -1 (左), 0 (无)
        const velocityArrowLength = Math.min(Math.max(2, Math.abs(velocityX) * velocityScale), maxArrowLength);
        drawArrow(
            ctx,
            positionX, springAttachY - 20, // 箭头起点：质量块上方
            positionX + velocityDir * velocityArrowLength, springAttachY - 20, // 箭头终点
            '#28a745', 2,
            arrowHeadSize, arrowHeadAngle,
            'v', // 标签 (小写)
            velocityDir * arrowLabelMagnitudeXOffset, // 标签X偏移，根据方向调整
            arrowLabelFixedYOffset // 标签Y偏移，固定值
        );
    }

    // 绘制加速度箭头
    // 当加速度的绝对值大于阈值时才绘制箭头
    if (Math.abs(accelerationX) > ARROW_DRAW_THRESHOLD) {
        const accelerationDir = Math.sign(accelerationX); // 方向：1 (右), -1 (左), 0 (无)
        const accelerationArrowLength = Math.min(Math.max(2, Math.abs(accelerationX) * accelerationScale), maxArrowLength);
        drawArrow(
            ctx,
            positionX, springAttachY, // 箭头起点：质量块中心
            positionX + accelerationDir * accelerationArrowLength, springAttachY, // 箭头终点
            '#ffc107', 2,
            arrowHeadSize, arrowHeadAngle,
            'a', // 标签 (小写)
            accelerationDir * arrowLabelMagnitudeXOffset, // 标签X偏移，根据方向调整
            arrowLabelFixedYOffset // 标签Y偏移，固定值
        );
    }

    updateDataDisplay();
}

// --- 物理更新 ---
function update() {
    time += dt;

    const displacement = positionX - equilibriumX;
    // F = -kx, a = F/m = - (k/m) * x_displacement
    accelerationX = -(springConstant / mass) * displacement;

    // 欧拉积分 (简单，但可能随时间累积误差)
    velocityX += accelerationX * dt;
    positionX += velocityX * dt;

    // 如果振子移出屏幕 (理想简谐运动不会发生，但作为保护措施)
    if (positionX < -massWidth || positionX > canvas.width + massWidth) {
        cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        infoDiv.textContent = "模拟结束 (振子移出屏幕)，点击重置。";
    }
}

// --- 动画循环 ---
function animate() {
    update();
    draw();

    // 只有当模拟正在进行时，才请求下一帧
    if (isAnimating) { // <-- 添加这个条件判断
        animationFrameId = requestAnimationFrame(animate);
    }
}

// --- 鼠标拖拽事件处理 ---
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

    // 检查鼠标是否在质量块的边界内
    if (mousePos.x > massLeft && mousePos.x < massRight &&
        mousePos.y > massTop && mousePos.y < massBottom) {

        isDragging = true;
        cancelAnimationFrame(animationFrameId); // 拖拽时停止动画
        isAnimating = false;
        velocityX = 0; // 拖拽开始时重置速度
        accelerationX = 0; // 拖拽时暂时设为0
        time = 0; // 如果设置新的初始条件，则重置时间
        dragOffsetX = mousePos.x - positionX; // 计算从质量块中心到鼠标指针的偏移量

        infoDiv.textContent = "拖拽振子设置初始位置。";
    }
}

function handleMouseMove(event) {
    if (isDragging) {
        const mousePos = getMousePos(event);
        let desiredPositionX = mousePos.x - dragOffsetX;

        // L0: 弹簧的自然长度 (从墙壁到平衡位置的距离)
        const L0 = equilibriumX - wallWidth;

        // 质量块中心能够到达的最左侧位置（刚好碰到墙壁）
        const wallCollisionLimitX = wallWidth + massWidth / 2;

        // 计算最大拉伸位移（从平衡位置开始计算）
        const maxStretchDisplacement = 2 * L0;

        // 计算最大压缩位移（从平衡位置开始计算）
        // 这是关键：最大压缩位移必须是 (2 * L0) 和 (平衡位置到墙壁接触点的距离) 中的最小值
        const maxCompressionDisplacement = Math.min(maxStretchDisplacement, equilibriumX - wallCollisionLimitX);

        // 计算允许拖拽到的绝对X坐标的上下限
        const maxAllowedX = equilibriumX + L0;
        const minAllowedX = equilibriumX - maxCompressionDisplacement; // 平衡位置 - 最大压缩位移

        let finalPositionX = desiredPositionX;
        let stopDrag = false;
        let message = "";

        // 首先检查拉伸限制
        if (desiredPositionX > maxAllowedX) {
            finalPositionX = maxAllowedX; // 限制在最大拉伸边界上
            stopDrag = true;
            message = "警告：拉伸量超过限制 (2倍墙壁到平衡位置的距离)，拖拽停止！";
        } 
        // 然后检查压缩限制
        else if (desiredPositionX < minAllowedX) {
            finalPositionX = minAllowedX; // 限制在最大压缩边界上
            stopDrag = true;
            // 根据最终限制的位置判断是撞墙还是达到2*L0压缩极限
            if (Math.abs(finalPositionX - wallCollisionLimitX) < 0.001) { // 如果非常接近墙壁限制
                message = "警告：振子不能穿透墙壁，拖拽停止！";
            } else {
                message = "警告：压缩量超过限制 (2倍墙壁到平衡位置的距离)，拖拽停止！";
            }
        }
        
        positionX = finalPositionX; // 应用最终确定的位置

        if (stopDrag) {
            isDragging = false;
            infoDiv.textContent = message;
            velocityX = 0; // 停止物理运动
            accelerationX = 0;
        } else {
            // 只有当拖拽继续时才更新加速度
            const currentDisplacement = positionX - equilibriumX;
            accelerationX = -(springConstant / mass) * currentDisplacement;
        }
        draw(); // 立即重绘以显示拖拽效果或限制后的位置
    }
}

function handleMouseUp() {
    if (isDragging) {
        isDragging = false;
        infoDiv.textContent = "点击画布开始模拟。";
        // 确保拖拽结束后加速度值正确
        const currentDisplacement = positionX - equilibriumX;
        accelerationX = -(springConstant / mass) * currentDisplacement;
        draw(); // 拖拽后的最终绘制
        updateDataDisplay(); // 根据最终拖拽位置更新数据
    }
}

function handleCanvasClick() {
    if (!isAnimating && !isDragging) {
        isAnimating = true;
        infoDiv.textContent = "模拟进行中...";
        animate(); // 开始动画
    } else if (isAnimating) {
        // 如果正在动画，点击可以暂停
        cancelAnimationFrame(animationFrameId);
        isAnimating = false;
        infoDiv.textContent = "模拟暂停。点击画布继续。";
    }
}

// --- 事件监听器 ---
window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseUp); // 鼠标离开画布时结束拖拽
canvas.addEventListener('click', handleCanvasClick); // 点击开始/暂停

// 初始设置
initializeControls();
resizeCanvas(); // 设置初始画布大小并首次绘制所有内容
resetSimulation(true); // 确保在加载时正确设置和绘制初始状态