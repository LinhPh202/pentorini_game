const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CẤU HÌNH ---
const BOARD_ROWS = 9; 
const BOARD_COLS = 7;
let CELL_SIZE = 35; 

const TRAY_SCALE = 0.45; 
const TRAY_GAP = 12; 

let MARGIN_X = 10;
// Tăng Margin Y lên để tránh bị nút che (do header mới)
let MARGIN_Y = 80; 

// Trạng thái chế độ mù màu
let isColorBlindMode = false;

const COLORS = {
    BG: '#F0E6D2', BOARD: '#FFFAF0', GRID: '#C8BEAA',
    TEXT: '#50463C', TEXT_RED: '#C83232', HIGHLIGHT: 'rgba(255, 255, 255, 0.4)',
};

// BẢNG MÀU MỚI: Tương phản cao, dễ phân biệt hơn
const SHAPE_COLORS = {
    'F': '#DC143C', // Đỏ thẫm
    'I': '#00BFFF', // Xanh dương nhạt (Deep Sky Blue)
    'L': '#FF8C00', // Cam đậm
    'P': '#FFD700', // Vàng
    'N': '#32CD32', // Xanh lá mạ
    'T': '#9400D3', // Tím đậm
    'U': '#4169E1', // Xanh hoàng gia
    'V': '#FF1493', // Hồng đậm
    'W': '#008080', // Xanh cổ vịt (Teal) - Khác hẳn xanh dương
    'X': '#808080', // Xám - Trung tính
    'Y': '#8B4513', // Nâu đất
    'Z': '#2E8B57'  // Xanh biển (Sea Green) - Khác xanh lá mạ
};

const BOARD_CONTENT = [
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    ["Aug", "Sep", "Oct", "Nov", "Dec", "25", "26"],
    ["27", "28", "29", "30", "1", "2", "3"],
    ["4", "5", "6", "7", "8", "9", "10"],
    ["11", "12", "13", "14", "15", "16", "17"],
    ["18", "19", "20", "21", "22", "23", "24"],
    ["25", "26", "27", "28", "29", "30", "31"],
    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] 
];

const SHAPES = {
    'F': [{r:1,c:0}, {r:1,c:1}, {r:0,c:1}, {r:0,c:2}, {r:2,c:1}],
    'I': [{r:0,c:0}, {r:1,c:0}, {r:2,c:0}, {r:3,c:0}, {r:4,c:0}],
    'L': [{r:0,c:0}, {r:1,c:0}, {r:2,c:0}, {r:3,c:0}, {r:3,c:1}],
    'P': [{r:0,c:0}, {r:1,c:0}, {r:0,c:1}, {r:1,c:1}, {r:2,c:0}],
    'N': [{r:0,c:1}, {r:1,c:1}, {r:2,c:0}, {r:2,c:1}, {r:3,c:0}],
    'T': [{r:0,c:0}, {r:0,c:1}, {r:0,c:2}, {r:1,c:1}, {r:2,c:1}],
    'U': [{r:0,c:0}, {r:0,c:2}, {r:1,c:0}, {r:1,c:1}, {r:1,c:2}],
    'V': [{r:0,c:0}, {r:1,c:0}, {r:2,c:0}, {r:2,c:1}, {r:2,c:2}],
    'W': [{r:0,c:0}, {r:1,c:0}, {r:1,c:1}, {r:2,c:1}, {r:2,c:2}],
    'X': [{r:0,c:1}, {r:1,c:0}, {r:1,c:1}, {r:1,c:2}, {r:2,c:1}],
    'Y': [{r:0,c:1}, {r:1,c:0}, {r:1,c:1}, {r:1,c:2}, {r:1,c:3}],
    'Z': [{r:0,c:0}, {r:0,c:1}, {r:1,c:1}, {r:2,c:1}, {r:2,c:2}]
};

class Piece {
    constructor(shapeKey, startX, startY) {
        this.key = shapeKey;
        this.shape = JSON.parse(JSON.stringify(SHAPES[shapeKey]));
        this.x = startX;
        this.y = startY;
        this.initialPos = { x: startX, y: startY };
        this.gridPos = null; 
        this.isDragging = false;
        this.color = SHAPE_COLORS[this.key] || '#A0643C';
        this.normalize(this.shape);
    }

    getCurrentScale() {
        if (this.isDragging || this.gridPos !== null) return 1.0;
        return TRAY_SCALE;
    }

    draw() {
        const scale = this.getCurrentScale();
        const drawSize = CELL_SIZE * scale;
        
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';

        // Cài đặt font cho chế độ mù màu
        if (isColorBlindMode) {
            ctx.font = `bold ${drawSize * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
        }

        this.shape.forEach(cell => {
            const px = this.x + cell.c * drawSize;
            const py = this.y + cell.r * drawSize;
            
            // 1. Vẽ nền
            ctx.fillStyle = this.color;
            ctx.fillRect(px, py, drawSize, drawSize);
            
            // 2. Vẽ viền
            ctx.strokeRect(px, py, drawSize, drawSize);
            
            // 3. Highlight nhẹ
            if (!isColorBlindMode) {
                ctx.fillStyle = COLORS.HIGHLIGHT;
                ctx.fillRect(px + 2, py + 2, drawSize - 4, drawSize * 0.3);
            }

            // 4. CHẾ ĐỘ MÙ MÀU: Vẽ ký tự tên khối (F, I, L...)
            if (isColorBlindMode) {
                // Vẽ viền chữ màu trắng để nổi trên mọi nền
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.strokeText(this.key, px + drawSize/2, py + drawSize/2);
                
                // Vẽ lòng chữ màu đen
                ctx.fillStyle = 'black';
                ctx.fillText(this.key, px + drawSize/2, py + drawSize/2);
                
                // Reset lại stroke style cho ô vuông tiếp theo
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1.5;
            }
        });
    }

    containsPoint(mx, my) {
        const scale = this.getCurrentScale();
        const drawSize = CELL_SIZE * scale;
        const buffer = 15; 
        for (let cell of this.shape) {
            const px = this.x + cell.c * drawSize;
            const py = this.y + cell.r * drawSize;
            if (mx >= px - buffer && mx <= px + drawSize + buffer && 
                my >= py - buffer && my <= py + drawSize + buffer) {
                return true;
            }
        }
        return false;
    }

    rotate() {
        let newShape = this.shape.map(cell => ({ r: cell.c, c: -cell.r }));
        this.normalize(newShape);
    }

    flip() {
        let newShape = this.shape.map(cell => ({ r: cell.r, c: -cell.c }));
        this.normalize(newShape);
    }

    normalize(newShape) {
        const minR = Math.min(...newShape.map(c => c.r));
        const minC = Math.min(...newShape.map(c => c.c));
        this.shape = newShape.map(cell => ({ r: cell.r - minR, c: cell.c - minC }));
    }

    snapToGrid(otherPieces) {
        const col = Math.round((this.x - MARGIN_X) / CELL_SIZE);
        const row = Math.round((this.y - MARGIN_Y) / CELL_SIZE);
        let validPosition = true;
        let potentialCells = [];
        for (let cell of this.shape) {
            const gridR = row + cell.r;
            const gridC = col + cell.c;
            if (gridR < 0 || gridR >= BOARD_ROWS || gridC < 0 || gridC >= BOARD_COLS) {
                validPosition = false; break;
            }
            potentialCells.push(`${gridR},${gridC}`);
        }
        if (validPosition) {
            for (let other of otherPieces) {
                if (other === this || !other.gridPos) continue;
                for (let cell of other.shape) {
                    const otherR = other.gridPos.r + cell.r;
                    const otherC = other.gridPos.c + cell.c;
                    if (potentialCells.includes(`${otherR},${otherC}`)) {
                        validPosition = false; break;
                    }
                }
                if (!validPosition) break;
            }
        }
        if (validPosition) {
            this.x = MARGIN_X + col * CELL_SIZE;
            this.y = MARGIN_Y + row * CELL_SIZE;
            this.gridPos = { r: row, c: col };
        } else {
            this.returnToTray();
        }
    }
    
    returnToTray() {
        this.x = this.initialPos.x;
        this.y = this.initialPos.y;
        this.gridPos = null; 
    }
}

let pieces = [];
let draggingPiece = null;
let lastSelectedPiece = null; 
let dragOffset = { x: 0, y: 0 };

function initGame() {
    resizeCanvas();
    
    document.getElementById('btnRotate').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation(); rotateCurrentPiece();
    });
    document.getElementById('btnFlip').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation(); flipCurrentPiece();
    });
    document.getElementById('btnReset').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation(); resetGame();
    });
    // SỰ KIỆN MỚI: BẬT/TẮT MÙ MÀU
    document.getElementById('btnColorBlind').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation(); 
        toggleColorBlind();
    });
    
    draw(); 
}

function toggleColorBlind() {
    isColorBlindMode = !isColorBlindMode;
    const btn = document.getElementById('btnColorBlind');
    // Đổi style nút bấm để biết đang bật hay tắt
    if(isColorBlindMode) {
        btn.style.backgroundColor = '#222';
        btn.style.border = '2px solid white';
    } else {
        btn.style.backgroundColor = '#555';
        btn.style.border = 'none';
    }
    draw(); // Vẽ lại toàn bộ
}

function resetGame() {
    createPiecesLayout();
    draggingPiece = null;
    lastSelectedPiece = null;
    draw();
}

function rotateCurrentPiece() {
    let target = draggingPiece || lastSelectedPiece;
    if (target) { target.rotate(); draw(); }
}

function flipCurrentPiece() {
    let target = draggingPiece || lastSelectedPiece;
    if (target) { target.flip(); draw(); }
}

function resizeCanvas() {
    const w = window.innerWidth;
    canvas.width = w;

    CELL_SIZE = Math.floor((w - 20) / 8); 
    if (CELL_SIZE < 32) CELL_SIZE = 32;
    if (CELL_SIZE > 50) CELL_SIZE = 50;

    MARGIN_X = (w - (BOARD_COLS * CELL_SIZE)) / 2;
    if (MARGIN_X < 5) MARGIN_X = 5;
    MARGIN_Y = 80; // Margin lớn hơn cho header

    const requiredHeight = createPiecesLayout();
    canvas.height = requiredHeight + 100;
    
    draw();
}

function createPiecesLayout() {
    pieces = [];
    const keys = Object.keys(SHAPES);
    const startTrayY = MARGIN_Y + (BOARD_ROWS * CELL_SIZE) + 30; 
    
    let currentX = 15;
    let currentY = startTrayY;
    let rowMaxH = 0;
    const trayCellSize = CELL_SIZE * TRAY_SCALE;
    
    keys.forEach((key) => {
        let tempPiece = new Piece(key, 0, 0);
        let shape = tempPiece.shape;
        let defaultWidth = (Math.max(...shape.map(c=>c.c)) + 1);
        let defaultHeight = (Math.max(...shape.map(c=>c.r)) + 1);

        if (defaultWidth > defaultHeight) {
            tempPiece.rotate();
        }
        
        let finalShape = tempPiece.shape;
        let pWidth = (Math.max(...finalShape.map(c=>c.c)) + 1) * trayCellSize;
        let pHeight = (Math.max(...finalShape.map(c=>c.r)) + 1) * trayCellSize;

        if (currentX + pWidth > canvas.width - 5) {
            currentX = 15;
            currentY += rowMaxH + TRAY_GAP; 
            rowMaxH = 0;
        }

        tempPiece.x = currentX;
        tempPiece.y = currentY;
        tempPiece.initialPos = {x: currentX, y: currentY}; 
        pieces.push(tempPiece);
        
        currentX += pWidth + TRAY_GAP; 
        if (pHeight > rowMaxH) rowMaxH = pHeight;
    });

    return currentY + rowMaxH;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    pieces.sort((a, b) => {
        if (a === draggingPiece) return 1;
        if (b === draggingPiece) return -1;
        return 0;
    });
    pieces.forEach(p => p.draw());
}

function drawBoard() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${CELL_SIZE * 0.45}px Arial`; 
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const x = MARGIN_X + c * CELL_SIZE;
            const y = MARGIN_Y + r * CELL_SIZE;
            ctx.fillStyle = COLORS.BOARD;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = COLORS.GRID;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            const content = BOARD_CONTENT[r][c];
            if (content !== "") {
                const isRed = ["Sun", "25", "26", "CN", "CN_K"].includes(content);
                ctx.fillStyle = isRed ? COLORS.TEXT_RED : COLORS.TEXT;
                ctx.fillText(content, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
            }
        }
    }
}

function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function handleStart(e) {
    const pos = getEventPos(e);
    for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i].containsPoint(pos.x, pos.y)) {
            if(e.target === canvas) e.preventDefault();
            draggingPiece = pieces[i];
            draggingPiece.isDragging = true;
            lastSelectedPiece = draggingPiece;
            draggingPiece.gridPos = null; 
            dragOffset.x = pos.x - draggingPiece.x;
            dragOffset.y = pos.y - draggingPiece.y;
            draw();
            return; 
        }
    }
}

function handleMove(e) {
    if (draggingPiece) {
        if(e.target === canvas) e.preventDefault();
        const pos = getEventPos(e);
        draggingPiece.x = pos.x - dragOffset.x;
        draggingPiece.y = pos.y - dragOffset.y;
        draw(); 
    }
}

function handleEnd(e) {
    if (draggingPiece) {
        if(e.target === canvas) e.preventDefault();
        draggingPiece.isDragging = false;
        draggingPiece.snapToGrid(pieces);
        draggingPiece = null;
        draw();
    }
}

canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });

window.addEventListener('orientationchange', () => { setTimeout(resizeCanvas, 200); });
window.addEventListener('resize', resizeCanvas);

initGame();
