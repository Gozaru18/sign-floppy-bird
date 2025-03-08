        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");
        const startModal = document.getElementById("startModal");
        const startButton = document.getElementById("startButton");
        const howToPlayButton = document.getElementById("howToPlayButton");
        const howToPlayModal = document.getElementById("howToPlayModal");
        const scoreDisplay = document.getElementById("score");
        const finalScoreDisplay = document.getElementById("finalScore");
        let selectedAvatar = "images/sign.jpg";

        // Detect if the user is on a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Game parameters adjusted for mobile
        const pipeSpeed = isMobile ? 1.5 : 2.5; // Slower pipe speed on mobile
        const birdGravity = isMobile ? 0.4 : 0.6; // Lower gravity on mobile
        const birdLift = isMobile ? -10 : -12; // Slightly less lift on mobile

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
            console.log("Canvas resized to:", canvas.width, canvas.height); // Debugging
        }
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        const bird = { x: 50, y: canvas.height / 2, width: 50, height: 50, gravity: birdGravity, lift: birdLift, velocity: 0 };
        let pipes = [];
        let collectibles = [];
        let frame = 0;
        let gameOver = false;

        // Collection effect animation
        let collectionEffects = [];

        // Frame rate independence
        let lastTime = 0;
        const fixedTimeStep = 1000 / 60; // 60 FPS

        function update(deltaTime) {
            if (gameOver) return;

            bird.velocity += bird.gravity * (deltaTime / 16.67); // Normalize gravity
            bird.y += bird.velocity * (deltaTime / 16.67); // Normalize velocity

            // Fix for top collision - don't fail when player touches the top
            if (bird.y < 0) {
                bird.y = 0;
                bird.velocity = 0;
                endGame();
            } else if (bird.y + bird.height >= canvas.height) {
                endGame();
            }

            if (frame % 120 === 0) {
                let gap = 250;
                let pipeHeight = Math.random() * (canvas.height / 2);
                let newPipe = {
                    x: canvas.width,
                    width: 60,
                    top: pipeHeight,
                    bottomY: pipeHeight + gap,
                    bottom: canvas.height - (pipeHeight + gap),
                    passed: false
                };
                pipes.push(newPipe);

                spawnCollectible(newPipe);
            }

            pipes.forEach(pipe => {
                pipe.x -= pipeSpeed * (deltaTime / 16.67); // Normalize pipe speed
                if (
                    bird.x < pipe.x + pipe.width &&
                    bird.x + bird.width > pipe.x &&
                    (bird.y < pipe.top || bird.y + bird.height > pipe.bottomY)
                ) {
                    endGame();
                }
                if (!pipe.passed && pipe.x + pipe.width < bird.x) {
                    // Play sound when passing a pipe
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

            collectibles.forEach((item, index) => {
                item.x -= pipeSpeed * (deltaTime / 16.67); // Normalize collectible speed
                if (
                    bird.x < item.x + item.size &&
                    bird.x + bird.width > item.x &&
                    bird.y < item.y + item.size &&
                    bird.y + bird.height > item.y
                ) {
                    // Play collect sound
                    try {
                        collectSound.currentTime = 0;
                        collectSound.play();
                    } catch (e) {
                        console.log("Sound error:", e);
                    }

                    // Add to collected SBTs with current frame number
                    collectedSBTs.push({
                        image: item.image,
                        collectedFrame: frame
                    });

                    // Update total collection counter
                    if (!totalCollectedSBTs[item.image]) {
                        totalCollectedSBTs[item.image] = 0;
                    }
                    totalCollectedSBTs[item.image]++;

                    // Add collection effect
                    collectionEffects.push({
                        image: item.image,
                        startX: item.x,
                        startY: item.y,
                        size: item.size,
                        startFrame: frame,
                        duration: 60 // 1 second at 60fps
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

        function gameLoop(timestamp) {
            if (!lastTime) lastTime = timestamp;
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;

            update(deltaTime);
            draw();
            if (!gameOver) requestAnimationFrame(gameLoop);
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
                `Created by @crizqt321\n` +
                `#FlappyBird #SIGNEDITION #Gaming`
            );

            const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
            window.open(tweetUrl, "_blank");
        }

        // Add touch and click support
        function flapBird() {
            if (gameStarted) bird.velocity = bird.lift;
        }

        // Ensure canvas is focusable and can receive touch events
        canvas.setAttribute("tabindex", "0");
        canvas.focus();

        // Prevent default touch actions
        canvas.addEventListener("touchstart", function (e) {
            e.preventDefault();
            flapBird();
        }, { passive: false });

        canvas.addEventListener("touchend", function (e) {
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener("touchmove", function (e) {
            e.preventDefault();
        }, { passive: false });

        // Add click and keydown support
        canvas.addEventListener("click", flapBird);
        document.addEventListener("keydown", flapBird);

        startButton.addEventListener("click", () => {
            console.log("Start Game button clicked"); // Debugging
            gameStarted = true;
            gameOver = false;
            startModal.style.display = "none";
            console.log("Modal hidden:", startModal.style.display); // Debugging
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
            requestAnimationFrame(gameLoop);
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
