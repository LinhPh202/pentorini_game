const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CẤU HÌNH ---
const BOARD_ROWS = 10; // Tăng lên 10 hàng
const BOARD_COLS = 7;
let CELL_SIZE = 30; 
let MARGIN_X = 20;
let MARGIN_Y = 20;

// Màu sắc
const COLORS = {
    BG: '#F0E6D2',
    BOARD: '#FFFAF0',
    GRID: '#C8BEAA',
    TEXT: '#50463C',
    TEXT_RED: '#C83232',
    PIECE: '#A0643C',
    PIECE_BORDER: '#643C1E',
    HIGHLIGHT: 'rgba(255, 255, 255, 0.4)',
    BLOCKED: '#E0D0B0' // Màu cho 2 ô góc hàng cuối
};

// Nội dung bảng
// Hàng cuối cùng: "BLOCK" là ô bị chặn, "" là ô trống cho khối vuông
const BOARD_CONTENT = [
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    ["Aug", "Sep", "Oct", "Nov", "Dec", "25", "26"],
    ["27", "28", "29", "30", "1", "2", "3"],
    ["4", "5", "6", "7", "8", "9", "10"],
    ["11", "12", "13", "14", "15", "16", "17"],
    ["18", "19", "20", "21", "22", "23", "24"],
    ["25", "26", "27", "28", "29", "30", "31"],
    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    ["BLOCK", "", "", "", "", "", "BLOCK"] // Hàng thứ 10 mới
];

const SHAPES = {
    // 12 Khối Pentomino (To)
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
    'Z': [{r:0,c:0}, {r:0,c:1}, {r:1,c:1}, {r:2,c:1}, {r:2,c:2}],
    // 5 Khối vuông nhỏ (S1-S5)
    'S1':[{r:0,c:0}], 'S2':[{r:0,c:0}], 'S3':[{r:0,c:0}], 'S4':[{r:0,c:0}], 'S5':[{r:0,c:0}]
};

class Piece {
    constructor(shapeKey, startX, startY) {
        this.shape = JSON.parse(JSON.stringify(SHAPES[shapeKey])); 
        this.x = startX;
        this.y = startY;
        this.initialPos = { x: startX, y: startY };
        this.gridPos = null; 
        this.isDragging = false;
        this.key = shapeKey; // Lưu tên để nhận biết S1-S5
        this.normalize(this.shape);
    }

    draw() {
        ctx.fillStyle = COLORS.PIECE;
        ctx.strokeStyle = COLORS.PIECE_BORDER;
        ctx.lineWidth = 1.5;

        this.shape.forEach(cell => {
            const px = this.x + cell.c * CELL_SIZE;
            const py = this.y + cell.r * CELL_SIZE;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
            
            ctx.fillStyle = COLORS.HIGHLIGHT;
            ctx.fillRect(px+2, py+2, CELL_SIZE-4, CELL_SIZE-4);
            ctx.fillStyle = COLORS.PIECE; 
        });
    }

    containsPoint(mx, my) {
        const buffer = 5; 
        for (let cell of this.shape) {
            const px = this.x + cell.c * CELL_SIZE;
            const py = this.y + cell.r * CELL_SIZE;
            if (mx >= px - buffer && mx <= px + CELL_SIZE + buffer && 
                my >= py - buffer && my <= py + CELL_SIZE + buffer) {
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
            
            // 1. Check biên bảng
            if (gridR < 0 || gridR >= BOARD_ROWS || gridC < 0 || gridC >= BOARD_COLS) {
                validPosition = false;
                break;
            }

            // 2. Check ô BLOCK (2 góc hàng cuối)
            if (BOARD_CONTENT[gridR][gridC] === "BLOCK") {
                validPosition = false;
                break;
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
        
        // Nếu là khối vuông nhỏ, khi reset sẽ về đúng ô slot của nó
        // Logic này đã được xử lý ở initialPos khi tạo
    }
}

let pieces = [];
let draggingPiece = null;
let dragOffset = { x: 0, y: 0 };

function initGame() {
    resizeCanvas();
    
    document.getElementById('btnRotate').addEventListener('click', () => {
        if (draggingPiece) draggingPiece.rotate();
        else if (pieces.length > 0) getLastInteractedPiece().rotate();
        draw();
    });
    document.getElementById('btnFlip').addEventListener('click', () => {
        if (draggingPiece) draggingPiece.flip();
        else if (pieces.length > 0) getLastInteractedPiece().flip();
        draw();
    });
    
    window.requestAnimationFrame(gameLoop);
}

function getLastInteractedPiece() {
    let loosePieces = pieces.filter(p => p.gridPos === null);
    if(loosePieces.length > 0) return loosePieces[loosePieces.length - 1];
    return pieces[pieces.length - 1];
}

function resizeCanvas() {
    const controlsHeight = document.querySelector('.controls-area').offsetHeight || 80;
    const w = window.innerWidth;
    const h = window.innerHeight - controlsHeight;

    canvas.width = w;
    canvas.height = h;

    // Bảng bây giờ cao 10 dòng. Khay chứa (12 khối to) cần thêm khoảng 6 dòng nữa.
    const totalRowsNeeded = BOARD_ROWS + 6; 
    const sizeByHeight = h / (totalRowsNeeded + 1);
    const sizeByWidth = (w - 20) / BOARD_COLS; 
    
    CELL_SIZE = Math.min(sizeByHeight, sizeByWidth);
    
    MARGIN_X = (w - (BOARD_COLS * CELL_SIZE)) / 2;
    MARGIN_Y = 10; 

    createPiecesLayout();
}

function createPiecesLayout() {
    pieces = [];
    const keys = Object.keys(SHAPES);
    
    // --- 1. Tạo 5 khối vuông nhỏ TRƯỚC (Đặt vào hàng cuối) ---
    // Hàng 9 (index), Cột 1, 2, 3, 4, 5
    for(let i=1; i<=5; i++) {
        let key = `S${i}`;
        let col = i; // Cột 1 đến 5
        let row = 9; // Hàng cuối
        
        let pX = MARGIN_X + col * CELL_SIZE;
        let pY = MARGIN_Y + row * CELL_SIZE;
        
        let piece = new Piece(key, pX, pY);
        piece.gridPos = {r: row, c: col}; // Đánh dấu là đang nằm trên bảng
        pieces.push(piece);
    }

    // --- 2. Tạo 12 khối Pentomino (Đặt vào khay bên dưới) ---
    const startTrayY = MARGIN_Y + (BOARD_ROWS * CELL_SIZE) + 20; 
    let currentX = 10;
    let currentY = startTrayY;
    let rowMaxH = 0;

    keys.forEach((key) => {
        if(key.startsWith('S')) return; // Bỏ qua S1-S5 đã tạo rồi

        let tempShape = SHAPES[key];
        let pWidth = (Math.max(...tempShape.map(c=>c.c)) + 1) * CELL_SIZE;
        let pHeight = (Math.max(...tempShape.map(c=>c.r)) + 1) * CELL_SIZE;

        if (currentX + pWidth > canvas.width - 10) {
            currentX = 10;
            currentY += rowMaxH + 10;
            rowMaxH = 0;
        }

        pieces.push(new Piece(key, currentX, currentY));
        
        currentX += pWidth + 15;
        if (pHeight > rowMaxH) rowMaxH = pHeight;
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    pieces.forEach(p => { if (p !== draggingPiece) p.draw(); });
    if (draggingPiece) draggingPiece.draw();
}

function drawBoard() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${CELL_SIZE * 0.45}px Arial`; 

    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const x = MARGIN_X + c * CELL_SIZE;
            const y = MARGIN_Y + r * CELL_SIZE;

            const content = BOARD_CONTENT[r][c];

            // Nếu là ô BLOCK (2 góc dưới)
            if (content === "BLOCK") {
                // Có thể vẽ hoặc không vẽ gì (để trống)
                // Ở đây mình vẽ mờ đi để biết là không được đặt
                ctx.fillStyle = COLORS.BG; // Màu trùng nền
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                continue; 
            }

            ctx.fillStyle = COLORS.BOARD;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = COLORS.GRID;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

            if (content !== "") {
                const isRed = ["Sun", "25", "26", "CN", "CN_K"].includes(content);
                ctx.fillStyle = isRed ? COLORS.TEXT_RED : COLORS.TEXT;
                ctx.fillText(content, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
            }
        }
    }
}

function gameLoop() {
    draw();
    window.requestAnimationFrame(gameLoop);
}

// --- XỬ LÝ SỰ KIỆN ---
function getEventPos(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
        return { x: e.clientX, y: e.clientY };
    }
}

function handleStart(e) {
    if(e.target == canvas) e.preventDefault(); 
    
    const pos = getEventPos(e);
    for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i].containsPoint(pos.x, pos.y)) {
            draggingPiece = pieces[i];
            draggingPiece.isDragging = true;
            
            // Nếu nhấc từ bảng lên, lưu vị trí cũ để trả về nếu thả sai
            if (draggingPiece.gridPos) {
                 draggingPiece.initialPos = {x: draggingPiece.x, y: draggingPiece.y};
            }
            draggingPiece.gridPos = null; 

            dragOffset.x = pos.x - draggingPiece.x;
            dragOffset.y = pos.y - draggingPiece.y;
            
            pieces.splice(i, 1);
            pieces.push(draggingPiece);
            break;
        }
    }
}

function handleMove(e) {
    if(e.target == canvas) e.preventDefault();
    if (draggingPiece) {
        const pos = getEventPos(e);
        draggingPiece.x = pos.x - dragOffset.x;
        draggingPiece.y = pos.y - dragOffset.y;
    }
}

function handleEnd(e) {
    if(e.target == canvas) e.preventDefault();
    if (draggingPiece) {
        draggingPiece.isDragging = false;
        draggingPiece.snapToGrid(pieces);
        draggingPiece = null;
    }
}

canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });

window.addEventListener('resize', () => {
    resizeCanvas(); 
});

initGame();
