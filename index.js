console.clear();
var playerData = {
      id: "",
      queue: false,
      displayName: /*prompt("Set Display Name")*/"Temp Name",
      opponent: "",
      lastMove: []
    };
var playersRef, playerId, playerRef;
var opponentId = "";
var queue = document.getElementById("queue");
var mouseX, mouseY;
var turnText = document.getElementById("turn");
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var color, board, turn, highlightLocs, winner, winHex, hexSide, redSpots, blueSpots, scrollX, scrollY;
firebase.auth().signInAnonymously().catch((error) => {
  console.log("Login error: ", error.code, error.message);
});
firebase.auth().onAuthStateChanged((user) => {
  //console.log("Login to:", user);
  if (user) {
    //Logged in
    playerId = user.uid;
    playerData.id = playerId;
    playersRef = firebase.database().ref("players");
    /*playersRef.on("value", (snapshot) => {
      
    });*/
    playersRef.on("child_added", (snapshot, key) => {
      snapshot = snapshot.val();
      if (!opponentId) {
        if (snapshot.queue) {
          addQueueElement(snapshot);
        }
      }
    });
    playersRef.on("child_changed", (snapshot, key) => {
      snapshot = snapshot.val();
      if (!opponentId) {
        if (snapshot.opponent == playerId) {
          playerData.opponent = snapshot.id;
          playerData.queue = false;
          playerRef.set(playerData);
          color = 2;
          startGame(snapshot.id);
        }
        var curQueueElement = document.getElementById(snapshot.id);
        if (snapshot.queue) {
          if (!curQueueElement) {
            addQueueElement(snapshot);
          } else {
            curQueueElement.getElementsByTagName("tr")[0].innerHTML = snapshot.displayName;
          }
        } else if (!snapshot.queue && curQueueElement) {
          curQueueElement.remove();
        }
      } else if (opponentId == snapshot.id) {
        var lastMove = snapshot.lastMove;
        if (lastMove && lastMove.length > 0 && (board.length < lastMove[0][0] || board[0].length < lastMove[0][1] || board[lastMove[0][0]][lastMove[0][1]] == 0)) {
          for (var i=0; i<lastMove.length; i++) {
            if (lastMove[i][1] > board[0].length) {
              var diff = lastMove[i][1] - board[0].length;
              for (var j=0; j<board.length; j++) {
                board[j].push(...Array(diff).fill(0));
              }
            }
            while (lastMove[i][0] > board.length-1) {
              board.push(Array(board[0].length).fill(0));
            }
            board[lastMove[i][0]][lastMove[i][1]] = 3 - color;
            checkForWin(lastMove[i], color==1 ? "Blue":"Red");
            turn = (turn%4)+1;
          }
          highlightLocs = lastMove;
          draw();
        }
      }
    });
    playersRef.on("child_removed", (snapshot) => {
      snapshot = snapshot.val();
      if (!opponentId) {
        var curQueueElement = document.getElementById(snapshot.id);
        if (curQueueElement) {
          curQueueElement.remove();
        }
      }
    });
    playerRef = firebase.database().ref("players/"+playerId);
    queueRef = firebase.database().ref("queue");
    playerRef.set(playerData);
    playerRef.onDisconnect().remove();
  } else {
    //Logged out
  }
})
function toggleQueue() {
  playerData.queue = !playerData.queue;
  playerRef.set(playerData);
  var toggleQueue = document.getElementById("toggleQueue");
  if (playerData.queue) {
    toggleQueue.innerHTML = "Leave Queue";
  } else {
    toggleQueue.innerHTML = "Enter Queue";
  }
}
function addQueueElement(snapshot) {
  var tr = document.createElement("tr");
  tr.setAttribute("id", snapshot.id);
  tr.innerHTML = "<th>"+snapshot.displayName+"</th><th>" + (snapshot.id == playerId ? "" : "<button onClick=joinGame('"+snapshot.id+"')>Join</button>")+"</th>";
  queue.appendChild(tr);
}
function joinGame(opponent) {
  playerData.opponent = opponent;
  playerData.queue = false;
  playerRef.set(playerData);
  color = 1;
  startGame(opponent);
}
function startGame(opponent) {
  document.getElementById("toggleQueue").style.display = "none";
  queue.style.display = "none";
  opponentId = opponent;
  board = [ //hex width = 100, hex height = 25sqrt(3)
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
  ]
  turn = 2; //1, 2: red, 3, 4: blue
  highlightLocs = []; //Last turn
  winner = 0; //0: none, 1: red, 2: blue
  winHex = null;
  hexSide = 48;
  redSpots = [];
  blueSpots = [];
  scrollX = 1000;
  scrollY = 2000;
  draw();
}
function getCanvasLocation(pos) {
  var i = pos[0];
  var j = pos[1];
  var centerX = (hexSide*1.5)*j - scrollX + 300;
  var centerY = Math.sqrt(3)*hexSide/2*(2*i+j) - scrollY + 300;
  return [centerX, centerY];
}
function canvasToBoard(canvasX, canvasY) {
  var x = Math.round((canvasX-300+scrollX)/(hexSide*1.5));
  var y = Math.round(((canvasY-300+scrollY)/(hexSide*Math.sqrt(3)/2)-x)/2);
  return [y,x];
}
function draw() {
  ctx.fillStyle="rgb(255,255,255)";
  ctx.fillRect(0,0,700,700);
  var startLoc = canvasToBoard(-hexSide,-350-hexSide);
  var endLoc = [Math.ceil(startLoc[0]+(600/hexSide)), Math.ceil(startLoc[1]+(600/hexSide))];
  if (endLoc[1] > board[0].length) {
    var diff = endLoc[1] - board[0].length;
    for (var i=0; i<board.length; i++) {
      board[i].push(...Array(diff).fill(0));
    }
  }
  if (endLoc[0] > board.length) {
    while (endLoc[0] > board.length) {
      board.push(Array(board[0].length).fill(0));
    }
  }
  for (var i=startLoc[0]; i<endLoc[0]; i++) {
    for (var j=startLoc[1]; j<endLoc[1]; j++) {
      if (i>=0&&j>=0&&board[i][j] >= 0) {
        var canvasLoc = getCanvasLocation([i,j]);
        var centerX = canvasLoc[0];
        var centerY = canvasLoc[1];
        ctx.fillStyle="rgb(255,255,255)";
        if (board[i][j] == 1) {
          ctx.fillStyle="rgb(255,191,191)";
        } else if (board[i][j] == 2) {
          ctx.fillStyle="rgb(191,223,255)";
        }
        ctx.beginPath();
        ctx.moveTo(centerX-hexSide, centerY);
        ctx.lineTo(centerX-hexSide/2, centerY-Math.sqrt(3)*hexSide/2);
        ctx.lineTo(centerX+hexSide/2, centerY-Math.sqrt(3)*hexSide/2);
        ctx.lineTo(centerX+hexSide, centerY);
        ctx.lineTo(centerX+hexSide/2, centerY+Math.sqrt(3)*hexSide/2);
        ctx.lineTo(centerX-hexSide/2, centerY+Math.sqrt(3)*hexSide/2);
        ctx.lineTo(centerX-hexSide, centerY);
        ctx.strokeStyle = "rgb(0,0,0)";
        ctx.lineWidth=1;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle="rgb(0,0,0)";
        if (board[i][j] == 1) {
          ctx.fillStyle="rgb(255,0,0)";
        } else if (board[i][j] == 2) {
          ctx.fillStyle="rgb(0,127,255)";
        }
        ctx.fillRect(centerX-5, centerY-5, 10, 10);
      }
    }
  }
  ctx.fillStyle = (color==1 ? "rgb(0,127,255)" : "rgb(255,0,0)");
  for (var i=0; i<highlightLocs.length; i++) {
    var drawLoc = getCanvasLocation(highlightLocs[i]);
    if (0 < drawLoc[0] && drawLoc[0] < 600 && 0 < drawLoc[1] && drawLoc[1] < 600) {
      ctx.beginPath();
      ctx.ellipse(drawLoc[0],drawLoc[1],hexSide*.75,hexSide*.75,0,0,2*Math.PI);
      ctx.lineTo(drawLoc[0]+hexSide*.60,drawLoc[1]);
      ctx.ellipse(drawLoc[0],drawLoc[1],hexSide*.60,hexSide*.60,0,0,2*Math.PI,true);
      ctx.lineTo(drawLoc[0]+hexSide*.75,drawLoc[1]);
      ctx.fill();
    } else {
      var slope = 1.0*(drawLoc[1]-300)/(drawLoc[0]-300);
      var angle = Math.atan(slope);
      var yIntersect = 300+(290*slope);
      var xIntersect = 300+(290/slope);
      if (10<yIntersect && yIntersect<590) {
        if (drawLoc[0] > 300) {
          drawArrow(590,yIntersect,angle);
        } else {
          drawArrow(10,600-yIntersect,angle+Math.PI);
        }
      } else {
        if (drawLoc[1] > 300) {
          drawArrow(xIntersect,590,angle+(angle<0 ? Math.PI : 0));
        } else {
          drawArrow(600-xIntersect,10,angle+(angle>0 ? Math.PI : 0));
        }
      }
    }
  }
  if (winner === 0) {
    turnText.innerHTML = ((((color==1)==(turn>=3)) ? "Their":"Your")+" turn ("+(turn%2+1)+" left)");
    turnText.style.backgroundColor = (turn>=3 ? "#9fcfff":"#ff9f9f");
  } else {
    turnText.innerHTML = (winner==color ? "You win!":"You lose.");
    turnText.style.backgroundColor = (winner==2 ? "#9fcfff":"#ff9f9f");
    ctx.strokeStyle = (winner==1) ? "rgb(255,0,0)":"rgb(0,127,255)";
    ctx.lineWidth=2;
    ctx.beginPath();
    for (var i=0; i<7; i++) {
      var canvasLoc = getCanvasLocation(winHex[i%6]);
      if (i===0) {
        ctx.moveTo(canvasLoc[0],canvasLoc[1]);
      } else {
        ctx.lineTo(canvasLoc[0],canvasLoc[1]);
      }
    }
    ctx.stroke();
  }
}
function drawArrow(xLoc, yLoc, angle) {
  ctx.beginPath();
  arrowLocs = [
    [-20,-20],
    [-20,-8],
    [-50,-8],
    [-50,8],
    [-20,8],
    [-20,20],
    [0,0]
  ];
  ctx.moveTo(xLoc,yLoc);
  for (var i=0; i<arrowLocs.length; i++) {
    ctx.lineTo(xLoc+arrowLocs[i][0]*Math.cos(angle)-arrowLocs[i][1]*Math.sin(angle),yLoc+arrowLocs[i][1]*Math.cos(angle)+arrowLocs[i][0]*Math.sin(angle));
  }
  ctx.fill();
}
function rotate(pos) {
  return [0-pos[1],pos[0]+pos[1]];
}
function sum(pos1, pos2) {
  return[pos1[0]+pos2[0],pos1[1]+pos2[1]];
}
function checkHex(pos1, pos2, color) {
  color = color=="Blue" ? 2 : 1
  var curPos = pos2;
  var diff = [pos2[0]-pos1[0],pos2[1]-pos1[1]];
  var locs = [pos1, pos2]
  for (var i=0; i<4; i++) {
    diff = rotate(diff);
    curPos = sum(curPos, diff);
    try {
      if (board[curPos[0]][curPos[1]] != color) {
        return false;
      }
    } catch (e) {
      return false;
    }
    locs.push(curPos);
  }
  return locs;
}
function checkForWin(pos, curTurn) {
  var check = false;
  if (curTurn == "Blue") {
    for (var i=0; i<blueSpots.length; i++) {
      check = checkHex(pos, blueSpots[i], curTurn);
      if (check !== false) {
        break;
      }
    }
    blueSpots.push(pos);
  } else {
    for (var i=0; i<redSpots.length; i++) {
      check = checkHex(pos, redSpots[i], curTurn);
      if (check !== false) {
        break;
      }
    }
    redSpots.push(pos);
  }
  if (check !== false) {
    winner = curTurn=="Blue" ? 2:1;
    winHex = check;
  }
}
document.addEventListener('keydown', e => {
  e.preventDefault();
  if (opponentId) {
    if (e.code === "KeyW" || e.code === "ArrowUp") {
      scrollY -= 10;
    } else if (e.code === "KeyS" || e.code === "ArrowDown") {
      scrollY += 10;
    } else if (e.code === "KeyA" || e.code === "ArrowLeft") {
      scrollX -= 10;
    } else if (e.code === "KeyD" || e.code === "ArrowRight") {
      scrollX += 10;
    } else if (e.code === "KeyQ") {
      if (hexSide > 10) {
        hexSide /= 1.5;
        scrollX /= 1.5;
        scrollY /= 1.5;
      }
    } else if (e.code === "KeyE") {
      if (hexSide < 60) {
        hexSide *= 1.5;
        scrollX *= 1.5;
        scrollY *= 1.5;
      }
    }
    draw();
  }
});
canvas.addEventListener('click', e => {
  e.preventDefault();
  if (opponentId && winner === 0 && ((turn <= 2) == (color == 1))) {
    var rect = canvas.getBoundingClientRect();
    var clickPos = canvasToBoard(mouseX, mouseY);
    if (clickPos[0]<board.length && clickPos[1]<board[clickPos[0]].length && board[clickPos[0]][clickPos[1]] == 0) {
      board[clickPos[0]][clickPos[1]] = Math.floor((turn+1)/2);
      checkForWin(clickPos, color==2 ? "Blue":"Red");
      playerData.lastMove.push([clickPos[0],clickPos[1]]);
      turn = (turn%4) + 1;
      if (turn % 2 == 1) {
        playerRef.set(playerData);
        playerData.lastMove = [];
      }
      draw();
    }
  }
});
canvas.addEventListener('mousemove', e => {
  mouseX = e.clientX - e.target.getBoundingClientRect().left;
  mouseY = e.clientY - e.target.getBoundingClientRect().top;
});
