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

// --- 新增：图表常量和变量 ---
// 瞬时值竖直坐标轴
const graphHeight = 200; // 竖直坐标轴的高度
let graphOriginX; // 竖直坐标轴的X位置 (画布水平居中)
let graphOriginY; // 竖直坐标轴零点的Y位置

// 竖直坐标轴上各个物理量的刻度 (像素/单位)
// 这些值根据模拟的典型范围进行调整，使其能较好地显示在图表中
// 这里假设主要模拟单位是像素，并根据经验值设定
const displacementGraphScale = 1;   // 1 像素/模拟位移单位 (如果位移单位是像素，那就是1像素图表长度/1像素位移)
const velocityGraphScale = 1.5;    // 1.5 像素/(模拟速度单位)
const accelerationGraphScale = 2.5; // 2.5 像素/(模拟加速度单位)
const forceGraphScale = 0.5;   // 0.5 像素/(模拟力单位)

// 时间序列水平坐标轴
const graphWidth = 400; // 时间序列图表的宽度
let timeAxisY; // 时间轴的Y位置
const timeScale = 50; // 时间轴刻度 (像素/秒)

// 历史数据存储数组
let displacementHistory = [];
let velocityHistory = [];
let accelerationHistory = [];
let forceHistory = [];
let timeHistory = [];


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

// --- 新增：辅助函数：绘制虚线 ---
function drawDashedLine(ctx, x1, y1, x2, y2, dash = [], color = '#aaa', width = 1) {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]); // 重置为实线
}


// --- 新增：绘制图表函数 ---
function drawGraphs() {
    // 重新计算图表原点位置以适应画布大小变化
    graphOriginX = canvas.width / 2;
    graphOriginY = floorY + 100; // 位于地面线下方100像素处
    timeAxisY = graphOriginY + graphHeight / 2 + 50; // 位于竖直轴下方50像素处

    // --- 瞬时值竖直坐标轴 (x, v, a, F) ---
    const axisStartX = graphOriginX;
    const axisStartY = graphOriginY - graphHeight / 2;
    const axisEndY = graphOriginY + graphHeight / 2;

    // 绘制竖直坐标轴线
    drawDashedLine(ctx, axisStartX, axisStartY, axisStartX, axisEndY, [], '#888', 1);

    // 绘制竖直坐标轴标题和零点标签
    ctx.font = '14px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('瞬时值', axisStartX, axisStartY - 20); // 标题
    ctx.fillText('0', axisStartX - 10, graphOriginY + 5); // 零点标签

    // 获取当前物理量的值（位移、速度、加速度、力）
    const currentDisplacement = positionX - equilibriumX;
    const currentVelocity = velocityX;
    const currentAcceleration = accelerationX;
    const currentForce = -springConstant * currentDisplacement;

    // 在竖直坐标轴上绘制代表这些值的点
    const pointRadius = 4;

    // 位移 (蓝色)
    const dispY = graphOriginY - currentDisplacement * displacementGraphScale;
    ctx.fillStyle = '#007bff'; // 蓝色
    ctx.beginPath();
    ctx.arc(axisStartX, dispY, pointRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('x', axisStartX - 20, dispY + 5); // 标签 x

    // 速度 (绿色)
    const velY = graphOriginY - currentVelocity * velocityGraphScale;
    ctx.fillStyle = '#28a745'; // 绿色
    ctx.beginPath();
    ctx.arc(axisStartX, velY, pointRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('v', axisStartX + 20, velY + 5); // 标签 v

    // 加速度 (黄色)
    const accY = graphOriginY - currentAcceleration * accelerationGraphScale;
    ctx.fillStyle = '#ffc107'; // 黄色
    ctx.beginPath();
    ctx.arc(axisStartX, accY, pointRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('a', axisStartX - 20, accY + 5); // 标签 a

    // 力 (红色)
    const forceY = graphOriginY - currentForce * forceGraphScale;
    ctx.fillStyle = '#dc3545'; // 红色
    ctx.beginPath();
    ctx.arc(axisStartX, forceY, pointRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('F', axisStartX + 20, forceY + 5); // 标签 F

    // --- 水平时间序列图表 (x, v, a, F vs. Time) ---
    const timeGraphOriginX = graphOriginX - graphWidth / 2; // 时间图表左边缘
    const timeGraphEndX = graphOriginX + graphWidth / 2;    // 时间图表右边缘
    const timeGraphCenterY = timeAxisY; // 时间轴线Y位置

    // 绘制水平时间轴线
    drawDashedLine(ctx, timeGraphOriginX, timeGraphCenterY, timeGraphEndX, timeGraphCenterY, [], '#888', 1);

    // 绘制时间轴的零点垂直线（虚线） <-- 修正：将虚线移动到图表右侧，代表当前时间
    drawDashedLine(ctx, timeGraphEndX, timeGraphCenterY - graphHeight / 2, timeGraphEndX, timeGraphCenterY + graphHeight / 2, [5, 5], '#aaa', 1);

    // 绘制时间轴标签
    ctx.font = '14px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('时间 (s)', timeGraphEndX + 40, timeGraphCenterY); // 时间轴标题
    // 修正：更改标签为“当前时间”，并将其放置在虚线下方
    ctx.fillText('当前时间', timeGraphEndX, timeGraphCenterY + 20); // '当前时间' 标签

    // 绘制曲线标签
    ctx.textAlign = 'left';
    ctx.font = '12px Arial';
    ctx.fillStyle = '#007bff'; ctx.fillText('x', timeGraphEndX + 10, timeGraphCenterY - graphHeight / 2 + 20);
    ctx.fillStyle = '#28a745'; ctx.fillText('v', timeGraphEndX + 10, timeGraphCenterY - graphHeight / 2 + 40);
    ctx.fillStyle = '#ffc107'; ctx.fillText('a', timeGraphEndX + 10, timeGraphCenterY - graphHeight / 2 + 60);
    ctx.fillStyle = '#dc3545'; ctx.fillText('F', timeGraphEndX + 10, timeGraphCenterY - graphHeight / 2 + 80);

    // 绘制历史数据曲线
    ctx.lineWidth = 1.5;

    // 确定当前图表上可见的时间范围
    const maxVisibleTimeSpan = graphWidth / timeScale; // 图表上可见的最大时间跨度
    // const minTimeToShow = time - maxVisibleTimeSpan; // 此变量在此处不再直接用于X坐标计算，但用于startIndex

    // 找到开始绘制历史数据的索引，避免遍历屏幕外的数据
    // 应该从 `time - maxVisibleTimeSpan` 之后的数据开始绘制
    let startIndex = 0;
    while (startIndex < timeHistory.length && timeHistory[startIndex] < time - maxVisibleTimeSpan) {
        startIndex++;
    }

    // 只有当有足够的数据点时才绘制曲线 (至少两个点才能连成线)
    if (timeHistory.length - startIndex > 1) {
        // 辅助函数：绘制单条曲线
        const drawCurve = (dataArray, scale, color) => {
            ctx.strokeStyle = color;
            ctx.beginPath();
            let firstPointDrawn = false;
            for (let i = startIndex; i < timeHistory.length; i++) {
                // 修正：将时间转换为图表X坐标
                // 确保当前时间映射到 timeGraphEndX，历史时间向左延伸
                const x = timeGraphEndX - (time - timeHistory[i]) * timeScale;
                // 将物理量转换为图表Y坐标
                const y = timeGraphCenterY - dataArray[i] * scale;
                if (!firstPointDrawn) {
                    ctx.moveTo(x, y);
                    firstPointDrawn = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        };

        // 绘制四条曲线
        drawCurve(displacementHistory, displacementGraphScale, '#007bff'); // 位移
        drawCurve(velocityHistory, velocityGraphScale, '#28a745');       // 速度
        drawCurve(accelerationHistory, accelerationGraphScale, '#ffc107'); // 加速度
        drawCurve(forceHistory, forceGraphScale, '#dc3545');         // 力
    }
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

    // 新增：清空历史数据数组
    displacementHistory = [];
    velocityHistory = [];
    accelerationHistory = [];
    forceHistory = [];
    timeHistory = [];

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

    // 绘制力箭头 (F = -kx)
    const displacementForForce = positionX - equilibriumX; // 使用当前的 positionX 计算位移
    const force = -springConstant * displacementForForce; // 直接根据当前位移计算力
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
            'a',
            accelerationDir * arrowLabelMagnitudeXOffset, // 标签X偏移，根据方向调整
            arrowLabelFixedYOffset // 标签Y偏移，固定值
        );
    }

    // 新增：绘制图表
    drawGraphs(); 

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

    // 新增：计算力，用于历史数据存储
    const currentForce = -springConstant * displacement;

    // 新增：存储历史数据，用于时间序列图表
    displacementHistory.push(displacement);
    velocityHistory.push(velocityX);
    accelerationHistory.push(accelerationX);
    forceHistory.push(currentForce);
    timeHistory.push(time);

    // 新增：限制历史数据数组大小，移除屏幕外的数据以优化性能
    const maxVisibleTimeSpan = graphWidth / timeScale; // 图表上可见的最大时间跨度
    const minTimeToShow = time - maxVisibleTimeSpan - dt * 2; // 保留一个小的缓冲

    while (timeHistory.length > 0 && timeHistory[0] < minTimeToShow) {
        displacementHistory.shift();
        velocityHistory.shift();
        accelerationHistory.shift();
        forceHistory.shift();
        timeHistory.shift();
    }

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
    if (isAnimating) {
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
    // 重要！！！
    // 这个函数的代码是对的，所以千万不要更改这里的代码。
    // 里面的注释是错误的
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
        const maxCompressionDisplacement = Math.min(maxStretchDisplacement, equilibriumX - wallCollisionLimitX);

        // 计算允许拖拽到的绝对X坐标的上下限
        const maxAllowedX = equilibriumX + L0 - massWidth / 2;
        const minAllowedX = equilibriumX - maxCompressionDisplacement; // 平衡位置 - 最大压缩位移

        let finalPositionX = desiredPositionX;
        let stopDrag = false;
        let message = "";

        // 检查拉伸限制
        if (desiredPositionX > maxAllowedX) {
            finalPositionX = maxAllowedX; // 限制在最大拉伸边界上
            stopDrag = true;
            message = "警告：拉伸量超过限制，拖拽停止！";
        }
        // 检查压缩限制
        else if (desiredPositionX < minAllowedX) {
            finalPositionX = minAllowedX; // 限制在最大压缩边界上
            stopDrag = true;
            // 根据最终限制的位置判断是撞墙还是达到2*L0压缩极限
            if (Math.abs(finalPositionX - wallCollisionLimitX) < 0.001) { // 如果非常接近墙壁限制
                message = "警告：振子不能穿透墙壁，拖拽停止！";
            }
        }
        
        positionX = finalPositionX; // 应用最终确定的位置

        // 无论是否停止拖拽，都应该根据当前位置计算加速度，以便绘制箭头和显示
        const currentDisplacement = positionX - equilibriumX;
        accelerationX = -(springConstant / mass) * currentDisplacement;

        if (stopDrag) {
            isDragging = false;
            infoDiv.textContent = message;
            velocityX = 0; // 停止物理运动
            // accelerationX 保持实际值
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