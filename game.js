const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CẤU HÌNH ---
const BOARD_ROWS = 9; // Quay về 9 hàng
const BOARD_COLS = 7;
let CELL_SIZE = 30; 

// Giảm scale trong khay xuống 0.5 để hiển thị được nhiều hơn
const TRAY_SCALE = 0.5; 
const TRAY_GAP = 15; 

let MARGIN_X = 10;
let MARGIN_Y = 60; // Dành khoảng trống bên trên cho nút bấm (nếu cần)

const COLORS = {
    BG: '#F0E6D2',
    BOARD: '#FFFAF0',
    GRID: '#C8BEAA',
    TEXT: '#50463C',
    TEXT_RED: '#C83232',
    HIGHLIGHT: 'rgba(255, 255, 255, 0.5)',
};

const SHAPE_COLORS = {
    'F': '#EF476F', 'I': '#118AB2', 'L': '#FFD166', 'P': '#06D6A0',
    'N': '#8338EC', 'T': '#FB5607', 'U': '#3A86FF', 'V': '#FF006E',
    'W': '#8D99AE', 'X': '#E9C46A', 'Y': '#F4A261', 'Z': '#2A9D8F',
    'S': '#8B4513'
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
        
        if (this.key.startsWith('S')) this.color = SHAPE_COLORS['S'];
        else this.color = SHAPE_COLORS[this.key] || '#A0643C';

        this.normalize(this.shape);
    }

    getCurrentScale() {
        if (this.isDragging || this.gridPos !== null) return 1.0;
        return TRAY_SCALE;
    }

    draw() {
        const scale = this.getCurrentScale();
        const drawSize = CELL_SIZE * scale;
        
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';

        this.shape.forEach(cell => {
            const px = this.x + cell.c * drawSize;
            const py = this.y + cell.r * drawSize;
            
            ctx.fillRect(px, py, drawSize, drawSize);
            ctx.strokeRect(px, py, drawSize, drawSize);
            
            ctx.fillStyle = COLORS.HIGHLIGHT;
            ctx.fillRect(px + 2, py + 2, drawSize - 4, drawSize * 0.3);
            ctx.fillStyle = this.color; 
        });
    }

    containsPoint(mx, my) {
        const scale = this.getCurrentScale();
        const drawSize = CELL_SIZE * scale;
        const buffer = 10; 

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
            
            // Chỉ check biên
            if (gridR < 0 || gridR >= BOARD_ROWS || gridC < 0 || gridC >= BOARD_COLS) {
                validPosition = false;
                break;
            }
            potentialCells.push(`${gridR},${gridC}`);
        }

        // Check va chạm
        if (validPosition) {
            for (let other of otherPieces) {
                if (other === this || !other.gridPos) continue;
                for (let cell of other.shape) {
                    const otherR = other.gridPos.r + cell.r;
                    const otherC = other.gridPos.c + cell.c;
                    if (potentialCells.includes(`${otherR},${otherC}`)) {
                        validPosition = false;
                        break;
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
let lastSelectedPiece = null; // Lưu khối cuối cùng chạm vào để xoay
let dragOffset = { x: 0, y: 0 };

function initGame() {
    resizeCanvas();
    
    // Nút điều khiển
    document.getElementById('btnRotate').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        rotateCurrentPiece();
    });
    document.getElementById('btnFlip').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        flipCurrentPiece();
    });
    
    // Fix lỗi không hiển thị: Vẽ ngay lập tức sau khi init
    draw(); 
}

function rotateCurrentPiece() {
    let target = draggingPiece || lastSelectedPiece;
    if (target) {
        target.rotate();
        // Nếu đang trên bảng, xoay xong có thể bị chồng lấn -> Kệ cho người dùng tự sửa
        // hoặc logic phức tạp hơn là check va chạm. Ở đây ta cho phép xoay tự do.
        draw();
    }
}

function flipCurrentPiece() {
    let target = draggingPiece || lastSelectedPiece;
    if (target) {
        target.flip();
        draw();
    }
}

function resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w;
    canvas.height = h;

    // Tính toán kích thước
    // Cần chỗ cho: Bảng (9 dòng) + Khay chứa (ước tính 8 dòng)
    const totalRowsNeeded = BOARD_ROWS + 8; 
    
    const sizeByHeight = h / (totalRowsNeeded + 1);
    const sizeByWidth = (w - 20) / BOARD_COLS; 
    
    CELL_SIZE = Math.min(sizeByHeight, sizeByWidth);
    if (CELL_SIZE < 22) CELL_SIZE = 22; // Bé nhất có thể để vừa màn hình nhỏ

    MARGIN_X = (w - (BOARD_COLS * CELL_SIZE)) / 2;
    // Đẩy bảng xuống một chút để tránh bị nút bấm che (nếu nút bấm nằm đè)
    // Nhưng vì nút bấm ở góc phải, bảng canh giữa nên thường không sao.
    MARGIN_Y = 50; 

    createPiecesLayout();
}

function createPiecesLayout() {
    pieces = [];
    const keys = Object.keys(SHAPES);
    
    // Khay bắt đầu ngay dưới bảng
    const startTrayY = MARGIN_Y + (BOARD_ROWS * CELL_SIZE) + 20; 
    let currentX = 15;
    let currentY = startTrayY;
    let rowMaxH = 0;
    
    const trayCellSize = CELL_SIZE * TRAY_SCALE;

    // Ưu tiên khối nhỏ lên đầu
    const smallKeys = ['S1', 'S2', 'S3', 'S4', 'S5'];
    smallKeys.forEach(key => {
        pieces.push(new Piece(key, currentX, currentY));
        currentX += (trayCellSize * 1.5) + TRAY_GAP; 
    });

    currentY += (trayCellSize * 1.5) + TRAY_GAP;
    currentX = 15;
    
    // Các khối còn lại
    keys.forEach((key) => {
        if(key.startsWith('S')) return; 

        let tempShape = SHAPES[key];
        let pWidth = (Math.max(...tempShape.map(c=>c.c)) + 1) * trayCellSize;
        let pHeight = (Math.max(...tempShape.map(c=>c.r)) + 1) * trayCellSize;

        if (currentX + pWidth > canvas.width - 5) {
            currentX = 15;
            currentY += rowMaxH + TRAY_GAP; 
            rowMaxH = 0;
        }

        pieces.push(new Piece(key, currentX, currentY));
        currentX += pWidth + TRAY_GAP; 
        if (pHeight > rowMaxH) rowMaxH = pHeight;
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    
    // Sắp xếp để vẽ khối đang cầm lên trên cùng
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
    // Quan trọng: Chỉ preventDefault trên canvas
    if(e.target === canvas) e.preventDefault();
    
    const pos = getEventPos(e);
    
    // Check ngược từ trên xuống
    for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i].containsPoint(pos.x, pos.y)) {
            draggingPiece = pieces[i];
            draggingPiece.isDragging = true;
            lastSelectedPiece = draggingPiece; // Lưu lại để xoay/lật
            
            // Lưu trạng thái cũ nếu cần (logic Undo), hiện tại reset gridPos
            draggingPiece.gridPos = null; 
            
            // Tính offset sao cho ngón tay nằm giữa khối
            // Không nhấc lên quá cao để tránh cảm giác bị trôi
            dragOffset.x = pos.x - draggingPiece.x;
            dragOffset.y = pos.y - draggingPiece.y;
            
            draw();
            break;
        }
    }
}

function handleMove(e) {
    if(e.target === canvas) e.preventDefault();
    
    if (draggingPiece) {
        const pos = getEventPos(e);
        draggingPiece.x = pos.x - dragOffset.x;
        draggingPiece.y = pos.y - dragOffset.y;
        
        // Vẽ lại ngay lập tức -> MƯỢT
        draw(); 
    }
}

function handleEnd(e) {
    if(e.target === canvas) e.preventDefault();
    
    if (draggingPiece) {
        draggingPiece.isDragging = false;
        draggingPiece.snapToGrid(pieces);
        draggingPiece = null;
        draw();
    }
}

// Sự kiện
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });

// Resize
window.addEventListener('resize', () => {
    resizeCanvas();
    draw();
});

// Chạy game ngay lập tức khi load script
initGame();

// Phòng hờ trường hợp ảnh/font chưa load kịp
window.onload = function() {
    resizeCanvas();
    draw();
};
