const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CẤU HÌNH ---
const BOARD_ROWS = 10;
const BOARD_COLS = 7;
let CELL_SIZE = 30; // Kích thước chuẩn trên bảng
const TRAY_SCALE = 0.6; // Tỷ lệ thu nhỏ khi ở trong khay (60%)

let MARGIN_X = 20;
let MARGIN_Y = 20;

// Bảng màu riêng cho từng khối (Màu Pastel dễ nhìn + Viền đậm)
const SHAPE_COLORS = {
    'F': '#EF476F', // Hồng đậm
    'I': '#118AB2', // Xanh dương
    'L': '#FFD166', // Vàng
    'P': '#06D6A0', // Xanh ngọc
    'N': '#8338EC', // Tím
    'T': '#FB5607', // Cam đỏ
    'U': '#3A86FF', // Xanh biển
    'V': '#FF006E', // Hồng neon
    'W': '#8D99AE', // Xám xanh
    'X': '#E9C46A', // Vàng đất
    'Y': '#F4A261', // Cam đất
    'Z': '#2A9D8F', // Xanh cổ vịt
    // Màu cho khối vuông nhỏ
    'S': '#A0643C'  // Màu gỗ
};

const COLORS = {
    BG: '#F0E6D2',
    BOARD: '#FFFAF0',
    GRID: '#C8BEAA',
    TEXT: '#50463C',
    TEXT_RED: '#C83232',
    HIGHLIGHT: 'rgba(255, 255, 255, 0.5)',
    BLOCKED: '#E0D0B0'
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
    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    ["BLOCK", "", "", "", "", "", "BLOCK"]
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
    'Z': [{r:0,c:0}, {r:0,c:1}, {r:1,c:1}, {r:2,c:1}, {r:2,c:2}],
    'S1':[{r:0,c:0}], 'S2':[{r:0,c:0}], 'S3':[{r:0,c:0}], 'S4':[{r:0,c:0}], 'S5':[{r:0,c:0}]
};

class Piece {
    constructor(shapeKey, startX, startY) {
        this.key = shapeKey;
        this.shape = JSON.parse(JSON.stringify(SHAPES[shapeKey]));
        this.x = startX;
        this.y = startY;
        this.initialPos = { x: startX, y: startY };
        this.gridPos = null; // null = đang ở khay/trên tay, {r,c} = đang ở bảng
        this.isDragging = false;
        
        // Xác định màu
        if (this.key.startsWith('S')) this.color = SHAPE_COLORS['S'];
        else this.color = SHAPE_COLORS[this.key] || '#A0643C';

        this.normalize(this.shape);
    }

    // Lấy tỷ lệ hiển thị hiện tại (To hay Nhỏ)
    getCurrentScale() {
        // Nếu đang kéo HOẶC đang nằm trên bảng -> Kích thước thật (1.0)
        // Nếu đang nằm trong khay -> Thu nhỏ (TRAY_SCALE)
        if (this.isDragging || this.gridPos !== null) {
            return 1.0;
        }
        return TRAY_SCALE;
    }

    draw() {
        const scale = this.getCurrentScale();
        const drawSize = CELL_SIZE * scale;
        
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#333'; // Viền đen đậm để phân biệt
        ctx.lineWidth = 2; // Viền dày hơn
        ctx.lineJoin = 'round'; // Bo góc viền cho mềm mại

        this.shape.forEach(cell => {
            const px = this.x + cell.c * drawSize;
            const py = this.y + cell.r * drawSize;
            
            ctx.fillRect(px, py, drawSize, drawSize);
            ctx.strokeRect(px, py, drawSize, drawSize);
            
            // Highlight nhẹ 3D
            ctx.fillStyle = COLORS.HIGHLIGHT;
            ctx.fillRect(px + 2, py + 2, drawSize - 4, drawSize * 0.3);
            ctx.fillStyle = this.color; // Reset màu
        });
    }

    containsPoint(mx, my) {
        const scale = this.getCurrentScale();
        const drawSize = CELL_SIZE * scale;
        // Tăng vùng nhận diện chạm (buffer) lên 20px để dễ bấm trên điện thoại
        const buffer = 20; 

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
        // Nếu thả ra mà không phải vị trí hợp lệ trên bảng -> Về Khay
        
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
            // 2. Check ô BLOCK
            if (BOARD_CONTENT[gridR][gridC] === "BLOCK") {
                validPosition = false;
                break;
            }
            potentialCells.push(`${gridR},${gridC}`);
        }

        // 3. Check đè lên khối khác
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
            // SNAP VÀO BẢNG
            this.x = MARGIN_X + col * CELL_SIZE;
            this.y = MARGIN_Y + row * CELL_SIZE;
            this.gridPos = { r: row, c: col };
        } else {
            // TRẢ VỀ KHAY (Đưa ra khỏi bảng)
            this.returnToTray();
        }
    }
    
    returnToTray() {
        this.x = this.initialPos.x;
        this.y = this.initialPos.y;
        this.gridPos = null; 
        // Khi gridPos = null, hàm draw() sẽ tự động dùng TRAY_SCALE
    }
}

let pieces = [];
let draggingPiece = null;
let dragOffset = { x: 0, y: 0 };

// --- HÀM KHỞI TẠO ---
function initGame() {
    resizeCanvas();
    
    // Nút điều khiển
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
    // Ưu tiên xoay khối đang cầm hoặc khối vừa đặt
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

    // Tính kích thước: Bảng + Khay
    // Khay bây giờ chứa các khối nhỏ hơn, nên sẽ tiết kiệm diện tích hơn
    const totalRowsNeeded = BOARD_ROWS + 6; 
    
    const sizeByHeight = h / (totalRowsNeeded + 1);
    const sizeByWidth = (w - 20) / BOARD_COLS; 
    
    CELL_SIZE = Math.min(sizeByHeight, sizeByWidth);
    
    MARGIN_X = (w - (BOARD_COLS * CELL_SIZE)) / 2;
    MARGIN_Y = 20; 

    createPiecesLayout();
}

function createPiecesLayout() {
    pieces = [];
    const keys = Object.keys(SHAPES);
    
    // 1. Tạo 5 khối vuông nhỏ (Luôn nằm trên bảng ban đầu)
    for(let i=1; i<=5; i++) {
        let key = `S${i}`;
        let col = i; 
        let row = 9; 
        let pX = MARGIN_X + col * CELL_SIZE;
        let pY = MARGIN_Y + row * CELL_SIZE;
        
        let piece = new Piece(key, pX, pY);
        piece.gridPos = {r: row, c: col}; 
        pieces.push(piece);
    }

    // 2. Tạo 12 khối Pentomino (Ở khay - KÍCH THƯỚC NHỎ)
    const startTrayY = MARGIN_Y + (BOARD_ROWS * CELL_SIZE) + 30; 
    let currentX = 20;
    let currentY = startTrayY;
    let rowMaxH = 0;
    
    // Kích thước ô trong khay dùng scale nhỏ
    const trayCellSize = CELL_SIZE * TRAY_SCALE;

    keys.forEach((key) => {
        if(key.startsWith('S')) return; 

        let tempShape = SHAPES[key];
        // Tính kích thước thật theo scale khay
        let pWidth = (Math.max(...tempShape.map(c=>c.c)) + 1) * trayCellSize;
        let pHeight = (Math.max(...tempShape.map(c=>c.r)) + 1) * trayCellSize;

        if (currentX + pWidth > canvas.width - 10) {
            currentX = 20;
            currentY += rowMaxH + 15; // Giãn dòng
            rowMaxH = 0;
        }

        pieces.push(new Piece(key, currentX, currentY));
        
        currentX += pWidth + 25; // Khoảng cách giữa các khối rộng hơn chút cho dễ nhìn
        if (pHeight > rowMaxH) rowMaxH = pHeight;
    });
}

// --- VẼ ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    
    // Vẽ các khối: Vẽ khối trong khay trước, khối đang kéo vẽ sau cùng
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

            const content = BOARD_CONTENT[r][c];

            if (content === "BLOCK") {
                // Ô bị khóa, không vẽ gì hoặc vẽ mờ
                continue; 
            }

            ctx.fillStyle = COLORS.BOARD;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = COLORS.GRID;
            ctx.lineWidth = 1;
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

// --- XỬ LÝ CHẠM / CHUỘT ---
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
    
    // Duyệt ngược để ưu tiên khối nằm trên (nếu xếp chồng trong khay)
    for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i].containsPoint(pos.x, pos.y)) {
            draggingPiece = pieces[i];
            draggingPiece.isDragging = true;
            
            // Nếu đang trên bảng thì lưu vị trí cũ (phòng khi muốn undo logic, nhưng giờ ta dùng returnTray)
            // Logic mới: Nếu nhấc lên, coi như nó đã rời khỏi grid
            draggingPiece.gridPos = null; 
            
            // TÍNH OFFSET:
            // Quan trọng: Khi nhấc lên, khối sẽ to ra (Scale 1.0). 
            // Cần tính lại offset dựa trên kích thước thật để không bị giật.
            // Tuy nhiên để đơn giản và tạo cảm giác "nhấc lên", ta dời vị trí khối lên trên ngón tay một chút
            // để ngón tay không che mất khối.
            
            // Chuyển vị trí khối về ngay tâm ngón tay (hoặc cao hơn chút)
            draggingPiece.x = pos.x - (CELL_SIZE * 1.5); // Căn giữa tương đối
            draggingPiece.y = pos.y - (CELL_SIZE * 1.5) - 50; // Cao hơn ngón tay 50px
            
            dragOffset.x = pos.x - draggingPiece.x;
            dragOffset.y = pos.y - draggingPiece.y;
            
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
        draw();
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
