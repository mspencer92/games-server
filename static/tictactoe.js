$(function () {
        let gameType = 3;
        let currentTurn;
        let selections = {};
        let winPatterns;
        let playerPiece;
        let finished = false;

        if (gameType === 3) {
            winPatterns = [
                [11, 12, 13], [21, 22, 23], [31, 32, 33],
                [11, 21, 31], [12, 22, 32], [13, 23, 33],
                [11, 22, 33], [13, 22, 31]];
        } else if (gameType === 4) {
            winPatterns = [
                [11, 12, 13, 14], [21, 22, 23, 24], [31, 32, 33, 34], [41, 42, 43, 44],
                [11, 21, 31, 41], [12, 22, 32, 42], [13, 23, 33, 43], [14, 24, 34, 44],
                [14, 23, 32, 41], [11, 22, 33, 44]];
        } else if (gameType === 5) {
            winPatterns = [
                [11, 12, 13, 14, 15], [21, 22, 23, 24, 25], [31, 32, 33, 34, 35], [41, 42, 43, 44, 45], [51, 52, 53, 54, 55],
                [11, 21, 31, 41, 51], [12, 22, 32, 42, 52], [13, 23, 33, 43, 53], [14, 24, 34, 44, 54], [15, 25, 35, 45, 55],
                [11, 22, 33, 44, 55], [15, 24, 33, 42, 51]];
        }

        let gameId = parseInt(getParameter("game") ? getParameter("game") : Math.floor(Math.random() * 1000)); // If have url parameter game, set gameId; else get a random gameId
        if (window.location.search.indexOf("game=" + gameId) <= -1) window.location = "?game=" + gameId; // Change page location to include the gameId in the url

        let socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.hostname}:${location.port}/websocket/tictactoe`); // Connect to the websocket
        socket.onopen = function connection() {
            socket.send(JSON.stringify(["connect", {"gameId": gameId, "uuid": getUUID()}]));
        };

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

        function drawSelections() {
            selections["X"].forEach(function (selection) {
                document.getElementById(selection).innerHTML = "X";
                document.getElementById(selection).style.backgroundColor = "#3399FF";
            });

            selections["O"].forEach(function (selection) {
                document.getElementById(selection).innerHTML = "O";
                document.getElementById(selection).style.backgroundColor = "#339966";
            });
        }

        socket.onmessage = function (msg) {
            let message = JSON.parse(msg.data);
            let type = message[0];
            if (type === "selections") {
                selections = message[1];
                drawSelections();
            } else if (type === "currentTurn") {
                currentTurn = message[1];
                document.getElementById("currentTurn").innerText = currentTurn;
                if (currentTurn === "X") {
                    document.getElementById("turn").style.color = "#3399FF";
                } else if (currentTurn === "O") {
                    document.getElementById("turn").style.color = "#339966";
                }

            } else if (type === "playerPiece") {
                playerPiece = message[1];
                document.getElementById("playerPiece").innerText = playerPiece;
                if (playerPiece === "X") {
                    document.getElementById("player").style.color = "#3399FF";
                } else if (playerPiece === "Y") {
                    document.getElementById("player").style.color = "#339966";
                }
            } else if (type === "winner") {
                winner(message[1]);
            } else if (type === "tie") {
                tie();
            } else if (type === "reset") {
                reset();
            }
        };

        function ticTacToe(event) {
            if (event.target.innerHTML === "&nbsp;") {
                if (currentTurn === "X" && playerPiece === "X") {
                    event.target.innerHTML = "X";
                    event.target.style.backgroundColor = "#3399FF";
                    document.getElementById("msg").innerHTML = "&nbsp;";
                    selections["X"].push(event.target.id);
                    socket.send(JSON.stringify(["selections", selections]));
                    checkWinner();
                    currentTurn = "O";
                    socket.send(JSON.stringify(["currentTurn", currentTurn]));
                } else if (currentTurn === "O" && playerPiece === "O") {
                    event.target.innerHTML = "O";
                    event.target.style.backgroundColor = "#339966";
                    document.getElementById("msg").innerHTML = "&nbsp;";
                    selections["O"].push(event.target.id);
                    socket.send(JSON.stringify(["selections", selections]));
                    checkWinner();
                    currentTurn = "X";
                    socket.send(JSON.stringify(["currentTurn", currentTurn]));
                }
            } else {
                if (document.getElementById("msg").innerHTML !== "The X wins!!!" && document.getElementById("msg").innerHTML !== "The O wins!!!") {
                    document.getElementById("msg").innerHTML = ("You cannot change a previous move!");
                }
            }
        }


        function reset() {
            for (let i = 1; i <= gameType; i++) {
                for (let j = 1; j <= gameType; j++) {
                    document.getElementById(`${i}${j}`).innerHTML = "&nbsp;";
                    document.getElementById(`${i}${j}`).style.backgroundColor = "#FFFFFF";
                }
            }
            finished = false;
            document.getElementById("msg").innerHTML = "&nbsp;";
        }

        function generateBoard() {
            for (let i = 1; i <= gameType; i++) {
                let tr = document.createElement("tr");
                for (let j = 1; j <= gameType; j++) {
                    let cell = `${i}${j}`;
                    let td = document.createElement("td");
                    td.id = cell;
                    td.innerHTML = "&nbsp;";
                    td.addEventListener("click", function (element) {
                        ticTacToe(element);
                    });
                    tr.appendChild(td);
                }
                document.getElementById("board").appendChild(tr);
            }
        }

        function isWinner(wins, selections) {
            let match = 0;

            wins.forEach(function (win) {
                selections.forEach(function (selection) {
                    if (win === parseInt(selection)) {
                        match++;
                    }
                });
            });
            return match === wins.length;
        }

        function checkWinner() {
            finished = false;
            for (let x = 0; x < winPatterns.length; x++) {
                if (finished !== true) {
                    finished = isWinner(winPatterns[x], selections[currentTurn]);
                    if (finished === true) {
                        break;
                    }
                }
            }
            if (finished === true) {
                socket.send(JSON.stringify(["winner", currentTurn]));
            } else {
                noWinner();
            }
        }

        function winner(piece) {
            for (let i = 1; i <= gameType; i++) {
                for (let j = 1; j <= gameType; j++) {
                    if (document.getElementById(`${i}${j}`).innerHTML === "&nbsp;") {
                        document.getElementById(`${i}${j}`).innerText = "-";
                        document.getElementById(`${i}${j}`).style.backgroundColor = "#808080";
                    }
                }
            }
            document.getElementById("msg").innerText = `The ${piece} wins!!!`

        }

        function noWinner() {
            let pieces = 0;
            for (let i = 1; i <= gameType; i++) {
                for (let j = 1; j <= gameType; j++) {
                    if (document.getElementById(`${i}${j}`).innerHTML !== "&nbsp;") {
                        pieces++;
                    }
                }
            }
            if (pieces === gameType * gameType) {
                socket.send(JSON.stringify(["tie"]));
            }
        }

        function tie() {
            document.getElementById("msg").innerText = "TIE!";
        }

        generateBoard();
        document.getElementById("btnReset").addEventListener("click", function () {
            socket.send(JSON.stringify(["reset"]));
        });
    }
);