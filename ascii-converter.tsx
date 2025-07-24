"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  GripVertical,
  UploadIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Settings,
  Copy,
  Save,
  ImageIcon,
  FileText,
  Code,
  Palette,
  Grid3x3,
  Layers,
  Sparkles,
  Info,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Types
type ColoredChar = {
  char: string
  color: string
}

type ExportFormat = "txt" | "html" | "svg" | "png"
type Theme = "dark" | "light" | "retro" | "neon"
type ViewMode = "split" | "ascii-only" | "original-only"

interface HistoryState {
  resolution: number
  inverted: boolean
  grayscale: boolean
  charSet: string
  customCharSet: string
  asciiArt: string
  coloredAsciiArt: ColoredChar[][]
}

export default function EnhancedAsciiConverter() {
  // Core state
  const [resolution, setResolution] = useState(0.11)
  const [inverted, setInverted] = useState(false)
  const [grayscale, setGrayscale] = useState(true)
  const [charSet, setCharSet] = useState("standard")
  const [customCharSet, setCustomCharSet] = useState("")
  const [loading, setLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [asciiArt, setAsciiArt] = useState("")
  const [coloredAsciiArt, setColoredAsciiArt] = useState<ColoredChar[][]>([])
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [leftPanelWidth, setLeftPanelWidth] = useState(25)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [sidebarNarrow, setSidebarNarrow] = useState(false)

  // Enhanced features state
  const [zoom, setZoom] = useState(1)
  const [theme, setTheme] = useState<Theme>("dark")
  const [viewMode, setViewMode] = useState<ViewMode>("split")
  const [showGrid, setShowGrid] = useState(false)
  const [realTimePreview, setRealTimePreview] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [edgeDetection, setEdgeDetection] = useState(false)
  const [dithering, setDithering] = useState(false)

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [frames, setFrames] = useState<string[]>([])

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Performance state
  const [processingTime, setProcessingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const workerRef = useRef<Worker | null>(null)

  // Character sets with more options
  const charSets = {
    standard: " .:-=+*#%@",
    detailed: " .,:;i1tfLCG08@",
    blocks: " ░▒▓█",
    minimal: " .:█",
    binary: " █",
    braille: " ⠁⠃⠇⠏⠟⠿⣿",
    mathematical: " ·∘○●◉⬢⬣",
    custom: customCharSet || " .:-=+*#%@",
  }

  // Theme configurations
  const themes = {
    dark: {
      bg: "bg-black",
      text: "text-white",
      panel: "bg-stone-900",
      border: "border-stone-700",
      accent: "bg-stone-700",
    },
    light: {
      bg: "bg-white",
      text: "text-black",
      panel: "bg-gray-100",
      border: "border-gray-300",
      accent: "bg-gray-300",
    },
    retro: {
      bg: "bg-green-900",
      text: "text-green-100",
      panel: "bg-green-800",
      border: "border-green-600",
      accent: "bg-green-600",
    },
    neon: {
      bg: "bg-purple-900",
      text: "text-cyan-100",
      panel: "bg-purple-800",
      border: "border-cyan-500",
      accent: "bg-cyan-600",
    },
  }

  const currentTheme = themes[theme]

  // Initialize
  useEffect(() => {
    setIsHydrated(true)
    // Set document background
    document.documentElement.style.backgroundColor =
      theme === "dark" ? "black" : theme === "light" ? "white" : theme === "retro" ? "#14532d" : "#581c87"
    document.body.style.backgroundColor =
      theme === "dark" ? "black" : theme === "light" ? "white" : theme === "retro" ? "#14532d" : "#581c87"

    return () => {
      document.documentElement.style.backgroundColor = ""
      document.body.style.backgroundColor = ""
    }
  }, [theme])

  useEffect(() => {
    if (!isHydrated) return

    setIsDesktop(window.innerWidth >= 768)
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 768
      setIsDesktop(newIsDesktop)
      if (newIsDesktop !== isDesktop) {
        setLeftPanelWidth(25)
      }
    }

    window.addEventListener("resize", handleResize)

    // Only load default image after hydration
    loadDefaultImage()

    // Rest of the keyboard shortcuts code remains the same...
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case "c":
            if (e.shiftKey) {
              e.preventDefault()
              copyToClipboard()
            }
            break
          case "s":
            e.preventDefault()
            downloadAsciiArt()
            break
          case "+":
          case "=":
            e.preventDefault()
            setZoom((prev) => Math.min(prev * 1.2, 5))
            break
          case "-":
            e.preventDefault()
            setZoom((prev) => Math.max(prev / 1.2, 0.1))
            break
        }
      }
      switch (e.key) {
        case "f":
          if (e.altKey) {
            e.preventDefault()
            setIsFullscreen((prev) => !prev)
          }
          break
        case "g":
          if (e.altKey) {
            e.preventDefault()
            setShowGrid((prev) => !prev)
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isDesktop, isHydrated])

  // Save to history
  const saveToHistory = useCallback(() => {
    const state: HistoryState = {
      resolution,
      inverted,
      grayscale,
      charSet,
      customCharSet,
      asciiArt,
      coloredAsciiArt,
    }

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(state)
      return newHistory.slice(-50) // Keep only last 50 states
    })
    setHistoryIndex((prev) => Math.min(prev + 1, 49))
  }, [resolution, inverted, grayscale, charSet, customCharSet, asciiArt, coloredAsciiArt, historyIndex])

  // Undo/Redo functions
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setResolution(prevState.resolution)
      setInverted(prevState.inverted)
      setGrayscale(prevState.grayscale)
      setCharSet(prevState.charSet)
      setCustomCharSet(prevState.customCharSet)
      setAsciiArt(prevState.asciiArt)
      setColoredAsciiArt(prevState.coloredAsciiArt)
      setHistoryIndex((prev) => prev - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setResolution(nextState.resolution)
      setInverted(nextState.inverted)
      setGrayscale(nextState.grayscale)
      setCharSet(nextState.charSet)
      setCustomCharSet(nextState.customCharSet)
      setAsciiArt(nextState.asciiArt)
      setColoredAsciiArt(nextState.coloredAsciiArt)
      setHistoryIndex((prev) => prev + 1)
    }
  }, [history, historyIndex])

  // Enhanced conversion with performance timing
  const convertToAscii = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return

    setIsProcessing(true)
    const startTime = performance.now()

    try {
      const img = imageRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      // Apply image filters
      canvas.width = img.width
      canvas.height = img.height
      ctx.filter = `brightness(${brightness}) contrast(${contrast})`
      ctx.drawImage(img, 0, 0)

      // Edge detection preprocessing
      if (edgeDetection) {
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const edgeData = applyEdgeDetection(imageData)
        ctx.putImageData(edgeData, 0, 0)
      }

      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const data = imageData.data

      const chars = charSets[charSet as keyof typeof charSets] || charSets.standard
      const width = Math.floor(img.width * resolution)
      const height = Math.floor(img.height * resolution)

      const fontAspect = 0.5
      const widthStep = Math.ceil(img.width / width)
      const heightStep = Math.ceil(img.height / height / fontAspect)

      let result = ""
      const coloredResult: ColoredChar[][] = []

      for (let y = 0; y < img.height; y += heightStep) {
        const coloredRow: ColoredChar[] = []

        for (let x = 0; x < img.width; x += widthStep) {
          const pos = (y * img.width + x) * 4
          const r = data[pos]
          const g = data[pos + 1]
          const b = data[pos + 2]

          let brightness = grayscale
            ? (r * 0.299 + g * 0.587 + b * 0.114) / 255
            : Math.sqrt(0.299 * (r / 255) ** 2 + 0.587 * (g / 255) ** 2 + 0.114 * (b / 255) ** 2)

          if (inverted) brightness = 1 - brightness

          // Apply dithering
          if (dithering) {
            brightness = Math.round(brightness * (chars.length - 1)) / (chars.length - 1)
          }

          const charIndex = Math.floor(brightness * (chars.length - 1))
          const char = chars[charIndex]
          result += char

          if (!grayscale) {
            const brightnessFactor = (charIndex / (chars.length - 1)) * 1.5 + 0.5
            const color = `rgb(${Math.max(r * brightnessFactor, 40)}, ${Math.max(g * brightnessFactor, 40)}, ${Math.max(b * brightnessFactor, 40)})`
            coloredRow.push({ char, color })
          } else {
            coloredRow.push({ char, color: currentTheme.text.includes("white") ? "white" : "black" })
          }
        }

        result += "\n"
        coloredResult.push(coloredRow)
      }

      setAsciiArt(result)
      setColoredAsciiArt(coloredResult)
      setError(null)

      const endTime = performance.now()
      setProcessingTime(endTime - startTime)
    } catch (err) {
      console.error("Error converting to ASCII:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsProcessing(false)
    }
  }, [resolution, inverted, grayscale, charSet, brightness, contrast, edgeDetection, dithering, currentTheme.text])

  // Edge detection algorithm
  const applyEdgeDetection = (imageData: ImageData): ImageData => {
    const { data, width, height } = imageData
    const output = new ImageData(width, height)
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0,
          gy = 0

        for (let i = 0; i < 9; i++) {
          const xi = x + (i % 3) - 1
          const yi = y + Math.floor(i / 3) - 1
          const idx = (yi * width + xi) * 4
          const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114

          gx += gray * sobelX[i]
          gy += gray * sobelY[i]
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy)
        const outputIdx = (y * width + x) * 4

        output.data[outputIdx] = magnitude
        output.data[outputIdx + 1] = magnitude
        output.data[outputIdx + 2] = magnitude
        output.data[outputIdx + 3] = 255
      }
    }

    return output
  }

  // Real-time preview effect
  useEffect(() => {
    if (imageLoaded && realTimePreview) {
      const timeoutId = setTimeout(convertToAscii, 100) // Debounce
      return () => clearTimeout(timeoutId)
    }
  }, [
    resolution,
    inverted,
    grayscale,
    charSet,
    customCharSet,
    brightness,
    contrast,
    edgeDetection,
    dithering,
    imageLoaded,
    realTimePreview,
    convertToAscii,
  ])

  // Manual conversion trigger
  useEffect(() => {
    if (imageLoaded && !realTimePreview) {
      convertToAscii()
    }
  }, [imageLoaded, convertToAscii, realTimePreview])

  // Canvas rendering with zoom and grid
  const renderToCanvas = useCallback(() => {
    if (!outputCanvasRef.current || !asciiArt || coloredAsciiArt.length === 0) return

    const canvas = outputCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const fontSize = 8 * zoom
    const lineHeight = fontSize
    const charWidth = fontSize * 0.6

    if (grayscale) {
      const lines = asciiArt.split("\n")
      const maxLineLength = Math.max(...lines.map((line) => line.length))
      canvas.width = maxLineLength * charWidth
      canvas.height = lines.length * lineHeight
    } else {
      canvas.width = coloredAsciiArt[0].length * charWidth
      canvas.height = coloredAsciiArt.length * lineHeight
    }

    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = "top"

    // Clear canvas
    ctx.fillStyle = currentTheme.bg.includes("black")
      ? "black"
      : currentTheme.bg.includes("white")
        ? "white"
        : currentTheme.bg.includes("green")
          ? "#14532d"
          : "#581c87"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid if enabled
    if (showGrid && zoom > 1) {
      ctx.strokeStyle = currentTheme.border.includes("stone")
        ? "#57534e"
        : currentTheme.border.includes("gray")
          ? "#d1d5db"
          : currentTheme.border.includes("green")
            ? "#16a34a"
            : "#06b6d4"
      ctx.lineWidth = 0.5

      for (let x = 0; x <= canvas.width; x += charWidth) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y <= canvas.height; y += lineHeight) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }

    // Render ASCII art
    if (grayscale) {
      ctx.fillStyle = currentTheme.text.includes("white") ? "white" : "black"
      asciiArt.split("\n").forEach((line, lineIndex) => {
        ctx.fillText(line, 0, lineIndex * lineHeight)
      })
    } else {
      coloredAsciiArt.forEach((row, rowIndex) => {
        row.forEach((col, colIndex) => {
          ctx.fillStyle = col.color
          ctx.fillText(col.char, colIndex * charWidth, rowIndex * lineHeight)
        })
      })
    }
  }, [asciiArt, coloredAsciiArt, grayscale, zoom, showGrid, currentTheme])

  // Render original image
  const renderOriginalImage = useCallback(() => {
    if (!originalCanvasRef.current || !imageRef.current) return

    const canvas = originalCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = imageRef.current
    canvas.width = img.width
    canvas.height = img.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.filter = `brightness(${brightness}) contrast(${contrast})`
    ctx.drawImage(img, 0, 0)
  }, [brightness, contrast])

  // Update renders when dependencies change
  useEffect(() => {
    if (imageLoaded && !loading && !error) {
      renderToCanvas()
      renderOriginalImage()
    }
  }, [
    asciiArt,
    coloredAsciiArt,
    grayscale,
    zoom,
    showGrid,
    loading,
    error,
    imageLoaded,
    renderToCanvas,
    renderOriginalImage,
  ])

  // File handling
  const loadDefaultImage = () => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    // Ensure we're in the browser environment
    if (typeof window === "undefined") {
      setError("Image loading not available on server")
      setLoading(false)
      return
    }

    const img = new window.Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        setError("Invalid image dimensions")
        setLoading(false)
        return
      }
      imageRef.current = img
      setImageLoaded(true)
      setLoading(false)
    }

    img.onerror = () => {
      setError("Failed to load image")
      setLoading(false)
    }

    img.src = "/images/original-image.png?height=400&width=400&text=Sample+Image"
  }

  const loadImage = (src: string) => {
    setLoading(true)
    setError(null)
    setImageLoaded(false)

    // Ensure we're in the browser environment
    if (typeof window === "undefined") {
      setError("Image loading not available on server")
      setLoading(false)
      return
    }

    const img = new window.Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        setError("Invalid image dimensions")
        setLoading(false)
        return
      }
      imageRef.current = img
      setImageLoaded(true)
      setLoading(false)
      saveToHistory()
    }

    img.onerror = () => {
      setError("Failed to load image")
      setLoading(false)
    }

    img.src = src
  }

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        loadImage(e.target.result as string)
      }
    }
    reader.onerror = () => setError("Failed to read file")
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = () => setIsDraggingFile(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // Panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
        if (newLeftWidth >= 20 && newLeftWidth <= 80) {
          setLeftPanelWidth(newLeftWidth)
        }
      }
    }

    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  // Sidebar width check
  useEffect(() => {
    if (!isHydrated || !isDesktop) return

    const checkSidebarWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const sidebarWidth = (leftPanelWidth / 100) * containerWidth
        setSidebarNarrow(sidebarWidth < 350)
      }
    }

    checkSidebarWidth()
    window.addEventListener("resize", checkSidebarWidth)
    return () => window.removeEventListener("resize", checkSidebarWidth)
  }, [leftPanelWidth, isHydrated, isDesktop])

  // Export functions
  const copyToClipboard = async () => {
    if (!asciiArt) {
      setError("No ASCII art to copy")
      return
    }

    try {
      await navigator.clipboard.writeText(asciiArt)
      // Show success feedback
      setError(null)
    } catch (err) {
      // Fallback for older browsers
      const el = document.createElement("textarea")
      el.value = asciiArt
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
  }

  const downloadAsciiArt = (format: ExportFormat = "txt") => {
    if (!asciiArt) {
      setError("No ASCII art to download")
      return
    }

    let content = ""
    let filename = ""
    let mimeType = ""

    switch (format) {
      case "txt":
        content = asciiArt
        filename = "ascii-art.txt"
        mimeType = "text/plain"
        break
      case "html":
        content = generateHTMLExport()
        filename = "ascii-art.html"
        mimeType = "text/html"
        break
      case "svg":
        content = generateSVGExport()
        filename = "ascii-art.svg"
        mimeType = "image/svg+xml"
        break
      case "png":
        downloadCanvasAsPNG()
        return
    }

    const element = document.createElement("a")
    const file = new Blob([content], { type: mimeType })
    element.href = URL.createObjectURL(file)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const generateHTMLExport = () => {
    const lines = asciiArt.split("\n")
    const htmlLines = lines
      .map((line) =>
        line
          .split("")
          .map((char) => `<span>${char === " " ? "&nbsp;" : char}</span>`)
          .join(""),
      )
      .join("<br>")

    return `<!DOCTYPE html>
<html>
<head>
    <title>ASCII Art</title>
    <style>
        body { 
            background: ${currentTheme.bg.includes("black") ? "black" : "white"}; 
            color: ${currentTheme.text.includes("white") ? "white" : "black"}; 
            font-family: monospace; 
            white-space: pre; 
            line-height: 1; 
        }
    </style>
</head>
<body>${htmlLines}</body>
</html>`
  }

  const generateSVGExport = () => {
    const lines = asciiArt.split("\n")
    const fontSize = 8
    const lineHeight = fontSize
    const charWidth = fontSize * 0.6
    const width = Math.max(...lines.map((line) => line.length)) * charWidth
    const height = lines.length * lineHeight

    const textElements = lines
      .map(
        (line, index) =>
          `<text x="0" y="${(index + 1) * lineHeight}" fontFamily="monospace" fontSize="${fontSize}" fill="${currentTheme.text.includes("white") ? "white" : "black"}">${line}</text>`,
      )
      .join("\n")

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${currentTheme.bg.includes("black") ? "black" : "white"}"/>
    ${textElements}
</svg>`
  }

  const downloadCanvasAsPNG = () => {
    if (!outputCanvasRef.current) return

    outputCanvasRef.current.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const element = document.createElement("a")
      element.href = url
      element.download = "ascii-art.png"
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(url)
    })
  }

  // Memoized preview component
  const PreviewContent = useMemo(() => {
    if (loading) {
      return (
        <div className={`${currentTheme.text} font-mono flex items-center justify-center h-full`}>
          <div className="text-center">
            <div className="animate-spin text-2xl mb-2">⟳</div>
            Loading image...
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-4 text-center">
          <Alert className={`${currentTheme.border} ${currentTheme.panel}`}>
            <AlertDescription className={`${currentTheme.text} font-mono`}>
              {error}
              <div className="mt-2 text-sm">Try uploading a different image or refreshing the page.</div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    const showSplit = viewMode === "split" && showOriginal
    const showAsciiOnly = viewMode === "ascii-only" || !showOriginal
    const showOriginalOnly = viewMode === "original-only"

    return (
      <div className="h-full w-full overflow-auto flex items-center justify-center p-4">
        {showSplit && (
          <div className="flex gap-4 max-w-full">
            <div className="flex-1 flex flex-col items-center">
              <h3 className={`${currentTheme.text} text-sm font-mono mb-2`}>Original</h3>
              <canvas
                ref={originalCanvasRef}
                className="max-w-full max-h-96 border rounded"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
              />
            </div>
            <div className="flex-1 flex flex-col items-center">
              <h3 className={`${currentTheme.text} text-sm font-mono mb-2`}>ASCII Art</h3>
              <canvas
                ref={outputCanvasRef}
                className="max-w-full select-text border rounded"
                style={{
                  fontSize: "0.4rem",
                  lineHeight: "0.4rem",
                  fontFamily: "monospace",
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              />
            </div>
          </div>
        )}

        {showAsciiOnly && (
          <div className="flex flex-col items-center">
            <canvas
              ref={outputCanvasRef}
              className="max-w-full select-text"
              style={{
                fontSize: "0.4rem",
                lineHeight: "0.4rem",
                fontFamily: "monospace",
                transform: `scale(${zoom})`,
                transformOrigin: "center",
              }}
            />
          </div>
        )}

        {showOriginalOnly && (
          <div className="flex flex-col items-center">
            <canvas
              ref={originalCanvasRef}
              className="max-w-full border rounded"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            />
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div
            className={`absolute top-4 right-4 ${currentTheme.panel} ${currentTheme.text} px-3 py-1 rounded font-mono text-sm`}
          >
            Processing...
          </div>
        )}
      </div>
    )
  }, [loading, error, viewMode, showOriginal, zoom, isProcessing, currentTheme])

  if (!isHydrated) {
    return <div className="min-h-screen w-full bg-black"></div>
  }

  return (
    <div className={`min-h-screen w-full ${currentTheme.bg} ${currentTheme.text}`}>
      <div
        ref={containerRef}
        className={`flex ${isFullscreen ? "fixed inset-0 z-50" : "flex-col md:flex-row"} min-h-screen w-full overflow-hidden select-none`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ASCII Art Preview */}
        <div
          ref={previewRef}
          className={`${isFullscreen ? "flex-1" : "order-1 md:order-2 flex-1"} ${currentTheme.bg} overflow-auto flex items-center justify-center ${
            isDraggingFile ? "bg-opacity-50" : ""
          } relative`}
          style={{
            ...(isHydrated && isDesktop && !isFullscreen
              ? {
                  width: `${100 - leftPanelWidth}%`,
                  marginLeft: `${leftPanelWidth}%`,
                }
              : {}),
          }}
        >
          {isDraggingFile && (
            <div
              className={`absolute inset-0 flex items-center justify-center ${currentTheme.bg} bg-opacity-70 z-10 select-none`}
            >
              <div className={`${currentTheme.text} text-xl font-mono flex flex-col items-center`}>
                <UploadIcon className="w-8 h-8 mb-2" />
                Drop image here
              </div>
            </div>
          )}

          {PreviewContent}

          {/* Zoom Controls */}
          {!isFullscreen && (
            <div className="absolute bottom-4 left-4 z-30 flex gap-2">
              <Button
                onClick={() => setZoom((prev) => Math.max(prev / 1.2, 0.1))}
                size="sm"
                className={`${currentTheme.accent} hover:opacity-90`}
                title="Zoom Out (Ctrl+-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className={`${currentTheme.panel} px-2 py-1 rounded text-sm font-mono flex items-center`}>
                {Math.round(zoom * 100)}%
              </div>
              <Button
                onClick={() => setZoom((prev) => Math.min(prev * 1.2, 5))}
                size="sm"
                className={`${currentTheme.accent} hover:opacity-90`}
                title="Zoom In (Ctrl++)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* View Mode Controls */}
          {!isFullscreen && (
            <div className="absolute top-4 left-4 z-30 flex gap-2">
              <Button
                onClick={() => setViewMode(viewMode === "split" ? "ascii-only" : "split")}
                size="sm"
                className={`${currentTheme.accent} hover:opacity-90`}
                title="Toggle View Mode"
              >
                <Layers className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setShowGrid((prev) => !prev)}
                size="sm"
                className={`${currentTheme.accent} hover:opacity-90 ${showGrid ? "opacity-100" : "opacity-60"}`}
                title="Toggle Grid (Alt+G)"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsFullscreen(true)}
                size="sm"
                className={`${currentTheme.accent} hover:opacity-90`}
                title="Fullscreen (Alt+F)"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Performance Info */}
          {processingTime > 0 && !isFullscreen && (
            <div
              className={`absolute top-4 right-4 ${currentTheme.panel} px-2 py-1 rounded text-xs font-mono opacity-70`}
            >
              {processingTime.toFixed(0)}ms
            </div>
          )}

          {/* Fullscreen Exit */}
          {isFullscreen && (
            <Button onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 z-50" size="sm">
              Exit Fullscreen
            </Button>
          )}
        </div>

        {/* Resizable divider */}
        {isHydrated && isDesktop && !isFullscreen && (
          <div
            className={`order-3 w-2 ${currentTheme.accent} hover:opacity-80 cursor-col-resize items-center justify-center z-10 transition-opacity duration-300`}
            onMouseDown={() => setIsDragging(true)}
            style={{
              position: "absolute",
              left: `${leftPanelWidth}%`,
              top: 0,
              bottom: 0,
              display: "flex",
            }}
          >
            <GripVertical className="h-6 w-6 text-stone-500" />
          </div>
        )}

        {/* Control Panel */}
        {!isFullscreen && (
          <div
            className={`${isFullscreen ? "hidden" : "order-2 md:order-1"} w-full md:h-auto p-2 md:p-4 ${currentTheme.panel} font-mono ${currentTheme.text} transition-opacity duration-300`}
            style={{
              width: "100%",
              height: "auto",
              flex: "0 0 auto",
              ...(isHydrated && isDesktop
                ? {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${leftPanelWidth}%`,
                    overflowY: "auto",
                  }
                : {}),
            }}
          >
            <div className={`space-y-4 p-2 md:p-4 border ${currentTheme.border} rounded-md`}>
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h1 className={`text-lg ${currentTheme.text} font-bold`}>ASCII Art Converter</h1>
                  <div className="flex gap-1">
                    <Button
                      onClick={undo}
                      size="sm"
                      disabled={historyIndex <= 0}
                      className={`${currentTheme.accent} hover:opacity-90`}
                      title="Undo (Ctrl+Z)"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={redo}
                      size="sm"
                      disabled={historyIndex >= history.length - 1}
                      className={`${currentTheme.accent} hover:opacity-90`}
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <RotateCcw className="h-3 w-3 scale-x-[-1]" />
                    </Button>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="flex items-center gap-2">
                  <Label className={`${currentTheme.text} text-xs`}>Theme:</Label>
                  <Select value={theme} onValueChange={(value: Theme) => setTheme(value)}>
                    <SelectTrigger
                      className={`${currentTheme.accent} ${currentTheme.border} ${currentTheme.text} h-7 text-xs`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${currentTheme.panel} ${currentTheme.border} ${currentTheme.text}`}>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="retro">Retro</SelectItem>
                      <SelectItem value="neon">Neon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <Alert className={`${currentTheme.border} ${currentTheme.panel} mt-2`}>
                    <AlertDescription className={`${currentTheme.text} text-sm`}>{error}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Performance Settings */}
              <div className={`space-y-2 border-t ${currentTheme.border} pt-4`}>
                <div className="flex items-center justify-between">
                  <Label className={`${currentTheme.text} text-sm flex items-center gap-2`}>
                    <Settings className="h-4 w-4" />
                    Performance
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="realtime"
                      checked={realTimePreview}
                      onCheckedChange={setRealTimePreview}
                      className="data-[state=checked]:bg-stone-600"
                    />
                    <Label htmlFor="realtime" className={`${currentTheme.text} text-xs`}>
                      Real-time
                    </Label>
                  </div>
                </div>
                {!realTimePreview && (
                  <Button
                    onClick={convertToAscii}
                    className={`w-full ${currentTheme.accent} hover:opacity-90`}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Converting..." : "Convert to ASCII"}
                  </Button>
                )}
              </div>

              {/* Resolution Control */}
              <div className={`space-y-2 border-t ${currentTheme.border} pt-4`}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="resolution" className={`${currentTheme.text}`}>
                    Resolution: {resolution.toFixed(2)}
                  </Label>
                </div>
                <Slider
                  id="resolution"
                  min={0.05}
                  max={0.3}
                  step={0.01}
                  value={[resolution]}
                  onValueChange={(value) => setResolution(value[0])}
                  className="[&>span]:border-none [&_.bg-primary]:bg-stone-800 [&>.bg-background]:bg-stone-500/30"
                />
              </div>

              {/* Character Set */}
              <div className={`space-y-2 border-t ${currentTheme.border} pt-4`}>
                <Label htmlFor="charset" className={`${currentTheme.text}`}>
                  Character Set
                </Label>
                <Select value={charSet} onValueChange={setCharSet}>
                  <SelectTrigger
                    id="charset"
                    className={`${currentTheme.accent} ${currentTheme.border} ${currentTheme.text}`}
                  >
                    <SelectValue placeholder="Select character set" />
                  </SelectTrigger>
                  <SelectContent className={`${currentTheme.panel} ${currentTheme.border} ${currentTheme.text}`}>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="blocks">Block Characters</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="binary">Binary</SelectItem>
                    <SelectItem value="braille">Braille</SelectItem>
                    <SelectItem value="mathematical">Mathematical</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>

                {charSet === "custom" && (
                  <Input
                    placeholder="Enter custom characters..."
                    value={customCharSet}
                    onChange={(e) => setCustomCharSet(e.target.value)}
                    className={`${currentTheme.accent} ${currentTheme.border} ${currentTheme.text}`}
                  />
                )}
              </div>

              {/* Image Adjustments */}
              <div className={`space-y-2 border-t ${currentTheme.border} pt-4`}>
                <Label className={`${currentTheme.text} flex items-center gap-2`}>
                  <Palette className="h-4 w-4" />
                  Image Adjustments
                </Label>

                <div className="space-y-2">
                  <div>
                    <Label className={`${currentTheme.text} text-sm`}>Brightness: {brightness.toFixed(1)}</Label>
                    <Slider
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={[brightness]}
                      onValueChange={(value) => setBrightness(value[0])}
                      className="[&>span]:border-none [&_.bg-primary]:bg-stone-800 [&>.bg-background]:bg-stone-500/30"
                    />
                  </div>

                  <div>
                    <Label className={`${currentTheme.text} text-sm`}>Contrast: {contrast.toFixed(1)}</Label>
                    <Slider
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={[contrast]}
                      onValueChange={(value) => setContrast(value[0])}
                      className="[&>span]:border-none [&_.bg-primary]:bg-stone-800 [&>.bg-background]:bg-stone-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Conversion Options */}
              <div className={`space-y-3 border-t ${currentTheme.border} pt-4`}>
                <Label className={`${currentTheme.text} flex items-center gap-2`}>
                  <Sparkles className="h-4 w-4" />
                  Options
                </Label>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="invert"
                    checked={inverted}
                    onCheckedChange={setInverted}
                    className="data-[state=checked]:bg-stone-600"
                  />
                  <Label htmlFor="invert" className={`${currentTheme.text}`}>
                    Invert Colors
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="grayscale"
                    checked={grayscale}
                    onCheckedChange={setGrayscale}
                    className="data-[state=checked]:bg-stone-600"
                  />
                  <Label htmlFor="grayscale" className={`${currentTheme.text}`}>
                    Grayscale Mode
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edge"
                    checked={edgeDetection}
                    onCheckedChange={setEdgeDetection}
                    className="data-[state=checked]:bg-stone-600"
                  />
                  <Label htmlFor="edge" className={`${currentTheme.text}`}>
                    Edge Detection
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="dither"
                    checked={dithering}
                    onCheckedChange={setDithering}
                    className="data-[state=checked]:bg-stone-600"
                  />
                  <Label htmlFor="dither" className={`${currentTheme.text}`}>
                    Dithering
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="original"
                    checked={showOriginal}
                    onCheckedChange={setShowOriginal}
                    className="data-[state=checked]:bg-stone-600"
                  />
                  <Label htmlFor="original" className={`${currentTheme.text}`}>
                    Show Original
                  </Label>
                </div>
              </div>

              {/* Hidden elements */}
              <div className="hidden">
                <canvas ref={canvasRef} width="300" height="300"></canvas>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className={`space-y-2 pt-4 border-t ${currentTheme.border}`}>
                <div className="flex gap-2">
                  <Button
                    onClick={copyToClipboard}
                    className={`flex-1 ${currentTheme.accent} hover:opacity-90 ${currentTheme.text}`}
                    disabled={loading || !imageLoaded}
                    title="Copy ASCII Art (Ctrl+Shift+C)"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {sidebarNarrow ? "Copy" : "Copy"}
                  </Button>

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className={`${currentTheme.accent} hover:opacity-90 ${currentTheme.text}`}
                    title="Upload Image"
                  >
                    <UploadIcon className="h-4 w-4" />
                  </Button>
                </div>

                {/* Export Options */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => downloadAsciiArt("txt")}
                    size="sm"
                    className={`${currentTheme.accent} hover:opacity-90 ${currentTheme.text}`}
                    disabled={loading || !imageLoaded || !asciiArt}
                    title="Download as Text (Ctrl+S)"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    TXT
                  </Button>

                  <Button
                    onClick={() => downloadAsciiArt("html")}
                    size="sm"
                    className={`${currentTheme.accent} hover:opacity-90 ${currentTheme.text}`}
                    disabled={loading || !imageLoaded || !asciiArt}
                  >
                    <Code className="h-3 w-3 mr-1" />
                    HTML
                  </Button>

                  <Button
                    onClick={() => downloadAsciiArt("svg")}
                    size="sm"
                    className={`${currentTheme.accent} hover:opacity-90 ${currentTheme.text}`}
                    disabled={loading || !imageLoaded || !asciiArt}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    SVG
                  </Button>

                  <Button
                    onClick={() => downloadAsciiArt("png")}
                    size="sm"
                    className={`${currentTheme.accent} hover:opacity-90 ${currentTheme.text}`}
                    disabled={loading || !imageLoaded || !asciiArt}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    PNG
                  </Button>
                </div>

                {/* Info Panel */}
                {processingTime > 0 && (
                  <div className={`text-xs ${currentTheme.text} opacity-70 text-center pt-2`}>
                    Last conversion: {processingTime.toFixed(0)}ms
                  </div>
                )}

                {/* Keyboard Shortcuts Info */}
                <details className={`text-xs ${currentTheme.text} opacity-70`}>
                  <summary className="cursor-pointer flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Keyboard Shortcuts
                  </summary>
                  <div className="mt-1 pl-4 space-y-1">
                    <div>Ctrl+Z/Y: Undo/Redo</div>
                    <div>Ctrl+Shift+C: Copy ASCII</div>
                    <div>Ctrl+S: Download</div>
                    <div>Ctrl +/-: Zoom</div>
                    <div>Alt+F: Fullscreen</div>
                    <div>Alt+G: Toggle Grid</div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
