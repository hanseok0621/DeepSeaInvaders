const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const shootSound = document.getElementById("shootSound");
    const explodeSound = document.getElementById("explodeSound");

    const shipImg = new Image();
    shipImg.src = "images/submarine.png";
    const bulletImg = new Image();
    bulletImg.src = "images/bullet.png";
    const enemyImgs = ["images/fish.png", "images/jellyfish.png", "images/shocker.png", "images/armored.png"].map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });
    const enemyBulletImg = new Image();
    enemyBulletImg.src = "images/enemy_bullet.png";
    const bossImg = new Image();
    bossImg.src = "images/crab_boss.png";
    const bossProjectileImg = new Image();
    bossProjectileImg.src = "images/rock.png";

    const ship = { x: canvas.width / 2 - 50, y: 500, width: 100, height: 90, speed: 5 };
    const bullets = [];
    let enemies = [];
    const keys = {};
    let lives = 3;
    let level = 1;
    let enemyDirection = 1;
    let enemySpeed = 1;
    let boss = null;
    let spacePressed = false;
    const bossBullets = [];
    let lastBossAttackTime = 0;
    let lastBossSpawnTime = 0;
    let bossAttackInterval = 3000;
    const bossSpawnInterval = 5000;
    const hitboxMarginX = 22;
    const hitboxMarginY = 10;
    const enemyBullets = [];
    let lastEnemyShotTime = 0;
    let enemyShotInterval = 3000;
    let isGameOver = false;

    // 시작 버튼
    function startGame() {
      document.getElementById("startScreen").style.display = "none";
      animationId = requestAnimationFrame(gameLoop);
    }

    // 다시 하기
    function restartGame() {
      location.reload();
    }

    function showOverlay(message, buttonText = null, buttonCallback = null) {
      isGameOver = true;
      cancelAnimationFrame(animationId);
      const overlay = document.createElement("div");
      overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        color: white; display: flex; flex-direction: column;
        justify-content: center; align-items: center; font-size: 36px;
        font-family: sans-serif;
      `;
      overlay.innerHTML = message;

      if (buttonText && buttonCallback) {
        const button = document.createElement("button");
        button.textContent = buttonText;
        button.className = "restart-button";
        button.onclick = buttonCallback;
        overlay.appendChild(button);
      }

      document.body.appendChild(overlay);
    }

    // 게임 오버
    function showGameOver() {
      showOverlay("💀 Game Over 💀", "다시 하기", restartGame);
    }
    // 게임 클리어어
    function showGameClear() {
      showOverlay("🎉 축하합니다! 게임 클리어! 🎉");
    }


    // 게임 루프
    function gameLoop() {
      if (isGameOver) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      update();
      drawShip();
      drawBullets();
      drawEnemies();
      drawBoss();
      drawBossBullets();
      drawEnemyBullets();
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        if (detectBulletEnemyCollision(bi)) continue;
        if (detectBulletBossCollision(bi)) continue;
      }
      detectEnemyBulletShipCollision();
      detectBossBulletshipCollision();
      animationId = requestAnimationFrame(gameLoop);
      }

    // 플레이어 이동, 적/보스 업데이트, 충돌 체크 등 게임 상태 업데이트
    function update() {
      if (keys["ArrowLeft"] && ship.x > 0) ship.x -= ship.speed;
      if (keys["ArrowRight"] && ship.x + ship.width < canvas.width) ship.x += ship.speed;
      if (!boss && enemies.every(e => !e.alive)) spawnBoss();
      moveEnemies();
      moveBoss();
      detectPlayerHitByEnemy()
    }

    // 현재 레벨에 따라 행 수가 증가하며, 무작위 타입의 적 생성
    function createEnemies(rows = 2 + (level - 1), cols = 6) {
      enemies = [];
      const margin = 40;
      for (let i = 0; i < rows * cols; i++) {
        const x = margin + Math.random() * (canvas.width - 30 - 2 * margin);
        const y = Math.random() * 150;
        const typePool = [0, 1, 2, 3];
        const type = typePool[Math.floor(Math.random() * typePool.length)];
        enemies.push({ x, y, width: 50, height: 40, alive: true, type, angle: 0 });
      }
    }

    // 적 타입별 움직임과 총알 발사 처리
    function moveEnemies() {
      let edgeHit = false;
      const now = Date.now();
      enemies.forEach((e, i) => {
        if (!e.alive) return;

        if (e.type === 0) {
          e.x += enemySpeed * enemyDirection;
          if (e.x + e.width > canvas.width || e.x < 0) edgeHit = true;
        } else if (e.type === 1) {
          e.angle += 0.1;
          e.x += Math.sin(e.angle) * 2;
          if (now - lastEnemyShotTime > enemyShotInterval) {
            enemyBullets.push({ x: e.x + e.width / 2, y: e.y + e.height, vx: 0, vy: 3 });
          }
        } else if (e.type === 2) {
          e.angle += 0.1;
          e.x += Math.sin(e.angle) * 2;
          if (now - lastEnemyShotTime > enemyShotInterval) {
            const dx = ship.x + ship.width / 2 - (e.x + e.width / 2);
            const dy = ship.y - (e.y + e.height);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 3;
            enemyBullets.push({
              x: e.x + e.width / 2,
              y: e.y + e.height,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed
          });
          }
        } else if (e.type === 3) {
        if (e.hp === undefined) e.hp = 2;
        e.x += enemySpeed * enemyDirection * 0.5;
        if (e.x + e.width > canvas.width || e.x < 0) edgeHit = true;
        }
      });
      if (now - lastEnemyShotTime > enemyShotInterval) {
        lastEnemyShotTime = now;
      }
      if (edgeHit) {
        enemyDirection *= -1;
        enemies.forEach(e => e.y += 20);
      }
    }

    // 보스 생성
    function spawnBoss() {
      boss = {
        x: canvas.width / 2 - 50,
        y: 50,
        width: 250,
        height: 120,
        hp: 20 + (level - 1) * 10,
        direction: 1
      };
      bossSpawnedTime = Date.now();
    }

    // 보스 좌우 이동, 돌 발사 및 적 소환
    function moveBoss() {
      if (!boss) return;
      boss.x += 2 * boss.direction;
      if (boss.x <= 0 || boss.x + boss.width >= canvas.width) boss.direction *= -1;

      const now = Date.now();
      if (now - lastBossAttackTime > bossAttackInterval) {
        const bx = boss.x + boss.width / 2;
        const by = boss.y + boss.height;
        bossBullets.push({ x: bx, y: by, vx: 0, vy: 4 });
        bossBullets.push({ x: bx, y: by, vx: -2, vy: 4 });
        bossBullets.push({ x: bx, y: by, vx: 2, vy: 4 });
        lastBossAttackTime = now;
      }

      if (bossSpawnedTime && now - bossSpawnedTime > 5000 && now - lastBossSpawnTime > bossSpawnInterval) {
        for (let i = 0; i < 2; i++) {
          const x = boss.x + 30 + i * 50;
          const y = boss.y + boss.height;
          const typePool = [0, 1, 2, 3];
          const type = typePool[Math.floor(Math.random() * typePool.length)];
          enemies.push({ x, y, width: 50, height: 40, alive: true, type, angle: 0 });
        }
        lastBossSpawnTime = now;
      }
    }

    // 플레이어 총알 vs 적
    function detectBulletEnemyCollision(bulletIndex) {
      const b = bullets[bulletIndex];
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive) continue;

        const margin = 5;
        if (
          b.x + 10 > e.x + margin &&
          b.x < e.x + e.width - margin &&
          b.y + 20 > e.y + margin &&
          b.y < e.y + e.height - margin
        ) {
          if (e.type === 3) {
            if (e.hp === undefined) e.hp = 2;
            e.hp--;

            bullets.splice(bulletIndex, 1);

            if (e.hp <= 0) {
              e.alive = false;
              explodeSound.currentTime = 0;
              explodeSound.play();
            }

            return true;
          } else {
            e.alive = false;
            bullets.splice(bulletIndex, 1);
            explodeSound.currentTime = 0;
            explodeSound.play();
            return true;
          }
        }
      }
      return false;
    }

    // 플레이어 총알 vs 보스
    function detectBulletBossCollision(bulletIndex) {
      const b = bullets[bulletIndex];
      if (!boss || !b) return false;

      if (
        b.x < boss.x + boss.width - 35 &&
        b.x + 10 > boss.x + 35 &&
        b.y < boss.y + boss.height - 25 &&
        b.y + 20 > boss.y + 25
      ) {
        bullets.splice(bulletIndex, 1);
        boss.hp--;
        if (boss.hp <= 0) {
          explodeSound.currentTime = 0;
          explodeSound.play();
          boss = null;
          level++;
          enemySpeed += 0.5;
          if (level > 5) {
            showGameClear();
          } else {
            bossAttackInterval = Math.max(1000, bossAttackInterval - 300);
            enemyShotInterval = Math.max(1000, enemyShotInterval - 300);
            createEnemies();
          }
        }
        return true;
      }
      return false;
    }

    // 적 총알 vs 잠수함
    function detectEnemyBulletShipCollision() {
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        const bulletCenterX = b.x + 10;

        if (
          b.y >= ship.y &&
          bulletCenterX >= ship.x + hitboxMarginX &&
          bulletCenterX <= ship.x + ship.width - hitboxMarginX
        ) {
          enemyBullets.splice(i, 1);
          lives--;
          if (lives <= 0) {
            showGameOver();
          }
        }
      }
    }

    //보스 총알 vs 잠수함
    function detectBossBulletshipCollision() {
      for (let i = bossBullets.length - 1; i >= 0; i--) {
        const p = bossBullets[i];
        if (
          p.y + 6 >= ship.y + hitboxMarginY &&
          p.x >= ship.x + hitboxMarginX &&
          p.x <= ship.x + ship.width - hitboxMarginX
        ) {
          bossBullets.splice(i, 1);
          lives--;
          if (lives <= 0) {
            showGameOver();
          }
        }
      }
    }

    // 적이 직접 잠수함에 닿았을 때
    function detectPlayerHitByEnemy() {
      enemies.forEach(e => {
        if (
          e.alive &&
          e.y + e.height >= ship.y + hitboxMarginY &&
          e.x < ship.x + ship.width - hitboxMarginX &&
          e.x + e.width > ship.x + hitboxMarginX
        ) {
          e.alive = false;
          lives--;
          if (lives <= 0) {
            showGameOver();
          }
        }
      });
    }


    // 잠수함과 HUD(목숨/레벨)
    function drawShip() {
      ctx.fillStyle = "white";
      ctx.font = "bold 20px monospace";
      ctx.fillText(`Lives: ${lives}`, 10, 30);
      ctx.fillText(`Level: ${level}`, canvas.width - 120, 30);
      ctx.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);
    }

    // 플레이어가 발사한 총알, 화면 밖으로 나가면 제거
    function drawBullets() {
      bullets.forEach((b, i) => {
        b.y -= 7;
        ctx.drawImage(bulletImg, b.x, b.y, 20, 20);
        if (b.y < 0) bullets.splice(i, 1);
      });
    }

    // 적들을 그리는 함수
    function drawEnemies() {
      enemies.forEach((e, i) => {
          if (e.alive) ctx.drawImage(enemyImgs[e.type], e.x, e.y, e.width, e.height);
      });
    }

    // 적이 발사한 총알들을 그리는 함수
    function drawEnemyBullets() {
      enemyBullets.forEach((b, i) => {
          b.x += b.vx;
          b.y += b.vy;
          ctx.drawImage(enemyBulletImg, b.x, b.y, 20, 20);
          if (b.y > canvas.height || b.y < 0 || b.x < 0 || b.x > canvas.width) {
            enemyBullets.splice(i, 1);
          }
      });
    }

    // 보스를 그리는 함수
    function drawBoss() {
      if (boss) ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
    }

    // 보스가 발사한 돌(3갈래)을 그리는 함수
    function drawBossBullets() {
      bossBullets.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        ctx.drawImage(bossProjectileImg, p.x - 10, p.y - 10, 20, 20);
        if (p.y > canvas.height || p.x < 0 || p.x > canvas.width) bossBullets.splice(i, 1);
      });
    }

    document.addEventListener("keydown", e => {
      if (e.key === " " || e.code === "Space") e.preventDefault();
      if (!keys[e.key]) {
        keys[e.key] = true;
        if (e.key === " " && !spacePressed) {
          bullets.push({ x: ship.x + ship.width / 2 - 5, y: ship.y });
          shootSound.currentTime = 0;
          shootSound.play();
          spacePressed = true;
        }
      }
    });

    document.addEventListener("keyup", e => {
      keys[e.key] = false;
      if (e.key === " ") spacePressed = false;
    });

    createEnemies();