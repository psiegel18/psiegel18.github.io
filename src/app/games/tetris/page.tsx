'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const SHAPES = [
  [[1, 1, 1, 1]],                    // I
  [[1, 1], [1, 1]],                  // O
  [[1, 1, 1], [0, 1, 0]],            // T
  [[1, 1, 1], [1, 0, 0]],            // L
  [[1, 1, 1], [0, 0, 1]],            // J
  [[1, 1, 0], [0, 1, 1]],            // S
  [[0, 1, 1], [1, 1, 0]]             // Z
]

const COLORS = [
  '#00FFFF', '#FFFF00', '#FF00FF', '#FF0000',
  '#00FF00', '#0000FF', '#FFA500'
]

type Piece = {
  shape: number[][]
  x: number
  y: number
}

export default function TetrisPage() {
  const { data: session } = useSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nextCanvasRef = useRef<HTMLCanvasElement>(null)

  const [score, setScore] = useState(0)
  const [topScores, setTopScores] = useState<{ name: string; score: number }[]>([])
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle')
  const [playerName, setPlayerName] = useState('')

  // Game state refs
  const boardRef = useRef<(string | 0)[][]>([])
  const currentPieceRef = useRef<Piece | null>(null)
  const currentColorRef = useRef('')
  const nextPieceRef = useRef<number[][] | null>(null)
  const nextColorRef = useRef('')
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const blockSizeRef = useRef(30)

  const BOARD_WIDTH = 10
  const BOARD_HEIGHT = 20

  // Load top scores
  useEffect(() => {
    const scores = JSON.parse(localStorage.getItem('tetrisScores') || '[]')
    setTopScores(scores)
  }, [])

  // Initialize board
  const initBoard = useCallback(() => {
    boardRef.current = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0))
  }, [])

  // Resize canvas
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const maxHeight = Math.min(window.innerHeight - 200, 600)
    blockSizeRef.current = Math.floor(maxHeight / BOARD_HEIGHT)

    canvas.width = blockSizeRef.current * BOARD_WIDTH
    canvas.height = blockSizeRef.current * BOARD_HEIGHT
  }, [])

  useEffect(() => {
    resizeCanvas()
    initBoard()
    drawStartScreen()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas, initBoard])

  // Draw functions
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const blockSize = blockSizeRef.current

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw placed pieces
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (boardRef.current[y][x]) {
          ctx.fillStyle = boardRef.current[y][x] as string
          ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1)
        }
      }
    }

    // Draw current piece
    const piece = currentPieceRef.current
    if (piece) {
      ctx.fillStyle = currentColorRef.current
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            ctx.fillRect(
              (piece.x + x) * blockSize,
              (piece.y + y) * blockSize,
              blockSize - 1,
              blockSize - 1
            )
          }
        }
      }
    }

    // Draw pause overlay
    if (gameState === 'paused') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#fff'
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2)
    }
  }, [gameState])

  const drawNextPiece = useCallback(() => {
    const canvas = nextCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const piece = nextPieceRef.current
    if (piece) {
      const previewBlockSize = 15
      const offsetX = (canvas.width - piece[0].length * previewBlockSize) / 2
      const offsetY = (canvas.height - piece.length * previewBlockSize) / 2

      ctx.fillStyle = nextColorRef.current
      for (let y = 0; y < piece.length; y++) {
        for (let x = 0; x < piece[y].length; x++) {
          if (piece[y][x]) {
            ctx.fillRect(
              offsetX + x * previewBlockSize,
              offsetY + y * previewBlockSize,
              previewBlockSize - 1,
              previewBlockSize - 1
            )
          }
        }
      }
    }
  }, [])

  const drawStartScreen = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2)
  }, [])

  // Generate next piece
  const generateNextPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length)
    nextPieceRef.current = SHAPES[shapeIndex]
    nextColorRef.current = COLORS[shapeIndex]
    drawNextPiece()
  }, [drawNextPiece])

  // Create new piece
  const createPiece = useCallback(() => {
    if (!nextPieceRef.current) {
      const shapeIndex = Math.floor(Math.random() * SHAPES.length)
      currentPieceRef.current = {
        shape: SHAPES[shapeIndex],
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(SHAPES[shapeIndex][0].length / 2),
        y: 0
      }
      currentColorRef.current = COLORS[shapeIndex]
      generateNextPiece()
    } else {
      currentPieceRef.current = {
        shape: nextPieceRef.current,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(nextPieceRef.current[0].length / 2),
        y: 0
      }
      currentColorRef.current = nextColorRef.current
      generateNextPiece()
    }
  }, [generateNextPiece])

  // Check if move is valid
  const canMove = useCallback((dx: number, dy: number, shape?: number[][]): boolean => {
    const piece = currentPieceRef.current
    if (!piece) return false

    const checkShape = shape || piece.shape

    for (let y = 0; y < checkShape.length; y++) {
      for (let x = 0; x < checkShape[y].length; x++) {
        if (checkShape[y][x]) {
          const newX = piece.x + x + dx
          const newY = piece.y + y + dy
          if (
            newX < 0 || newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && boardRef.current[newY][newX])
          ) {
            return false
          }
        }
      }
    }
    return true
  }, [])

  // Rotate piece
  const rotate = useCallback(() => {
    const piece = currentPieceRef.current
    if (!piece) return

    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    )

    if (canMove(0, 0, rotated)) {
      piece.shape = rotated
    }
  }, [canMove])

  // Merge piece into board
  const mergePiece = useCallback(() => {
    const piece = currentPieceRef.current
    if (!piece) return

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          boardRef.current[piece.y + y][piece.x + x] = currentColorRef.current
        }
      }
    }
  }, [])

  // Clear completed lines
  const clearLines = useCallback(() => {
    let linesCleared = 0

    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (boardRef.current[y].every(cell => cell !== 0)) {
        boardRef.current.splice(y, 1)
        boardRef.current.unshift(Array(BOARD_WIDTH).fill(0))
        linesCleared++
        y++ // Check same row again
      }
    }

    if (linesCleared > 0) {
      const points = [40, 100, 300, 1200][linesCleared - 1]
      setScore(prev => prev + points)
    }
  }, [])

  // End game
  const endGame = useCallback(async () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }
    setGameState('gameover')
  }, [])

  // Save score
  const saveScore = useCallback((name: string, finalScore: number) => {
    let scores = JSON.parse(localStorage.getItem('tetrisScores') || '[]')
    scores.push({ name, score: finalScore })
    scores.sort((a: any, b: any) => b.score - a.score)
    scores = scores.slice(0, 5)
    localStorage.setItem('tetrisScores', JSON.stringify(scores))
    setTopScores(scores)

    // Submit to global leaderboard if logged in
    if (session?.user) {
      fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: 'TETRIS', score: finalScore })
      }).catch(console.error)
    }
  }, [session])

  // Game loop
  const gameLoop = useCallback(() => {
    const piece = currentPieceRef.current
    if (!piece) return

    if (canMove(0, 1)) {
      piece.y++
    } else {
      mergePiece()
      clearLines()
      createPiece()

      if (!canMove(0, 0)) {
        endGame()
        return
      }
    }

    drawBoard()
  }, [canMove, mergePiece, clearLines, createPiece, endGame, drawBoard])

  // Start game
  const startGame = useCallback(() => {
    initBoard()
    currentPieceRef.current = null
    nextPieceRef.current = null
    setScore(0)
    setGameState('playing')

    createPiece()

    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    gameLoopRef.current = setInterval(gameLoop, 500)
  }, [initBoard, createPiece, gameLoop])

  // Toggle pause
  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      setGameState('paused')
      drawBoard()
    } else if (gameState === 'paused') {
      setGameState('playing')
      gameLoopRef.current = setInterval(gameLoop, 500)
    }
  }, [gameState, gameLoop, drawBoard])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'idle') {
        startGame()
        return
      }

      if (gameState === 'playing') {
        if (e.key.toLowerCase() === 'q') {
          endGame()
          return
        }

        if (e.key.toLowerCase() === 'p') {
          togglePause()
          return
        }

        const piece = currentPieceRef.current
        if (!piece) return

        switch (e.key) {
          case 'ArrowLeft':
            if (canMove(-1, 0)) piece.x--
            break
          case 'ArrowRight':
            if (canMove(1, 0)) piece.x++
            break
          case 'ArrowDown':
            if (canMove(0, 1)) piece.y++
            break
          case 'ArrowUp':
            rotate()
            break
        }
        drawBoard()
      } else if (gameState === 'paused' && e.key.toLowerCase() === 'p') {
        togglePause()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, startGame, endGame, togglePause, canMove, rotate, drawBoard])

  // Handle game over submission
  const handlePlayAgain = () => {
    if (playerName.trim()) {
      saveScore(playerName.trim(), score)
    }
    setPlayerName('')
    setGameState('idle')
    drawStartScreen()

    // Clear next piece preview
    const nextCtx = nextCanvasRef.current?.getContext('2d')
    if (nextCtx && nextCanvasRef.current) {
      nextCtx.fillStyle = '#000'
      nextCtx.fillRect(0, 0, nextCanvasRef.current.width, nextCanvasRef.current.height)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [])

  // Check if it's a top score
  const isTopScore = topScores.length < 5 || score > (topScores[topScores.length - 1]?.score || 0)

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Side Panel */}
          <div className="card p-6 min-w-[220px] order-2 lg:order-1">
            <div className="text-lg mb-4">
              Current Score: <span className="text-primary-400 font-bold">{score}</span>
            </div>

            <h2 className="text-xl font-semibold mb-3">Instructions</h2>
            <ul className="text-gray-400 text-sm space-y-1 mb-4">
              <li><strong>Space:</strong> Start game</li>
              <li><strong>Left Arrow:</strong> Move left</li>
              <li><strong>Right Arrow:</strong> Move right</li>
              <li><strong>Down Arrow:</strong> Move down</li>
              <li><strong>Up Arrow:</strong> Rotate</li>
              <li><strong>P:</strong> Pause/Resume</li>
              <li><strong>Q:</strong> Quit game</li>
            </ul>

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Next Piece</h3>
              <canvas
                ref={nextCanvasRef}
                width={80}
                height={80}
                className="border border-dark-100/50 rounded bg-black"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Top 5 Scores</h3>
              {topScores.length > 0 ? (
                <ol className="text-gray-400 text-sm list-decimal list-inside">
                  {topScores.map((entry, index) => (
                    <li key={index}>{entry.name}: {entry.score}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-500 text-sm">No scores yet</p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-dark-100/50">
              <Link href="/leaderboard" className="text-primary-400 hover:text-primary-300 text-sm">
                <i className="fas fa-trophy mr-2" />
                View Global Leaderboard
              </Link>
            </div>
          </div>

          {/* Game Area */}
          <div className="order-1 lg:order-2">
            <canvas ref={canvasRef} className="game-canvas" />
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full p-8 text-center">
            <h2 className="text-3xl font-bold text-red-400 mb-4">Game Over!</h2>
            <div className="text-5xl font-bold text-primary-400 mb-4">{score}</div>
            <div className="text-xl text-yellow-400 mb-6">
              {isTopScore ? '🏆 Top 5 Score! 🏆' :
               score >= 500 ? '⭐ Great Job! ⭐' :
               'Keep trying!'}
            </div>

            <div className="mb-6">
              <label className="block text-gray-400 mb-2">Enter your name:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePlayAgain()}
                placeholder="Your Name"
                maxLength={20}
                className="w-full px-4 py-2 bg-dark-400 border border-dark-100 rounded-lg text-center focus:outline-none focus:border-primary-500"
                autoFocus
              />
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={handlePlayAgain} className="btn-primary">
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
