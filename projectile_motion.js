import { drawArrow } from './drawing_utils.js'; // Adjust path if needed

const canvas = document.getElementById('gravityCanvas');
const ctx = canvas.getContext('2d');
const infoDiv = document.getElementById('info'); // 获取信息提示 div
const controlsDiv = document.getElementById('controls'); // 获取控制面板 div
const explanationDiv = document.getElementById('explanation'); // 获取解释面板 div

// 获取控制面板元素
const gravitySlider = document.getElementById('gravitySlider');
const gravityValueSpan = document.getElementById('gravityValue'); // 这个用于显示在滑块旁
const initialSpeedSlider = document.getElementById('initialSpeedSlider');
const initialSpeedValueSpan = document.getElementById('initialSpeedValue');

// 新增：获取实时数据面板元素
const dataDisplayDiv = document.getElementById('dataDisplay');
const timeSpan = document.getElementById('timeValue');
const vxValueSpan = document.getElementById('vxValue');
const vyValueSpan = document.getElementById('vyValue');
const vValueSpan = document.getElementById('vValue');
const heightValueSpan = document.getElementById('heightValue');
const distanceValueSpan = document.getElementById('distanceValue');
const gravityDisplayValueSpan = document.getElementById('gravityDisplayValue'); // 用于显示在数据面板中

// 小球属性
let ball = {
    x: 0,
    y: 0,
    radius: 8,
};

// 物理属性
let gravity = 0.15; // 默认重力
let initialSpeed = 13; // 默认初始速度

// 地平线位置 (距离底部)
const horizonOffset = 30;

// 箭头公共参数和速度比例
const arrowHeadSize = 6;
const arrowHeadAngle = Math.PI / 6;
const gravityArrowLength = 30; // 重力箭头长度固定为30
const speedScale = 3.5; // 速度箭头长度比例
const maxSpeedArrowLength = 111; // 速度箭头最大长度

let vx = 0; // x轴速度
let vy = 0; // y轴速度
let animationFrameId; // 用于存储 requestAnimationFrame 的ID

let isAnimating = false; // 状态变量：小球是否在运动
let isTimeReversalMode = false; // 新增状态变量：是否处于时间回溯模式
let ballHistory = []; // 存储小球运动轨迹和速度的历史数据 (新增time)
let historyIndex = 0; // 当前在历史数据中的索引
let time = 0; // 新增：动画时间，单位为帧数 (可理解为秒，因为每帧固定时间步长)

// 新增：用于时间回溯模式下，记录轨迹的X轴范围
let minHistoryX = Infinity;
let maxHistoryX = -Infinity;

// --- 初始化滑块值 ---
function initializeControls() {
    gravitySlider.value = gravity;
    // gravityValueSpan.textContent = gravity.toFixed(2); // 这个值现在由 updateDataDisplay() 更新

    initialSpeedSlider.value = initialSpeed;
    initialSpeedValueSpan.textContent = initialSpeed;
}

// --- 画布大小调整和重置函数 ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // 如果动画未运行，设置初始位置并绘制静止小球
    if (!isAnimating && !isTimeReversalMode) {
        ball.x = ball.radius + 30;
        ball.y = canvas.height - ball.radius - horizonOffset;
        draw(); // 绘制初始静止状态 (会调用 updateDataDisplay)
    } else if (isTimeReversalMode) {
        // 在时间回溯模式下，如果画布大小调整，模拟一次鼠标移动
        // 使小球保持其当前的屏幕X位置，找到轨迹上最接近该X值的点。
        if (ballHistory.length > 0) {
            // 直接使用当前小球的X坐标来模拟鼠标X，这样会找到最接近当前X的历史点
            handleMouseMove({ clientX: ball.x });
        }
    } else {
        // If animation is in progress, just redraw to accommodate new size
        draw();
    }
}

// --- 重置小球状态 ---
function resetBall() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    isAnimating = true;
    isTimeReversalMode = false;
    ballHistory = []; // 清空历史记录
    historyIndex = 0;
    time = 0; // 重置时间

    // 重置历史X轴范围
    minHistoryX = Infinity;
    maxHistoryX = -Infinity;

    // Reset dataDisplay position if it was moved to top-right
    dataDisplayDiv.classList.remove('top-right');

    ball.x = ball.radius + 30;
    ball.y = canvas.height - ball.radius - horizonOffset;

    // 使用当前滑块的initialSpeed值
    vx = initialSpeed * Math.cos(Math.PI / 4);
    vy = -initialSpeed * Math.sin(Math.PI / 4);

    infoDiv.textContent = "点击这里开始 / 重新开始"; // 更新信息文本
    controlsDiv.classList.remove('hidden'); // 显示控制面板
    explanationDiv.classList.remove('hidden'); // 显示解释面板
    dataDisplayDiv.classList.remove('hidden'); // 显示数据面板 (确保在重置时可见)
    
    animate(); // 启动主物理动画
}

// --- 更新实时数据面板 ---
function updateDataDisplay() {
    // 将重力值也显示在数据面板中
    gravityDisplayValueSpan.textContent = gravity.toFixed(2) + ' m/s²';
    gravityValueSpan.textContent = gravity.toFixed(2); // 更新滑块旁的值

    timeSpan.textContent = time.toFixed(1) + ' s'; // 时间保留1位小数
    vxValueSpan.textContent = vx.toFixed(2) + ' m/s';
    vyValueSpan.textContent = vy.toFixed(2) + ' m/s';
    vValueSpan.textContent = Math.sqrt(vx * vx + vy * vy).toFixed(2) + ' m/s';

    // 计算高度（小球底部到地平线的距离）
    const currentHeight = (canvas.height - horizonOffset) - (ball.y + ball.radius);
    heightValueSpan.textContent = Math.max(0, currentHeight).toFixed(2) + ' m'; // 确保高度不为负

    // 计算水平距离（相对于起始点）
    const initialBallX = ball.radius + 30;
    const currentDistance = ball.x - initialBallX;
    distanceValueSpan.textContent = Math.max(0, currentDistance).toFixed(2) + ' m'; // 确保距离不为负 (如果往左运动则为0)
}


// --- 绘图函数 (主Canvas) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 绘制地平线
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - horizonOffset);
    ctx.lineTo(canvas.width, canvas.height - horizonOffset);
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();

    // 2. 绘制轨迹 (在时间回溯模式下显示)
    if (isTimeReversalMode && ballHistory.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Faded grey path
        ctx.lineWidth = 1;
        ctx.moveTo(ballHistory[0].x, ballHistory[0].y);
        for (let i = 1; i < ballHistory.length; i++) {
            ctx.lineTo(ballHistory[i].x, ballHistory[i].y);
        }
        ctx.stroke();
    }

    // 3. 绘制小球 (只绘制黑色轮廓)
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.closePath();

    // 4. 绘制重力箭头 (无论何种模式都绘制)
    // 重力箭头向下，标签放在箭头尖右侧一点
    drawArrow(
        ctx, ball.x, ball.y,
        ball.x, ball.y + gravityArrowLength,
        '#aaaaaa', 1, arrowHeadSize, arrowHeadAngle, 'G',
        15, // labelOffsetX: 标签向右偏移15px
        0   // labelOffsetY: 标签不进行垂直偏移
    );

    // 根据模式选择绘制方式
    if (!isTimeReversalMode) {
        // 正常动画模式：只绘制合速度 V 箭头
        const speedMagnitude = Math.sqrt(vx * vx + vy * vy);
        if (speedMagnitude > 0.1) {
            const combinedSpeedArrowLength = Math.min(speedMagnitude * speedScale, maxSpeedArrowLength);
            const speedAngle = Math.atan2(vy, vx);

            const tipX_v_combined = ball.x + combinedSpeedArrowLength * Math.cos(speedAngle);
            const tipY_v_combined = ball.y + combinedSpeedArrowLength * Math.sin(speedAngle);

            // V 箭头，标签始终放在箭头尖上方一点
            // 考虑小球运动方向，如果速度朝下，标签可以放在下方，避免穿过小球
            let vLabelOffsetY = -15; // 默认向上偏移
            if (vy > 0 && Math.abs(vx) < 0.5) { // 如果主要是向下运动，并且水平速度很小
                vLabelOffsetY = 15; // 标签向下偏移
            }


            drawArrow(
                ctx, ball.x, ball.y,
                tipX_v_combined, tipY_v_combined,
                '#555555', 1.2, arrowHeadSize, arrowHeadAngle, 'V',
                0, // labelOffsetX
                vLabelOffsetY // labelOffsetY: 标签向上/向下偏移15px
            );
        }

    } else {
        // 时间回溯模式：绘制矢量三角形 (Vx + Vy = V)
        // 此模式下的标签位置相对固定，因为 Vx 和 Vy 是矢量加法的一部分
        const currentVxMagnitude = Math.abs(vx);
        const currentVyMagnitude = Math.abs(vy);

        // 根据速度大小和比例计算绘制长度，并限制最大长度
        const scaledVxLength = Math.min(currentVxMagnitude * speedScale, maxSpeedArrowLength);
        const scaledVyLength = Math.min(currentVyMagnitude * speedScale, maxSpeedArrowLength);

        const scaledVxComponent = vx > 0 ? scaledVxLength : -scaledVxLength;
        const scaledVyComponent = vy > 0 ? scaledVyLength : -scaledVyLength;

        // 定义矢量三角形的三个点
        const P_ball = { x: ball.x, y: ball.y }; // 小球位置，即所有矢量的起点
        const P_endVx = { x: P_ball.x + scaledVxComponent, y: P_ball.y }; // Vx 箭头的终点
        const P_endVy = { x: P_ball.x + scaledVxComponent, y: P_ball.y + scaledVyComponent }; // Vy 箭头的终点，也是合速度 V 的终点

        // 绘制 Vx 矢量
        if (currentVxMagnitude > 0.1) { // 避免绘制过短的箭头
            let vxLabelOffsetY_tr = -15; // 默认向上偏移
            if (vy < 0) {
                vxLabelOffsetY_tr = 15;
            }
            drawArrow(
                ctx, P_ball.x, P_ball.y,
                P_endVx.x, P_endVx.y,
                '#007bff', 1.2, arrowHeadSize, arrowHeadAngle, 'Vx',
                0,    // labelOffsetX
                vxLabelOffsetY_tr // 根据方向调整垂直偏移
            );
        }

        // 绘制 Vy 矢量 (从 Vx 的终点开始)
        if (currentVyMagnitude > 0.1) { // 避免绘制过短的箭头
            // Vy 箭头：标签始终放在箭头尖的右侧，保持一致性
            drawArrow(
                ctx, P_endVx.x, P_endVx.y,
                P_endVy.x, P_endVy.y,
                '#28a745', 1.2, arrowHeadSize, arrowHeadAngle, 'Vy',
                15, // labelOffsetX: 始终向右偏移15px
                0   // labelOffsetY: 不进行垂直偏移
            );
        }

        // 绘制合速度 V 矢量
        const combinedSpeedMagnitude = Math.sqrt(vx * vx + vy * vy);
        if (combinedSpeedMagnitude > 0.1) { // 避免绘制过短的箭头
            // V 箭头：如果向上，标签放上；如果向下，标签放下
            let vLabelOffsetX_tr = 0;
            let vLabelOffsetY_tr = 0;
            if (vy < 0) { // V 向上
                vLabelOffsetY_tr = -15; // 向上
            } else { // V 向下
                vLabelOffsetY_tr = 15; // 向下
            }
            drawArrow(
                ctx, P_ball.x, P_ball.y,
                P_endVy.x, P_endVy.y,
                '#555555', 1.2, arrowHeadSize, arrowHeadAngle, 'V',
                vLabelOffsetX_tr, vLabelOffsetY_tr
            );
        }
    }
    updateDataDisplay(); // 每次绘制后更新数据面板
}

// --- 更新物理状态函数 ---
function update() {
    time++; // 增加时间 (每帧为1单位时间)

    // Store current state before updating for history
    ballHistory.push({
        x: ball.x,
        y: ball.y,
        vx: vx,
        vy: vy,
        time: time // 存储当前时间
    });

    vy += gravity; // 应用重力

    ball.x += vx;
    ball.y += vy;

    // 底部碰撞 (与地平线碰撞)
    if (ball.y + ball.radius >= canvas.height - horizonOffset) {
        ball.y = canvas.height - horizonOffset - ball.radius; // Precisely place the ball on the horizon
        
        // Push the exact impact state
        ballHistory.push({
            x: ball.x,
            y: ball.y,
            vx: 0, // Record as stopped for the very last point
            vy: 0, // Record as stopped for the very last point
            time: time // Use the same time as the impact state
        });

        // Stop the live animation
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        isAnimating = false;
        isTimeReversalMode = true;
        
        // For the display immediately upon entry into time reversal:
        // Velocities are set to 0, matching the last pushed history entry.
        vx = 0; 
        vy = 0;

        historyIndex = ballHistory.length - 1; // Start at the very last point (stopped state)

        // **新增：在进入时间回溯模式时计算轨迹的X轴范围**
        minHistoryX = Infinity;
        maxHistoryX = -Infinity;
        for (const entry of ballHistory) {
            if (entry.x < minHistoryX) minHistoryX = entry.x;
            if (entry.x > maxHistoryX) maxHistoryX = entry.x;
        }


        infoDiv.textContent = "时间回溯模式：左右移动鼠标查看速度分解。点击任意位置重新开始。";
        controlsDiv.classList.add('hidden'); // 隐藏控制面板
        dataDisplayDiv.classList.add('top-right'); // 将数据面板移动到右上角
        // explanationDiv.classList.add('hidden'); // Optional: hide explanation panel
        
        // Initially draw the stopped ball on the ground, then mousemove will take over
        draw();
        console.log("Animation stopped, entering time reversal mode.");
        return; // Exit update as we are transitioning modes
    }

    // 顶部碰撞 (保留，小球不会飞出顶部，除非初始速度巨大且重力极小)
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        vy *= -1; // Simple reflection, no energy loss
    }

    // 小球飞出屏幕 (仅在动画进行中考虑)
    if (ball.x > canvas.width + ball.radius * 2 || ball.x < -ball.radius * 2) {
        if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
        }
        isAnimating = false;
        isTimeReversalMode = false; // If it flies off, it just stops. Not entering time reversal.
        ballHistory = []; // Clear history if it flies off
        time = 0; // Reset time if it flies off

        // Ensure dataDisplay is back to default position if ball flies off
        dataDisplayDiv.classList.remove('top-right');
        // 重置历史X轴范围
        minHistoryX = Infinity;
        maxHistoryX = -Infinity;

        infoDiv.textContent = "小球飞出屏幕。点击这里重新开始。";
        controlsDiv.classList.remove('hidden'); // 显示控制面板
        explanationDiv.classList.remove('hidden'); // 显示解释面板
        dataDisplayDiv.classList.remove('hidden'); // 显示数据面板
        draw(); // Draw final state before exiting.
        console.log("Animation stopped (ball flew off screen).");
    }
}

// --- 动画循环 ---
function animate() {
    if (isAnimating) { // Only run physics update if in animating state
        update();
        // Check if update transitioned to time reversal mode.
        // If it did, `animate` function will not be called again until resetBall.
        if (!isTimeReversalMode) { 
            draw(); // Only draw if still animating normally
            animationFrameId = requestAnimationFrame(animate);
        }
    }
    // If isTimeReversalMode is true, this loop stops. Drawing is handled by mousemove.
}

// --- 鼠标移动事件处理 (时间回溯模式下) ---
function handleMouseMove(event) {
    if (isTimeReversalMode && ballHistory.length > 0) {
        // 将鼠标的 clientX 直接作为我们希望小球到达的X坐标
        const desiredBallX = Math.max(0, Math.min(event.clientX, canvas.width));
        
        // 如果轨迹是垂直的（minX 和 maxX 相同，例如小球垂直落下），
        // 那么无论鼠标X如何，都停留在轨迹的最后一个点。
        if (minHistoryX === maxHistoryX) {
            historyIndex = ballHistory.length - 1; 
        } else {
            // 遍历历史记录，找到X坐标最接近 desiredBallX 的点
            let closestIndex = 0;
            let minDiff = Infinity;

            for (let i = 0; i < ballHistory.length; i++) {
                const diff = Math.abs(ballHistory[i].x - desiredBallX);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = i;
                }
            }
            historyIndex = closestIndex;
        }

        const historicalState = ballHistory[historyIndex];
        ball.x = historicalState.x;
        ball.y = historicalState.y;
        vx = historicalState.vx;
        vy = historicalState.vy;
        time = historicalState.time; // 恢复历史时间

        draw(); // 立即重绘
    }
}

// --- 统一点击处理 ---
function handlePageClick() {
    // Clicking anywhere always triggers a reset/restart
    resetBall();
}

// --- 事件监听 ---
window.addEventListener('resize', resizeCanvas);
document.addEventListener('click', handlePageClick); // 统一点击处理
document.addEventListener('mousemove', handleMouseMove); // 鼠标移动监听

// 滑块事件监听
gravitySlider.addEventListener('input', (event) => {
    gravity = parseFloat(event.target.value);
    // gravityValueSpan.textContent = gravity.toFixed(2); // 统一到 updateDataDisplay
    // 如果在时间回溯模式下调整重力，不会影响当前历史轨迹，但会影响下一次模拟。
    // 在实时模式下调整重力，不会立即改变当前运动（因为需要reset），但会改变下一次reset的重力值。
    updateDataDisplay(); // 立即更新数据面板中的重力值
});

initialSpeedSlider.addEventListener('input', (event) => {
    initialSpeed = parseFloat(event.target.value);
    initialSpeedValueSpan.textContent = initialSpeed;
});

// 页面加载时执行
initializeControls(); // 初始化所有控件
resizeCanvas(); // 初始设置画布大小和球的位置 (并绘制初始静止状态)
// 页面加载时，虽然尚未开始动画，但我们希望数据面板能显示初始值
updateDataDisplay();