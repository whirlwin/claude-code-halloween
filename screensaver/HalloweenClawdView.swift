import AppKit
import ScreenSaver

// Plays the frames bake.mjs takes from the mod's scene, as big as the screen
// allows: the spinner's 24 by 6 pixel picture, Clawd and his effects alike.
@objc(HalloweenClawdView)
final class HalloweenClawdView: ScreenSaverView {
  private struct Scene: Decodable {
    struct Variant: Decodable {
      let name: String
      let color: String
      let words: [String]
    }

    let width: Int
    let height: Int
    let tickMs: Int
    let framesPerVariant: Int
    let background: UInt32
    let variants: [Variant]
    let frames: String
  }

  // A quadrant pixel is half a terminal cell each way, and a cell is about
  // twice as tall as it is wide, so square pixels would squash Clawd flat.
  private static let pixelAspect: CGFloat = 2
  // How much of the screen the picture may take, leaving room to drift.
  private static let maxWidth: CGFloat = 0.85
  private static let maxHeight: CGFloat = 0.65

  private let scene: Scene?
  private let pixels: [UInt32]
  private var colors: [UInt32: CGColor] = [:]
  private var start = Date()

  // Which frame is showing. Exposed so a harness can pose any frame.
  @objc var tick = 0

  override init?(frame: NSRect, isPreview: Bool) {
    let url = Bundle(for: HalloweenClawdView.self).url(forResource: "scene", withExtension: "json")
    let scene = url.flatMap { try? Data(contentsOf: $0) }.flatMap { try? JSONDecoder().decode(Scene.self, from: $0) }
    self.scene = scene
    pixels = scene.flatMap { Data(base64Encoded: $0.frames) }.map { data in
      data.withUnsafeBytes { raw in
        stride(from: 0, to: raw.count, by: 4).map { UInt32(littleEndian: raw.loadUnaligned(fromByteOffset: $0, as: UInt32.self)) }
      }
    } ?? []
    super.init(frame: frame, isPreview: isPreview)
    animationTimeInterval = Double(scene?.tickMs ?? 150) / 1000
    // Since Sonoma the host can leave an old instance animating after the
    // screensaver ends, so stop on the system's own signal.
    if !isPreview {
      DistributedNotificationCenter.default().addObserver(
        self, selector: #selector(willStop), name: Notification.Name("com.apple.screensaver.willstop"), object: nil)
    }
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  deinit {
    DistributedNotificationCenter.default().removeObserver(self)
  }

  @objc private func willStop(_ notification: Notification) {
    stopAnimation()
  }

  override var isOpaque: Bool { true }

  override func startAnimation() {
    start = Date()
    tick = 0
    super.startAnimation()
  }

  override func animateOneFrame() {
    guard let scene else { return }
    let now = Int(Date().timeIntervalSince(start) * 1000) / scene.tickMs
    if now != tick {
      tick = now
      needsDisplay = true
    }
  }

  override func draw(_ rect: NSRect) {
    guard let context = NSGraphicsContext.current?.cgContext else { return }
    context.setFillColor(.black)
    context.fill(bounds)
    guard let scene, !scene.variants.isEmpty, !pixels.isEmpty else { return }

    let size = scene.width * scene.height
    let count = pixels.count / size
    let costume = tick / scene.framesPerVariant
    let variant = scene.variants[costume % scene.variants.count]
    let round = tick / (scene.framesPerVariant * scene.variants.count)
    let word = variant.words.isEmpty ? variant.name : variant.words[round % variant.words.count]

    // Whole points per pixel, placed on whole points further down, so
    // neighbouring pixels never leave an antialiased seam.
    let pw = max(1, floor(min(
      bounds.width * Self.maxWidth / CGFloat(scene.width),
      bounds.height * Self.maxHeight / (CGFloat(scene.height) * Self.pixelAspect))))
    let ph = pw * Self.pixelAspect
    let sceneWidth = pw * CGFloat(scene.width)
    let sceneHeight = ph * CGFloat(scene.height)

    let label = caption(word: word, color: variant.color, elapsed: tick * scene.tickMs / 1000, size: pw * 1.4)
    let labelSize = label.size()
    let gap = pw * 1.5
    let blockHeight = sceneHeight + gap + labelSize.height

    // A new spot with every costume, behind the puff of smoke, so nothing
    // sits still long enough to burn in.
    let slackX = max(0, bounds.width - max(sceneWidth, labelSize.width)) / 2
    let slackY = max(0, bounds.height - blockHeight) / 2
    let left = bounds.minX + slackX + (unit(costume, 1) * 2 - 1) * slackX * 0.8
    let bottom = bounds.minY + slackY + (unit(costume, 2) * 2 - 1) * slackY * 0.8
    let sceneLeft = (left + (max(sceneWidth, labelSize.width) - sceneWidth) / 2).rounded()
    let sceneTop = (bottom + blockHeight).rounded()

    let offset = (tick % count) * size
    for y in 0..<scene.height {
      for x in 0..<scene.width {
        let pixel = pixels[offset + y * scene.width + x]
        if pixel == scene.background { continue }
        context.setFillColor(color(pixel))
        context.fill(CGRect(x: sceneLeft + CGFloat(x) * pw, y: sceneTop - CGFloat(y + 1) * ph, width: pw, height: ph))
      }
    }

    label.draw(at: NSPoint(x: left + (max(sceneWidth, labelSize.width) - labelSize.width) / 2, y: bottom))
  }

  // The spinner line: the costume's word in its color, then the time spent.
  private func caption(word: String, color: String, elapsed: Int, size: CGFloat) -> NSAttributedString {
    let font = NSFont.monospacedSystemFont(ofSize: size, weight: .regular)
    let hex = UInt32(color.dropFirst(), radix: 16) ?? 0xffffff
    let text = NSMutableAttributedString(string: "\(word)…", attributes: [.font: font, .foregroundColor: NSColor(cgColor: self.color(hex)) ?? .white])
    let time = elapsed < 60 ? "\(elapsed)s" : "\(elapsed / 60)m \(elapsed % 60)s"
    text.append(NSAttributedString(string: " (\(time))", attributes: [.font: font, .foregroundColor: NSColor(white: 0.5, alpha: 1)]))
    return text
  }

  private func color(_ rgb: UInt32) -> CGColor {
    if let cached = colors[rgb] { return cached }
    let made = CGColor(
      srgbRed: CGFloat((rgb >> 16) & 0xff) / 255, green: CGFloat((rgb >> 8) & 0xff) / 255, blue: CGFloat(rgb & 0xff) / 255, alpha: 1)
    colors[rgb] = made
    return made
  }

  // A steady number in [0, 1) for each costume, so his spot holds until the
  // next one.
  private func unit(_ n: Int, _ salt: UInt64) -> CGFloat {
    var h = UInt64(truncatingIfNeeded: n) &* 0x9e37_79b9_7f4a_7c15 &+ salt &* 0xbf58_476d_1ce4_e5b9
    h = (h ^ (h >> 30)) &* 0xbf58_476d_1ce4_e5b9
    h = (h ^ (h >> 27)) &* 0x94d0_49bb_1331_11eb
    h ^= h >> 31
    return CGFloat(h >> 11) / CGFloat(UInt64(1) << 53)
  }
}
