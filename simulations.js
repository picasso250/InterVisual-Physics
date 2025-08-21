// simulations.js

/**
 * 辅助函数：绘制虚线。
 * @param {CanvasRenderingContext2D} ctx - 2D 渲染上下文。
 * @param {number} x1 - 起点 X 坐标。
 * @param {number} y1 - 起点 Y 坐标。
 * @param {number} x2 - 终点 X 坐标。
 * @param {number} y2 - 终点 Y 坐标。
 * @param {string} color - 描边颜色。
 * @param {number} lineWidth - 线宽。
 * @param {number[]} pattern - 指定交替绘制和跳过距离的数字数组。
 */
function drawDottedLine(ctx, x1, y1, x2, y2, color, lineWidth, pattern) {
    ctx.beginPath();
    ctx.setLineDash(pattern);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.setLineDash([]); // 重置虚线样式为实线
}

// 初始化所有迷你模拟的主函数
function initMiniSimulations() {
    initProjectileSimulation();
    initShmSimulation();
}

// --- 抛体运动模拟 ---
// (这部分代码没有改动，与您提供的代码一致)
function initProjectileSimulation() {
    const canvas = document.getElementById('projectileMiniCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId = null;
    let currentFrame = 0;

    const ballRadius = 6;
    let ball = { x: 0, y: 0, vx: 0, vy: 0 };
    let gravity = 0;
    let initialVx = 0;
    let initialVy = 0;

    const groundYOffset = 15;
    const horizontalPadding = 5;
    const verticalPadding = 5;

    const totalFrames = 90;
    const timeToPeakFrames = totalFrames / 2;

    let fullTrajectoryPoints = []; // **新增：用于存储完整的预计算轨迹**

    // 重置抛体状态并开始动画
    function resetProjectile() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        if (canvas.width <= 0 || canvas.height <= 0) {
            animationFrameId = null;
            return;
        }

        const startX = ballRadius + horizontalPadding;
        const groundY = canvas.height - groundYOffset;
        const startY = groundY - ballRadius;
        const landingX = canvas.width - ballRadius - horizontalPadding;
        const peakYCanvasCoord = ballRadius + verticalPadding;
        let desiredPeakHeightFromGround = startY - peakYCanvasCoord;
        const minHeightRatio = 0.3;
        if (desiredPeakHeightFromGround < canvas.height * minHeightRatio) {
            desiredPeakHeightFromGround = canvas.height * minHeightRatio;
        }
        if (desiredPeakHeightFromGround <= 0) {
             desiredPeakHeightFromGround = 20;
        }
        const horizontalRange = landingX - startX;
        
        if (horizontalRange <= 0) {
            ball = { x: startX, y: startY, vx: 0, vy: 0 };
            fullTrajectoryPoints = [{ x: ball.x, y: ball.y }];
            drawProjectile();
            animationFrameId = null;
            return;
        }

        initialVx = horizontalRange / totalFrames;
        gravity = (2 * desiredPeakHeightFromGround) / (timeToPeakFrames * timeToPeakFrames);
        initialVy = -gravity * timeToPeakFrames;

        ball = { x: startX, y: startY, vx: initialVx, vy: initialVy };
        currentFrame = 0;

        // **新增：预先计算整个轨迹**
        fullTrajectoryPoints = []; // 清空之前的轨迹
        let tempX = startX;
        let tempY = startY;
        let tempVy = initialVy;
        for (let i = 0; i <= totalFrames; i++) {
            fullTrajectoryPoints.push({ x: tempX, y: tempY });
            tempVy += gravity;
            tempX += initialVx;
            tempY += tempVy;
            // 防止轨迹线画到地面以下
            if (tempY > startY) {
                tempY = startY;
                fullTrajectoryPoints.push({ x: tempX, y: tempY });
                break;
            }
        }
        
        animationFrameId = requestAnimationFrame(animateProjectile);
    }

    // 更新物理状态
    function updateProjectile() {
        if (currentFrame < totalFrames) {
            ball.vy += gravity;
            ball.x += ball.vx;
            ball.y += ball.vy;

            if (ball.y + ballRadius >= canvas.height - groundYOffset) {
                ball.y = canvas.height - groundYOffset - ballRadius;
                currentFrame = totalFrames;
            }
        }
        currentFrame++;
    }

    // 绘制函数
    function drawProjectile() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 绘制地面线
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - groundYOffset);
        ctx.lineTo(canvas.width, canvas.height - groundYOffset);
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. **修改：绘制预先计算好的完整轨迹 (虚线)**
        if (fullTrajectoryPoints.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.moveTo(fullTrajectoryPoints[0].x, fullTrajectoryPoints[0].y);
            for (let i = 1; i < fullTrajectoryPoints.length; i++) {
                ctx.lineTo(fullTrajectoryPoints[i].x, fullTrajectoryPoints[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]); // 重置为实线
        }

        // 3. 绘制小球
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#eeeeee';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.closePath();
    }

    // 动画循环
    function animateProjectile() {
        updateProjectile();
        drawProjectile();

        if (currentFrame <= totalFrames) {
            animationFrameId = requestAnimationFrame(animateProjectile);
        } else {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = null;
            setTimeout(resetProjectile, 500);
        }
    }

    const resizeObserver = new ResizeObserver(() => resetProjectile());
    resizeObserver.observe(canvas);
    resetProjectile();
}


// --- 简谐运动模拟 (已重构) ---
function initShmSimulation() {
    const canvas = document.getElementById('shmMiniCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId = null;
    let startTime = 0;

    // 模拟参数
    const massWidth = 30;
    const massHeight = 20;
    const wallX = 15; // 左侧墙壁的位置
    const padding = 40; // 右侧边距
    const PERIOD_SECONDS = 3; // 振动周期为3秒
    const OMEGA = (2 * Math.PI) / PERIOD_SECONDS; // 角频率

    // 动态计算的变量
    let mass = { x: 0, y: 0 };
    let amplitude = 0; // 振幅
    let equilibriumX = 0; // 平衡位置

    // 重置并启动SHM动画
    function resetShm() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        if (canvas.width <= 0 || canvas.height <= 0) {
            animationFrameId = null;
            return;
        }

        // 计算振幅和平衡位置，使其响应画布大小
        const availableWidth = canvas.width - wallX - padding - padding;
        amplitude = (availableWidth - massWidth) / 2;
        equilibriumX = wallX + massWidth / 2 + amplitude + padding;
        
        if (amplitude <= 0) { // 如果画布太小，则不进行动画
            amplitude = 0;
            equilibriumX = canvas.width / 2;
        }

        mass.y = canvas.height / 2; // 垂直居中

        startTime = Date.now(); // 记录动画开始时间
        animationFrameId = requestAnimationFrame(animateShm);
    }

    // 使用sin函数更新物体位置
    function updateShm() {
        const elapsedTime = (Date.now() - startTime) / 1000; // 转换为秒
        const displacement = amplitude * Math.sin(OMEGA * elapsedTime);
        mass.x = equilibriumX + displacement;
    }

    // 绘制函数
    function drawShm() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 绘制左侧的墙壁
        ctx.beginPath();
        ctx.moveTo(wallX, 0);
        ctx.lineTo(wallX, canvas.height);
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. 绘制水平弹簧
        const springStartY = mass.y;
        const springEndX = mass.x - massWidth / 2;
        const totalSpringLength = springEndX - wallX;

        ctx.beginPath();
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1.5;
        
        const numCoils = 22;
        const coilWidth = 8;
        const segmentLength = totalSpringLength / (numCoils * 2);

        // 确保弹簧长度有效再绘制
        if (totalSpringLength > 0 && isFinite(segmentLength)) {
            ctx.moveTo(wallX, springStartY);
            for (let i = 0; i < numCoils; i++) {
                // y坐标偏移来画出线圈
                ctx.lineTo(wallX + segmentLength * (2 * i + 1), springStartY + (i % 2 === 0 ? coilWidth : -coilWidth));
                ctx.lineTo(wallX + segmentLength * (2 * i + 2), springStartY);
            }
            ctx.lineTo(springEndX, springStartY);
            ctx.stroke();
        }

        // 3. 绘制物体
        ctx.beginPath();
        ctx.rect(mass.x - massWidth / 2, mass.y - massHeight / 2, massWidth, massHeight);
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.closePath();
    }

    // 动画循环
    function animateShm() {
        updateShm();
        drawShm();
        animationFrameId = requestAnimationFrame(animateShm);
    }

    // 监听画布尺寸变化，并重置动画
    const resizeObserver = new ResizeObserver(() => resetShm());
    resizeObserver.observe(canvas);
    resetShm();
}

document.addEventListener('DOMContentLoaded', initMiniSimulations);