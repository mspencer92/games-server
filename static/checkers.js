$(function () {
    let canvas = document.getElementById("board");
    let ctx = canvas.getContext("2d");
    let offsetX;
    let offsetY;
    let boardPieces = [];
    let boardTiles = [];
    let pieceThatCanMoveAgain;
    let blueMoveAgain;
    let greenMoveAgain;
    let mouseIsDown = false;
    let movingPiece;
    let lastX;
    let lastY;
    let jumpColumn;
    let jumpRow;
    let playerColor;
    let currentTurn;
    let blueScore;
    let greenScore;
    let BLOCK_SIZE;
    let flyingKings = false;

    BLOCK_SIZE = calculateBlockSize();
    canvas.height = BLOCK_SIZE * 8;
    canvas.width = BLOCK_SIZE * 8;


    let gameId = parseInt(getParameter("game") ? getParameter("game") : Math.floor(Math.random() * 1000)); // If have url parameter game, set gameId; else get a random gameId
    if (window.location.search.indexOf("game=" + gameId) <= -1) window.location = "?game=" + gameId; // Change page location to include the gameId in the url

    let socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.hostname}:${location.port}/websocket/checkers`); // Connect to the websocket
    socket.onopen = function connection() {
        socket.send(JSON.stringify(["connect", {"gameId": gameId, "uuid": getUUID()}]));
    };
    positionBoard();

    function getParameter(name) {
        let params = {};
        location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (s, k, v) {
            params[k] = v
        });
        return params[name];
    }

    function getUUID() {
        let uuid;
        if (window.localStorage.getItem("uuid")) {
            uuid = window.localStorage.getItem("uuid");
        } else {
            uuid = create_UUID();
            window.localStorage.setItem("uuid", uuid);
        }
        return uuid;
    }

    function create_UUID() { // Generates a UUID that the browser uses to identify with the socket server.
        let dt = new Date().getTime();
        return "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".replace(/[x]/g, function (c) {
            let r = (dt + Math.random() * 16) % 16 | 0;
            dt = Math.floor(dt / 16);
            return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function zoomOutMobile() {
        let viewport = document.querySelector("meta[name=\"viewport\"]");
        if (viewport) {
            viewport.content = "initial-scale=0.1";
            viewport.content = "width=device-width";
        }
    }

    function calculateBlockSize() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && window.orientation === 0) {
            if (((window.innerHeight - 100) / 8) < ((window.innerWidth) / 8)) {
                return (window.innerHeight - 100) / 8;
            } else {
                return (window.innerWidth) / 8;
            }
        } else {
            if (((window.innerHeight) / 8) < ((window.innerWidth - 250) / 8)) {
                return (window.innerHeight) / 8;
            } else {
                return (window.innerWidth - 250) / 8;
            }
        }

    }


    function drawBoard() { // Generates the board and then draws each tile
        let color;
        boardTiles = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (i % 2) {
                    color = j % 2 ? "RED" : "BLACK";
                } else {
                    color = j % 2 ? "BLACK" : "RED";
                }
                drawTile({
                    column: i,
                    row: j,
                    color: color
                });
                boardTiles.push({
                    column: i,
                    row: j,
                    color: color
                });
            }
        }
    }

    function drawPiece(piece) { // Draws the piece inside the row and column it belongs in on the board
        ctx.beginPath(); // Start the path to draw the piece
        ctx.arc((piece.column - 1) * BLOCK_SIZE + (BLOCK_SIZE * 0.5) + 0.5, (piece.row - 1) * BLOCK_SIZE + (BLOCK_SIZE * 0.5) + 0.5, (BLOCK_SIZE * 0.5) - 10, 0, 2 * Math.PI, false); // Calculates the x and y coordinates of the piece
        ctx.fillStyle = piece.color; // Changes the ctx fill color to the piece of the color
        ctx.strokeStyle = "WHITE"; // Changes the ctx stroke color to white
        ctx.fill(); // Fills the piece to the color that is set
        ctx.stroke(); // Outlines the piece  to the color that is set
        if (piece.king) { // If the piece is king
            ctx.fillStyle = "GOLD"; // Change the font color to gold
            ctx.font = (BLOCK_SIZE / 4) + "px Arial"; // Calculates the font size and sets it
            ctx.textAlign = "center"; // Set the text align to centered
            ctx.fillText("K", (piece.column - 1) * BLOCK_SIZE + (BLOCK_SIZE * 0.5) + 0.5, (piece.row - 1) * BLOCK_SIZE + (BLOCK_SIZE * 0.5)); // Draws a "K" on the piece if the piece is king
        }
    }

    function drawTile(tile) { // Draws the tile on the board
        ctx.beginPath(); // Start the path to draw the tile
        ctx.rect(tile.column * BLOCK_SIZE, tile.row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE); // Calculates the x and y coordinates of the tile and draws it
        ctx.fillStyle = tile.color; // Changes the ctx fill color to the piece of the tile
        ctx.fill(); // Fills the piece to the color that is set
    }


    function drawBoardAndPieces() { // Draws the board and all the pieces to the board
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clears the canvas
        drawBoard(); // Draws the board

        boardPieces.forEach(function (piece) { // Loops through the pieces on the board
            if (piece !== movingPiece) { // Check to see if it is the moving piece
                drawPiece(piece); // Draw the piece
            }
        });

        if (movingPiece) { // Draw the moving piece last so it is above all others
            drawPiece(movingPiece);
        }
    }


    function canPieceJump(piece) {
        let canJump = false;
        let blueJumpVariations = [
            [1, 1],
            [-1, 1]
        ]; // Jump variations for the blue pieces
        let greenJumpVariations = [
            [-1, -1],
            [1, -1]
        ]; // Jump variations for the green pieces
        let jumpVariations = piece.color === "BLUE" ? blueJumpVariations : greenJumpVariations; // Sets the jump variations for the player color
        boardPieces.forEach(function (boardPiece) {
            jumpVariations.forEach(function (jumpVariation) {
                if (boardPiece === piece) {
                } else {
                    if (movingPiece === piece) {
                        if (movingPiece.previousColumn + jumpVariation[0] === boardPiece.column && movingPiece.previousRow + jumpVariation[1] === boardPiece.row && piece.color !== boardPiece.color) {
                            canJump = true;
                            boardPieces.forEach(function (boardPieceTwoAway) {
                                if (boardPieceTwoAway === piece) {
                                } else {
                                    if ((movingPiece.previousColumn + jumpVariation[0] * 2) === 9 || (movingPiece.previousColumn + jumpVariation[0] * 2) === 0 || (piece.row + jumpVariation[1] * 2) === 0 || (piece.row + jumpVariations[1] * 2) === 9) {
                                        canJump = false;
                                    }

                                    if (movingPiece.previousColumn + (jumpVariation[0] * 2) === boardPieceTwoAway.column && movingPiece.previousRow + (jumpVariation[1] * 2) === boardPieceTwoAway.row) {
                                        canJump = false;
                                    }
                                }
                            });
                        }
                    } else {
                        if (piece.column + jumpVariation[0] === boardPiece.column && piece.row + jumpVariation[1] === boardPiece.row && piece.color !== boardPiece.color) {
                            canJump = true;
                            boardPieces.forEach(function (boardPieceTwoAway) {
                                if (boardPieceTwoAway === piece) {
                                } else {
                                    if ((piece.column + jumpVariation[0] * 2) === 9 || (piece.column + jumpVariation[0] * 2) === 0 || (piece.row + jumpVariation[1] * 2) === 0 || (piece.row + jumpVariation[1] * 2) === 9) {
                                        canJump = false;
                                    }
                                    if (piece.column + (jumpVariation[0] * 2) === boardPieceTwoAway.column && piece.row + (jumpVariation[1] * 2) === boardPieceTwoAway.row) {
                                        canJump = false;
                                    }
                                }
                            });
                        }
                    }
                }
            });
        });
        return canJump;
    }


    function canJumpAgain() {
        let canJump = false;
        let blueJumpVariations = [
            [1, 1],
            [-1, 1]
        ];
        let greenJumpVariations = [
            [-1, -1],
            [1, -1]
        ];
        let jumpVariations = movingPiece.color === "BLUE" ? blueJumpVariations : greenJumpVariations;
        boardPieces.forEach(function (boardPiece) {
            jumpVariations.forEach(function (jumpVariation) { // Loops through the jump variations
                if (boardPiece !== movingPiece) {
                    if (movingPiece.column + jumpVariation[0] === boardPiece.column && movingPiece.row + jumpVariation[1] === boardPiece.row && movingPiece.color !== boardPiece.color) {
                        canJump = true;
                        boardPieces.forEach(function (boardPieceTwoAway) {
                            if ((movingPiece.column + jumpVariation[0] * 2) > 8 || (movingPiece.row + jumpVariation[1] * 2) > 8) {
                                canJump = false;
                            }
                            if (movingPiece.column + (jumpVariation[0] * 2) === boardPieceTwoAway.column && movingPiece.row + (jumpVariation[1] * 2) === boardPieceTwoAway.row) {
                                canJump = false;
                            }
                        });
                    }
                }
            });
        });
        return canJump;
    }


    function checkDiagonal() {
        if (movingPiece.king) {
            if ((movingPiece.column === movingPiece.previousColumn) || (movingPiece.row === movingPiece.previousRow) || (Math.abs(movingPiece.previousColumn - movingPiece.column) !== Math.abs(movingPiece.previousRow - movingPiece.row))) {
                return false;
            }
        } else {
            if (currentTurn === "BLUE") {
                if ((movingPiece.column === movingPiece.previousColumn) || (movingPiece.row <= movingPiece.previousRow) || (Math.abs(movingPiece.previousColumn - movingPiece.column) > 2) || (Math.abs(movingPiece.previousColumn - movingPiece.column) !== Math.abs(movingPiece.previousRow - movingPiece.row))) {
                    return false;
                }
            } else {
                if ((movingPiece.column === movingPiece.previousColumn) || (movingPiece.row >= movingPiece.previousRow) || (Math.abs(movingPiece.previousColumn - movingPiece.column) > 2) || (Math.abs(movingPiece.previousColumn - movingPiece.column) !== Math.abs(movingPiece.previousRow - movingPiece.row))) {
                    return false;
                }
            }
        }
        return true;
    }

    function checkJump() {
        let jump = 0;

        if (movingPiece.king) {
            let colDifference = movingPiece.previousColumn - movingPiece.column;
            let rowDifference = movingPiece.previousRow - movingPiece.row;
            let colTemp = movingPiece.previousColumn;
            let rowTemp = movingPiece.previousRow;
            let pieceCounter = 0;
            let colorMatch = 0;

            for (let i = 0; i < Math.abs(colDifference); i++) {
                colTemp -= colDifference / Math.abs(colDifference);
                rowTemp -= rowDifference / Math.abs(rowDifference);
                boardPieces.forEach(function (boardPiece) {
                    if (boardPiece !== movingPiece) {
                        if ((boardPiece.column === colTemp) && (boardPiece.row === rowTemp)) {
                            if (boardPiece.color === movingPiece.color) {
                                colorMatch++;
                            } else {
                                jumpColumn = boardPiece.column;
                                jumpRow = boardPiece.row;
                                pieceCounter++;
                            }
                        }
                    }
                });
            }
            if (pieceCounter === 0 && colorMatch === 0) {
                jump = 2;
            } else if (pieceCounter === 1 && colorMatch === 0) {
                jump = 1;
            }
        } else {
            if ((Math.abs(movingPiece.previousColumn - movingPiece.column) === 2) && (Math.abs(movingPiece.previousRow - movingPiece.row) === 2)) {
                if (movingPiece.previousColumn - movingPiece.column > 0) {
                    jumpColumn = movingPiece.previousColumn - 1;
                } else {
                    jumpColumn = movingPiece.previousColumn + 1;
                }
                if (movingPiece.previousRow - movingPiece.row < 0) {
                    jumpRow = movingPiece.previousRow + 1;
                } else {
                    jumpRow = movingPiece.previousRow - 1;
                }
                boardPieces.forEach(function (boardPiece) {
                    if ((boardPiece.column === jumpColumn) && (boardPiece.row === jumpRow) && (boardPiece.color !== movingPiece.color)) {
                        jump = 1;
                    }
                });
            } else {
                jump = 2;
            }
        }
        return jump;
    }

    function removePiece() {
        boardPieces.forEach(function (boardPiece) {
            if ((boardPiece.column === jumpColumn) && (boardPiece.row === jumpRow)) {
                boardPieces = boardPieces.filter(item => item !== boardPiece);
            }
        });
    }

    function checkForPiece() {
        boardPieces.forEach(function (boardPiece) {
            if (boardPiece === movingPiece) {
            } else {
                if (boardPiece.row === movingPiece.row && boardPiece.column === movingPiece.column) {
                    return true;
                }
            }
        });
        return false;
    }

    function positionBoard() { // Positions the board and score board
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && window.orientation === 0) {
            if ((window.innerHeight - (BLOCK_SIZE * 8)) / 2 > 100) {
                canvas.style.top = (window.innerHeight - (BLOCK_SIZE * 8)) / 2 + "px";
                canvas.style.bottom = "0px";
                canvas.style.left = "0px";
                offsetY = (window.innerHeight - (BLOCK_SIZE * 8)) / 2;
                offsetX = 0;
                document.getElementById("score_card").style.height = canvas.offsetTop + "px";
            } else {
                canvas.style.top = "100px";
                canvas.style.bottom = "0px";
                canvas.style.left = "0px";
                offsetY = 100;
                offsetX = 0;
                document.getElementById("score_card").style.height = "100px";
            }
        } else {
            if ((window.innerWidth - (BLOCK_SIZE * 8)) / 2 > 250) {
                canvas.style.left = (window.innerWidth - (BLOCK_SIZE * 8)) / 2 + "px";
                offsetX = (window.innerWidth - (BLOCK_SIZE * 8)) / 2;
                offsetY = 0;
                document.getElementById("score_card").style.width = canvas.offsetLeft + "px";
            } else {
                canvas.style.left = "250px";
                canvas.style.top = "0px";
                offsetX = 250;
                offsetY = 0;
                document.getElementById("score_card").style.width = "250px";
            }

        }
        zoomOutMobile();
        window.scrollTo(0, 1);

    }


    function resizeCanvas() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            if (((window.innerHeight - 100) / 8) < ((window.innerWidth) / 8)) {
                BLOCK_SIZE = (window.innerHeight) / 8;
            } else {
                BLOCK_SIZE = (window.innerHeight - 100) / 8;
            }
        } else {
            if (((window.innerHeight) / 8) < ((window.innerWidth - 250) / 8)) {
                BLOCK_SIZE = (window.innerHeight) / 8;
            } else {
                BLOCK_SIZE = (window.innerWidth - 250) / 8;
            }

        }
        canvas.width = BLOCK_SIZE * 8;
        canvas.height = BLOCK_SIZE * 8;

        positionBoard();
        drawBoardAndPieces();
    }

    function handleMouseDown(e) { // If mouse is down, set the currently moving piece and redraw
        let mouseX;
        let mouseY;

        if (event.touches) {
            mouseX = parseInt(event.touches[0].pageX - offsetX);
            mouseY = parseInt(event.touches[0].pageY - offsetY);

        } else {
            mouseX = parseInt(e.clientX - offsetX);
            mouseY = parseInt(e.clientY - offsetY);

        }
        lastX = mouseX;
        lastY = mouseY;

        let column = Math.ceil(mouseX * (1 / BLOCK_SIZE)); // Calculate the column the player is clicking
        let row = Math.ceil(mouseY * (1 / BLOCK_SIZE)); // Calculate the row the player is clicking

        boardPieces.forEach(function (boardPiece) { // Loops through the pieces on the board
            if (boardPiece.column === column && boardPiece.row === row) {
                if (boardPiece.color === currentTurn && playerColor === currentTurn) { // Check if the player is clicking a piece of its own color
                    if (currentTurn === "BLUE") {
                        pieceThatCanMoveAgain = blueMoveAgain;
                    } else if (currentTurn === "GREEN") {
                        pieceThatCanMoveAgain = greenMoveAgain;
                    }
                    if (pieceThatCanMoveAgain) { // Check if the player just jumped
                        if (pieceThatCanMoveAgain.column === boardPiece.column && pieceThatCanMoveAgain.row === boardPiece.row) { // If player just jumped, make sure the next piece they are clicking is the same as the last
                            mouseIsDown = true; // Sets that the mouse is down
                        } else { // Player is not clicking the piece they just jumped with
                            alert("You must use the piece you just jumped with."); // Tells the player that they are not clicking the piece the just jumped with
                        }
                    } else {
                        mouseIsDown = true; // Sets that the mouse is down
                    }
                }
                if (mouseIsDown) { // If mouse is down
                    movingPiece = boardPiece; // Set the current moving piece
                    movingPiece.previousColumn = column; // Sets the column where the piece originated from
                    movingPiece.previousRow = row; // Sets the row where the piece originated from
                    drawBoardAndPieces(); // Redraws the board and pieces
                }
            }
        });
    }

    function handleMouseMove(e) {
        if (!mouseIsDown) {
            return;
        }

        let mouseX;
        let mouseY;

        if (event.touches) {
            mouseX = parseInt(event.touches[0].pageX - offsetX);
            mouseY = parseInt(event.touches[0].pageY - offsetY);

        } else {
            mouseX = parseInt(e.clientX - offsetX);
            mouseY = parseInt(e.clientY - offsetY);

        }
        if (movingPiece !== null) {
            let column = Math.ceil(mouseX * (1 / BLOCK_SIZE));
            let row = Math.ceil(mouseY * (1 / BLOCK_SIZE));
            movingPiece.column = column;
            movingPiece.row = row;
        }
        drawBoardAndPieces();
    }

    function handleMouseUp() {
        if (movingPiece != null) {
            let canJump = checkJump();
            let containsPiece = checkForPiece();
            let validDiagonal = checkDiagonal();
            let hasPossibleJump;
            let successfulMove;

            for (let i = 0; i < boardPieces.length; i++) {
                if (boardPieces[i].color === currentTurn) {
                    hasPossibleJump = canPieceJump(boardPieces[i]);
                    if (hasPossibleJump) {
                        break;
                    }
                }
            }

            if ((hasPossibleJump && canJump === 2)) { // If piece moves without jumping when possible
                movingPiece.column = movingPiece.previousColumn;
                movingPiece.row = movingPiece.previousRow;
                alert("You must take all possible jumps.")
            } else {
                successfulMove = (!containsPiece && validDiagonal && canJump);
                if (!successfulMove) {
                    movingPiece.column = movingPiece.previousColumn;
                    movingPiece.row = movingPiece.previousRow;
                    alert("Invalid move.");
                }

            }


            if (canJump === 1 && successfulMove) {
                removePiece();
                if (playerColor === "BLUE") {
                    blueScore++;
                    document.getElementById("blue_score").innerText = blueScore;
                } else {
                    greenScore++;
                    document.getElementById("green_score").innerText = greenScore;
                }

                if (blueScore === 12 || greenScore === 12) {
                    let gameWinner = (blueScore === 12) ? "Blue" : "Green";
                    socket.send(JSON.stringify(["gameWinner", gameWinner]));
                }
                socket.send(JSON.stringify(["playerScores", {"blueScore": blueScore, "greenScore": greenScore}]));

            }
            if ((movingPiece.previousColumn !== movingPiece.column || movingPiece.previousRow !== movingPiece.row) && successfulMove) {
                if (canJump === 1 && canJumpAgain()) {
                    if (playerColor === "BLUE") {
                        blueMoveAgain = movingPiece;
                        greenMoveAgain = null;
                    } else if (playerColor === "GREEN") {
                        greenMoveAgain = movingPiece;
                        blueMoveAgain = null;
                    }
                    socket.send(JSON.stringify(["pieceThatCanMoveAgain", {
                        "blueMoveAgain": blueMoveAgain,
                        "greenMoveAgain": greenMoveAgain
                    }]));
                } else {
                    if (playerColor === "BLUE") {
                        blueMoveAgain = null;
                    } else if (playerColor === "GREEN") {
                        greenMoveAgain = null;
                    }
                    socket.send(JSON.stringify(["pieceThatCanMoveAgain", {
                        "blueMoveAgain": blueMoveAgain,
                        "greenMoveAgain": greenMoveAgain
                    }]));
                    pieceThatCanMoveAgain = null;
                    socket.send(JSON.stringify(["currentTurn", currentTurn === "BLUE" ? "GREEN" : "BLUE"]));
                }
            }
            if ((movingPiece.row === 1 && movingPiece.color === "GREEN") || (movingPiece.row === 8 && movingPiece.color === "BLUE")) {
                movingPiece.king = true;
            }
            socket.send(JSON.stringify(["boardPieces", boardPieces]));
        }
        movingPiece = null;
        mouseIsDown = false;

    }


    document.getElementById("games").onchange = function () {
        if (document.getElementById("games").value === "newgame") {
            window.location = "/checkers";
        } else {
            window.location = "?game=" + document.getElementById("games").value;
        }
    };

    window.addEventListener("resize", resizeCanvas, false);

    $("#board").on("mousedown touchstart", function (e) {
        e.preventDefault();
        handleMouseDown(e);
    }).on("mousemove touchmove", function (e) {
        e.preventDefault();
        handleMouseMove(e);
    }).on("mouseup touchend", function (e) {
        e.preventDefault();
        handleMouseUp();
    });

    window.addEventListener("orientationchange", function () {
        positionBoard();
        drawBoardAndPieces();
    });

    socket.onmessage = function (msg) {
        let message = JSON.parse(msg.data);
        let type = message[0];
        if (type === "boardPieces") {
            boardPieces = message[1];
            drawBoardAndPieces();
        } else if (type === "playerColor") {
            playerColor = message[1];
            document.getElementById("player_color").innerText = playerColor;
            document.getElementById("player_color").style.background = playerColor;
        } else if (type === "currentTurn") {
            currentTurn = message[1];
            document.getElementById("current_turn").innerText = currentTurn;
            document.getElementById("current_turn").style.color = currentTurn;
        } else if (type === "playerScores") {
            blueScore = message[1]["blueScore"];
            greenScore = message[1]["greenScore"];
            document.getElementById("blue_score").innerText = blueScore;
            document.getElementById("green_score").innerText = greenScore;
        } else if (type === "playerGames") {
            let games = message[1];
            games.forEach(function (game) {
                if (game === gameId) {
                    document.getElementById("games").innerHTML += `<option value="">Game #${game} - Current Game</option>`;
                }
            });
            games.forEach(function (game) {
                if (game !== gameId) {
                    document.getElementById("games").innerHTML += `<option value="${game}">Game #${game}</option>`;
                }
            });
            document.getElementById("games").innerHTML += `<option value="newgame">New Game...</option>`;
        } else if (type === "gameWinner") {
            let winner = message[1];
            canvas.removeEventListener("mousedown", handleMouseDown, false);
            canvas.removeEventListener("mouseup", handleMouseUp, false);
            canvas.removeEventListener("mousemove", handleMouseMove, false);
            canvas.removeEventListener("touchstart", handleMouseDown, false);
            canvas.removeEventListener("touchend", handleMouseUp, false);
            canvas.removeEventListener("touchmove", handleMouseMove, false);
            alert(`${winner} wins!`);
        } else if (type === "pieceThatCanMoveAgain") {
            blueMoveAgain = message[1]["blueMoveAgain"];
            greenMoveAgain = message[1]["greenMoveAgain"];
        }
    };

});