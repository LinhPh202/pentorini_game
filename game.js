const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CẤU HÌNH ---
const BOARD_ROWS = 9;
const BOARD_COLS = 7;
let CELL_SIZE = 40; // Sẽ được tính toán lại dựa trên màn hình
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
    HIGHLIGHT: 'rgba(255, 255, 255, 0.3)'
};

// Nội dung bảng
const BOARD_CONTENT = [
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    ["Aug", "Sep", "Oct", "Nov", "Dec", "25", "26"],
    ["27", "28", "29", "30", "1", "2", "3"],
    ["4", "5", "6", "7", "8", "9", "10"],
    ["11", "12", "13", "14", "15", "16", "17"],
    ["18", "19", "20", "21", "22", "23", "24"],
    ["25", "26", "27", "28", "29", "30", "31"],
    ["CN", "T3", "T4", "T5", "T6", "T7", "CN_K"]
];

// Định nghĩa 12 khối Pentomino + Khối đơn
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
    'Z': [{r:0,c:0}, {r:0,c:1}, {r:1,c:1}, {r:2,c:1}, {r:2,c:2}],
    'S1':[{r:0,c:0}], 'S2':[{r:0,c:0}], 'S3':[{r:0,c:0}], 'S4':[{r:0,c:0}], 'S5':[{r:0,c:0}] // 5 khối đơn
};

// --- LỚP ĐỐI TƯỢNG KHỐI ---
class Piece {
    constructor(shapeKey, startX, startY) {
        this.shape = JSON.parse(JSON.stringify(SHAPES[shapeKey])); // Deep copy
        this.x = startX;
        this.y = startY;
        this.initialPos = { x: startX, y: startY };
        this.gridPos = null; // {r, c} nếu đang trên bảng
        this.isDragging = false;
    }

    draw() {
        ctx.fillStyle = COLORS.PIECE;
        ctx.strokeStyle = COLORS.PIECE_BORDER;
        ctx.lineWidth = 2;

        this.shape.forEach(cell => {
            const px = this.x + cell.c * CELL_SIZE;
            const py = this.y + cell.r * CELL_SIZE;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
            
            // Highlight nhẹ
            ctx.fillStyle = COLORS.HIGHLIGHT;
            ctx.fillRect(px+2, py+2, CELL_SIZE-4, CELL_SIZE-4);
            ctx.fillStyle = COLORS.PIECE; // Reset lại màu
        });
    }

    containsPoint(mx, my) {
        for (let cell of this.shape) {
            const px = this.x + cell.c * CELL_SIZE;
            const py = this.y + cell.r * CELL_SIZE;
            if (mx >= px && mx <= px + CELL_SIZE && my >= py && my <= py + CELL_SIZE) {
                return true;
            }
        }
        return false;
    }

    rotate() {
        // Xoay 90 độ: (r, c) -> (c, -r)
        let newShape = this.shape.map(cell => ({ r: cell.c, c: -cell.r }));
        this.normalize(newShape);
    }

    flip() {
        // Lật ngang: (r, c) -> (r, -c)
        let newShape = this.shape.map(cell => ({ r: cell.r, c: -cell.c }));
        this.normalize(newShape);
    }

    normalize(newShape) {
        // Đưa khối về gốc (0,0) để dễ điều khiển
        const minR = Math.min(...newShape.map(c => c.r));
        const minC = Math.min(...newShape.map(c => c.c));
        this.shape = newShape.map(cell => ({ r: cell.r - minR, c: cell.c - minC }));
    }

    snapToGrid(otherPieces) {
        const col = Math.round((this.x - MARGIN_X) / CELL_SIZE);
        const row = Math.round((this.y - MARGIN_Y) / CELL_SIZE);
        
        let validPosition = true;
        let potentialCells = [];

        // 1. Check biên bảng
        for (let cell of this.shape) {
            const gridR = row + cell.r;
            const gridC = col + cell.c;
            if (gridR < 0 || gridR >= BOARD_ROWS || gridC < 0 || gridC >= BOARD_COLS) {
                validPosition = false;
                break;
            }
            potentialCells.push(`${gridR},${gridC}`);
        }

        // 2. Check va chạm
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
            // Bay về chỗ cũ
            this.x = this.initialPos.x;
            this.y = this.initialPos.y;
            this.gridPos = null;
        }
    }
}

// --- TRẠNG THÁI GAME ---
let pieces = [];
let draggingPiece = null;
let dragOffset = { x: 0, y: 0 };

// --- KHỞI TẠO ---
function initGame() {
    resizeCanvas();
    createPieces();
    // Thêm sự kiện cho nút bấm trên mobile
    document.getElementById('btnRotate').addEventListener('click', () => {
        if (draggingPiece) draggingPiece.rotate();
        else if (pieces.length > 0) pieces[pieces.length - 1].rotate(); // Xoay khối vừa tương tác
        draw();
    });
    document.getElementById('btnFlip').addEventListener('click', () => {
        if (draggingPiece) draggingPiece.flip();
        else if (pieces.length > 0) pieces[pieces.length - 1].flip();
        draw();
    });
    
    window.requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    // Tính toán kích thước dựa trên màn hình điện thoại
    // Trừ đi phần controls ở dưới
    const controlsHeight = document.querySelector('.controls-area').offsetHeight || 80;
    const availableHeight = window.innerHeight - controlsHeight - 20; 
    const availableWidth = window.innerWidth - 20;

    // Bảng là 7 cột, khay chứa khoảng 4 cột nữa = 11 cột chiều ngang ước tính
    // Chiều dọc khoảng 13 hàng (9 bảng + 4 khay)
    
    // Ưu tiên hiển thị bảng rõ ràng
    const sizeByWidth = availableWidth / (BOARD_COLS + 1);
    const sizeByHeight = availableHeight / (BOARD_ROWS + 6); // +6 cho phần khay bên dưới
    
    CELL_SIZE = Math.min(sizeByWidth, sizeByHeight);
    // Giới hạn CELL_SIZE không quá nhỏ hoặc quá to
    CELL_SIZE = Math.max(30, Math.min(CELL_SIZE, 60));

    MARGIN_X = (window.innerWidth - (BOARD_COLS * CELL_SIZE)) / 2;
    if (MARGIN_X < 10) MARGIN_X = 10;
    MARGIN_Y = 20;

    // Đặt kích thước canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - controlsHeight;
}

function createPieces() {
    pieces = [];
    const trayY = MARGIN_Y + BOARD_ROWS * CELL_SIZE + 30; // Vị trí khay bên dưới bảng
    let currentX = MARGIN_X;
    let currentY = trayY;
    let maxHeightInRow = 0;

    const keys = Object.keys(SHAPES);
    keys.forEach((key, index) => {
        pieces.push(new Piece(key, currentX, currentY));
        
        // Tính toán vị trí cho khối tiếp theo trong khay
        const shape = SHAPES[key];
        const width = (Math.max(...shape.map(c => c.c)) + 1) * CELL_SIZE;
        const height = (Math.max(...shape.map(c => c.r)) + 1) * CELL_SIZE;
        
        currentX += width + 20;
        maxHeightInRow = Math.max(maxHeightInRow, height);

        // Xuống dòng nếu hết chỗ ngang
        if (currentX + CELL_SIZE * 3 > canvas.width) {
            currentX = MARGIN_X;
            currentY += maxHeightInRow + 20;
            maxHeightInRow = 0;
        }
    });
}

// --- VÒNG LẶP GAME ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    // Vẽ khối đang kéo sau cùng để nó nằm trên
    pieces.forEach(p => { if (p !== draggingPiece) p.draw(); });
    if (draggingPiece) draggingPiece.draw();
}

function drawBoard() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${CELL_SIZE * 0.4}px Arial`;

    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const x = MARGIN_X + c * CELL_SIZE;
            const y = MARGIN_Y + r * CELL_SIZE;

            ctx.fillStyle = COLORS.BOARD;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = COLORS.GRID;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

            const text = BOARD_CONTENT[r][c];
            const isRed = ["Sun", "25", "26", "CN", "CN_K"].includes(text);
            ctx.fillStyle = isRed ? COLORS.TEXT_RED : COLORS.TEXT;
            ctx.fillText(text, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        }
    }
}

function gameLoop() {
    draw();
    window.requestAnimationFrame(gameLoop);
}

// --- XỬ LÝ SỰ KIỆN (TOUCH & MOUSE) ---

function getEventPos(e) {
    // Lấy tọa độ chính xác của chuột hoặc điểm chạm
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
        return { x: e.clientX, y: e.clientY };
    }
}

function handleStart(e) {
    e.preventDefault(); // Ngăn cuộn trang
    const pos = getEventPos(e);
    // Duyệt ngược để lấy khối trên cùng
    for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i].containsPoint(pos.x, pos.y)) {
            draggingPiece = pieces[i];
            draggingPiece.isDragging = true;
            draggingPiece.gridPos = null; // Nhấc lên
            dragOffset.x = pos.x - draggingPiece.x;
            dragOffset.y = pos.y - draggingPiece.y;
            
            // Đưa lên đầu mảng để vẽ cuối cùng
            pieces.splice(i, 1);
            pieces.push(draggingPiece);
            break;
        }
    }
}

function handleMove(e) {
    e.preventDefault();
    if (draggingPiece) {
        const pos = getEventPos(e);
        draggingPiece.x = pos.x - dragOffset.x;
        draggingPiece.y = pos.y - dragOffset.y;
    }
}

function handleEnd(e) {
    e.preventDefault();
    if (draggingPiece) {
        draggingPiece.isDragging = false;
        draggingPiece.snapToGrid(pieces);
        draggingPiece = null;
    }
}

// Gán sự kiện cho cả chuột (PC) và cảm ứng (Mobile)
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });

// Xử lý khi xoay màn hình
window.addEventListener('resize', () => {
    resizeCanvas();
    createPieces(); // Reset vị trí các khối khi resize để tránh lỗi
    draw();
});

// Bắt đầu game
initGame();
