const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const fs = require('fs');
const path = require('path');

const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
};

const server = http.createServer(function (req, res) {
        const parsedUrl = url.parse(req.url);
        if (path.extname(parsedUrl.pathname) !== "" && path.extname(parsedUrl.pathname) !== ".html") {
            const ext = path.parse(parsedUrl.pathname).ext;
            fs.readFile("static/" + parsedUrl.pathname, {encoding: 'utf-8'}, function (err, data) {
                if (err) {
                    res.writeHead(404);
                } else {
                    res.setHeader('Content-type', mimeType[ext] || 'text/plain');
                    res.write(data);
                    res.end(); //end the response
                }
            });
        } else if (parsedUrl.pathname === "/") {
            fs.readFile("static/index.html", {encoding: 'utf-8'}, function (err, data) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(data);
                res.end(); //end the response
            });
        } else {
            fs.readFile("static/" + parsedUrl.pathname + ".html", {encoding: 'utf-8'}, function (err, data) {
                if (err) {
                    res.writeHead(404);
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.write(data);
                    res.end();
                }
            });
        }
    }
);
const wsCheckers = new WebSocket.Server({noServer: true});
const wsTicTacToe = new WebSocket.Server({noServer: true});

let checkerGames = [];
let checkerBoardPieces = [{"column": 2, "row": 1, "color": "BLUE", "king": false},
    {"column": 4, "row": 1, "color": "BLUE", "king": false},
    {"column": 6, "row": 1, "color": "BLUE", "king": false},
    {"column": 8, "row": 1, "color": "BLUE", "king": false},
    {"column": 1, "row": 2, "color": "BLUE", "king": false},
    {"column": 3, "row": 2, "color": "BLUE", "king": false},
    {"column": 5, "row": 2, "color": "BLUE", "king": false},
    {"column": 7, "row": 2, "color": "BLUE", "king": false},
    {"column": 2, "row": 3, "color": "BLUE", "king": false},
    {"column": 4, "row": 3, "color": "BLUE", "king": false},
    {"column": 6, "row": 3, "color": "BLUE", "king": false},
    {"column": 8, "row": 3, "color": "BLUE", "king": false},
    {"column": 1, "row": 6, "color": "GREEN", "king": false},
    {"column": 3, "row": 6, "color": "GREEN", "king": false},
    {"column": 5, "row": 6, "color": "GREEN", "king": false},
    {"column": 7, "row": 6, "color": "GREEN", "king": false},
    {"column": 2, "row": 7, "color": "GREEN", "king": false},
    {"column": 4, "row": 7, "color": "GREEN", "king": false},
    {"column": 6, "row": 7, "color": "GREEN", "king": false},
    {"column": 8, "row": 7, "color": "GREEN", "king": false},
    {"column": 1, "row": 8, "color": "GREEN", "king": false},
    {"column": 3, "row": 8, "color": "GREEN", "king": false},
    {"column": 5, "row": 8, "color": "GREEN", "king": false},
    {"column": 7, "row": 8, "color": "GREEN", "king": false}];

let ticTacToeGames = [];

function getTicTacToeGame(gameId) {
    let ret; // Game to return
    ticTacToeGames.forEach(function (game) {
        if (game["gameId"] === gameId) {
            ret = game;
        }
    });
    return ret ? ret : null;
}

function getCheckersGame(gameId) {
    let ret; // Game to return
    checkerGames.forEach(function (game) {
        if (game["gameId"] === gameId) {
            ret = game;
        }
    });
    return ret ? ret : null;
}


wsCheckers.on('connection', function connection(ws) {
    ws.on('message', function message(message) {
        let data = JSON.parse(message);
        switch (data[0]) {
            case "connect": {
                ws.uuid = data[1]["uuid"];
                ws.gameId = parseInt(data[1]["gameId"]);
                if (getCheckersGame(ws.gameId) === null) {
                    checkerGames.push({
                        "gameId": ws.gameId, "boardPieces": checkerBoardPieces, "playerOne": null, "playerTwo": null,
                        "currentTurn": "BLUE", "blueScore": 0,
                        "greenScore": 0, "blueMoveAgain": null, "greenMoveAgain": null
                    });
                }
                if (getCheckersGame(ws.gameId)["playerOne"] === null) {
                    if (getCheckersGame(ws.gameId)["playerTwo"] !== ws.uuid) {
                        getCheckersGame(ws.gameId)["playerOne"] = ws.uuid
                    }
                } else if (getCheckersGame(ws.gameId)["playerTwo"] === null) {
                    if (getCheckersGame(ws.gameId)["playerOne"] !== ws.uuid) {
                        getCheckersGame(ws.gameId)["playerTwo"] = ws.uuid
                    }
                }
                ws.send(JSON.stringify(["boardPieces", getCheckersGame(ws.gameId)["boardPieces"]]));
                ws.send(JSON.stringify(["currentTurn", getCheckersGame(ws.gameId)["currentTurn"]]));
                ws.send(JSON.stringify(["playerScores", {
                    "blueScore": getCheckersGame(ws.gameId)["blueScore"],
                    "greenScore": getCheckersGame(ws.gameId)["greenScore"]
                }]));
                if (getCheckersGame(ws.gameId)["playerOne"] === ws.uuid) {
                    ws.send(JSON.stringify(["playerColor", "BLUE"]))
                } else if (getCheckersGame(ws.gameId)["playerTwo"] === ws.uuid) {
                    ws.send(JSON.stringify(["playerColor", "GREEN"]))
                } else {
                    ws.send(JSON.stringify(["playerColor", "SPECTATING"]))
                }
                let playerGames = [];
                checkerGames.forEach(function (game) {
                    if (game["playerOne"] === ws.uuid || game["playerTwo"] === ws.uuid) {
                        playerGames.push(game["gameId"]);
                    }
                });
                ws.send(JSON.stringify(["playerGames", playerGames]));
                ws.send(JSON.stringify(["pieceThatCanMoveAgain", {
                    "blueMoveAgain": getCheckersGame(ws.gameId)["blueMoveAgain"],
                    "greenMoveAgain": getCheckersGame(ws.gameId)["greenMoveAgain"]
                }]));

                break;
            }
            case "boardPieces": {
                getCheckersGame(ws.gameId)["boardPieces"] = data[1];
                wsCheckers.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["boardPieces", getCheckersGame(ws.gameId)["boardPieces"]]));
                        }
                    }
                });
                break;
            }
            case "currentTurn": {
                getCheckersGame(ws.gameId)["currentTurn"] = data[1];
                wsCheckers.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["currentTurn", getCheckersGame(ws.gameId)["currentTurn"]]));
                        }
                    }
                });
                break;
            }
            case "playerScores":
                getCheckersGame(ws.gameId)["blueScore"] = data[1]["blueScore"];
                getCheckersGame(ws.gameId)["greenScore"] = data[1]["greenScore"];
                wsCheckers.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["playerScores", {
                                "blueScore": getCheckersGame(ws.gameId)["blueScore"],
                                "greenScore": getCheckersGame(ws.gameId)["greenScore"]
                            }]));
                        }
                    }
                });
                break;
            case "gameWinner": {
                wsCheckers.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["gameWinner", data[1]]));
                        }
                    }
                });
                break;
            }
            case "pieceThatCanMoveAgain":
                getCheckersGame(ws.gameId)["blueMoveAgain"] = data[1]["blueMoveAgain"];
                getCheckersGame(ws.gameId)["greenMoveAgain"] = data[1]["greenMoveAgain"];
                wsCheckers.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["pieceThatCanMoveAgain", {
                                "blueMoveAgain": getCheckersGame(ws.gameId)["blueMoveAgain"],
                                "greenMoveAgain": getCheckersGame(ws.gameId)["greenMoveAgain"],
                            }]));
                        }
                    }
                });
                break;
            default:
                break;
        }
    })
});

wsTicTacToe.on('connection', function connection(ws) {
    ws.on('message', function message(message) {
        let data = JSON.parse(message);
        switch (data[0]) {
            case "connect": {
                ws.uuid = data[1]["uuid"];
                ws.gameId = parseInt(data[1]["gameId"]);
                if (getTicTacToeGame(ws.gameId) === null) {
                    ticTacToeGames.push({
                        "gameId": ws.gameId, "playerOne": null, "playerTwo": null,
                        "currentTurn": "X", "selections": {"X": [], "O": []},
                        "startingPiece": "X"
                    });
                }
                if (getTicTacToeGame(ws.gameId)["playerOne"] === null) {
                    if (getTicTacToeGame(ws.gameId)["playerTwo"] !== ws.uuid) {
                        getTicTacToeGame(ws.gameId)["playerOne"] = ws.uuid
                    }
                } else if (getTicTacToeGame(ws.gameId)["playerTwo"] === null) {
                    if (getTicTacToeGame(ws.gameId)["playerOne"] !== ws.uuid) {
                        getTicTacToeGame(ws.gameId)["playerTwo"] = ws.uuid
                    }
                }
                ws.send(JSON.stringify(["selections", getTicTacToeGame(ws.gameId)["selections"]]));
                ws.send(JSON.stringify(["currentTurn", getTicTacToeGame(ws.gameId)["currentTurn"]]));
                if (getTicTacToeGame(ws.gameId)["playerOne"] === ws.uuid) {
                    ws.send(JSON.stringify(["playerPiece", "X"]))
                } else if (getTicTacToeGame(ws.gameId)["playerTwo"] === ws.uuid) {
                    ws.send(JSON.stringify(["playerPiece", "O"]))
                } else {
                    ws.send(JSON.stringify(["playerPiece", "SPECTATING"]))
                }
                break;
            }
            case "selections": {
                getTicTacToeGame(ws.gameId)["selections"] = data[1];
                wsTicTacToe.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["selections", getTicTacToeGame(ws.gameId)["selections"]]));
                        }
                    }
                });
                break;
            }
            case "currentTurn": {
                getTicTacToeGame(ws.gameId)["currentTurn"] = data[1];
                wsTicTacToe.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["currentTurn", getTicTacToeGame(ws.gameId)["currentTurn"]]));
                        }
                    }
                });
                break;
            }
            case "winner": {
                wsTicTacToe.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["winner", data[1]]));
                        }
                    }
                });
                break;
            }
            case "reset": {
                if (getTicTacToeGame(ws.gameId)["startingPiece"] === "X") {
                    getTicTacToeGame(ws.gameId)["currentTurn"] = "O";
                    getTicTacToeGame(ws.gameId)["startingPiece"] = "O";
                } else {
                    getTicTacToeGame(ws.gameId)["currentTurn"] = "X";
                    getTicTacToeGame(ws.gameId)["startingPiece"] = "X";

                }
                getTicTacToeGame(ws.gameId)["selections"]["X"] = [];
                getTicTacToeGame(ws.gameId)["selections"]["O"] = [];

                wsTicTacToe.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["reset"]));
                            client.send(JSON.stringify(["selections", getTicTacToeGame(ws.gameId)["selections"]]));
                            client.send(JSON.stringify(["currentTurn", getTicTacToeGame(ws.gameId)["currentTurn"]]));

                        }
                    }
                });
                break;
            }
            case "tie": {
                wsTicTacToe.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN) {
                        if (client.gameId === ws.gameId) {
                            client.send(JSON.stringify(["tie"]));
                        }
                    }
                });
                break;
            }
            default: {
                break;
            }
        }
    });
});
server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;

    if (pathname.startsWith('/websocket/checkers')) {
        wsCheckers.handleUpgrade(request, socket, head, function done(ws) {
            wsCheckers.emit('connection', ws);
        });
    } else if (pathname.startsWith('/websocket/tictactoe')) {
        wsTicTacToe.handleUpgrade(request, socket, head, function done(ws) {
            wsTicTacToe.emit('connection', ws);
        });
    } else {
        socket.destroy();
    }
});

server.listen(80);
