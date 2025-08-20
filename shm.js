// my_physics_simulations/shm/shm.js
// 简谐运动模拟的主逻辑将在这里实现。

const canvas = document.getElementById('shmCanvas');
const ctx = canvas.getContext('2d');
const infoDiv = document.getElementById('info');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw(); // 初始绘制
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('简谐运动模拟区域', canvas.width / 2, canvas.height / 2);
    ctx.fillText('请在此文件添加你的简谐运动代码。', canvas.width / 2, canvas.height / 2 + 30);
}

// 示例：点击画布重置 (未来可改为启动/暂停)
canvas.addEventListener('click', () => {
    infoDiv.textContent = '简谐运动模拟 (点击开始/暂停)';
    // 在这里添加简谐运动的启动/暂停逻辑
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // 首次加载时调整大小并绘制
