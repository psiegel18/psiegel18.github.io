'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

type Direction = 'up' | 'down' | 'left' | 'right'
type Position = { x: number; y: number }

export default function SnakePage() {
  const { data: session } = useSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle')
  const [isMobile, setIsMobile] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  // Game state refs (to avoid stale closures in game loop)
  const snakeRef = useRef<Position[]>([])
  const appleRef = useRef<Position>({ x: 0, y: 0 })
  const directionRef = useRef<Direction>('right')
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const cellSizeRef = useRef(10)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    checkMobile()
  }, [])

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('snakeHighScore')
    if (saved) setHighScore(parseInt(saved, 10))
  }, [])

  // Resize canvas
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const maxWidth = Math.min(window.innerWidth - 40, 600)
    const maxHeight = Math.min(window.innerHeight - 300, 600)
    const size = Math.min(maxWidth, maxHeight)

    canvas.width = size
    canvas.height = size
    cellSizeRef.current = Math.floor(size / 40)
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  // Get random position
  const getRandomPosition = useCallback((): Position => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const cellSize = cellSizeRef.current
    return {
      x: Math.floor(Math.random() * (canvas.width / cellSize)) * cellSize,
      y: Math.floor(Math.random() * (canvas.height / cellSize)) * cellSize
    }
  }, [])

  // Draw game
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const cellSize = cellSizeRef.current

    // Clear canvas
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw snake
    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e'
      ctx.fillRect(segment.x, segment.y, cellSize - 1, cellSize - 1)
    })

    // Draw apple
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(appleRef.current.x, appleRef.current.y, cellSize - 1, cellSize - 1)
  }, [])

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const cellSize = cellSizeRef.current
    const snake = snakeRef.current
    const direction = directionRef.current

    // Move snake
    const head = { ...snake[0] }
    switch (direction) {
      case 'up': head.y -= cellSize; break
      case 'down': head.y += cellSize; break
      case 'left': head.x -= cellSize; break
      case 'right': head.x += cellSize; break
    }

    // Check wall collision
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
      endGame()
      return
    }

    // Check self collision
    for (let i = 0; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        endGame()
        return
      }
    }

    snakeRef.current = [head, ...snake]

    // Check apple collision
    if (Math.abs(head.x - appleRef.current.x) < cellSize && Math.abs(head.y - appleRef.current.y) < cellSize) {
      appleRef.current = getRandomPosition()
      setScore(prev => prev + 1)
    } else {
      snakeRef.current.pop()
    }

    draw()
  }, [draw, getRandomPosition])

  // Start game
  const startGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const cellSize = cellSizeRef.current

    snakeRef.current = [
      { x: 20 * cellSize, y: 20 * cellSize },
      { x: 19 * cellSize, y: 20 * cellSize },
      { x: 18 * cellSize, y: 20 * cellSize }
    ]
    appleRef.current = getRandomPosition()
    directionRef.current = 'right'
    setScore(0)
    setGameState('playing')
    setShowInstructions(false)

    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    gameLoopRef.current = setInterval(gameLoop, 100)
  }, [gameLoop, getRandomPosition])

  // End game
  const endGame = useCallback(async () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }

    setGameState('gameover')

    // Update high score
    setScore(currentScore => {
      if (currentScore > highScore) {
        setHighScore(currentScore)
        localStorage.setItem('snakeHighScore', currentScore.toString())

        // Submit to leaderboard if logged in
        if (session?.user) {
          fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: 'SNAKE', score: currentScore })
          }).catch(console.error)
        }
      }
      return currentScore
    })
  }, [highScore, session])

  // Toggle pause
  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      setGameState('paused')

      // Draw pause overlay
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'white'
        ctx.font = '30px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2)
      }
    } else if (gameState === 'paused') {
      setGameState('playing')
      gameLoopRef.current = setInterval(gameLoop, 100)
    }
  }, [gameState, gameLoop])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === 'playing' || gameState === 'paused') {
          togglePause()
        }
        return
      }

      if (gameState !== 'playing') return

      // Prevent arrow keys from scrolling the page
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }

      const direction = directionRef.current
      switch (e.key) {
        case 'ArrowUp': if (direction !== 'down') directionRef.current = 'up'; break
        case 'ArrowDown': if (direction !== 'up') directionRef.current = 'down'; break
        case 'ArrowLeft': if (direction !== 'right') directionRef.current = 'left'; break
        case 'ArrowRight': if (direction !== 'left') directionRef.current = 'right'; break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, togglePause])

  // Touch controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== 'playing') return

    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const direction = directionRef.current

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && direction !== 'left') directionRef.current = 'right'
      else if (dx < 0 && direction !== 'right') directionRef.current = 'left'
    } else {
      if (dy > 0 && direction !== 'up') directionRef.current = 'down'
      else if (dy < 0 && direction !== 'down') directionRef.current = 'up'
    }
  }

  // Mobile button controls
  const handleDirection = (dir: Direction) => {
    const current = directionRef.current
    if (dir === 'up' && current !== 'down') directionRef.current = 'up'
    if (dir === 'down' && current !== 'up') directionRef.current = 'down'
    if (dir === 'left' && current !== 'right') directionRef.current = 'left'
    if (dir === 'right' && current !== 'left') directionRef.current = 'right'
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Game Area */}
          <div className="flex flex-col items-center">
            <canvas
              ref={canvasRef}
              className="game-canvas cursor-pointer"
              onClick={() => gameState === 'playing' && togglePause()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            />

            <div className="mt-4 text-lg">
              Score: <span className="text-primary-400 font-bold">{score}</span>
              {' | '}
              High Score: <span className="text-yellow-400 font-bold">{highScore}</span>
            </div>

            {/* Mobile Controls */}
            {isMobile && gameState === 'playing' && (
              <div className="mt-4 flex flex-col items-center" role="group" aria-label="Game controls">
                <button
                  onClick={() => handleDirection('up')}
                  className="w-14 h-14 bg-gradient-primary rounded-lg text-2xl mb-1"
                  aria-label="Move up"
                >
                  <i className="fas fa-arrow-up" aria-hidden="true" />
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDirection('left')}
                    className="w-14 h-14 bg-gradient-primary rounded-lg text-2xl"
                    aria-label="Move left"
                  >
                    <i className="fas fa-arrow-left" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDirection('down')}
                    className="w-14 h-14 bg-gradient-primary rounded-lg text-2xl"
                    aria-label="Move down"
                  >
                    <i className="fas fa-arrow-down" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDirection('right')}
                    className="w-14 h-14 bg-gradient-primary rounded-lg text-2xl"
                    aria-label="Move right"
                  >
                    <i className="fas fa-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="card p-6 min-w-[220px]">
            <h2 className="text-xl font-semibold mb-4">Controls</h2>
            <ul className="text-gray-400 space-y-2">
              {isMobile ? (
                <>
                  <li><strong>Arrow Buttons:</strong> Move snake</li>
                  <li><strong>Swipe:</strong> Change direction</li>
                  <li><strong>Tap Screen:</strong> Pause/Resume</li>
                </>
              ) : (
                <>
                  <li><strong>Arrow Keys:</strong> Move snake</li>
                  <li><strong>P or Esc:</strong> Pause/Resume</li>
                </>
              )}
            </ul>

            <div className="mt-6">
              <Link href="/leaderboard" className="text-primary-400 hover:text-primary-300">
                <i className="fas fa-trophy mr-2" />
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Snake Game Instructions</h2>
            <p className="text-gray-400 mb-4">Welcome to Snake! Here's how to play:</p>
            <ul className="text-gray-400 space-y-2 mb-6">
              {isMobile ? (
                <>
                  <li>Use the on-screen buttons or swipe to control the snake</li>
                  <li>Eat the red apples to grow longer and increase your score</li>
                  <li>Avoid hitting the walls or your own tail</li>
                  <li>Tap anywhere to pause/resume</li>
                </>
              ) : (
                <>
                  <li>Use arrow keys to control the snake's direction</li>
                  <li>Eat the red apples to grow longer and increase your score</li>
                  <li>Avoid hitting the walls or your own tail</li>
                  <li>Press 'P' or 'Esc' to pause/resume</li>
                </>
              )}
            </ul>
            <button onClick={startGame} className="btn-primary w-full">
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full p-8 text-center">
            <h2 className="text-3xl font-bold text-red-400 mb-4">Game Over!</h2>
            <div className="text-5xl font-bold text-primary-400 mb-4">{score}</div>
            <div className="text-xl text-yellow-400 mb-6">
              {score > highScore ? '🎉 New Personal Best! 🎉' :
               score === highScore && score > 0 ? '⭐ Matched Your Best! ⭐' :
               `Best: ${highScore}`}
            </div>
            <div className="flex gap-4 justify-center">
              <button onClick={startGame} className="btn-primary">
                Play Again
              </button>
              <Link href="/" className="btn-secondary">
                Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
