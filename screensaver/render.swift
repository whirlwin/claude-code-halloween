// Loads a built saver the way the system does and renders frames offscreen
// into one PNG, a tile per tick, three to a row:
//   swift render.swift <saver> <out.png> <width> <height> <tick>...
import AppKit
import ScreenSaver

let args = CommandLine.arguments.dropFirst()
guard args.count >= 5, let width = Int(args[args.startIndex + 2]), let height = Int(args[args.startIndex + 3]) else {
  FileHandle.standardError.write("usage: render.swift <saver> <out.png> <width> <height> <tick>...\n".data(using: .utf8)!)
  exit(2)
}
let path = args[args.startIndex]
let out = args[args.startIndex + 1]
let ticks = args.dropFirst(4).compactMap { Int($0) }

guard let bundle = Bundle(path: path), bundle.load(), let saver = bundle.principalClass as? ScreenSaverView.Type else {
  FileHandle.standardError.write("\(path) has no ScreenSaverView principal class\n".data(using: .utf8)!)
  exit(1)
}

let columns = min(3, ticks.count)
let rows = (ticks.count + columns - 1) / columns
let sheet = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: width * columns, pixelsHigh: height * rows, bitsPerSample: 8,
  samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: sheet)
for (i, tick) in ticks.enumerated() {
  guard let view = saver.init(frame: NSRect(x: 0, y: 0, width: width, height: height), isPreview: false) else { exit(1) }
  view.setValue(tick, forKey: "tick")
  let tile = view.bitmapImageRepForCachingDisplay(in: view.bounds)!
  view.cacheDisplay(in: view.bounds, to: tile)
  tile.draw(in: NSRect(x: (i % columns) * width, y: (rows - 1 - i / columns) * height, width: width, height: height))
}

// Hairlines between tiles, drawn over them rather than shrinking them.
NSColor.darkGray.setFill()
for column in 1..<max(1, columns) { NSRect(x: column * width, y: 0, width: 1, height: height * rows).fill() }
for row in 1..<max(1, rows) { NSRect(x: 0, y: row * height, width: width * columns, height: 1).fill() }

NSGraphicsContext.restoreGraphicsState()
try sheet.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
