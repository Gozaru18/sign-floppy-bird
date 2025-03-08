const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startModal = document.getElementById("startModal");
const startButton = document.getElementById("startButton");
const howToPlayButton = document.getElementById("howToPlayButton");
const howToPlayModal = document.getElementById("howToPlayModal");
const scoreDisplay = document.getElementById("score");
const finalScoreDisplay = document.getElementById("finalScore");
let selectedAvatar = "images/sign.jpg";

// Function to calculate dynamic gap size
function getPipeGap() {
    return canvas.height * 0.25; // 25% of canvas height
}

// Function to calculate dynamic pipe width
function getPipeWidth() {
    return canvas.width * 0.1; // 10% of canvas width
}

// Function to calculate dynamic horizontal spacing between pipes
function getPipeSpacing() {
    return canvas.width * 0.5; // 50% of canvas width
}

// Audio elements
const pipeSound = new Audio("pipe.mp3"); // Add a pipe sound file to your project
const collectSound = new Audio("collect.mp3"); // Add a collectible sound file

// Preload all images
const avatarImages = {};
const collectibleImgs = {};
const collectibleImageNames = ["images/SupportSBT.png", "images/orangeintheveinSBT.png", "images/seeingsignSBT.png", "images/seriousSBT.png"];

const avatarImageMappings = {
    "images/sign.jpg": "images/sign.jpg", // Modal and game images are the same (adjust if needed)
    "images/zoeCM.jpg": "images/zoeCM-transparent.png",
    "images/signpass.jpg": "images/signpass-transparent.png",
    "images/signdaddy.jpg": "images/signdaddy1.png",
    "images/meganwang.jpg": "images/meganwang-transparent.png",
    "images/zunXBT.png": "images/zunXBT-transparent.png",
    "images/tokentable.jpg": "images/tokentable-transparent.png",
    "images/lodi.jpg": "images/lodi-transparent.png",
    "images/lodi1.jpg": "images/lodi1-transparent.png",
    "images/lodi2.jpg": "images/lodi2-transparent.png"
};

// Preload images
function preloadImages() {
    for (const [modalImage, gameImage] of Object.entries(avatarImageMappings)) {
        // Preload modal image (with background)
        const modalImg = new Image();
        modalImg.src = modalImage;
        avatarImages[modalImage] = modalImg;

        // Preload game image (transparent)
        const gameImg = new Image();
        gameImg.src = gameImage;
        avatarImages[gameImage] = gameImg;
    }

    collectibleImageNames.forEach(name => {
        collectibleImgs[name] = new Image();
        collectibleImgs[name].src = name;
    });
}

preloadImages();

function selectAvatar(modalImage, event) {
    // Get the corresponding game image (transparent) from the mapping
    const gameImage = avatarImageMappings[modalImage];
    if (!gameImage) {
        console.error("No game image found for modal image:", modalImage);
        return;
    }

    selectedAvatar = gameImage; // Set the transparent version for the game
    document.querySelectorAll(".avatar-selection img").forEach(img => img.classList.remove("selected"));
    if (event && event.target) {
        event.target.classList.add("selected");
    }
}

let score = 0;
let gameStarted = false;
let comboCounter = 0;
let nextSpawnThreshold = 10; // Changed to 10 points
let collectedSBTs = []; // Array to store collected SBTs for display
let totalCollectedSBTs = {}; // Object to track the count of each SBT type collected

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const bird = { x: 50, y: canvas.height / 2, width: 50, height: 50, gravity: 0.6, lift: -12, velocity: 0 };
let pipes = [];
let collectibles = [];
let frame = 0;
let gameOver = false;

// Collection effect animation
let collectionEffects = [];

function drawBird() {
    if (!avatarImages[selectedAvatar]) {
        const img = new Image();
        img.src = selectedAvatar; // Load the transparent version
        avatarImages[selectedAvatar] = img;
    }

    const img = avatarImages[selectedAvatar];

    if (img.complete) {
        ctx.save();
        ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
        let angle = Math.min(Math.max(bird.velocity * 0.05, -0.6), 0.6); // Tilt effect with limits
        ctx.rotate(angle);
        ctx.drawImage(img, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
        ctx.restore();
    }
}

function drawPipes() {
    ctx.fillStyle = "green";
    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
        ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, pipe.bottom);
    });
}

function drawCollectibles() {
    collectibles.forEach(item => {
        if (!collectibleImgs[item.image]) {
            const img = new Image();
            img.src = item.image;
            collectibleImgs[item.image] = img;
        }

        const img = collectibleImgs[item.image];

        if (img.complete) {
            ctx.drawImage(img, item.x, item.y, item.size, item.size);
        }
    });
}

function drawCollectedSBTs() {
    const sbtSize = 30;
    const spacing = 5;
    const startX = canvas.width - 40;  // Position to the right
    const startY = 10;  // Near the top

    let y = startY;

    // Draw SBT counter
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "right";
    ctx.fillText("SBTs:", startX - 5, y + sbtSize / 2 + 5);

    // Draw each type of collected SBT with count
    let index = 0;
    for (const [sbtName, count] of Object.entries(totalCollectedSBTs)) {
        if (!collectibleImgs[sbtName]) {
            continue;
        }

        const img = collectibleImgs[sbtName];

        if (img.complete) {
            // Draw SBT icon
            ctx.drawImage(img, startX + spacing * index, y, sbtSize, sbtSize);

            // Draw count
            ctx.fillStyle = "white";
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.fillText(count.toString(), startX + spacing * index + sbtSize / 2, y + sbtSize + 16);
        }

        y += sbtSize + 20;  // Move down for the next SBT
    }

    // Draw collection effects (animation when collecting SBTs)
    drawCollectionEffects();
}

function drawCollectionEffects() {
    collectionEffects.forEach((effect, index) => {
        const img = collectibleImgs[effect.image];

        if (img && img.complete) {
            // Calculate animation progress (0 to 1)
            const progress = (frame - effect.startFrame) / effect.duration;

            if (progress <= 1) {
                // Calculate current position (start at collection point, move to top right)
                const x = effect.startX + (canvas.width - 40 - effect.startX) * progress;
                const y = effect.startY + (10 - effect.startY) * progress;

                // Scale effect (start bigger, end smaller)
                const scale = 1 - progress * 0.5;

                // Rotation effect
                const rotation = progress * Math.PI * 2; // One full rotation

                // Draw with effects
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotation);
                ctx.globalAlpha = 1 - progress * 0.5; // Fade effect
                ctx.drawImage(img, -effect.size * scale / 2, -effect.size * scale / 2,
                    effect.size * scale, effect.size * scale);
                ctx.restore();
            }
        }
    });

    // Clean up finished effects
    collectionEffects = collectionEffects.filter(effect =>
        (frame - effect.startFrame) <= effect.duration);
}

function spawnCollectible(pipe) {
    if (score < nextSpawnThreshold) return;

    // Spawn SBT in the center of the pipe gap or at a random position within the gap
    const centerY = pipe.bottomY - (pipe.bottomY - pipe.top) / 2;
    const randomY = pipe.top + Math.random() * (pipe.bottomY - pipe.top - 80); // Ensure SBT fits within the gap

    collectibles.push({
        x: pipe.x + pipe.width + 20,
        y: centerY, // Spawn in the center of the pipe gap
        size: 80, // Increased size to 2x
        image: collectibleImageNames[Math.floor(Math.random() * collectibleImageNames.length)]
    });

    comboCounter++;
    nextSpawnThreshold += 10; // Spawn collectibles every 10 points
}

let lastTime = 0;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();
    if (!gameOver) requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    if (gameOver) return;

    const speedFactor = deltaTime / (1000 / 60); // Normalize speed to 60 FPS

    bird.velocity += bird.gravity * speedFactor;
    bird.y += bird.velocity * speedFactor;

    // Fix for top collision
    if (bird.y < 0) {
        bird.y = 0;
        bird.velocity = 0;
        endGame();
    } else if (bird.y + bird.height >= canvas.height) {
        endGame();
    }

    // Spawn new pipes
    if (frame % 120 === 0) {
        let gap = getPipeGap(); // Dynamic gap size
        let pipeHeight = Math.random() * (canvas.height / 2);
        let newPipe = {
            x: canvas.width,
            width: getPipeWidth(), // Dynamic pipe width
            top: pipeHeight,
            bottomY: pipeHeight + gap,
            bottom: canvas.height - (pipeHeight + gap),
            passed: false
        };
        pipes.push(newPipe);

        spawnCollectible(newPipe);
    }

    // Move pipes
    pipes.forEach(pipe => {
        pipe.x -= 2.5 * speedFactor;
        if (
            bird.x < pipe.x + pipe.width &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.top || bird.y + bird.height > pipe.bottomY)
        ) {
            endGame();
        }
        if (!pipe.passed && pipe.x + pipe.width < bird.x) {
            try {
                pipeSound.currentTime = 0;
                pipeSound.play();
            } catch (e) {
                console.log("Sound error:", e);
            }

            score++;
            pipe.passed = true;
            scoreDisplay.innerText = "Score: " + score;
        }
    });

    pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);

    // Move collectibles
    collectibles.forEach((item, index) => {
        item.x -= 2.5 * speedFactor;
        if (
            bird.x < item.x + item.size &&
            bird.x + bird.width > item.x &&
            bird.y < item.y + item.size &&
            bird.y + bird.height > item.y
        ) {
            try {
                collectSound.currentTime = 0;
                collectSound.play();
            } catch (e) {
                console.log("Sound error:", e);
            }

            collectedSBTs.push({
                image: item.image,
                collectedFrame: frame
            });

            if (!totalCollectedSBTs[item.image]) {
                totalCollectedSBTs[item.image] = 0;
            }
            totalCollectedSBTs[item.image]++;

            collectionEffects.push({
                image: item.image,
                startX: item.x,
                startY: item.y,
                size: item.size,
                startFrame: frame,
                duration: 60
            });

            score += 5;
            collectibles.splice(index, 1);
            scoreDisplay.innerText = "Score: " + score;
        }
    });

    collectibles = collectibles.filter(item => item.x + item.size > 0);
    frame++;
}
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBird();
    drawPipes();
    drawCollectibles();
    drawCollectedSBTs(); // Draw the collected SBTs at the top
}

function endGame() {
    gameOver = true;

    // Create SBT collection display for the modal
    let sbtHTML = '<div class="collected-sbts">';
    sbtHTML += '<h3>Collected SBTs:</h3>';
    sbtHTML += '<div class="sbt-grid">';

    for (const [sbtName, count] of Object.entries(totalCollectedSBTs)) {
        sbtHTML += `<div class="sbt-item">
            <img src="${sbtName}" width="40" height="40">
            <span class="sbt-count">x${count}</span>
        </div>`;
    }

    sbtHTML += '</div></div>';

    setTimeout(() => {
        finalScoreDisplay.innerHTML = `Final Score: ${score} ${sbtHTML}`;
        finalScoreDisplay.style.display = "block";
        startModal.style.display = "flex";

        const shareButton = document.createElement("button");
        shareButton.className = "button";
        shareButton.id = "shareButton";
        shareButton.innerText = "Share on X";
        shareButton.addEventListener("click", shareScore);

        finalScoreDisplay.appendChild(shareButton);

        // Add CSS for the SBT display in the modal
        const style = document.createElement('style');
        style.textContent = `
            .collected-sbts {
                margin-top: 15px;
                text-align: center;
            }
            .sbt-grid {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
                margin-top: 10px;
            }
            .sbt-item {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .sbt-count {
                font-weight: bold;
                margin-top: 5px;
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            .sbt-item img {
                animation: pulse 2s infinite;
                border-radius: 50%;
                background-color: transparent;
            }
        `;
        document.head.appendChild(style);
    }, 500);
}

function resetGame() {
    gameStarted = true;
    gameOver = false;
    scoreDisplay.innerText = "Score: 0";
    finalScoreDisplay.style.display = "none";
    score = 0;
    comboCounter = 0;
    nextSpawnThreshold = 10;
    pipes = [];
    collectibles = [];
    collectedSBTs = [];
    totalCollectedSBTs = {};
    collectionEffects = [];
    frame = 0;
    bird.y = canvas.height / 2;
    bird.velocity = 0;
}

function shareScore() {
    const sbtList = Object.entries(totalCollectedSBTs)
        .map(([sbtName, count]) => `${sbtName.split('/').pop().split('.')[0]} x${count}`)
        .join(', ');

    const tweetText = encodeURIComponent(
        `I just scored ${score} points in Flappy Bird: SIGN EDITION! 🎮\n` +
        `Collected SBTs: ${sbtList}\n` +
        `Can you beat my score? Try it now: ${window.location.href}\n` +
        `Created by @crizqt321\n`
    );

    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(tweetUrl, "_blank");
}

// Add touch and click support
function flapBird() {
    if (gameStarted) bird.velocity = bird.lift;
}

document.addEventListener("keydown", flapBird);
canvas.addEventListener("click", flapBird);
canvas.addEventListener("touchstart", function (e) {
    e.preventDefault();
    flapBird();
});

startButton.addEventListener("click", () => {
    gameStarted = true;
    gameOver = false;
    startModal.style.display = "none";
    scoreDisplay.innerText = "Score: 0";
    finalScoreDisplay.style.display = "none";
    score = 0;
    comboCounter = 0;
    nextSpawnThreshold = 10;
    pipes = [];
    collectibles = [];
    collectedSBTs = [];
    totalCollectedSBTs = {};
    collectionEffects = [];
    frame = 0;
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    lastTime = 0; // Reset lastTime
    requestAnimationFrame(gameLoop); // Start the game loop
});

// Also update your HTML to fix the avatar selection
document.querySelectorAll(".avatar-selection img").forEach(img => {
    img.onclick = function (event) {
        selectAvatar(this.getAttribute('src'), event);
    };
});

// Show "How to Play" modal
howToPlayButton.addEventListener("click", () => {
    howToPlayModal.style.display = "flex";
});

// Close "How to Play" modal when clicking outside
window.addEventListener("click", (event) => {
    if (event.target === howToPlayModal) {
        howToPlayModal.style.display = "none";
    }
});
