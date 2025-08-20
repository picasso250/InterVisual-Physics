// drawing_utils.js

/**
 * Draws an arrow on a canvas context.
 * @param {CanvasRenderingContext2D} ctxToDraw - The 2D rendering context of the canvas.
 * @param {number} x1 - Start X coordinate.
 * @param {number} y1 - Start Y coordinate.
 * @param {number} x2 - End X coordinate (arrow tip).
 * @param {number} y2 - End Y coordinate (arrow tip).
 * @param {string} color - Stroke color.
 * @param {number} lineWidth - Line width.
 * @param {number} headSize - Size of the arrowhead.
 * @param {number} headAngle - Angle of the arrowhead.
 * @param {string} [label=null] - Optional text label for the arrow.
 * @param {number} [labelOffsetX=0] - X offset for the label from the arrow tip.
 * @param {number} [labelOffsetY=0] - Y offset for the label from the arrow tip.
 */
export function drawArrow(ctxToDraw, x1, y1, x2, y2, color, lineWidth, headSize, headAngle, label = null, labelOffsetX = 0, labelOffsetY = 0) {
    ctxToDraw.beginPath();
    ctxToDraw.moveTo(x1, y1);
    ctxToDraw.lineTo(x2, y2);
    ctxToDraw.strokeStyle = color;
    ctxToDraw.lineWidth = lineWidth;
    ctxToDraw.stroke();

    // 绘制箭头头部
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctxToDraw.beginPath();
    ctxToDraw.moveTo(x2, y2);
    ctxToDraw.lineTo(
        x2 - headSize * Math.cos(angle - headAngle),
        y2 - headSize * Math.sin(angle - headAngle)
    );
    ctxToDraw.stroke();
    ctxToDraw.beginPath();
    ctxToDraw.moveTo(x2, y2);
    ctxToDraw.lineTo(
        x2 - headSize * Math.cos(angle + headAngle),
        y2 - headSize * Math.sin(angle + headAngle)
    );
    ctxToDraw.stroke();

    // 绘制标签
    if (label) {
        ctxToDraw.font = `bold 14px Segoe UI`;
        ctxToDraw.fillStyle = color;
        ctxToDraw.textAlign = 'center';
        ctxToDraw.textBaseline = 'middle';

        let textX = x2 + labelOffsetX;
        let textY = y2 + labelOffsetY;

        ctxToDraw.fillText(label, textX, textY);
    }
}